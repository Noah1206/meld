import { ipcMain, dialog, BrowserWindow } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import { scanProject } from "@figma-code-bridge/agent/scanner";
import { createWatcher } from "@figma-code-bridge/agent/watcher";
import type { FSWatcher } from "chokidar";
import { startDevServer, stopDevServer } from "./dev-server.js";

let activeWatcher: FSWatcher | null = null;
let currentRootDir: string | null = null;

export function registerIpcHandlers() {
  // 프로젝트 디렉토리 열기 (네이티브 다이얼로그)
  ipcMain.handle("agent:openProject", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "프로젝트 폴더 선택",
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const rootDir = result.filePaths[0];
    currentRootDir = rootDir;

    // 기존 watcher 정리
    if (activeWatcher) {
      await activeWatcher.close();
      activeWatcher = null;
    }

    // 파일 트리 스캔
    const fileTree = scanProject(rootDir);

    // 파일 변경 감지 시작
    activeWatcher = createWatcher(rootDir, (event) => {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        win.webContents.send("agent:fileChanged", event);
      }
    });

    return {
      projectPath: rootDir,
      projectName: path.basename(rootDir),
      fileTree,
    };
  });

  // 파일 읽기
  ipcMain.handle("agent:readFile", async (_, filePath: string) => {
    if (!currentRootDir) throw new Error("프로젝트가 열려있지 않습니다");

    const fullPath = path.resolve(currentRootDir, filePath);

    // 경로 탐색 방지
    if (!fullPath.startsWith(currentRootDir)) {
      throw new Error("접근 불가한 경로입니다");
    }

    return fs.promises.readFile(fullPath, "utf-8");
  });

  // 파일 쓰기
  ipcMain.handle("agent:writeFile", async (_, filePath: string, content: string) => {
    if (!currentRootDir) throw new Error("프로젝트가 열려있지 않습니다");

    const fullPath = path.resolve(currentRootDir, filePath);

    // 경로 탐색 방지
    if (!fullPath.startsWith(currentRootDir)) {
      throw new Error("접근 불가한 경로입니다");
    }

    // 디렉토리 생성
    const dir = path.dirname(fullPath);
    await fs.promises.mkdir(dir, { recursive: true });

    await fs.promises.writeFile(fullPath, content, "utf-8");
    return true;
  });

  // 파일 트리 새로고침
  ipcMain.handle("agent:refreshTree", async () => {
    if (!currentRootDir) return [];
    return scanProject(currentRootDir);
  });

  // Dev server 시작
  ipcMain.handle("agent:startDevServer", async (_, dir: string) => {
    const rootDir = dir || currentRootDir;
    if (!rootDir) throw new Error("프로젝트가 열려있지 않습니다");

    await startDevServer(rootDir);
  });

  // Dev server 중지
  ipcMain.handle("agent:stopDevServer", async () => {
    stopDevServer();
  });
}

export function cleanup() {
  if (activeWatcher) {
    activeWatcher.close();
    activeWatcher = null;
  }
  currentRootDir = null;
}
