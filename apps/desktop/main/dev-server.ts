import { spawn, type ChildProcess } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { BrowserWindow } from "electron";
import { detectFramework, checkPort } from "@figma-code-bridge/agent/server";

let devProcess: ChildProcess | null = null;

// 일반적인 dev server 포트
const COMMON_DEV_PORTS = [3000, 5173, 5174, 8080, 4200, 4321, 8000];

function broadcast(channel: string, data: unknown) {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(channel, data);
  }
}

// dev server 시작 스크립트 결정
function getDevCommand(rootDir: string): { cmd: string; args: string[] } | null {
  const pkgPath = path.join(rootDir, "package.json");
  if (!fs.existsSync(pkgPath)) return null;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const scripts = pkg.scripts || {};

    if (scripts.dev) return { cmd: "npm", args: ["run", "dev"] };
    if (scripts.start) return { cmd: "npm", args: ["run", "start"] };

    return null;
  } catch {
    return null;
  }
}

export async function startDevServer(rootDir: string) {
  // 이미 실행 중이면 중지
  stopDevServer();

  // 이미 열려있는 dev server 감지
  for (const port of COMMON_DEV_PORTS) {
    const isOpen = await checkPort(port);
    if (isOpen) {
      const framework = detectFramework(rootDir);
      broadcast("agent:devServerReady", {
        url: `http://localhost:${port}`,
        framework,
      });
      return;
    }
  }

  // dev server 시작
  const devCmd = getDevCommand(rootDir);
  if (!devCmd) {
    broadcast("agent:terminal", "[info] dev 스크립트를 찾을 수 없습니다\n");
    return;
  }

  const framework = detectFramework(rootDir);
  broadcast("agent:terminal", `[info] ${devCmd.cmd} ${devCmd.args.join(" ")} 실행 중...\n`);

  devProcess = spawn(devCmd.cmd, devCmd.args, {
    cwd: rootDir,
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  // stdout/stderr → renderer 전달
  devProcess.stdout?.on("data", (data: Buffer) => {
    const text = data.toString();
    broadcast("agent:terminal", text);

    // 포트 감지 (URL 패턴 매칭)
    const urlMatch = text.match(/https?:\/\/localhost:(\d+)/);
    if (urlMatch) {
      broadcast("agent:devServerReady", {
        url: urlMatch[0],
        framework,
      });
    }
  });

  devProcess.stderr?.on("data", (data: Buffer) => {
    broadcast("agent:terminal", data.toString());
  });

  devProcess.on("exit", (code) => {
    broadcast("agent:terminal", `[info] dev server 종료 (code: ${code})\n`);
    devProcess = null;
  });

  // 폴링으로 포트 감지 (stdout에서 안 잡힐 때 대비)
  const pollInterval = setInterval(async () => {
    if (!devProcess) {
      clearInterval(pollInterval);
      return;
    }
    for (const port of COMMON_DEV_PORTS) {
      const isOpen = await checkPort(port);
      if (isOpen) {
        broadcast("agent:devServerReady", {
          url: `http://localhost:${port}`,
          framework,
        });
        clearInterval(pollInterval);
        return;
      }
    }
  }, 2000);

  // 30초 뒤 폴링 종료
  setTimeout(() => clearInterval(pollInterval), 30_000);
}

export function stopDevServer() {
  if (devProcess) {
    devProcess.kill("SIGTERM");
    devProcess = null;
  }
}

export function cleanup() {
  stopDevServer();
}
