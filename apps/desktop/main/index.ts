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

// GitHub OAuth — GitHub 직접 열고 콜백 코드를 웹앱에 전달
const GITHUB_CLIENT_ID = "Ov23liqIpD09joCA9KBo";
const GITHUB_REDIRECT_URI = `${APP_URL}/api/auth/github`;

ipcMain.handle("auth:github", async () => {
  return new Promise((resolve) => {
    const state = Math.random().toString(36).substring(2);
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=repo+user:email&state=${state}`;

    const authWin = new BrowserWindow({
      width: 480,
      height: 700,
      parent: mainWindow ?? undefined,
      modal: true,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // GitHub OAuth 페이지 직접 열기
    authWin.loadURL(authUrl);

    // 모든 네비게이션 감지 (리다이렉트 포함)
    authWin.webContents.on("will-redirect", async (_event, url) => {
      try {
        const u = new URL(url);

        // 웹앱 콜백으로 돌아오면 → 처리 완료 대기 → /dashboard 감지
        if (u.origin === new URL(APP_URL).origin && u.pathname === "/dashboard") {
          setTimeout(async () => {
            try {
              const response = await authWin.webContents.executeJavaScript(
                `fetch("${APP_URL}/api/auth/me", { credentials: "include" }).then(r => r.json())`
              );
              authWin.close();
              resolve(response?.user ?? null);
            } catch {
              authWin.close();
              resolve(null);
            }
          }, 500);
        }
      } catch {}
    });

    authWin.webContents.on("did-navigate", async (_event, url) => {
      try {
        const u = new URL(url);
        // /dashboard 도착 = 로그인 성공
        if (u.origin === new URL(APP_URL).origin && u.pathname === "/dashboard") {
          setTimeout(async () => {
            try {
              const response = await authWin.webContents.executeJavaScript(
                `fetch("${APP_URL}/api/auth/me", { credentials: "include" }).then(r => r.json())`
              );
              authWin.close();
              resolve(response?.user ?? null);
            } catch {
              authWin.close();
              resolve(null);
            }
          }, 500);
        }
      } catch {}
    });

    authWin.on("closed", () => {
      resolve(null);
    });
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
