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

// GitHub OAuth — 웹앱의 OAuth 플로우를 Electron 창에서 실행
ipcMain.handle("auth:github", async () => {
  return new Promise((resolve) => {
    const authWin = new BrowserWindow({
      width: 500,
      height: 700,
      parent: mainWindow ?? undefined,
      modal: true,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // 웹앱의 GitHub OAuth 시작 URL
    authWin.loadURL(`${APP_URL}/api/auth/github?redirect_to=/api/auth/me`);

    // OAuth 완료 후 /api/auth/me로 리다이렉트되면 유저 정보 가져옴
    authWin.webContents.on("did-navigate", async (_event, url) => {
      try {
        const u = new URL(url);

        // /api/auth/me에 도착하면 유저 정보를 가져온 것
        if (u.pathname === "/api/auth/me") {
          // 쿠키에서 세션으로 유저 정보 가져오기
          const cookies = await authWin.webContents.session.cookies.get({ url: APP_URL });
          const sessionCookie = cookies.find((c) => c.name === "session");

          if (sessionCookie) {
            // /api/auth/me 응답에서 유저 정보 추출
            const response = await authWin.webContents.executeJavaScript(
              `fetch("${APP_URL}/api/auth/me", { credentials: "include" }).then(r => r.json())`
            );
            authWin.close();
            resolve(response?.user ?? null);
            return;
          }
        }

        // /dashboard에 도착하면 로그인 성공 → 유저 정보 가져오기
        if (u.pathname === "/dashboard") {
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
          return;
        }

        // 로그인 실패
        if (u.pathname === "/login" && u.searchParams.has("error")) {
          authWin.close();
          resolve(null);
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
