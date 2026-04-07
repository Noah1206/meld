import { spawn, type ChildProcess } from "node:child_process";
import * as net from "node:net";
import * as http from "node:http";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { BrowserWindow } from "electron";
import { detectFramework } from "@figma-code-bridge/agent/server";

// Save/load project-specific port to .meld/port
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

// Ports reserved by Meld — never use these
const RESERVED_PORTS = new Set([9090, 3000, 3001, 5173, 5174, 4200, 8080, 8000]);

// Find an available port, skipping reserved ones
function findFreePort(startPort = 18000): Promise<number> {
  return new Promise((resolve) => {
    // Skip reserved ports
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

let devProcess: ChildProcess | null = null;
let ptyProcess: ReturnType<typeof import("node-pty").spawn> | null = null;
let detectedUrl: string | null = null;
let outputAccumulator = ""; // Accumulate stdout chunks for URL detection
let lastRootDir: string | null = null; // For port-conflict auto-fix
let portConflictRetries = 0; // Guard against infinite retry (max 2)

// Terminal log buffer
const terminalBuffer: string[] = [];
const MAX_BUFFER = 500;

function broadcast(channel: string, data: unknown) {
  if (channel === "agent:terminal" && typeof data === "string") {
    terminalBuffer.push(data);
    if (terminalBuffer.length > MAX_BUFFER) {
      terminalBuffer.splice(0, terminalBuffer.length - MAX_BUFFER);
    }
  }

  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(channel, data);
  }
}

export function getTerminalBuffer(): string[] {
  return [...terminalBuffer];
}

// HTTP health check from Node.js without CORS
export function checkUrlHealth(targetUrl: string): Promise<{ ok: boolean; status: number; error?: string }> {
  // Prevent localhost DNS resolution failure on macOS
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

// User-configured port (set via IPC)
let userConfiguredPort: number | null = null;

export function setUserPort(port: number | null) {
  userConfiguredPort = port;
}

export function getUserPort(): number | null {
  return userConfiguredPort;
}

interface DevCommand {
  cmd: string;
  args: string[];
  hardcodedPort?: number; // port found in the script (e.g. next dev -p 6600)
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

    // Detect hardcoded port: -p 6600, --port 6600, -p=6600, --port=6600
    const portMatch = script.match(/(?:-p|--port)[=\s]+(\d+)/);
    const hardcodedPort = portMatch ? parseInt(portMatch[1], 10) : undefined;

    return { cmd: "npm", args: ["run", scriptName], hardcodedPort };
  } catch {
    return null;
  }
}

// Kill process on a specific port
async function killPortProcess(port: number): Promise<boolean> {
  try {
    const { execSync } = require("node:child_process");
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
    // Wait a moment for port to be released
    await new Promise((r) => setTimeout(r, 500));
    return true;
  } catch {
    return false;
  }
}

async function getPty() {
  try {
    return require("node-pty") as typeof import("node-pty");
  } catch {
    return null;
  }
}

export async function startDevServer(rootDir: string) {
  // Extract port from previous URL before stopping
  const prevPort = detectedUrl ? parseInt(new URL(detectedUrl).port, 10) : null;

  // Stop if there's an existing process started by Meld
  stopDevServer();
  portConflictRetries = 0;

  // Kill orphaned process on the previous port
  if (prevPort) {
    await killPortProcess(prevPort);
  }

  // Skip existing port scan — always start directly and extract URL from stdout
  await launchDevServer(rootDir);
}

async function launchDevServer(rootDir: string) {
  lastRootDir = rootDir;

  const devCmd = getDevCommand(rootDir);
  if (!devCmd) {
    broadcast("agent:terminal", "\x1b[33m[warn]\x1b[0m No dev script found (need 'dev' or 'start' in package.json)\r\n");
    return;
  }

  const framework = detectFramework(rootDir);

  // Install dependencies if missing
  const nodeModulesPath = path.join(rootDir, "node_modules");
  if (!fs.existsSync(nodeModulesPath)) {
    broadcast("agent:terminal", "\x1b[36m[info]\x1b[0m node_modules not found. Running npm install...\r\n");
    await runInstall(rootDir);
  }

  // Determine port: user setting > hardcoded in script > saved project port > find free port
  // ALL ports are checked for availability. If occupied, find a new one.
  let targetPort: number;

  const checkPort = (port: number): Promise<boolean> => new Promise((resolve) => {
    const s = net.createServer();
    s.listen(port, () => { s.close(() => resolve(false)); });
    s.on("error", () => resolve(true));
  });

  if (userConfiguredPort) {
    if (await checkPort(userConfiguredPort)) {
      broadcast("agent:terminal", `\x1b[33m[warn]\x1b[0m Port ${userConfiguredPort} is occupied. Finding free port...\r\n`);
      targetPort = await findFreePort(18000 + Math.floor(Math.random() * 10000));
    } else {
      targetPort = userConfiguredPort;
    }
  } else if (devCmd.hardcodedPort) {
    if (await checkPort(devCmd.hardcodedPort)) {
      // Hardcoded port occupied — find free port AND rewrite package.json
      targetPort = await findFreePort(18000 + Math.floor(Math.random() * 10000));
      broadcast("agent:terminal", `\x1b[33m[warn]\x1b[0m Port ${devCmd.hardcodedPort} is occupied. Switching to ${targetPort}\r\n`);
      // Rewrite package.json to use new port
      try {
        const pkgPath = path.join(rootDir, "package.json");
        const pkgContent = fs.readFileSync(pkgPath, "utf-8");
        const updated = pkgContent.replace(
          new RegExp(`(--port|PORT=|-p)[=\\s]*${devCmd.hardcodedPort}`, "g"),
          `$1 ${targetPort}`
        );
        if (updated !== pkgContent) {
          fs.writeFileSync(pkgPath, updated, "utf-8");
          broadcast("agent:terminal", `\x1b[36m[info]\x1b[0m Updated package.json port to ${targetPort}\r\n`);
          // Update devCmd to reflect new port
          devCmd.hardcodedPort = targetPort;
        }
      } catch {}
      saveProjectPort(rootDir, targetPort);
    } else {
      targetPort = devCmd.hardcodedPort;
    }
  } else {
    // Check saved project port
    const savedPort = loadProjectPort(rootDir);
    if (savedPort && !(await checkPort(savedPort))) {
      targetPort = savedPort;
    } else {
      if (savedPort) {
        broadcast("agent:terminal", `\x1b[33m[warn]\x1b[0m Saved port ${savedPort} is occupied. Finding free port...\r\n`);
      }
      targetPort = await findFreePort(18000 + Math.floor(Math.random() * 10000));
      saveProjectPort(rootDir, targetPort);
    }
  }

  const portEnv = { PORT: String(targetPort) };
  const shell = os.platform() === "win32" ? "powershell.exe" : (process.env.SHELL || "/bin/zsh");
  const fullCmd = `${devCmd.cmd} ${devCmd.args.join(" ")}`;

  broadcast("agent:terminal", `\x1b[36m[info]\x1b[0m ${fullCmd} (port: ${targetPort})\r\n`);

  detectedUrl = null;

  const pty = await getPty();
  if (pty) {
    try {
      startWithPty(pty, shell, fullCmd, rootDir, framework, portEnv);
    } catch {
      broadcast("agent:terminal", "\x1b[33m[warn]\x1b[0m PTY failed, using fallback mode\r\n");
      startWithSpawn(devCmd, rootDir, framework, portEnv);
    }
  } else {
    startWithSpawn(devCmd, rootDir, framework, portEnv);
  }
}

// Strip ANSI escape codes for URL matching
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "");
}

// Parse localhost URL from stdout/stderr
function handleOutput(data: string, framework: string | null) {
  broadcast("agent:terminal", data);

  const clean = stripAnsi(data);

  // Detect port conflict → kill the port and restart automatically
  const portConflictMatch = clean.match(/(?:already running on|already in use|EADDRINUSE).*?(?:port\s*)?(\d{4,5})/i)
    || clean.match(/Something is already running on port (\d+)/i);
  if (portConflictMatch && portConflictRetries < 2 && lastRootDir) {
    const conflictPort = parseInt(portConflictMatch[1], 10);
    portConflictRetries++;
    broadcast("agent:terminal", `\r\n\x1b[33m[fix]\x1b[0m Port ${conflictPort} conflict detected. Killing process and retrying... (attempt ${portConflictRetries}/2)\r\n`);
    stopDevServer();
    killPortProcess(conflictPort).then(() => {
      setTimeout(() => {
        launchDevServer(lastRootDir!);
      }, 800);
    });
    return;
  }

  // Prevent duplicate broadcast if URL already detected
  if (detectedUrl) return;

  // Accumulate output and strip ANSI codes for URL matching
  outputAccumulator += data;
  const accumulated = stripAnsi(outputAccumulator);
  const urlMatch = accumulated.match(/https?:\/\/localhost:(\d+)/);
  if (urlMatch) {
    detectedUrl = urlMatch[0];
    outputAccumulator = "";
    portConflictRetries = 0; // Reset on success
    broadcast("agent:devServerReady", {
      url: detectedUrl,
      framework,
    });
  }
  // Prevent unbounded growth
  if (outputAccumulator.length > 10000) outputAccumulator = outputAccumulator.slice(-5000);
}

function startWithPty(
  pty: typeof import("node-pty"),
  shell: string,
  cmd: string,
  rootDir: string,
  framework: string | null,
  extraEnv: Record<string, string> = {},
) {
  ptyProcess = pty.spawn(shell, ["-c", cmd], {
    name: "xterm-256color",
    cols: 120,
    rows: 30,
    cwd: rootDir,
    env: { ...process.env, FORCE_COLOR: "3", TERM: "xterm-256color", ...extraEnv } as Record<string, string>,
  });

  ptyProcess.onData((data: string) => {
    handleOutput(data, framework);
  });

  ptyProcess.onExit(({ exitCode }) => {
    broadcast("agent:terminal", `\r\n\x1b[36m[info]\x1b[0m dev server exited (code: ${exitCode})\r\n`);
    ptyProcess = null;
  });
}

function startWithSpawn(
  devCmd: { cmd: string; args: string[] },
  rootDir: string,
  framework: string | null,
  extraEnv: Record<string, string> = {},
) {
  devProcess = spawn(devCmd.cmd, devCmd.args, {
    cwd: rootDir,
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1", ...extraEnv },
  });

  devProcess.stdout?.on("data", (data: Buffer) => {
    handleOutput(data.toString(), framework);
  });

  devProcess.stderr?.on("data", (data: Buffer) => {
    handleOutput(data.toString(), framework);
  });

  devProcess.on("exit", (code) => {
    broadcast("agent:terminal", `[info] dev server exited (code: ${code})\n`);
    devProcess = null;
  });
}

async function runInstall(rootDir: string): Promise<void> {
  const pty = await getPty();

  if (pty) {
    try {
      const shell = os.platform() === "win32" ? "powershell.exe" : (process.env.SHELL || "/bin/zsh");
      return await new Promise<void>((resolve) => {
        const proc = pty.spawn(shell, ["-c", "npm install"], {
          name: "xterm-256color",
          cols: 120,
          rows: 30,
          cwd: rootDir,
          env: { ...process.env, FORCE_COLOR: "3", TERM: "xterm-256color" } as Record<string, string>,
        });

        proc.onData((data: string) => {
          broadcast("agent:terminal", data);
        });

        proc.onExit(({ exitCode }) => {
          if (exitCode !== 0) {
            broadcast("agent:terminal", `\r\n\x1b[31m[error]\x1b[0m npm install failed (code: ${exitCode})\r\n`);
          } else {
            broadcast("agent:terminal", `\r\n\x1b[32m[info]\x1b[0m npm install completed\r\n`);
          }
          resolve();
        });
      });
    } catch {
      broadcast("agent:terminal", "\x1b[33m[warn]\x1b[0m PTY install failed, using fallback mode\r\n");
      // fall through to spawn
    }
  }

  return new Promise<void>((resolve) => {
    const installProcess = spawn("npm", ["install"], {
      cwd: rootDir,
      shell: true,
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    installProcess.stdout?.on("data", (data: Buffer) => {
      broadcast("agent:terminal", data.toString());
    });
    installProcess.stderr?.on("data", (data: Buffer) => {
      broadcast("agent:terminal", data.toString());
    });
    installProcess.on("exit", (code) => {
      if (code !== 0) {
        broadcast("agent:terminal", `[error] npm install failed (code: ${code})\n`);
      } else {
        broadcast("agent:terminal", "[info] npm install completed\n");
      }
      resolve();
    });
  });
}

export function resizePty(cols: number, rows: number) {
  if (ptyProcess) {
    ptyProcess.resize(cols, rows);
  }
}

export function writeToPty(data: string) {
  if (ptyProcess) {
    ptyProcess.write(data);
  }
}

// Restart: stop existing Meld process and start again
export async function restartDevServer(rootDir: string) {
  broadcast("agent:terminal", `\r\n\x1b[36m[info]\x1b[0m Restarting server...\r\n`);

  // Extract port from previous URL before clearing
  const prevPort = detectedUrl ? parseInt(new URL(detectedUrl).port, 10) : null;

  stopDevServer();
  terminalBuffer.length = 0;

  // Kill orphaned process on the previous port (PTY may have died but child process lives)
  if (prevPort) {
    await killPortProcess(prevPort);
  }

  await launchDevServer(rootDir);
}

export function stopDevServer() {
  if (ptyProcess) {
    ptyProcess.kill();
    ptyProcess = null;
  }
  if (devProcess) {
    devProcess.kill("SIGTERM");
    devProcess = null;
  }
  detectedUrl = null;
  outputAccumulator = "";
}

export function getDevServerUrl(): string | null {
  return detectedUrl;
}

export function cleanup() {
  stopDevServer();
}
