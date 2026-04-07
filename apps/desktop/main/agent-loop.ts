import * as fs from "node:fs";
import * as path from "node:path";
import * as childProcess from "node:child_process";
import type { AgentEvent, AgentLoopInput, AgentTool } from "@figma-code-bridge/shared";
import { AGENT_TOOLS } from "@figma-code-bridge/shared";
import { analyzeCodePatterns } from "./code-patterns";

// ─── Agent Loop: Autonomous coding agent based on Claude tool_use ──

// Per-session backup data (original file contents)
interface BackupData {
  sessionId: string;
  rootDir: string;
  createdAt: string;
  files: Record<string, string | null>; // filePath → originalContent (null = new file)
}

// Backup store (persists even on session errors)
const backupStore = new Map<string, BackupData>();

/** Roll back all files in the current session to their original state */
export async function rollbackSession(sessionId?: string): Promise<{ rolledBack: string[]; errors: string[] }> {
  const targetId = sessionId ?? Array.from(backupStore.keys()).pop();
  if (!targetId) return { rolledBack: [], errors: [] };

  const backup = backupStore.get(targetId);
  if (!backup) return { rolledBack: [], errors: [] };

  const rolledBack: string[] = [];
  const errors: string[] = [];

  for (const [relPath, originalContent] of Object.entries(backup.files)) {
    const fullPath = path.resolve(backup.rootDir, relPath);
    try {
      if (originalContent === null) {
        // Newly created file → delete
        await fs.promises.unlink(fullPath);
      } else {
        // Existing file → restore to original
        await fs.promises.writeFile(fullPath, originalContent, "utf-8");
      }
      rolledBack.push(relPath);
    } catch (err) {
      errors.push(`${relPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Clean up backup
  backupStore.delete(targetId);

  // Clean up disk backup file as well
  const backupFilePath = path.join(backup.rootDir, ".meld", "backups", `${targetId}.json`);
  try { await fs.promises.unlink(backupFilePath); } catch { /* ignore if not found */ }

  return { rolledBack, errors };
}

/** Return list of active session IDs */
export function getBackupSessionIds(): string[] {
  return Array.from(backupStore.keys());
}

interface AgentLoopConfig {
  apiKey: string;
  modelId: string;
  rootDir: string;
  input: AgentLoopInput;
  onEvent: (event: AgentEvent) => void;
  maxRounds?: number;
}

// write_file approval pending Promise resolver
type ApprovalResolver = (approved: boolean) => void;

// Session record data (persisted to disk)
export interface SessionRecord {
  sessionId: string;
  timestamp: string;
  command: string;
  modelId: string;
  duration: number; // ms
  status: "completed" | "error" | "cancelled";
  filesChanged: string[];
  filesRead: string[];
  toolCalls: number;
  errorMessage?: string;
  summary?: string;
}

/** Load recent session list from .meld/sessions/ directory */
export async function loadRecentSessions(rootDir: string, limit = 20): Promise<SessionRecord[]> {
  const sessionsDir = path.join(rootDir, ".meld", "sessions");
  try {
    const files = await fs.promises.readdir(sessionsDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse().slice(0, limit);
    const sessions: SessionRecord[] = [];
    for (const file of jsonFiles) {
      try {
        const content = await fs.promises.readFile(path.join(sessionsDir, file), "utf-8");
        sessions.push(JSON.parse(content));
      } catch { /* ignore corrupted files */ }
    }
    return sessions;
  } catch {
    return [];
  }
}

export class AgentLoop {
  private abortController = new AbortController();
  private messages: Array<{ role: string; content: unknown }> = [];
  private approvalResolvers = new Map<string, ApprovalResolver>();
  private config: Required<Pick<AgentLoopConfig, "maxRounds">> & AgentLoopConfig;
  readonly sessionId: string;
  private backupData: BackupData;
  private startTime = Date.now();
  private filesChanged = new Set<string>();
  private filesRead = new Set<string>();
  private toolCallCount = 0;

  // Code pattern analysis cache (per rootDir, reused across sessions)
  private static codePatternsCache = new Map<string, string>();

  constructor(config: AgentLoopConfig) {
    this.config = { maxRounds: 25, ...config };
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.backupData = {
      sessionId: this.sessionId,
      rootDir: config.rootDir,
      createdAt: new Date().toISOString(),
      files: {},
    };
    backupStore.set(this.sessionId, this.backupData);
  }

  // Approve/reject file edits from external caller
  approveEdit(toolCallId: string, approved: boolean) {
    const resolver = this.approvalResolvers.get(toolCallId);
    if (resolver) {
      resolver(approved);
      this.approvalResolvers.delete(toolCallId);
    }
  }

  cancel() {
    this.abortController.abort();
    this.emitRollbackAvailable();
    this.config.onEvent({ type: "cancelled" });
    this.saveSession("cancelled").catch(() => {});
  }

  async run() {
    const { apiKey, modelId, rootDir, input, onEvent, maxRounds } = this.config;

    // Build system prompt
    const systemPrompt = await this.buildSystemPrompt(input);

    // Initial user message
    this.messages.push({ role: "user", content: input.command });

    for (let round = 0; round < maxRounds; round++) {
      if (this.abortController.signal.aborted) return;

      try {
        // Call Claude API (tool_use)
        const response = await this.callClaude(apiKey, modelId, systemPrompt, this.messages);

        // Parse response
        const assistantContent = response.content;
        this.messages.push({ role: "assistant", content: assistantContent });

        // Process text blocks
        for (const block of assistantContent) {
          if (block.type === "text" && block.text) {
            onEvent({ type: "message", content: block.text });
          }
        }

        // Complete if stop_reason is end_turn
        if (response.stop_reason === "end_turn") {
          const summary = assistantContent
            .filter((b: { type: string }) => b.type === "text")
            .map((b: { text: string }) => b.text)
            .join("\n");
          onEvent({ type: "done", summary });
          await this.saveSession("completed", summary);
          return;
        }

        // Process tool_use blocks
        if (response.stop_reason === "tool_use") {
          const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean }> = [];

          for (const block of assistantContent) {
            if (block.type !== "tool_use") continue;
            if (this.abortController.signal.aborted) return;

            const { id: toolCallId, name: toolName, input: toolInput } = block;
            this.toolCallCount++;
            onEvent({ type: "tool_call", toolName, input: toolInput, toolCallId });

            const result = await this.executeTool(toolName, toolInput, rootDir, toolCallId);
            onEvent({ type: "tool_result", toolCallId, result: result.text, isError: result.isError });

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolCallId,
              content: result.text,
              is_error: result.isError,
            });
          }

          this.messages.push({ role: "user", content: toolResults });
        }
      } catch (err) {
        if (this.abortController.signal.aborted) return;
        const msg = err instanceof Error ? err.message : "Unknown error";
        this.emitRollbackAvailable();
        onEvent({ type: "error", message: msg });
        await this.saveSession("error", undefined, msg);
        return;
      }
    }

    this.emitRollbackAvailable();
    const maxMsg = `Agent reached max rounds (${maxRounds})`;
    onEvent({ type: "error", message: maxMsg });
    await this.saveSession("error", undefined, maxMsg);
  }

  // ─── Claude API call ──────────────────────────────

  private async callClaude(
    apiKey: string,
    modelId: string,
    systemPrompt: string,
    messages: Array<{ role: string; content: unknown }>,
  ) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 8192,
        system: systemPrompt,
        messages,
        tools: AGENT_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.input_schema,
        })),
      }),
      signal: this.abortController.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API error (${res.status}): ${errText}`);
    }

    return res.json();
  }

  // ─── Tool execution ────────────────────────────────────

  private async executeTool(
    toolName: string,
    input: Record<string, unknown>,
    rootDir: string,
    toolCallId: string,
  ): Promise<{ text: string; isError: boolean }> {
    const { onEvent } = this.config;

    switch (toolName) {
      case "read_file": {
        const relPath = String(input.path ?? "");
        const fullPath = path.resolve(rootDir, relPath);
        if (!fullPath.startsWith(rootDir)) {
          return { text: `Error: Cannot access "${relPath}" — it is outside the project directory.`, isError: true };
        }
        try {
          const content = await fs.promises.readFile(fullPath, "utf-8");
          const preview = content.length > 500 ? content.slice(0, 500) + "..." : content;
          this.filesRead.add(relPath);
          onEvent({ type: "file_read", filePath: relPath, preview });
          return { text: content, isError: false };
        } catch {
          return { text: `Error: File not found at "${relPath}". Check the path and try again.`, isError: true };
        }
      }

      case "write_file": {
        const relPath = String(input.path ?? "");
        const fullPath = path.resolve(rootDir, relPath);
        if (!fullPath.startsWith(rootDir)) {
          return { text: `Error: Cannot write to "${relPath}" — it is outside the project directory.`, isError: true };
        }
        const newContent = String(input.content ?? "");
        const explanation = String(input.explanation ?? "");

        // Read existing file (empty string if not found)
        let original = "";
        try { original = await fs.promises.readFile(fullPath, "utf-8"); } catch { /* new file */ }

        // Send diff to renderer + wait for approval
        onEvent({
          type: "file_edit",
          toolCallId,
          filePath: relPath,
          original,
          modified: newContent,
          explanation,
        });

        // Wait for approval
        const approved = await new Promise<boolean>((resolve) => {
          this.approvalResolvers.set(toolCallId, resolve);
          onEvent({ type: "awaiting_approval", editCount: this.approvalResolvers.size });
        });

        if (!approved) {
          return { text: "User rejected this edit.", isError: false };
        }

        // Backup: save original only on first edit (skip already backed-up files)
        if (!(relPath in this.backupData.files)) {
          this.backupData.files[relPath] = original === "" ? null : original;
          await this.persistBackupToDisk();
        }

        // Write file
        try {
          await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.promises.writeFile(fullPath, newContent, "utf-8");
          if (original === "") {
            onEvent({ type: "file_created", filePath: relPath });
          }
          this.filesChanged.add(relPath);
          return { text: `File written: ${relPath}`, isError: false };
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          if (reason.includes("EACCES") || reason.includes("permission")) {
            return { text: `Error: Permission denied writing to "${relPath}". Check file permissions.`, isError: true };
          }
          if (reason.includes("ENOSPC")) {
            return { text: `Error: Disk is full. Free up space and try again.`, isError: true };
          }
          return { text: `Error: Could not write to "${relPath}" — ${reason}`, isError: true };
        }
      }

      case "list_files": {
        const dir = String(input.directory ?? ".");
        const fullDir = path.resolve(rootDir, dir);
        if (!fullDir.startsWith(rootDir)) {
          return { text: `Error: Cannot list "${dir}" — it is outside the project directory.`, isError: true };
        }
        try {
          const entries = await this.listFilesRecursive(fullDir, rootDir, String(input.pattern ?? ""), 200);
          return { text: entries.join("\n"), isError: false };
        } catch (err) {
          return { text: `Error: Could not list directory "${dir}" — ${err instanceof Error ? err.message : err}`, isError: true };
        }
      }

      case "search_files": {
        const query = String(input.query ?? "");
        const glob = String(input.glob ?? "");
        const maxResults = Number(input.maxResults ?? 20);
        try {
          const results = this.searchFiles(rootDir, query, glob, maxResults);
          return { text: results || "No matches found.", isError: false };
        } catch (err) {
          return { text: `Error: ${err instanceof Error ? err.message : err}`, isError: true };
        }
      }

      case "run_command": {
        let command = String(input.command ?? "");

        // Pre-check: if command starts a dev server with a common port, swap it
        const portInCmd = command.match(/(?:--port|PORT=|-p)\s*(\d+)/);
        if (portInCmd) {
          const port = parseInt(portInCmd[1], 10);
          if (await this.isPortInUse(port)) {
            const freePort = await this.findFreePort();
            command = command.replace(portInCmd[0], portInCmd[0].replace(String(port), String(freePort)));
            onEvent({ type: "command_output", data: `[meld] Port ${port} is in use. Switching to ${freePort}\n` });
          }
        }

        // Pre-check: if command is npm start/dev without explicit port, inject PORT env
        if (/npm\s+(run\s+)?(start|dev)\b/.test(command) && !portInCmd) {
          const commonPorts = [3000, 3001, 5173, 8080, 8000];
          for (const p of commonPorts) {
            if (await this.isPortInUse(p)) {
              const freePort = await this.findFreePort();
              command = `PORT=${freePort} ${command}`;
              onEvent({ type: "command_output", data: `[meld] Common ports occupied. Using PORT=${freePort}\n` });
              break;
            }
          }
        }

        onEvent({ type: "command_start", command, cwd: rootDir });
        try {
          const result = await this.runCommand(command, rootDir, onEvent);
          onEvent({ type: "command_done", command, exitCode: result.exitCode });
          let output = result.output || "(no output)";
          // Post-check: if still a port conflict, suggest fix
          if (result.exitCode !== 0 || /EADDRINUSE|already in use|address already in use|Something is already running/i.test(output)) {
            const randomPort = 18000 + Math.floor(Math.random() * 10000);
            output += `\n\n[HINT: Port conflict detected. Update the package.json dev/start script to use port ${randomPort} (--port ${randomPort} or PORT=${randomPort}). NEVER use ports 3000, 5173, 8080, 9090.]`;
          }
          return { text: output, isError: result.exitCode !== 0 };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          onEvent({ type: "command_done", command, exitCode: 1 });
          return { text: `Command failed: ${msg}`, isError: true };
        }
      }

      default:
        return { text: `Unknown tool: ${toolName}`, isError: true };
    }
  }

  // ─── Session saving ──────────────────────────────────────

  /** Save session record to .meld/sessions/ */
  private async saveSession(status: SessionRecord["status"], summary?: string, errorMessage?: string): Promise<void> {
    try {
      const sessionsDir = path.join(this.config.rootDir, ".meld", "sessions");
      await fs.promises.mkdir(sessionsDir, { recursive: true });

      const record: SessionRecord = {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        command: this.config.input.command,
        modelId: this.config.modelId,
        duration: Date.now() - this.startTime,
        status,
        filesChanged: Array.from(this.filesChanged),
        filesRead: Array.from(this.filesRead),
        toolCalls: this.toolCallCount,
        ...(summary && { summary }),
        ...(errorMessage && { errorMessage }),
      };

      // Filename based on timestamp for sortable ordering
      const fileName = `${record.timestamp.replace(/[:.]/g, "-")}_${this.sessionId}.json`;
      await fs.promises.writeFile(
        path.join(sessionsDir, fileName),
        JSON.stringify(record, null, 2),
        "utf-8",
      );
    } catch {
      // Agent continues even if session save fails
    }
  }

  // ─── Backup utilities ───────────────────────────────────

  /** Save backup data to .meld/backups/{sessionId}.json */
  private async persistBackupToDisk(): Promise<void> {
    try {
      const backupDir = path.join(this.config.rootDir, ".meld", "backups");
      await fs.promises.mkdir(backupDir, { recursive: true });
      const filePath = path.join(backupDir, `${this.sessionId}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(this.backupData, null, 2), "utf-8");
    } catch {
      // Agent continues even if backup save fails
    }
  }

  /** Emit rollback available event if there are edited files */
  private emitRollbackAvailable(): void {
    const editedFiles = Object.keys(this.backupData.files);
    if (editedFiles.length > 0) {
      this.config.onEvent({
        type: "rollback_available",
        sessionId: this.sessionId,
        fileCount: editedFiles.length,
        files: editedFiles,
      } as AgentEvent);
    }
  }

  // ─── Utilities ─────────────────────────────────────

  private async listFilesRecursive(dir: string, rootDir: string, pattern: string, maxFiles: number): Promise<string[]> {
    const results: string[] = [];
    const IGNORE = new Set(["node_modules", ".git", ".next", "dist", "build", ".turbo", ".cache", ".meld"]);

    const walk = async (current: string) => {
      if (results.length >= maxFiles) return;
      const entries = await fs.promises.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxFiles) return;
        if (IGNORE.has(entry.name)) continue;
        const full = path.join(current, entry.name);
        const rel = path.relative(rootDir, full);
        if (entry.isDirectory()) {
          await walk(full);
        } else {
          if (!pattern || new RegExp(pattern.replace(/\*/g, ".*")).test(entry.name)) {
            results.push(rel);
          }
        }
      }
    };
    await walk(dir);
    return results.sort();
  }

  private searchFiles(rootDir: string, query: string, glob: string, maxResults: number): string {
    const args = ["-rn", "--max-count", String(maxResults)];
    if (glob) args.push("--include", glob);
    args.push("--", query, ".");

    const result = childProcess.spawnSync("grep", args, {
      cwd: rootDir,
      encoding: "utf-8",
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    });
    return (result.stdout ?? "").trim();
  }

  // Scan all listening ports on the system
  private getSystemPorts(): number[] {
    try {
      const { execSync } = require("node:child_process");
      const os = require("node:os");
      let output: string;
      if (os.platform() === "win32") {
        output = execSync("netstat -an | findstr LISTENING", { encoding: "utf-8", timeout: 3000 });
        const matches = output.matchAll(/:(\d+)\s/g);
        return [...new Set([...matches].map(m => parseInt(m[1], 10)).filter(p => p > 1024))];
      } else {
        // macOS / Linux
        output = execSync("lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null | awk '{print $9}'", { encoding: "utf-8", timeout: 3000 });
        const ports: number[] = [];
        for (const line of output.split("\n")) {
          const m = line.match(/:(\d+)$/);
          if (m) ports.push(parseInt(m[1], 10));
        }
        return [...new Set(ports)];
      }
    } catch {
      return [];
    }
  }

  private getBannedPortsList(): string {
    const banned = new Set([9090, 3000, 3001, 5173, 5174, 4200, 8080, 8000]);
    // Add all currently listening ports on the system
    for (const p of this.getSystemPorts()) banned.add(p);
    return Array.from(banned).filter(p => p > 1024).sort((a, b) => a - b).join(", ");
  }

  private isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require("node:net");
      const s = net.createServer();
      s.listen(port, () => { s.close(() => resolve(false)); });
      s.on("error", () => resolve(true));
    });
  }

  private async findFreePort(): Promise<number> {
    const systemPorts = new Set(this.getSystemPorts());
    const start = 18000 + Math.floor(Math.random() * 10000);
    for (let p = start; p < start + 200; p++) {
      if (systemPorts.has(p)) continue;
      const inUse = await this.isPortInUse(p);
      if (!inUse) return p;
    }
    return start;
  }

  private runCommand(command: string, cwd: string, onEvent: (e: AgentEvent) => void): Promise<{ output: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const proc = childProcess.spawn("sh", ["-c", command], {
        cwd,
        env: { ...process.env, FORCE_COLOR: "0" },
        timeout: 60000,
      });

      let output = "";
      proc.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        output += text;
        onEvent({ type: "command_output", data: text });
      });
      proc.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        output += text;
        onEvent({ type: "command_output", data: text });
      });
      proc.on("close", (code) => resolve({ output, exitCode: code ?? 0 }));
      proc.on("error", (err) => reject(err));
    });
  }

  // ─── System prompt ──────────────────────────────

  private async buildSystemPrompt(input: AgentLoopInput): Promise<string> {
    const ctx = input.context;
    let prompt = `You are Meld AI, an autonomous coding agent integrated into a design-to-code IDE.
You help developers modify their existing codebase based on natural language instructions.
Your goal is to make precise, minimal changes that blend seamlessly into the existing project.

WORKFLOW:
1. Analyze the user's request carefully — understand intent before acting
2. Use list_files or search_files to understand the project structure
3. Use read_file to examine ALL relevant files (the target file AND its imports/dependencies)
4. Study the existing code patterns, naming conventions, and architecture
5. Plan your changes — make minimal, targeted edits that follow existing patterns
6. Use write_file to propose changes (user reviews each edit before applying)
7. Use run_command for npm install, git, build tools, etc.
8. After editing, check if related files (imports, types, tests) need updating

CRITICAL RULES:
- ALWAYS read a file before editing it — never assume file contents
- Make the SMALLEST changes possible — do NOT rewrite entire files
- Preserve existing code style, patterns, indentation, and conventions exactly
- Use the project's existing import style (named vs default, path aliases vs relative)
- When modifying React/Vue components, maintain the existing hooks/lifecycle order
- When adding new code, follow the same patterns as surrounding code
- If creating a new file, explain why and follow the project's file naming convention
- If unsure, explain your reasoning and ask the user
- After editing, consider if related files need updating (types, exports, imports)
- Use run_command sparingly and only when necessary (e.g., installing a dependency)
- PORT MANAGEMENT: CRITICAL — read carefully.
  BANNED PORTS: ${this.getBannedPortsList()}
  These ports are already in use by Meld or other projects. NEVER use any of them.
  When creating a new project or configuring a dev server:
  1. Pick a random port between 18000-28000 that is NOT in the banned list above
  2. Modify the project's package.json scripts to hardcode this port:
     - Next.js: \`"dev": "next dev -p <port>"\`
     - Vite/React: \`"dev": "vite --port <port>"\` or \`"start": "PORT=<port> react-scripts start"\`
     - Express: set PORT env or hardcode in server file
     - Vue: \`"dev": "vite --port <port>"\`
  3. If a port conflict occurs, pick another random port in 18000-28000 and update the script
  4. ALWAYS update the package.json script — do NOT rely on env vars alone
  5. Before choosing a port, check the project's existing package.json for any hardcoded ports and avoid those too
- DEV SERVER: When starting a dev server, if it exits immediately, check the error output. Common fixes: kill the process on the port, use a different port, or install missing dependencies first.
- NEVER remove existing functionality unless explicitly asked
- NEVER change unrelated code — keep your diff as small as possible
- When adding imports, place them with the same group (e.g., React imports with React, lib imports with libs)

CODE QUALITY RULES:
- Match the existing indentation (tabs vs spaces, 2-space vs 4-space)
- Preserve existing comment style (// vs /* */ vs JSDoc)
- Keep consistent naming: camelCase, PascalCase, kebab-case — match what exists
- If the project uses TypeScript, add proper types — never use \`any\`
- If the project uses ESLint/Prettier, follow its configured rules
- Preserve existing error handling patterns (try-catch, .catch(), error boundaries)

RESPONSE DISCIPLINE:
- When using write_file, write the COMPLETE file content. No placeholders, no "...rest of file".
- Each write_file must be a working, complete file.
- Explanation in write_file's "explanation" field must be ONE sentence. No paragraphs.
- After making changes, verify by reading the file back if unsure.
- For visual edits (color, spacing, layout): make the change and STOP. Don't refactor surrounding code.
- For multi-file changes: state the plan first as a message, then execute file by file.
- NEVER apologize. NEVER say "I'll help you with that". Just do it.
`;

    // ─── Framework-specific guidelines ───
    if (ctx?.framework) {
      prompt += `\nFRAMEWORK: ${ctx.framework}\n`;
      prompt += this.getFrameworkGuidelines(ctx.framework, ctx.dependencies);
    }

    // ─── Dependency awareness ───
    if (ctx?.dependencies?.length) {
      prompt += `\nINSTALLED DEPENDENCIES:\n${ctx.dependencies.join(", ")}\n`;
      prompt += `IMPORTANT: Use these existing libraries instead of installing alternatives.\n`;
      prompt += `For example, if "axios" is installed, do NOT use fetch. If "date-fns" is installed, do NOT use moment.\n`;
      prompt += `Always check this list before suggesting \`npm install\`.\n`;
    }

    // ─── Design system ───
    if (ctx?.designSystemMd) {
      prompt += `\n--- DESIGN SYSTEM ---\n`;
      prompt += `The project has a design system. You MUST use these tokens/variables for colors, spacing, typography.\n`;
      prompt += `Do NOT hardcode color values or font sizes — reference the design system.\n`;
      prompt += ctx.designSystemMd;
      prompt += `\n--- END DESIGN SYSTEM ---\n`;
    }

    // ─── File tree ───
    if (ctx?.fileTree?.length) {
      const tree = ctx.fileTree.slice(0, 150).join("\n");
      prompt += `\nPROJECT FILES (first 150):\n${tree}\n`;
    }

    // ─── Selected file context ───
    if (ctx?.selectedFile) {
      prompt += `\nCURRENTLY SELECTED FILE: ${ctx.selectedFile}\n`;
      prompt += `The user is focused on this file. Prioritize changes here unless the request clearly targets a different file.\n`;
    }
    if (ctx?.currentCode) {
      prompt += `\nCURRENT FILE CONTENT:\n\`\`\`\n${ctx.currentCode}\n\`\`\`\n`;
      prompt += `Study this code carefully before proposing changes. Match its style exactly.\n`;
    }

    // ─── Nearby files context ───
    if (ctx?.nearbyFiles && Object.keys(ctx.nearbyFiles).length > 0) {
      prompt += `\nRELATED FILES (imported by or importing the selected file):\n`;
      for (const [filePath, content] of Object.entries(ctx.nearbyFiles)) {
        const preview = content.length > 1500 ? content.slice(0, 1500) + "\n... (truncated)" : content;
        prompt += `\n--- ${filePath} ---\n\`\`\`\n${preview}\n\`\`\`\n`;
      }
    }

    // ─── Element history for Figma context ───
    if (ctx?.elementHistory?.length) {
      prompt += `\nFIGMA ELEMENT HISTORY (recently selected design elements):\n`;
      prompt += ctx.elementHistory.join("\n");
      prompt += `\n`;
    }

    // ─── Custom Instructions (from Super-Context settings) ───
    if (ctx?.customInstructions) {
      prompt += `\n--- CUSTOM INSTRUCTIONS ---\n`;
      prompt += `The user has set the following rules. You MUST follow them:\n`;
      prompt += ctx.customInstructions;
      prompt += `\n--- END CUSTOM INSTRUCTIONS ---\n`;
    }

    // ─── Installed Skills ───
    if (ctx?.skillsContent) {
      prompt += `\n--- INSTALLED SKILLS ---\n`;
      prompt += `Follow these skill rules strictly:\n`;
      prompt += ctx.skillsContent;
      prompt += `\n--- END SKILLS ---\n`;
    }

    // ─── Behavioral Preferences ───
    if (ctx?.preferences) {
      prompt += `\n--- USER PREFERENCES (learned from accept/reject patterns) ---\n`;
      prompt += `Adjust your code suggestions to match these preferences:\n`;
      prompt += ctx.preferences;
      prompt += `\nHigher scores mean the user strongly prefers this pattern. Negative scores mean they reject it.\n`;
      prompt += `--- END PREFERENCES ---\n`;
    }

    // ─── Terminal Logs (for error context) ───
    if (ctx?.terminalLogs) {
      prompt += `\n--- RECENT TERMINAL OUTPUT ---\n`;
      prompt += `Use this to understand current build/runtime state and errors:\n`;
      prompt += ctx.terminalLogs;
      prompt += `\n--- END TERMINAL ---\n`;
    }

    // ─── Connected MCP Services ───
    // Inform AI about which external services are available
    if (ctx?.connectedServices) {
      prompt += `\n--- CONNECTED SERVICES ---\n`;
      prompt += `The following external services are connected and available. You can reference their data in your responses:\n`;
      prompt += ctx.connectedServices;
      prompt += `\n--- END SERVICES ---\n`;
    }

    // ─── Pinned files ───
    if (ctx?.nearbyFiles && Object.keys(ctx.nearbyFiles).length > 0) {
      prompt += `\nRELATED FILES (Smart Chain + pinned):\n`;
      for (const [filePath, content] of Object.entries(ctx.nearbyFiles)) {
        const preview = content.length > 1500 ? content.slice(0, 1500) + "\n... (truncated)" : content;
        prompt += `\n--- ${filePath} ---\n\`\`\`\n${preview}\n\`\`\`\n`;
      }
    }

    // ─── Detected code patterns (cached, analyzed once per session) ───
    try {
      const rootDir = this.config.rootDir;
      if (!AgentLoop.codePatternsCache.has(rootDir)) {
        const patterns = await analyzeCodePatterns(rootDir);
        AgentLoop.codePatternsCache.set(rootDir, patterns);
      }
      const cachedPatterns = AgentLoop.codePatternsCache.get(rootDir);
      if (cachedPatterns) {
        prompt += `\n${cachedPatterns}\n`;
        prompt += `IMPORTANT: Follow these detected patterns exactly when generating or modifying code.\n`;
      }
    } catch {
      // Ignore pattern analysis failure — does not affect agent operation
    }

    return prompt;
  }

  // ─── Framework-specific detailed guidelines ──────────────────

  private getFrameworkGuidelines(framework: string, deps?: string[]): string {
    const hasDep = (name: string) => deps?.some((d) => d === name || d.startsWith(name + "/") || d.startsWith("@" + name));
    let guide = "";

    switch (framework) {
      case "Next.js":
        guide += `
[Next.js Guidelines]
- Default to App Router (app/) conventions. Use Pages Router only if the project uses pages/.
- Add "use client" directive ONLY when the component uses hooks, event handlers, or browser APIs.
- Use next/image for images, next/link for navigation — never raw <img> or <a> for internal links.
- For data fetching, prefer Server Components with async/await over client-side useEffect.
- Use next/font for font loading if the project does.
- Route handlers go in app/api/. Use NextRequest/NextResponse.
- For metadata, use the metadata export or generateMetadata.
`;
        break;
      case "React":
        guide += `
[React Guidelines]
- Use functional components with hooks. No class components unless the project uses them.
- Maintain hooks order: useState, useRef, useMemo, useCallback, useEffect.
- Never call hooks conditionally or inside loops.
- Extract complex logic into custom hooks (use-* naming).
- Use React.memo only when there's a measured performance need.
`;
        break;
      case "Vue":
        guide += `
[Vue Guidelines]
- Use Composition API with <script setup> unless the project uses Options API.
- Use ref() for primitives, reactive() for objects.
- Use defineProps/defineEmits for component interfaces.
- Use computed() for derived state, watch/watchEffect for side effects.
`;
        break;
      case "Angular":
        guide += `
[Angular Guidelines]
- Use standalone components by default.
- Use dependency injection with Injectable and inject().
- Follow Angular naming: component.ts, service.ts, module.ts.
- Use reactive forms for complex forms, template-driven for simple ones.
`;
        break;
      case "Svelte":
        guide += `
[Svelte Guidelines]
- Use $: for reactive declarations.
- Use export let for component props.
- Use Svelte stores for shared state.
- Use {#if}, {#each}, {#await} for template logic.
`;
        break;
    }

    // Common library-specific guidelines
    if (hasDep("tailwindcss") || hasDep("tailwind")) {
      guide += `- Tailwind CSS: Use utility classes. Do NOT write custom CSS unless absolutely necessary.\n`;
      guide += `  Follow the project's existing Tailwind patterns (e.g., className ordering).\n`;
    }
    if (hasDep("shadcn") || hasDep("radix")) {
      guide += `- shadcn/ui: Reuse existing components from components/ui/. Check before creating new ones.\n`;
    }
    if (hasDep("zustand")) {
      guide += `- Zustand: Use existing stores. Follow the project's store pattern (slices, selectors).\n`;
    }
    if (hasDep("react-query") || hasDep("tanstack")) {
      guide += `- TanStack Query: Use useQuery/useMutation for server state. Follow existing query key patterns.\n`;
    }
    if (hasDep("trpc")) {
      guide += `- tRPC: Use existing router procedures. Follow the project's tRPC patterns.\n`;
    }
    if (hasDep("prisma")) {
      guide += `- Prisma: Use the existing Prisma client. Follow existing query patterns.\n`;
    }
    if (hasDep("supabase")) {
      guide += `- Supabase: Use the existing Supabase client. Follow existing query/auth patterns.\n`;
    }

    return guide;
  }
}
