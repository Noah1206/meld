import { app, BrowserWindow, net } from "electron";
import * as path from "node:path";
import { registerIpcHandlers, cleanup as cleanupIpc } from "./ipc-handlers.js";
import { cleanup as cleanupDevServer } from "./dev-server.js";

const APP_URL = "https://meld-psi.vercel.app";
let mainWindow: BrowserWindow | null = null;

// 인터넷 연결 확인
function checkOnline(): Promise<boolean> {
  return new Promise((resolve) => {
    const request = net.request(APP_URL);
    request.on("response", () => resolve(true));
    request.on("error", () => resolve(false));
    setTimeout(() => resolve(false), 3000);
    request.end();
  });
}

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
    mainWindow.loadURL("http://localhost:3000/dashboard");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    // 온라인: 웹앱 로드 (로그인, 대시보드, Figma 등 풀 기능)
    // 오프라인: 로컬 렌더러 로드 (로컬 프로젝트 편집만)
    checkOnline().then((online) => {
      if (online) {
        mainWindow?.loadURL(`${APP_URL}/dashboard`);
      } else {
        mainWindow?.loadFile(path.join(__dirname, "../renderer/index.html"));
      }
    });
  }

  // 랜딩페이지(/)로 이동 방지 → dashboard로 리다이렉트
  mainWindow.webContents.on("did-navigate", (_event, url) => {
    try {
      const u = new URL(url);
      if (u.origin === APP_URL && u.pathname === "/") {
        mainWindow?.loadURL(`${APP_URL}/dashboard`);
      }
    } catch {}
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
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
