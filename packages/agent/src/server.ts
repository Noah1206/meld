import * as fs from "node:fs";
import * as net from "node:net";
import * as path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import { scanProject } from "./scanner.js";
import { createWatcher } from "./watcher.js";
import { createMessage, parseMessage } from "./protocol.js";

interface ServerOptions {
  port: number;
  rootDir: string;
}

// Common dev server ports
const COMMON_DEV_PORTS = [3000, 5173, 5174, 8080, 4200, 4321, 8000];

export function startServer({ port, rootDir }: ServerOptions) {
  const projectName = path.basename(rootDir);
  const wss = new WebSocketServer({ port });
  let activeClient: WebSocket | null = null;

  console.log(`\n  ⚡ FigmaCodeBridge Agent`);
  console.log(`  📁 Project: ${rootDir}`);
  console.log(`  🔗 WebSocket: ws://localhost:${port}`);
  console.log(`  → Connect from web app: https://meld-psi.vercel.app/project/local?agent=ws://localhost:${port}`);
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

      handleMessage(ws, msg, rootDir);
    });

    ws.on("close", () => {
      console.log("  ❌ Web app disconnected");
      activeClient = null;
    });
  });

  // Cleanup
  const cleanup = () => {
    watcher.close();
    wss.close();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  return wss;
}

function handleMessage(ws: WebSocket, msg: ReturnType<typeof parseMessage>, rootDir: string) {
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
