import { app, BrowserWindow, ipcMain, shell, nativeImage } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import { registerIpcHandlers, cleanup as cleanupIpc } from "./ipc-handlers.js";
import { cleanup as cleanupDevServer } from "./dev-server.js";
import { registerPreviewHandlers, cleanupPreview } from "./preview-view.js";
import { registerAiHandlers } from "./ai-handler.js";

// ─── Memory management: increase V8 heap limit ───
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=4096 --expose-gc");

const APP_URL = "http://localhost:9090";
let mainWindow: BrowserWindow | null = null;
let authResolve: ((user: unknown) => void) | null = null;

// Current user in memory (for session without "Remember me")
let currentUser: SavedSession["user"] | null = null;

// Session persistence
const SESSION_FILE = path.join(app.getPath("userData"), "session.json");

interface SavedSession {
  user: {
    id: string;
    githubUsername: string;
    avatarUrl?: string;
    hasFigmaToken?: boolean;
  };
  savedAt: number;
}

function loadSavedSession(): SavedSession | null {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
      // Session expires after 30 days
      if (Date.now() - data.savedAt < 30 * 24 * 60 * 60 * 1000) {
        return data;
      }
      // Expired, delete file
      fs.unlinkSync(SESSION_FILE);
    }
  } catch {
    // Ignore errors
  }
  return null;
}

function saveSession(user: SavedSession["user"]): void {
  try {
    const data: SavedSession = { user, savedAt: Date.now() };
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
  } catch {
    // Ignore errors
  }
}

function clearSession(): void {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
  } catch {
    // Ignore errors
  }
}

// Register meld:// protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("meld", process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient("meld");
}

// macOS: Receive protocol URL
app.on("open-url", (_event, url) => {
  handleProtocolUrl(url);
});

function handleProtocolUrl(url: string) {
  try {
    const u = new URL(url);

    if (u.hostname === "auth") {
      const error = u.searchParams.get("error");
      if (error) {
        authResolve?.(null);
        authResolve = null;
        return;
      }

      const userJson = u.searchParams.get("user");
      const rememberMe = u.searchParams.get("remember_me") === "true";

      if (userJson) {
        const user = JSON.parse(decodeURIComponent(userJson));
        console.log("[Meld] OAuth success, user:", user.githubUsername);

        // Always store current user in memory for this session
        currentUser = user;
        console.log("[Meld] currentUser set in memory");

        // Only save session to disk if "Remember me" was checked
        if (rememberMe) {
          saveSession(user);
          console.log("[Meld] Session saved to disk (remember_me=true)");
        } else {
          // Clear any existing saved session when "Remember me" is not checked
          clearSession();
          console.log("[Meld] Session cleared from disk (remember_me=false)");
        }

        authResolve?.(user);
        authResolve = null;

        // Navigate to tutorial page after login
        // Tutorial page will redirect to workspace if already completed
        if (mainWindow) {
          console.log("[Meld] Navigating to /tutorial");
          mainWindow.loadURL(`${APP_URL}/tutorial`);
        }
      }
    }

    // MCP OAuth callback (Figma, Vercel, etc.)
    // meld://mcp-connected?service=figma&redirect=/project/workspace?...
    if (u.hostname === "mcp-connected") {
      const service = u.searchParams.get("service") ?? "";
      const redirect = u.searchParams.get("redirect") ?? "/dashboard";
      // Navigate to workspace + mcp_connected parameter
      if (mainWindow) {
        const sep = redirect.includes("?") ? "&" : "?";
        mainWindow.loadURL(`${APP_URL}${redirect}${sep}mcp_connected=${service}`);
      }
    }
  } catch {
    authResolve?.(null);
    authResolve = null;
  }

  // Focus the app window
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
}

function createWindow() {
  // App icon
  const iconPath = path.join(__dirname, "../../resources/icon.png");
  const appIcon = nativeImage.createFromPath(iconPath);

  // Set dock icon (macOS)
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(appIcon);
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 12 },
    fullscreenable: true,
    show: false,
    backgroundColor: "#111111",
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: false,
    },
  });

  // Allow iframe access to localhost dev server
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    // Remove X-Frame-Options (dev server may set it)
    delete responseHeaders["X-Frame-Options"];
    delete responseHeaders["x-frame-options"];
    callback({ responseHeaders });
  });

  const isDev = !app.isPackaged;

  // Check for saved session (Remember me)
  const savedSession = loadSavedSession();
  if (savedSession) {
    // User previously logged in with "Remember me" - go directly to workspace
    currentUser = savedSession.user;
    console.log("[Meld] Saved session found for:", savedSession.user.githubUsername);
    mainWindow.loadURL(`${APP_URL}/project/workspace`);
  } else {
    // No saved session - start at onboarding
    if (isDev) {
      mainWindow.loadURL(`${APP_URL}/onboarding`);
      // mainWindow.webContents.openDevTools({ mode: "detach" });
    } else {
      mainWindow.loadURL(`${APP_URL}/onboarding`);
    }
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Debug: Track all navigation events
  mainWindow.webContents.on("will-navigate", (event, url) => {
    console.log("[Meld] will-navigate:", url);
    // Block redirect to /login if we just tried to go to /project/workspace
    if (url.includes("/login") && !url.includes("error=")) {
      console.log("[Meld] BLOCKING redirect to /login");
      event.preventDefault();
    }
  });
  mainWindow.webContents.on("did-navigate", (_event, url) => {
    console.log("[Meld] did-navigate:", url);
  });
  mainWindow.webContents.on("did-navigate-in-page", (_event, url) => {
    console.log("[Meld] did-navigate-in-page:", url);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// GitHub OAuth — Login via system browser, receive user info via meld:// protocol
ipcMain.handle("auth:github", async (_event, options?: { rememberMe?: boolean }) => {
  return new Promise((resolve) => {
    authResolve = resolve;

    // 1. Open GitHub login in system browser (redirect_to points to desktop endpoint)
    const rememberMe = options?.rememberMe ? "true" : "false";
    const url = `${APP_URL}/api/auth/github?redirect_to=/api/auth/desktop&remember_me=${rememberMe}`;
    console.log("[Meld] Opening GitHub OAuth with remember_me:", rememberMe, "URL:", url);
    shell.openExternal(url);

    // 60 second timeout
    setTimeout(() => {
      if (authResolve === resolve) {
        authResolve = null;
        resolve(null);
      }
    }, 60000);
  });
});

// MCP OAuth — Open in Electron BrowserWindow (auto-close on completion)
ipcMain.handle("auth:openExternal", async (_event, url: string) => {
  try {
    let absoluteUrl = url.startsWith("/") ? `${APP_URL}${url}` : url;

    // Attach Electron session cookie to URL for authentication
    if (mainWindow) {
      const cookies = await mainWindow.webContents.session.cookies.get({ name: "fcb_session" });
      if (cookies.length > 0) {
        const sep = absoluteUrl.includes("?") ? "&" : "?";
        absoluteUrl += `${sep}session_token=${encodeURIComponent(cookies[0].value)}`;
      }
    }

    // Proceed with OAuth in a new BrowserWindow (auto-close on completion)
    const authWindow = new BrowserWindow({
      width: 600,
      height: 700,
      parent: mainWindow ?? undefined,
      modal: false,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Auto-close when "Connected" in title or success page detected
    authWindow.webContents.on("did-finish-load", () => {
      const pageUrl = authWindow.webContents.getURL();
      // Detect OAuth success page (HTML returned from localhost callback)
      if (pageUrl.includes("/api/auth/figma") && pageUrl.includes("code=")) {
        // Close 2 seconds after callback processing completes
        setTimeout(() => {
          if (!authWindow.isDestroyed()) authWindow.close();
        }, 2000);
      }
    });

    // Detect success via page title (fallback)
    authWindow.on("page-title-updated", (_e, title) => {
      if (title.includes("Connected")) {
        setTimeout(() => {
          if (!authWindow.isDestroyed()) authWindow.close();
        }, 1500);
      }
    });

    authWindow.loadURL(absoluteUrl);
  } catch (e) {
    console.error("[auth:openExternal] Failed:", url, e);
  }
});

// Session IPC handlers
ipcMain.handle("auth:getSavedSession", () => {
  // First check memory (current session), then disk (persistent session)
  console.log("[Meld] getSavedSession called, currentUser:", currentUser?.githubUsername ?? "null");
  if (currentUser) {
    console.log("[Meld] Returning currentUser from memory");
    return currentUser;
  }
  const session = loadSavedSession();
  console.log("[Meld] Checking disk session:", session?.user?.githubUsername ?? "null");
  return session?.user ?? null;
});

ipcMain.handle("auth:saveSession", (_event, user: SavedSession["user"]) => {
  saveSession(user);
  return true;
});

ipcMain.handle("auth:clearSession", () => {
  currentUser = null;
  clearSession();
  return true;
});

// Navigate to URL via Electron loadURL (bypasses client-side routing)
ipcMain.handle("navigate:loadURL", async (_event, path: string) => {
  if (mainWindow) {
    // Clear ALL cache to avoid stale redirects
    await mainWindow.webContents.session.clearStorageData({
      storages: ["cachestorage", "serviceworkers", "localstorage"],
    });
    await mainWindow.webContents.session.clearCache();
    await mainWindow.webContents.session.clearHostResolverCache();

    const url = path.startsWith("http") ? path : `${APP_URL}${path}`;
    console.log("[Meld] IPC navigate:loadURL (all cache cleared):", url);

    // Force reload with no-cache headers and cache-busting query
    const finalUrl = url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
    mainWindow.loadURL(finalUrl, {
      extraHeaders: "pragma: no-cache\nCache-Control: no-cache, no-store, must-revalidate\n",
    });
    return true;
  }
  return false;
});

// Register IPC handlers
registerIpcHandlers();
registerPreviewHandlers();
registerAiHandlers();

// ─── Memory monitor: proactive GC at 85% heap usage ───
setInterval(() => {
  const mem = process.memoryUsage();
  const heapRatio = mem.heapUsed / mem.heapTotal;
  if (heapRatio > 0.85) {
    console.log(`[Meld] Memory pressure: ${Math.round(heapRatio * 100)}% heap used (${Math.round(mem.heapUsed / 1024 / 1024)}MB). Running GC.`);
    if (typeof globalThis.gc === "function") globalThis.gc();
  }
}, 15000);

app.whenReady().then(async () => {
  // --logout flag: clear session and start logged out
  if (process.argv.includes("--logout") || process.argv.includes("--logged-out")) {
    clearSession();
    // Also clear Electron session cookies
    const { session } = await import("electron");
    await session.defaultSession.clearStorageData({ storages: ["cookies"] });
    console.log("[Meld] Starting in logged-out state");
  }

  // Set dock icon immediately (before window creation)
  if (process.platform === "darwin" && app.dock) {
    const earlyIcon = nativeImage.createFromPath(path.join(__dirname, "../../resources/icon.png"));
    if (!earlyIcon.isEmpty()) app.dock.setIcon(earlyIcon);
  }
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Cleanup on app quit
app.on("before-quit", () => {
  cleanupIpc();
  cleanupDevServer();
  cleanupPreview();
});
