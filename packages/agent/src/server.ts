import * as fs from "node:fs";
import * as net from "node:net";
import * as path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import { scanProject } from "./scanner.js";
import { createWatcher } from "./watcher.js";
import { createMessage, parseMessage } from "./protocol.js";
import { AgentLoop, rollbackSession, getBackupSessionIds, loadRecentSessions } from "./agent-loop.js";
import { DevServerManager } from "./dev-server-manager.js";
import { HeartbeatScheduler } from "./heartbeat.js";
import { EventHooks } from "./event-hooks.js";
import { bootVMScreen, shutdownVMScreen, vmNavigate, vmClick, vmType, vmScroll, vmScreenshot, vmEvaluate, isVMScreenRunning } from "./vm-screen.js";
import type { AgentEvent } from "@figma-code-bridge/shared";

interface ServerOptions {
  port: number;
  rootDir: string;
  apiKey?: string;
  serverUrl?: string;
}

// Active agent loop instance (one at a time)
let activeAgentLoop: AgentLoop | null = null;
// Dev server manager instance
let devServerManager: DevServerManager | null = null;
// Heartbeat scheduler instance
let heartbeatScheduler: HeartbeatScheduler | null = null;
// Event hooks instance
let eventHooks: EventHooks | null = null;

// Common dev server ports
const COMMON_DEV_PORTS = [3000, 5173, 5174, 8080, 4200, 4321, 8000];

export function startServer({ port, rootDir, apiKey, serverUrl }: ServerOptions) {
  const projectName = path.basename(rootDir);
  const wss = new WebSocketServer({ port });
  let activeClient: WebSocket | null = null;

  // Initialize dev server manager with broadcast to active client
  devServerManager = new DevServerManager((channel, data) => {
    if (activeClient?.readyState === WebSocket.OPEN) {
      activeClient.send(JSON.stringify(createMessage(channel, data)));
    }
  });

  console.log(`\n  ⚡ Meld Agent`);
  console.log(`  📁 Project: ${rootDir}`);
  console.log(`  🔗 WebSocket: ws://localhost:${port}`);
  console.log(`  🤖 AI Agent: ${apiKey ? "ready" : "no API key (set ANTHROPIC_API_KEY)"}`);
  console.log(`  → Open in browser: https://meld-psi.vercel.app/project/local?agent=ws://localhost:${port}`);
  console.log(`\n  Press Ctrl+C to stop\n`);

  // File change detection
  const watcher = createWatcher(rootDir, (event) => {
    if (activeClient?.readyState === WebSocket.OPEN) {
      activeClient.send(
        JSON.stringify(createMessage("fileChanged", event)),
      );
    }
  });

  // Dev server detection
  detectDevServer(rootDir).then((info) => {
    if (info && activeClient?.readyState === WebSocket.OPEN) {
      activeClient.send(
        JSON.stringify(createMessage("devServer", info)),
      );
    }
  });

  wss.on("connection", (ws) => {
    console.log("  ✅ Web app connected");
    activeClient = ws;

    // Connection success message
    ws.send(
      JSON.stringify(
        createMessage("connected", { projectPath: rootDir, projectName }),
      ),
    );

    // Send file tree
    const files = scanProject(rootDir);
    ws.send(
      JSON.stringify(createMessage("fileTree", { files })),
    );

    // Re-detect dev server
    detectDevServer(rootDir).then((info) => {
      if (info && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(createMessage("devServer", info)));
      }
    });

    ws.on("message", (raw) => {
      const msg = parseMessage(raw.toString());
      if (!msg) return;

      handleMessage(ws, msg, rootDir, apiKey, serverUrl);
    });

    ws.on("close", () => {
      console.log("  ❌ Web app disconnected");
      activeClient = null;
    });
  });

  // Initialize VM Screen (AI's virtual computer — user watches via streaming)
  bootVMScreen({
    captureInterval: 1000, // 1 fps
    viewport: { width: 1280, height: 720 },
    onFrame: (frame) => {
      if (activeClient?.readyState === WebSocket.OPEN) {
        activeClient.send(JSON.stringify(createMessage("vmFrame", frame)));
      }
    },
    onEvent: (event: AgentEvent) => {
      if (activeClient?.readyState === WebSocket.OPEN) {
        activeClient.send(JSON.stringify(createMessage("agentEvent", event)));
      }
    },
  }).then((ok) => {
    if (ok) console.log(`  🖥️  VM Screen: active (1280x720)`);
    else console.log(`  🖥️  VM Screen: unavailable (install Playwright for full VM)`);
  });

  // Initialize Heartbeat scheduler
  if (apiKey) {
    heartbeatScheduler = new HeartbeatScheduler({
      intervalMs: 30 * 60 * 1000, // 30 minutes
      rootDir,
      apiKey,
      modelId: "claude-sonnet-4-20250514",
      serverUrl,
      onEvent: (event: AgentEvent) => {
        if (activeClient?.readyState === WebSocket.OPEN) {
          activeClient.send(JSON.stringify(createMessage("agentEvent", event)));
        }
      },
      onAlert: (message: string, severity: "info" | "warning" | "critical") => {
        console.log(`  🔔 [${severity.toUpperCase()}] ${message}`);
        if (activeClient?.readyState === WebSocket.OPEN) {
          activeClient.send(JSON.stringify(createMessage("heartbeatAlert", { message, severity })));
        }
      },
    });
    heartbeatScheduler.start();
    console.log(`  💓 Heartbeat: active (30min interval)`);
  }

  // Initialize Event Hooks
  eventHooks = new EventHooks({
    rootDir,
    onTrigger: (event: string, detail: string) => {
      console.log(`  ⚡ [Hook] ${event}: ${detail.slice(0, 100)}`);
      if (activeClient?.readyState === WebSocket.OPEN) {
        activeClient.send(JSON.stringify(createMessage("eventHook", { event, detail })));
      }
    },
  });
  eventHooks.startFileWatcher();
  eventHooks.startGitWatcher();

  // Cleanup
  const cleanup = () => {
    shutdownVMScreen();
    heartbeatScheduler?.stop();
    eventHooks?.stop();
    devServerManager?.cleanup();
    watcher.close();
    wss.close();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  return wss;
}

function handleMessage(ws: WebSocket, msg: ReturnType<typeof parseMessage>, rootDir: string, apiKey?: string, serverUrl?: string) {
  if (!msg) return;

  const payload = msg.payload as Record<string, unknown>;

  switch (msg.type) {
    case "readFile": {
      const filePath = payload.path as string;
      const fullPath = path.resolve(rootDir, filePath);

      // Prevent path traversal
      if (!fullPath.startsWith(rootDir)) {
        ws.send(
          JSON.stringify(
            createMessage("fileContent", { path: filePath, content: "", error: "Access denied" }),
          ),
        );
        return;
      }

      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        ws.send(
          JSON.stringify(
            createMessage("fileContent", { path: filePath, content }),
          ),
        );
      } catch (err) {
        ws.send(
          JSON.stringify(
            createMessage("fileContent", {
              path: filePath,
              content: "",
              error: err instanceof Error ? err.message : "Read failed",
            }),
          ),
        );
      }
      break;
    }

    case "getFileTree": {
      const files = scanProject(rootDir);
      ws.send(JSON.stringify(createMessage("fileTree", { files })));
      break;
    }

    case "writeFile": {
      const filePath = payload.path as string;
      const content = payload.content as string;
      const fullPath = path.resolve(rootDir, filePath);

      // Prevent path traversal
      if (!fullPath.startsWith(rootDir)) {
        ws.send(
          JSON.stringify(
            createMessage("writeResult", { path: filePath, success: false, error: "Access denied" }),
          ),
        );
        return;
      }

      try {
        // Create directory if it doesn't exist
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, content, "utf-8");
        console.log(`  📝 File modified: ${filePath}`);
        ws.send(
          JSON.stringify(
            createMessage("writeResult", { path: filePath, success: true }),
          ),
        );
      } catch (err) {
        ws.send(
          JSON.stringify(
            createMessage("writeResult", {
              path: filePath,
              success: false,
              error: err instanceof Error ? err.message : "Write failed",
            }),
          ),
        );
      }
      break;
    }

    // ─── Agent Loop messages ───────────────────────────

    case "startAgent": {
      // Resolve API key: message payload > server option > env var
      // If no key, agent will use server proxy (/api/ai/agent) instead of calling Claude directly
      const key = (payload.apiKey as string) || apiKey || process.env.ANTHROPIC_API_KEY || "";

      // Cancel existing agent if running
      if (activeAgentLoop) {
        activeAgentLoop.cancel();
        activeAgentLoop = null;
      }

      const modelId = (payload.modelId as string) || "claude-sonnet-4-20250514";
      const command = payload.command as string;
      const context = payload.context as Record<string, unknown> | undefined;

      console.log(`  🤖 Agent started: "${command.slice(0, 80)}${command.length > 80 ? "..." : ""}"`);

      const loop = new AgentLoop({
        apiKey: key,
        modelId,
        rootDir,
        serverUrl,
        input: { command, context: context as import("@figma-code-bridge/shared").AgentLoopInput["context"] },
        onEvent: (event: AgentEvent) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(createMessage("agentEvent", event)));
          }
        },
      });

      activeAgentLoop = loop;

      // Run agent loop (async, don't await — it streams events)
      loop.run().then(() => {
        if (activeAgentLoop === loop) activeAgentLoop = null;
        console.log(`  ✅ Agent completed: ${loop.sessionId}`);
      }).catch((err) => {
        if (activeAgentLoop === loop) activeAgentLoop = null;
        console.error(`  ❌ Agent error:`, err);
      });
      break;
    }

    case "cancelAgent": {
      if (activeAgentLoop) {
        console.log(`  🛑 Agent cancelled: ${activeAgentLoop.sessionId}`);
        activeAgentLoop.cancel();
        activeAgentLoop = null;
      }
      break;
    }

    case "approveEdit": {
      const toolCallId = payload.toolCallId as string;
      const approved = payload.approved as boolean;
      if (activeAgentLoop) {
        activeAgentLoop.approveEdit(toolCallId, approved);
      }
      break;
    }

    case "respondToAgent": {
      const questionId = payload.questionId as string;
      const response = payload.response as string;
      if (activeAgentLoop) {
        activeAgentLoop.respondToAgent(questionId, response);
      }
      break;
    }

    // ─── Heartbeat management ───────────────────────
    case "startHeartbeat": {
      if (heartbeatScheduler) {
        heartbeatScheduler.start();
        ws.send(JSON.stringify(createMessage("heartbeatStatus", heartbeatScheduler.getStatus())));
      }
      break;
    }

    case "stopHeartbeat": {
      if (heartbeatScheduler) {
        heartbeatScheduler.stop();
        ws.send(JSON.stringify(createMessage("heartbeatStatus", { running: false })));
      }
      break;
    }

    case "getHeartbeatStatus": {
      if (heartbeatScheduler) {
        ws.send(JSON.stringify(createMessage("heartbeatStatus", heartbeatScheduler.getStatus())));
      }
      break;
    }

    // ─── VM Screen control ─────────────────────────
    case "vmNavigate": {
      const url = payload.url as string;
      vmNavigate(url).then((result) => {
        ws.send(JSON.stringify(createMessage("vmNavigateResult", result)));
      }).catch((err) => {
        ws.send(JSON.stringify(createMessage("vmNavigateResult", { success: false, title: "", url: "", error: String(err) })));
      });
      break;
    }

    case "vmScreenshot": {
      vmScreenshot().then((result) => {
        ws.send(JSON.stringify(createMessage("vmScreenshotResult", result)));
      }).catch(() => {
        ws.send(JSON.stringify(createMessage("vmScreenshotResult", { screenshot: "", url: "", title: "" })));
      });
      break;
    }

    case "vmStatus": {
      ws.send(JSON.stringify(createMessage("vmStatus", { running: isVMScreenRunning() })));
      break;
    }

    case "rollback": {
      const sessionId = payload.sessionId as string | undefined;
      rollbackSession(sessionId).then((result) => {
        ws.send(JSON.stringify(createMessage("rollbackResult", result)));
      });
      break;
    }

    case "getBackupSessions": {
      const sessions = getBackupSessionIds();
      ws.send(JSON.stringify(createMessage("backupSessions", { sessions })));
      break;
    }

    case "loadRecentSessions": {
      loadRecentSessions(rootDir).then((sessions) => {
        ws.send(JSON.stringify(createMessage("recentSessions", { sessions })));
      });
      break;
    }

    // ─── URL health check ───────────────────────────

    case "checkUrl": {
      const url = payload.url as string;
      const requestId = msg.id;
      if (devServerManager) {
        devServerManager.checkUrlHealth(url).then((result) => {
          ws.send(JSON.stringify(createMessage("checkUrlResult", { ...result, requestId })));
        });
      } else {
        fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) })
          .then((res) => {
            ws.send(JSON.stringify(createMessage("checkUrlResult", { ok: res.ok, status: res.status, requestId })));
          })
          .catch((err) => {
            ws.send(JSON.stringify(createMessage("checkUrlResult", { ok: false, error: err instanceof Error ? err.message : "Fetch failed", requestId })));
          });
      }
      break;
    }

    // ─── Dev Server management ───────────────────────

    case "startDevServer": {
      if (devServerManager) {
        devServerManager.start(rootDir);
      }
      break;
    }

    case "stopDevServer": {
      if (devServerManager) {
        devServerManager.stop();
      }
      break;
    }

    case "restartDevServer": {
      if (devServerManager) {
        devServerManager.restart(rootDir);
      }
      break;
    }

    case "getTerminalBuffer": {
      if (devServerManager) {
        const logs = devServerManager.getTerminalBuffer();
        ws.send(JSON.stringify(createMessage("terminalBuffer", { logs })));
      }
      break;
    }

    case "setDevPort": {
      if (devServerManager) {
        const port = payload.port as number | null;
        devServerManager.setUserPort(port);
      }
      break;
    }

    case "getDevPort": {
      if (devServerManager) {
        const port = devServerManager.getUserPort();
        ws.send(JSON.stringify(createMessage("devPort", { port })));
      }
      break;
    }

    case "getDevServerUrl": {
      if (devServerManager) {
        const url = devServerManager.getDevServerUrl();
        ws.send(JSON.stringify(createMessage("devServerUrl", { url })));
      }
      break;
    }
  }
}

// Dev server port detection
async function detectDevServer(rootDir: string): Promise<{ url: string; framework: string } | null> {
  // Detect framework from package.json
  const framework = detectFramework(rootDir);

  for (const port of COMMON_DEV_PORTS) {
    const isOpen = await checkPort(port);
    if (isOpen) {
      return { url: `http://localhost:${port}`, framework };
    }
  }

  return null;
}

export function detectFramework(rootDir: string): string {
  try {
    const pkgPath = path.join(rootDir, "package.json");
    if (!fs.existsSync(pkgPath)) return "unknown";

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps["next"]) return "nextjs";
    if (deps["vite"]) return "vite";
    if (deps["react-scripts"]) return "cra";
    if (deps["@angular/core"]) return "angular";
    if (deps["vue"]) return "vue";
    if (deps["svelte"]) return "svelte";
    if (deps["astro"]) return "astro";

    return "unknown";
  } catch {
    return "unknown";
  }
}

export function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(300);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}
