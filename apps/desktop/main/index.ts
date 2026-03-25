import { app, BrowserWindow, ipcMain, shell } from "electron";
import * as path from "node:path";
import { registerIpcHandlers, cleanup as cleanupIpc } from "./ipc-handlers.js";
import { cleanup as cleanupDevServer } from "./dev-server.js";

const APP_URL = "https://meld-psi.vercel.app";
let mainWindow: BrowserWindow | null = null;
let authResolve: ((user: unknown) => void) | null = null;

// meld:// 프로토콜 등록
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("meld", process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient("meld");
}

// macOS: 프로토콜 URL 수신
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
      if (userJson) {
        const user = JSON.parse(decodeURIComponent(userJson));
        authResolve?.(user);
        authResolve = null;
      }
    }
  } catch {
    authResolve?.(null);
    authResolve = null;
  }

  // 앱 창으로 포커스
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
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

// GitHub OAuth — 시스템 브라우저에서 로그인 후 meld:// 프로토콜로 유저 정보 수신
ipcMain.handle("auth:github", async () => {
  return new Promise((resolve) => {
    authResolve = resolve;

    // 1. 시스템 브라우저에서 일반 GitHub 로그인 (redirect_to로 데스크톱 엔드포인트 지정)
    shell.openExternal(`${APP_URL}/api/auth/github?redirect_to=/api/auth/desktop`);

    // 60초 타임아웃
    setTimeout(() => {
      if (authResolve === resolve) {
        authResolve = null;
        resolve(null);
      }
    }, 60000);
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
