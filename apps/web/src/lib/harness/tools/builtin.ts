// Built-in tools
//
// The 9 core tools the harness ships with. Each is a plain object implementing
// the Tool interface — tool.execute(ctx, input) is the only entry point.
// None of these tools know about E2B, the event bus, or the session layer —
// they only touch the ToolExecutionContext.
//
// Tool *schemas* (name, description, input_schema) live in the shared
// module @/lib/agent/tools/schemas so the workspace single-loop and the
// harness pipeline advertise the SAME wire-format tools to Claude.

import type { Tool, ToolExecutionResult } from "../types";
import {
  READ_FILE_TOOL,
  WRITE_FILE_TOOL,
  DELETE_FILE_TOOL,
  RENAME_FILE_TOOL,
  LIST_FILES_TOOL,
  SEARCH_FILES_TOOL,
  RUN_COMMAND_TOOL,
  WEB_SEARCH_TOOL,
  BROWSE_URL_TOOL,
} from "@/lib/agent/tools/schemas";

// ─── Dev server detection (from legacy route.ts) ──────
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

// ─── Tool: read_file ──────────────────────────────────
const readFileTool: Tool = {
  def: READ_FILE_TOOL,
  async execute(ctx, input): Promise<ToolExecutionResult> {
    const path = String(input.path ?? "");
    try {
      const content = await ctx.sandbox.readFile(path);
      ctx.emit({ type: "file_read", timestamp: Date.now(), filePath: path });
      return { text: content, isError: false };
    } catch {
      return { text: `File not found: ${path}`, isError: true };
    }
  },
};

// ─── Tool: write_file ─────────────────────────────────
const writeFileTool: Tool = {
  def: WRITE_FILE_TOOL,
  async execute(ctx, input): Promise<ToolExecutionResult> {
    const path = String(input.path ?? "");
    const content = String(input.content ?? "");
    const explanation = String(input.explanation ?? "File created");
    try {
      await ctx.sandbox.writeFile(path, content);
      ctx.emit({ type: "file_write", timestamp: Date.now(), filePath: path, explanation });
      return { text: `Written: ${path}`, isError: false };
    } catch (e) {
      return {
        text: `Write failed: ${e instanceof Error ? e.message : ""}`,
        isError: true,
      };
    }
  },
};

// ─── Tool: delete_file ────────────────────────────────
const deleteFileTool: Tool = {
  def: DELETE_FILE_TOOL,
  async execute(ctx, input): Promise<ToolExecutionResult> {
    const path = String(input.path ?? "");
    try {
      await ctx.sandbox.deleteFile(path);
      ctx.emit({ type: "file_delete", timestamp: Date.now(), filePath: path });
      return { text: `Deleted: ${path}`, isError: false };
    } catch (e) {
      return {
        text: `Delete failed: ${e instanceof Error ? e.message : ""}`,
        isError: true,
      };
    }
  },
};

// ─── Tool: rename_file ────────────────────────────────
const renameFileTool: Tool = {
  def: RENAME_FILE_TOOL,
  async execute(ctx, input): Promise<ToolExecutionResult> {
    const from = String(input.from ?? "");
    const to = String(input.to ?? "");
    try {
      await ctx.sandbox.exec(`mkdir -p $(dirname ${to}) && mv ${from} ${to}`, { timeoutMs: 5000 });
      return { text: `Renamed: ${from} → ${to}`, isError: false };
    } catch (e) {
      return {
        text: `Rename failed: ${e instanceof Error ? e.message : ""}`,
        isError: true,
      };
    }
  },
};

// ─── Tool: list_files ─────────────────────────────────
const listFilesTool: Tool = {
  def: LIST_FILES_TOOL,
  async execute(ctx, input): Promise<ToolExecutionResult> {
    const dir = String(input.directory ?? "");
    const depth = Number(input.maxDepth ?? 10);
    const findCmd = `find ${dir || "."} -maxdepth ${depth} -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | head -500`;
    try {
      const result = await ctx.sandbox.exec(findCmd, { timeoutMs: 15000 });
      return { text: result.stdout || "(empty)", isError: false };
    } catch {
      return { text: "list failed", isError: true };
    }
  },
};

// ─── Tool: search_files ───────────────────────────────
const searchFilesTool: Tool = {
  def: SEARCH_FILES_TOOL,
  async execute(ctx, input): Promise<ToolExecutionResult> {
    const query = String(input.query ?? "");
    const ext = String(input.fileExtensions ?? "");
    const includeFlags = ext
      ? ext
          .split(",")
          .map(e => `--include="*.${e.trim()}"`)
          .join(" ")
      : "";
    try {
      const result = await ctx.sandbox.exec(
        `grep -r "${query}" . ${includeFlags} -l 2>/dev/null | head -50`,
        { timeoutMs: 15000 }
      );
      return { text: result.stdout || "No matches", isError: false };
    } catch {
      return { text: "search failed", isError: true };
    }
  },
};

// ─── Tool: run_command ────────────────────────────────
const runCommandTool: Tool = {
  def: RUN_COMMAND_TOOL,
  async execute(ctx, input): Promise<ToolExecutionResult> {
    const command = String(input.command ?? "");
    const isDevServer = /\b(dev|start|serve)\b/.test(command) && /\b(npm|pnpm|npx|yarn|node)\b/.test(command);

    const streamWithDetection = (chunk: string, stream: "stdout" | "stderr") => {
      ctx.emit({ type: "command_output", timestamp: Date.now(), stream, data: chunk });
      const port = detectDevServerPort(chunk);
      if (port) {
        const url = ctx.sandbox.getPublicUrl(port);
        ctx.emit({
          type: "dev_server_detected",
          timestamp: Date.now(),
          url,
          port,
          framework: "auto-detected",
        });
      }
    };

    try {
      if (isDevServer) {
        await ctx.sandbox.exec(command, {
          background: true,
          timeoutMs: 300000,
          onStdout: chunk => streamWithDetection(chunk, "stdout"),
          onStderr: chunk => streamWithDetection(chunk, "stderr"),
        });
        return { text: `Dev server started in background: ${command}`, isError: false };
      }

      const result = await ctx.sandbox.exec(command, {
        timeoutMs: 300000,
        onStdout: chunk => streamWithDetection(chunk, "stdout"),
        onStderr: chunk => streamWithDetection(chunk, "stderr"),
      });
      return {
        text: (result.stdout || "") + (result.stderr || "") || "(no output)",
        isError: result.exitCode !== 0,
      };
    } catch (e) {
      return {
        text: `Failed: ${e instanceof Error ? e.message : ""}`,
        isError: true,
      };
    }
  },
};

// ─── Tool: web_search ─────────────────────────────────
const webSearchTool: Tool = {
  def: WEB_SEARCH_TOOL,
  async execute(_ctx, input): Promise<ToolExecutionResult> {
    const query = String(input.query ?? "");
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9090";
      const res = await fetch(`${base}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, maxResults: 5 }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      type SearchHit = { title: string; url: string; snippet: string };
      const results = (data.results ?? []) as SearchHit[];
      return {
        text:
          results.map((x, i) => `[${i + 1}] ${x.title}\n${x.url}\n${x.snippet}`).join("\n\n") ||
          "No results",
        isError: false,
      };
    } catch {
      return { text: "Search failed", isError: true };
    }
  },
};

// ─── Tool: browse_url ─────────────────────────────────
const browseUrlTool: Tool = {
  def: BROWSE_URL_TOOL,
  async execute(ctx, input): Promise<ToolExecutionResult> {
    const targetUrl = String(input.url ?? "");
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9090";
      const res = await fetch(`${base}/api/browse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (data.screenshot) {
        ctx.emit({
          type: "tool_result",
          timestamp: Date.now(),
          toolName: "browse_url",
          screenshot: data.screenshot,
          url: targetUrl,
          title: data.title ?? "",
        });
      }
      const body = data.markdown ?? data.content ?? data.text ?? "";
      const vision = data.visionAnalysis ? `\n\n---\n**Vision analysis:**\n${data.visionAnalysis}` : "";
      return {
        text: body + vision || "No content",
        isError: false,
        artifact: data.screenshot
          ? { screenshot: data.screenshot, title: data.title, url: targetUrl }
          : undefined,
      };
    } catch {
      return { text: "Browse failed", isError: true };
    }
  },
};

// ─── Export ───────────────────────────────────────────
export const BUILTIN_TOOLS: Tool[] = [
  readFileTool,
  writeFileTool,
  deleteFileTool,
  renameFileTool,
  listFilesTool,
  searchFilesTool,
  runCommandTool,
  webSearchTool,
  browseUrlTool,
];

export {
  readFileTool,
  writeFileTool,
  deleteFileTool,
  renameFileTool,
  listFilesTool,
  searchFilesTool,
  runCommandTool,
  webSearchTool,
  browseUrlTool,
};
