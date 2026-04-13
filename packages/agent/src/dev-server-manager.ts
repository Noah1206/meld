import { spawn, execSync, type ChildProcess } from "node:child_process";
import * as net from "node:net";
import * as http from "node:http";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { detectFramework } from "./server.js";

// ─── Dev Server Manager (no Electron, no PTY) ──

export type BroadcastFn = (channel: string, data: unknown) => void;

// Ports reserved by Meld
const RESERVED_PORTS = new Set([9090, 3000, 3001, 5173, 5174, 4200, 8080, 8000]);

function saveProjectPort(rootDir: string, port: number) {
  try {
    const meldDir = path.join(rootDir, ".meld");
    fs.mkdirSync(meldDir, { recursive: true });
    fs.writeFileSync(path.join(meldDir, "port"), String(port), "utf-8");
  } catch {}
}

function loadProjectPort(rootDir: string): number | null {
  try {
    const portFile = path.join(rootDir, ".meld", "port");
    if (fs.existsSync(portFile)) {
      const port = parseInt(fs.readFileSync(portFile, "utf-8").trim(), 10);
      if (port > 1024 && port < 65535) return port;
    }
  } catch {}
  return null;
}

function findFreePort(startPort = 18000): Promise<number> {
  return new Promise((resolve) => {
    if (RESERVED_PORTS.has(startPort)) {
      resolve(findFreePort(startPort + 1));
      return;
    }
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
    server.on("error", () => {
      resolve(findFreePort(startPort + 1));
    });
  });
}

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(port, () => { s.close(() => resolve(false)); });
    s.on("error", () => resolve(true));
  });
}

async function killPortProcess(port: number): Promise<boolean> {
  try {
    if (os.platform() === "win32") {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf-8" });
      const pids = output.match(/\d+$/gm);
      if (pids) {
        for (const pid of new Set(pids)) {
          try { execSync(`taskkill /PID ${pid} /F`); } catch {}
        }
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { encoding: "utf-8" });
    }
    await new Promise((r) => setTimeout(r, 500));
    return true;
  } catch {
    return false;
  }
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "");
}

interface DevCommand {
  cmd: string;
  args: string[];
  hardcodedPort?: number;
}

function getDevCommand(rootDir: string): DevCommand | null {
  const pkgPath = path.join(rootDir, "package.json");
  if (!fs.existsSync(pkgPath)) return null;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const scripts = pkg.scripts || {};
    const script = scripts.dev || scripts.start;
    if (!script) return null;

    const scriptName = scripts.dev ? "dev" : "start";
    const portMatch = script.match(/(?:-p|--port)[=\s]+(\d+)/);
    const hardcodedPort = portMatch ? parseInt(portMatch[1], 10) : undefined;

    return { cmd: "npm", args: ["run", scriptName], hardcodedPort };
  } catch {
    return null;
  }
}

export class DevServerManager {
  private devProcess: ChildProcess | null = null;
  private detectedUrl: string | null = null;
  private outputAccumulator = "";
  private lastRootDir: string | null = null;
  private portConflictRetries = 0;
  private userConfiguredPort: number | null = null;
  private terminalBuffer: string[] = [];
  private readonly maxBuffer = 500;
  private broadcast: BroadcastFn;

  constructor(broadcast: BroadcastFn) {
    this.broadcast = broadcast;
  }

  getTerminalBuffer(): string[] {
    return [...this.terminalBuffer];
  }

  getDevServerUrl(): string | null {
    return this.detectedUrl;
  }

  setUserPort(port: number | null) {
    this.userConfiguredPort = port;
  }

  getUserPort(): number | null {
    return this.userConfiguredPort;
  }

  async checkUrlHealth(targetUrl: string): Promise<{ ok: boolean; status: number; error?: string }> {
    const url = targetUrl.replace("://localhost", "://127.0.0.1");
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ ok: false, status: 0, error: "timeout" });
      }, 5000);

      try {
        const req = http.get(url, (res) => {
          clearTimeout(timeout);
          res.resume();
          const status = res.statusCode || 0;
          resolve({ ok: status >= 200 && status < 400, status });
        });
        req.on("error", (err) => {
          clearTimeout(timeout);
          resolve({ ok: false, status: 0, error: err.message });
        });
      } catch (err) {
        clearTimeout(timeout);
        resolve({ ok: false, status: 0, error: String(err) });
      }
    });
  }

  async start(rootDir: string) {
    const prevPort = this.detectedUrl ? parseInt(new URL(this.detectedUrl).port, 10) : null;
    this.stop();
    this.portConflictRetries = 0;

    if (prevPort) {
      await killPortProcess(prevPort);
    }

    await this.launch(rootDir);
  }

  async restart(rootDir: string) {
    this.broadcastTerminal(`\x1b[36m[info]\x1b[0m Restarting server...\r\n`);
    const prevPort = this.detectedUrl ? parseInt(new URL(this.detectedUrl).port, 10) : null;
    this.stop();
    this.terminalBuffer.length = 0;

    if (prevPort) {
      await killPortProcess(prevPort);
    }

    await this.launch(rootDir);
  }

  stop() {
    if (this.devProcess) {
      this.devProcess.kill("SIGTERM");
      this.devProcess = null;
    }
    this.detectedUrl = null;
    this.outputAccumulator = "";
  }

  cleanup() {
    this.stop();
  }

  private broadcastTerminal(data: string) {
    this.terminalBuffer.push(data);
    if (this.terminalBuffer.length > this.maxBuffer) {
      this.terminalBuffer.splice(0, this.terminalBuffer.length - this.maxBuffer);
    }
    this.broadcast("terminalOutput", { data });
  }

  private async launch(rootDir: string) {
    this.lastRootDir = rootDir;

    const devCmd = getDevCommand(rootDir);
    if (!devCmd) {
      this.broadcastTerminal("\x1b[33m[warn]\x1b[0m No dev script found (need 'dev' or 'start' in package.json)\r\n");
      return;
    }

    const framework = detectFramework(rootDir);

    // Install dependencies if missing
    const nodeModulesPath = path.join(rootDir, "node_modules");
    if (!fs.existsSync(nodeModulesPath)) {
      this.broadcastTerminal("\x1b[36m[info]\x1b[0m node_modules not found. Running npm install...\r\n");
      await this.runInstall(rootDir);
    }

    // Determine port
    let targetPort: number;

    if (this.userConfiguredPort) {
      if (await checkPort(this.userConfiguredPort)) {
        this.broadcastTerminal(`\x1b[33m[warn]\x1b[0m Port ${this.userConfiguredPort} is occupied. Finding free port...\r\n`);
        targetPort = await findFreePort(18000 + Math.floor(Math.random() * 10000));
      } else {
        targetPort = this.userConfiguredPort;
      }
    } else if (devCmd.hardcodedPort) {
      if (await checkPort(devCmd.hardcodedPort)) {
        targetPort = await findFreePort(18000 + Math.floor(Math.random() * 10000));
        this.broadcastTerminal(`\x1b[33m[warn]\x1b[0m Port ${devCmd.hardcodedPort} is occupied. Switching to ${targetPort}\r\n`);
        try {
          const pkgPath = path.join(rootDir, "package.json");
          const pkgContent = fs.readFileSync(pkgPath, "utf-8");
          const updated = pkgContent.replace(
            new RegExp(`(--port|PORT=|-p)[=\\s]*${devCmd.hardcodedPort}`, "g"),
            `$1 ${targetPort}`
          );
          if (updated !== pkgContent) {
            fs.writeFileSync(pkgPath, updated, "utf-8");
            this.broadcastTerminal(`\x1b[36m[info]\x1b[0m Updated package.json port to ${targetPort}\r\n`);
            devCmd.hardcodedPort = targetPort;
          }
        } catch {}
        saveProjectPort(rootDir, targetPort);
      } else {
        targetPort = devCmd.hardcodedPort;
      }
    } else {
      const savedPort = loadProjectPort(rootDir);
      if (savedPort && !(await checkPort(savedPort))) {
        targetPort = savedPort;
      } else {
        if (savedPort) {
          this.broadcastTerminal(`\x1b[33m[warn]\x1b[0m Saved port ${savedPort} is occupied. Finding free port...\r\n`);
        }
        targetPort = await findFreePort(18000 + Math.floor(Math.random() * 10000));
        saveProjectPort(rootDir, targetPort);
      }
    }

    const portEnv = { PORT: String(targetPort) };
    const fullCmd = `${devCmd.cmd} ${devCmd.args.join(" ")}`;

    this.broadcastTerminal(`\x1b[36m[info]\x1b[0m ${fullCmd} (port: ${targetPort})\r\n`);
    this.detectedUrl = null;

    // Always use spawn (no PTY in web agent)
    this.devProcess = spawn(devCmd.cmd, devCmd.args, {
      cwd: rootDir,
      shell: true,
      env: { ...process.env, FORCE_COLOR: "1", ...portEnv },
    });

    this.devProcess.stdout?.on("data", (data: Buffer) => {
      this.handleOutput(data.toString(), framework);
    });

    this.devProcess.stderr?.on("data", (data: Buffer) => {
      this.handleOutput(data.toString(), framework);
    });

    this.devProcess.on("exit", (code) => {
      this.broadcastTerminal(`[info] dev server exited (code: ${code})\n`);
      this.devProcess = null;
    });
  }

  private handleOutput(data: string, framework: string | null) {
    this.broadcastTerminal(data);
    const clean = stripAnsi(data);

    // Detect port conflict
    const portConflictMatch = clean.match(/(?:already running on|already in use|EADDRINUSE).*?(?:port\s*)?(\d{4,5})/i)
      || clean.match(/Something is already running on port (\d+)/i);
    if (portConflictMatch && this.portConflictRetries < 2 && this.lastRootDir) {
      const conflictPort = parseInt(portConflictMatch[1], 10);
      this.portConflictRetries++;
      this.broadcastTerminal(`\r\n\x1b[33m[fix]\x1b[0m Port ${conflictPort} conflict detected. Retrying... (attempt ${this.portConflictRetries}/2)\r\n`);
      this.stop();
      killPortProcess(conflictPort).then(() => {
        setTimeout(() => {
          this.launch(this.lastRootDir!);
        }, 800);
      });
      return;
    }

    if (this.detectedUrl) return;

    this.outputAccumulator += data;
    const accumulated = stripAnsi(this.outputAccumulator);
    const urlMatch = accumulated.match(/https?:\/\/localhost:(\d+)/);
    if (urlMatch) {
      this.detectedUrl = urlMatch[0];
      this.outputAccumulator = "";
      this.portConflictRetries = 0;
      this.broadcast("devServerReady", { url: this.detectedUrl, framework });
    }
    if (this.outputAccumulator.length > 10000) this.outputAccumulator = this.outputAccumulator.slice(-5000);
  }

  private runInstall(rootDir: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const installProcess = spawn("npm", ["install"], {
        cwd: rootDir,
        shell: true,
        env: { ...process.env, FORCE_COLOR: "1" },
      });

      installProcess.stdout?.on("data", (data: Buffer) => {
        this.broadcastTerminal(data.toString());
      });
      installProcess.stderr?.on("data", (data: Buffer) => {
        this.broadcastTerminal(data.toString());
      });
      installProcess.on("exit", (code) => {
        if (code !== 0) {
          this.broadcastTerminal(`[error] npm install failed (code: ${code})\n`);
        } else {
          this.broadcastTerminal("[info] npm install completed\n");
        }
        resolve();
      });
    });
  }
}
