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

// GitHub OAuth — 웹앱의 로그인 페이지를 Electron 창에서 실행
ipcMain.handle("auth:github", async () => {
  return new Promise((resolve) => {
    const authWin = new BrowserWindow({
      width: 480,
      height: 640,
      parent: mainWindow ?? undefined,
      modal: true,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // 웹앱의 로그인 페이지 열기
    authWin.loadURL(`${APP_URL}/login`);

    // 페이지 이동 감지
    const handleNavigation = async (_event: unknown, url: string) => {
      try {
        const u = new URL(url);

        // /dashboard에 도착 = 로그인 성공
        if (u.pathname === "/dashboard") {
          // 유저 정보 가져오기
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

        // 로그인 에러
        if (u.pathname === "/login" && u.searchParams.has("error")) {
          // 에러 있어도 창은 닫지 않고 재시도 가능하게 둠
        }
      } catch {}
    };

    authWin.webContents.on("did-navigate", handleNavigation);
    authWin.webContents.on("did-navigate-in-page", handleNavigation);

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
