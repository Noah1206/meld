import { app, BrowserWindow, ipcMain, shell, nativeImage } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import { registerIpcHandlers, cleanup as cleanupIpc } from "./ipc-handlers.js";
import { cleanup as cleanupDevServer } from "./dev-server.js";
import { registerPreviewHandlers, cleanupPreview } from "./preview-view.js";
import { registerAiHandlers } from "./ai-handler.js";

const APP_URL = "http://localhost:9090";
let mainWindow: BrowserWindow | null = null;
let authResolve: ((user: unknown) => void) | null = null;

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

        // Only save session if "Remember me" was checked
        if (rememberMe) {
          saveSession(user);
        } else {
          // Clear any existing saved session when "Remember me" is not checked
          clearSession();
        }

        authResolve?.(user);
        authResolve = null;

        // Navigate to onboarding (first-time) or workspace (returning user)
        if (mainWindow) {
          // Check if onboarding was completed before (stored in renderer localStorage)
          // For now, always go to onboarding - the page itself will skip if completed
          mainWindow.loadURL(`${APP_URL}/onboarding`);
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

  if (isDev) {
    mainWindow.loadURL(`${APP_URL}/project/workspace`);
    // mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadURL(`${APP_URL}/project/workspace`);
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// GitHub OAuth — Login via system browser, receive user info via meld:// protocol
ipcMain.handle("auth:github", async () => {
  return new Promise((resolve) => {
    authResolve = resolve;

    // 1. Open GitHub login in system browser (redirect_to points to desktop endpoint)
    shell.openExternal(`${APP_URL}/api/auth/github?redirect_to=/api/auth/desktop`);

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
  const session = loadSavedSession();
  return session?.user ?? null;
});

ipcMain.handle("auth:saveSession", (_event, user: SavedSession["user"]) => {
  saveSession(user);
  return true;
});

ipcMain.handle("auth:clearSession", () => {
  clearSession();
  return true;
});

// Register IPC handlers
registerIpcHandlers();
registerPreviewHandlers();
registerAiHandlers();

app.whenReady().then(() => {
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
