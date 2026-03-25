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
    trafficLightPosition: { x: 16, y: 16 },
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
