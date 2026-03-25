import { app, BrowserWindow, ipcMain, session } from "electron";
import * as path from "node:path";
import { registerIpcHandlers, cleanup as cleanupIpc } from "./ipc-handlers.js";
import { cleanup as cleanupDevServer } from "./dev-server.js";

const APP_URL = "https://meld.day";
let mainWindow: BrowserWindow | null = null;

async function isLoggedIn(): Promise<boolean> {
  const cookies = await session.defaultSession.cookies.get({ url: APP_URL });
  return cookies.some((c) => c.name === "session" || c.name === "sb-access-token" || c.name.startsWith("sb-"));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // 쿠키 영속성 보장
      partition: "persist:meld",
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000/dashboard");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    // 로그인 상태 확인 후 적절한 페이지 로드
    isLoggedIn().then((loggedIn) => {
      mainWindow?.loadURL(loggedIn ? `${APP_URL}/dashboard` : `${APP_URL}/login`);
    });
  }

  // 로그인 성공 후 dashboard로 이동 감지
  mainWindow.webContents.on("did-navigate", (_event, url) => {
    // OAuth 콜백 완료 후 dashboard 도착 시 세션 저장됨
    if (url.includes("/dashboard")) {
      session.fromPartition("persist:meld").cookies.flushStore();
    }
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
