import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "e2b";
import { pushEvent, markComplete } from "./events/route";

// ─── Server-Side Agent Loop with E2B ──────────
// POST starts the agent. GET /events?session=xxx polls for events.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const E2B_API_KEY = process.env.E2B_API_KEY;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API keys not configured" }, { status: 503 });
  }
  if (!E2B_API_KEY) {
    return NextResponse.json({ error: "E2B API key not configured" }, { status: 503 });
  }

  const { command, context } = await req.json();
  if (!command) {
    return NextResponse.json({ error: "command required" }, { status: 400 });
  }

  const sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Start agent loop in background (non-blocking)
  runAgentLoop(sessionId, command, context).catch((err) => {
    console.error("[agent-run] Loop error:", err);
    pushEvent(sessionId, { type: "error", message: err instanceof Error ? err.message : "Unknown error" });
    markComplete(sessionId);
  });

  return NextResponse.json({ sessionId, status: "started" });
}

// ─── Dev Server Detection ───
const DEV_SERVER_PATTERNS = [
  /https?:\/\/localhost:(\d+)/,
  /https?:\/\/127\.0\.0\.1:(\d+)/,
  /https?:\/\/0\.0\.0\.0:(\d+)/,
  /Local:\s+https?:\/\/[^:]+:(\d+)/,
  /ready on\s+https?:\/\/[^:]+:(\d+)/i,
  /listening on[:\s]+(\d+)/i,
  /started.*(?:port|:)\s*(\d+)/i,
];

function detectDevServerPort(output: string): number | null {
  for (const pattern of DEV_SERVER_PATTERNS) {
    const match = output.match(pattern);
    if (match?.[1]) return parseInt(match[1], 10);
  }
  return null;
}

// ─── Agent Loop (runs in background) ───
async function runAgentLoop(sessionId: string, command: string, context?: Record<string, unknown>) {
  const send = (event: Record<string, unknown>) => {
    pushEvent(sessionId, { ...event, _timestamp: Date.now() });
  };

  let sandbox: Sandbox | null = null;
  let devServerDetected = false;

  try {
    send({ type: "thinking", content: "Starting virtual environment..." });
    sandbox = await Sandbox.create("meld-agent", {
      apiKey: E2B_API_KEY!,
      timeoutMs: 30 * 60 * 1000, // 30 min
    });
    send({ type: "thinking", content: "Virtual environment ready" });

    await sandbox.commands.run("mkdir -p /home/user/project", { timeoutMs: 5000 });

    send({ type: "thinking", content: "Analyzing your request..." });

    const systemPrompt = buildSystemPrompt(context);
    const messages: Array<{ role: string; content: unknown }> = [
      { role: "user", content: command },
    ];
    const tools = getTools();
    let round = 0;
    const maxRounds = 50;

    while (round < maxRounds) {
      round++;

      const compressed = compressMessages(messages);
      const response = await callClaude(systemPrompt, compressed, tools);
      const assistantContent = response.content;
      messages.push({ role: "assistant", content: assistantContent });

      for (const block of assistantContent) {
        if (block.type === "text" && block.text) {
          send({ type: "message", content: block.text });
        }
      }

      if (response.stop_reason === "end_turn") {
        send({ type: "done", summary: "Completed" });
        break;
      }

      if (response.stop_reason === "tool_use") {
        const toolCalls = assistantContent.filter((b: { type: string }) => b.type === "tool_use");
        const toolNames = toolCalls.map((b: { name: string }) => b.name).join(", ");
        send({ type: "thinking", content: `Executing: ${toolNames}` });

        const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean }> = [];

        for (const block of assistantContent) {
          if (block.type !== "tool_use") continue;
          const { id, name, input } = block;
          send({ type: "tool_call", toolName: name, input });

          const result = await executeTool(sandbox!, name, input, send, () => devServerDetected, (v: boolean) => { devServerDetected = v; });
          send({ type: "tool_result", toolName: name, result: result.text.slice(0, 500) });

          // Generous truncation — keep more context for the AI
          const maxLen = name === "read_file" ? 10000 : name === "run_command" ? 8000 : 5000;
          const truncated = result.text.length > maxLen
            ? result.text.slice(0, maxLen) + `\n...[truncated, ${result.text.length - maxLen} chars omitted]`
            : result.text;

          toolResults.push({ type: "tool_result", tool_use_id: id, content: truncated, is_error: result.isError });
        }

        messages.push({ role: "user", content: toolResults });
      }
    }
  } catch (err) {
    send({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
  } finally {
    markComplete(sessionId);
    // Don't kill sandbox if dev server is running — let E2B timeout handle cleanup
    if (sandbox && !devServerDetected) {
      try { await Sandbox.kill(sandbox.sandboxId, { apiKey: E2B_API_KEY! }); } catch {}
    }
  }
}

// ─── Execute tool in E2B ───
async function executeTool(sandbox: Sandbox, toolName: string, input: Record<string, unknown>, send: (e: Record<string, unknown>) => void, getDevDetected: () => boolean, setDevDetected: (v: boolean) => void): Promise<{ text: string; isError: boolean }> {
  const P = "/home/user/project";

  switch (toolName) {
    case "read_file": {
      const p = String(input.path ?? "");
      try {
        const content = await sandbox.files.read(`${P}/${p}`);
        send({ type: "file_read", filePath: p });
        return { text: content, isError: false };
      } catch { return { text: `File not found: ${p}`, isError: true }; }
    }
    case "write_file": {
      const p = String(input.path ?? "");
      const c = String(input.content ?? "");
      try {
        const dir = p.split("/").slice(0, -1).join("/");
        if (dir) await sandbox.commands.run(`mkdir -p ${P}/${dir}`, { timeoutMs: 5000 }).catch(() => {});
        await sandbox.files.write(`${P}/${p}`, c);
        send({ type: "file_edit_auto", filePath: p, explanation: String(input.explanation ?? "File created") });
        return { text: `Written: ${p}`, isError: false };
      } catch (e) { return { text: `Write failed: ${e instanceof Error ? e.message : ""}`, isError: true }; }
    }
    case "delete_file": {
      const p = String(input.path ?? "");
      try {
        await sandbox.commands.run(`rm -rf ${P}/${p}`, { timeoutMs: 5000 });
        send({ type: "file_delete", filePath: p });
        return { text: `Deleted: ${p}`, isError: false };
      } catch (e) { return { text: `Delete failed: ${e instanceof Error ? e.message : ""}`, isError: true }; }
    }
    case "rename_file": {
      const from = String(input.from ?? "");
      const to = String(input.to ?? "");
      try {
        const toDir = to.split("/").slice(0, -1).join("/");
        if (toDir) await sandbox.commands.run(`mkdir -p ${P}/${toDir}`, { timeoutMs: 5000 }).catch(() => {});
        await sandbox.commands.run(`mv ${P}/${from} ${P}/${to}`, { timeoutMs: 5000 });
        send({ type: "file_rename", from, to });
        return { text: `Renamed: ${from} → ${to}`, isError: false };
      } catch (e) { return { text: `Rename failed: ${e instanceof Error ? e.message : ""}`, isError: true }; }
    }
    case "list_files": {
      const dir = String(input.directory ?? "");
      const depth = Number(input.maxDepth ?? 10);
      try {
        const r = await sandbox.commands.run(`find ${P}/${dir} -maxdepth ${depth} -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | head -500`, { timeoutMs: 15000 });
        return { text: r.stdout || "(empty)", isError: false };
      } catch { return { text: "list failed", isError: true }; }
    }
    case "search_files": {
      const q = String(input.query ?? "");
      const ext = String(input.fileExtensions ?? "");
      try {
        // Search all file types by default, or specific extensions if provided
        const includeFlags = ext
          ? ext.split(",").map((e: string) => `--include="*.${e.trim()}"`).join(" ")
          : "";
        const r = await sandbox.commands.run(`grep -r "${q}" ${P} ${includeFlags} -l 2>/dev/null | head -50`, { timeoutMs: 15000 });
        return { text: r.stdout || "No matches", isError: false };
      } catch { return { text: "search failed", isError: true }; }
    }
    case "run_command": {
      const cmd = String(input.command ?? "");
      send({ type: "command_start", command: cmd });

      // Dev server commands are long-running — run in background
      const isDevServer = /\b(dev|start|serve)\b/.test(cmd) && /\b(npm|pnpm|npx|yarn|node)\b/.test(cmd);

      try {
        if (isDevServer) {
          sandbox.commands.run(`cd ${P} && ${cmd}`, {
            timeoutMs: 300000, // 5 min
            onStdout: (data) => {
              const text = data.toString();
              send({ type: "command_output", stream: "stdout", data: text });
              const port = detectDevServerPort(text);
              if (port && !getDevDetected()) {
                setDevDetected(true);
                const publicHost = sandbox.getHost(port);
                send({ type: "devServer", url: `https://${publicHost}`, port, framework: "auto-detected" });
              }
            },
            onStderr: (data) => {
              const text = data.toString();
              send({ type: "command_output", stream: "stderr", data: text });
              const port = detectDevServerPort(text);
              if (port && !getDevDetected()) {
                setDevDetected(true);
                const publicHost = sandbox.getHost(port);
                send({ type: "devServer", url: `https://${publicHost}`, port, framework: "auto-detected" });
              }
            },
          }).catch(() => {});

          await new Promise(r => setTimeout(r, 5000));
          send({ type: "command_done", command: cmd, exitCode: 0 });
          return { text: `Dev server started in background: ${cmd}`, isError: false };
        }

        // Normal command
        const r = await sandbox.commands.run(`cd ${P} && ${cmd}`, {
          timeoutMs: 300000, // 5 min per command
          onStdout: (data) => send({ type: "command_output", stream: "stdout", data: data.toString() }),
          onStderr: (data) => send({ type: "command_output", stream: "stderr", data: data.toString() }),
        });
        send({ type: "command_done", command: cmd, exitCode: r.exitCode });
        return { text: (r.stdout || "") + (r.stderr || "") || "(no output)", isError: r.exitCode !== 0 };
      } catch (e) { return { text: `Failed: ${e instanceof Error ? e.message : ""}`, isError: true }; }
    }
    case "web_search": {
      const q = String(input.query ?? "");
      try {
        const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9090";
        const r = await fetch(`${url}/api/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, maxResults: 5 }), signal: AbortSignal.timeout(15000) });
        const d = await r.json();
        return { text: (d.results ?? []).map((x: { title: string; url: string; snippet: string }, i: number) => `[${i+1}] ${x.title}\n${x.url}\n${x.snippet}`).join("\n\n") || "No results", isError: false };
      } catch { return { text: "Search failed", isError: true }; }
    }
    case "browse_url": {
      const targetUrl = String(input.url ?? "");
      try {
        const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9090";
        const r = await fetch(`${url}/api/browse`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: targetUrl }), signal: AbortSignal.timeout(30000) });
        const d = await r.json();
        return { text: d.content ?? d.text ?? "No content", isError: false };
      } catch { return { text: "Browse failed", isError: true }; }
    }
    default: return { text: `Unknown tool: ${toolName}`, isError: false };
  }
}

// Compress old messages — summarize old rounds, keep recent ones intact
function compressMessages(messages: Array<{ role: string; content: unknown }>): Array<{ role: string; content: unknown }> {
  if (messages.length <= 20) return messages;

  let keepFrom = messages.length - 14;
  if (keepFrom < 3) return messages;

  while (keepFrom < messages.length - 4) {
    const msg = messages[keepFrom];
    const next = messages[keepFrom + 1];
    if (msg?.role === "user" && next?.role === "assistant") {
      keepFrom = keepFrom + 1;
      break;
    }
    keepFrom++;
  }

  if (keepFrom >= messages.length - 4) return messages;

  const first = messages[0];
  const recent = messages.slice(keepFrom);
  const omitted = keepFrom - 1;
  const summary: { role: string; content: unknown }[] = [
    { role: "assistant", content: [{ type: "text", text: `[I completed ${Math.floor(omitted / 2)} earlier steps. Continuing with the current task.]` }] },
    { role: "user", content: "Continue." },
  ];

  return [first, ...summary, ...recent];
}

async function callClaude(system: string, messages: unknown[], tools: unknown[]) {
  const maxRetries = 3;

  const systemWithCache = [{
    type: "text",
    text: system,
    cache_control: { type: "ephemeral" },
  }];

  const toolsWithCache = tools.map((tool, i) =>
    i === tools.length - 1
      ? { ...(tool as Record<string, unknown>), cache_control: { type: "ephemeral" } }
      : tool
  );

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16384,
        system: systemWithCache,
        messages,
        tools: toolsWithCache,
      }),
    });

    if (res.ok) return res.json();

    const raw = await res.text();

    if ((res.status === 529 || res.status === 429) && attempt < maxRetries - 1) {
      const wait = (attempt + 1) * 3000;
      await new Promise(r => setTimeout(r, wait));
      continue;
    }

    let msg = `Claude API error (${res.status})`;
    try {
      const parsed = JSON.parse(raw);
      msg = parsed?.error?.message || msg;
    } catch { /* use default */ }
    if (res.status === 529) msg = "Claude is currently overloaded. Please try again in a moment.";
    if (res.status === 429) msg = "Rate limit exceeded. Please wait a moment and try again.";
    throw new Error(msg);
  }
  throw new Error("Max retries exceeded");
}

function buildSystemPrompt(ctx?: Record<string, unknown>) {
  return `You are Meld AI — a fully autonomous coding agent running in an E2B cloud sandbox at /home/user/project.

You have COMPLETE freedom to:
- Create, read, write, delete, rename ANY file
- Run ANY shell command (npm, git, curl, python, etc.)
- Install ANY package or dependency
- Start dev servers, build projects, run tests
- Search the web for documentation or solutions
- Browse URLs for reference

WORKFLOW:
1. Understand the request
2. Plan the implementation
3. Create all necessary files (complete, production-ready code — NO placeholders)
4. Install dependencies (npm install / pnpm install)
5. Start the dev server (npm run dev / pnpm dev)
6. Verify the result

RULES:
- Write COMPLETE files — never use "// TODO" or "..." placeholders
- Always install dependencies before starting dev server
- Always start the dev server after building so the user sees a live preview
- If something fails, debug and fix it autonomously — don't ask the user
- Be thorough in code, concise in explanations

Respond in ${ctx?.lang === "ko" ? "Korean" : "English"}.${ctx?.framework ? ` Framework: ${ctx.framework}.` : ""}${ctx?.category ? ` Category: ${ctx.category}.` : ""}`;
}

function getTools() {
  return [
    { name: "read_file", description: "Read a file's contents", input_schema: { type: "object", properties: { path: { type: "string", description: "Relative path from project root" } }, required: ["path"] } },
    { name: "write_file", description: "Create or overwrite a file with complete content", input_schema: { type: "object", properties: { path: { type: "string", description: "Relative path from project root" }, content: { type: "string", description: "Complete file content" }, explanation: { type: "string", description: "Brief explanation of changes" } }, required: ["path", "content"] } },
    { name: "delete_file", description: "Delete a file or directory", input_schema: { type: "object", properties: { path: { type: "string", description: "Relative path to delete" } }, required: ["path"] } },
    { name: "rename_file", description: "Rename or move a file", input_schema: { type: "object", properties: { from: { type: "string", description: "Current path" }, to: { type: "string", description: "New path" } }, required: ["from", "to"] } },
    { name: "list_files", description: "List files and directories in the project", input_schema: { type: "object", properties: { directory: { type: "string", description: "Subdirectory to list (empty for root)" }, maxDepth: { type: "number", description: "Max directory depth (default 10)" } } } },
    { name: "search_files", description: "Search for text across all project files", input_schema: { type: "object", properties: { query: { type: "string", description: "Text or regex to search for" }, fileExtensions: { type: "string", description: "Comma-separated extensions to filter (e.g. 'ts,tsx,css'). Empty = all files" } }, required: ["query"] } },
    { name: "run_command", description: "Run any shell command (npm, git, curl, python, etc.)", input_schema: { type: "object", properties: { command: { type: "string", description: "Shell command to execute" } }, required: ["command"] } },
    { name: "web_search", description: "Search the web for documentation, examples, or solutions", input_schema: { type: "object", properties: { query: { type: "string", description: "Search query" } }, required: ["query"] } },
    { name: "browse_url", description: "Fetch and read content from a URL", input_schema: { type: "object", properties: { url: { type: "string", description: "URL to browse" } }, required: ["url"] } },
  ];
}
