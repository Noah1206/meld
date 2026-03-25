import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "node:path";
import { registerIpcHandlers, cleanup as cleanupIpc } from "./ipc-handlers.js";
import { cleanup as cleanupDevServer } from "./dev-server.js";

const APP_URL = "https://meld-psi.vercel.app";
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "default",
    show: false,
    backgroundColor: "#FFFFFF",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// GitHub OAuth — Electron에서 직접 처리 (웹앱 서버 안 거침)
const GITHUB_CLIENT_ID = "Ov23liqIpD09joCA9KBo";
const GITHUB_CLIENT_SECRET = "ac98a9a1aa4e571918ec7f6385e58f00fb390c25";

async function exchangeCodeForToken(code: string): Promise<string | null> {
  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const data = await res.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

async function getGitHubUser(token: string) {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

ipcMain.handle("auth:github", async () => {
  return new Promise((resolve) => {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo+user:email`;

    const authWin = new BrowserWindow({
      width: 480,
      height: 700,
      parent: mainWindow ?? undefined,
      modal: true,
      show: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    authWin.loadURL(authUrl);

    // GitHub가 콜백으로 리다이렉트할 때 코드 가로채기
    authWin.webContents.on("will-redirect", async (event, url) => {
      const u = new URL(url);
      const code = u.searchParams.get("code");

      if (code) {
        event.preventDefault();

        // Node.js에서 직접 토큰 교환
        const token = await exchangeCodeForToken(code);
        if (!token) { authWin.close(); resolve(null); return; }

        const ghUser = await getGitHubUser(token);
        authWin.close();

        if (ghUser) {
          resolve({
            id: String(ghUser.id),
            githubUsername: ghUser.login,
            email: ghUser.email,
            avatarUrl: ghUser.avatar_url,
          });
        } else {
          resolve(null);
        }
      }
    });

    // did-navigate 에서도 체크 (will-redirect가 안 잡힐 경우)
    authWin.webContents.on("did-navigate", async (_event, url) => {
      try {
        const u = new URL(url);
        const code = u.searchParams.get("code");
        if (code && u.hostname !== "github.com") {
          const token = await exchangeCodeForToken(code);
          if (!token) { authWin.close(); resolve(null); return; }

          const ghUser = await getGitHubUser(token);
          authWin.close();
          resolve(ghUser ? {
            id: String(ghUser.id),
            githubUsername: ghUser.login,
            email: ghUser.email,
            avatarUrl: ghUser.avatar_url,
          } : null);
        }
      } catch {}
    });

    authWin.on("closed", () => resolve(null));
  });
});

// IPC 핸들러 등록
registerIpcHandlers();

app.whenReady().then(() => {
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

// 앱 종료 시 cleanup
app.on("before-quit", () => {
  cleanupIpc();
  cleanupDevServer();
});
