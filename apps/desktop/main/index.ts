import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "node:path";
import { registerIpcHandlers, cleanup as cleanupIpc } from "./ipc-handlers.js";
import { cleanup as cleanupDevServer } from "./dev-server.js";

const APP_URL = "https://meld-psi.vercel.app";
let mainWindow: BrowserWindow | null = null;

function getSplashPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "splash.html")
    : path.join(__dirname, "../resources/splash.html");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 20 },
    show: false,
    backgroundColor: "#0A0A0A",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.show();
    mainWindow.loadURL("http://localhost:3000/dashboard");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    // 스플래시 화면 먼저 표시
    mainWindow.loadFile(getSplashPath());
    mainWindow.once("ready-to-show", () => {
      mainWindow?.show();
    });

    // 타이핑(~1s) + 멈춤(0.6s) + 빨려들어감(0.6s) = ~2.2초
    setTimeout(() => {
      mainWindow?.loadURL(`${APP_URL}/dashboard`);
    }, 2200);
  }

  // 랜딩페이지(/)나 앱 외부 페이지로 이동하면 /dashboard로 리다이렉트
  const ALLOWED_PATHS = ["/dashboard", "/login", "/callback", "/project", "/api/"];
  mainWindow.webContents.on("did-navigate", (_event, url) => {
    try {
      const u = new URL(url);
      // 앱 내부 URL인 경우만 체크
      if (u.origin === APP_URL || u.origin === "http://localhost:3000") {
        const isAllowed = ALLOWED_PATHS.some((p) => u.pathname.startsWith(p));
        if (!isAllowed) {
          mainWindow?.loadURL(`${APP_URL}/dashboard`);
        }
      }
    } catch {}
  });

  // OAuth 등 외부 링크는 시스템 브라우저로 열기 (GitHub 로그인 제외)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL) && !url.includes("github.com/login")) {
      require("electron").shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

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
