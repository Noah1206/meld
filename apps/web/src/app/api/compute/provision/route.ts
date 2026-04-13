import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "e2b";

// ─── E2B Sandbox Provisioning ──────────
// 150ms boot → agent install → WebSocket server start → URL return

const E2B_API_KEY = process.env.E2B_API_KEY;

// Active sandboxes per user
const activeSandboxes = new Map<string, {
  sandboxId: string;
  wsUrl: string;
  previewUrl: string;
  createdAt: number;
}>();

export async function POST(req: NextRequest) {
  if (!E2B_API_KEY) {
    return NextResponse.json({ error: "E2B_API_KEY not configured. Add it to .env.local" }, { status: 503 });
  }

  const body = await req.json();
  const { action, userId, command } = body;

  switch (action) {
    case "start": {
      // Reuse existing sandbox
      const existing = activeSandboxes.get(userId || "default");
      if (existing) {
        return NextResponse.json({
          status: "running",
          ...existing,
        });
      }

      try {
        // Create sandbox with custom template (Node.js + pnpm + Playwright pre-installed)
        const sandbox = await Sandbox.create("meld-agent", {
          apiKey: E2B_API_KEY,
          timeoutMs: 15 * 60 * 1000, // 15 min
        });

        console.log("[E2B] Sandbox created:", sandbox.sandboxId);

        // Ensure project directory exists
        await sandbox.commands.run("mkdir -p /home/user/project", { timeoutMs: 5000 });

        // Upload and start the Meld agent
        // For now, install from npm (in production, upload built package)
        await sandbox.commands.run(
          "cd /home/user/project && npm init -y && npm install ws",
          { timeoutMs: 60000 }
        ).catch(() => {});

        // Create a minimal agent server that accepts WebSocket connections
        await sandbox.files.write("/home/user/project/agent-server.js", getAgentServerScript());

        // Start the agent WebSocket server
        await sandbox.commands.run(
          "cd /home/user/project && node agent-server.js &",
          { timeoutMs: 10000 }
        ).catch(() => {});

        // Get URLs
        const wsHost = sandbox.getHost(3100);
        const previewHost = sandbox.getHost(3000);

        const info = {
          sandboxId: sandbox.sandboxId,
          wsUrl: `wss://${wsHost}`,
          previewUrl: `https://${previewHost}`,
          createdAt: Date.now(),
        };

        activeSandboxes.set(userId || "default", info);

        // If there's an initial command, start building
        if (command) {
          // The browser will connect via WebSocket and send the command
          console.log("[E2B] Ready for command:", command);
        }

        return NextResponse.json({
          status: "running",
          ...info,
          message: "Sandbox ready. Connect via WebSocket to start building.",
        });

      } catch (err) {
        console.error("[E2B] Error:", err);
        return NextResponse.json({
          error: `Sandbox creation failed: ${err instanceof Error ? err.message : "Unknown"}`,
        }, { status: 500 });
      }
    }

    case "stop": {
      const key = userId || "default";
      const info = activeSandboxes.get(key);
      if (info) {
        try {
          await Sandbox.kill(info.sandboxId, { apiKey: E2B_API_KEY });
        } catch { /* ignore */ }
        activeSandboxes.delete(key);
      }
      return NextResponse.json({ status: "stopped" });
    }

    case "status": {
      const key = userId || "default";
      const info = activeSandboxes.get(key);
      if (!info) return NextResponse.json({ status: "none" });
      return NextResponse.json({
        status: "running",
        ...info,
        uptimeSeconds: Math.round((Date.now() - info.createdAt) / 1000),
      });
    }

    default:
      return NextResponse.json({ error: "Unknown action. Use: start, stop, status" }, { status: 400 });
  }
}

// Minimal agent server script that runs inside the E2B sandbox
function getAgentServerScript(): string {
  return `
const { WebSocketServer } = require("ws");
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = 3100;
const PROJECT_DIR = "/home/user/project";

const wss = new WebSocketServer({ port: PORT });
console.log("[Agent] WebSocket server on port " + PORT);

wss.on("connection", (ws) => {
  console.log("[Agent] Client connected");

  ws.send(JSON.stringify({
    type: "connected",
    payload: { projectPath: PROJECT_DIR, projectName: "project" }
  }));

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleMessage(ws, msg);
    } catch (e) {
      console.error("[Agent] Parse error:", e);
    }
  });

  ws.on("close", () => console.log("[Agent] Client disconnected"));
});

function handleMessage(ws, msg) {
  const send = (type, payload) => ws.send(JSON.stringify({ type, payload }));

  switch (msg.type) {
    case "readFile": {
      const fullPath = path.resolve(PROJECT_DIR, msg.payload.path);
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        send("fileContent", { path: msg.payload.path, content });
      } catch (e) {
        send("fileContent", { path: msg.payload.path, content: "", error: e.message });
      }
      break;
    }

    case "writeFile": {
      const fullPath = path.resolve(PROJECT_DIR, msg.payload.path);
      try {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, msg.payload.content, "utf-8");
        send("writeResult", { path: msg.payload.path, success: true });
      } catch (e) {
        send("writeResult", { path: msg.payload.path, success: false, error: e.message });
      }
      break;
    }

    case "getFileTree": {
      try {
        const files = getFileTree(PROJECT_DIR, PROJECT_DIR);
        send("fileTree", { files });
      } catch (e) {
        send("fileTree", { files: [] });
      }
      break;
    }

    case "startAgent": {
      // Forward to the full agent loop (packages/agent)
      // For now, send a message that agent is starting
      send("agentEvent", { type: "thinking", content: "Starting agent..." });

      // The actual agent loop would be started here
      // For MVP: use the Claude API directly from the sandbox
      send("agentEvent", { type: "message", content: "Agent ready. Full agent loop requires packages/agent to be installed." });
      break;
    }

    case "startDevServer": {
      try {
        const proc = spawn("npm", ["run", "dev"], { cwd: PROJECT_DIR, env: { ...process.env, PORT: "3000" } });
        proc.stdout.on("data", (d) => send("terminalOutput", { data: d.toString() }));
        proc.stderr.on("data", (d) => send("terminalOutput", { data: d.toString() }));
        send("devServer", { url: "http://localhost:3000", framework: "unknown" });
      } catch (e) {
        send("terminalOutput", { data: "Dev server failed: " + e.message });
      }
      break;
    }

    default:
      console.log("[Agent] Unknown message type:", msg.type);
  }
}

function getFileTree(dir, rootDir, depth = 0) {
  if (depth > 3) return [];
  const entries = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item === "node_modules" || item === ".git" || item === ".next") continue;
      const fullPath = path.join(dir, item);
      const relPath = path.relative(rootDir, fullPath);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        entries.push({ name: item, path: relPath, type: "directory", children: getFileTree(fullPath, rootDir, depth + 1) });
      } else {
        entries.push({ name: item, path: relPath, type: "file" });
      }
    }
  } catch {}
  return entries;
}
`;
}
