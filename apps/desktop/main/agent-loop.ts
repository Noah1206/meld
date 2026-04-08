import * as fs from "node:fs";
import * as path from "node:path";
import * as childProcess from "node:child_process";
import type { AgentEvent, AgentLoopInput, AgentTool } from "@figma-code-bridge/shared";
import { AGENT_TOOLS } from "@figma-code-bridge/shared";
import { analyzeCodePatterns } from "./code-patterns";

// ─── Category-specific autonomous agent instructions ──
const CATEGORY_PERSONAS: Record<string, string> = {
  website: `You are a senior web developer and UX/UI expert building a WEBSITE.

PAGES TO BUILD (in order):
1. Home/Landing — hero section, value proposition, CTA, social proof, testimonials
2. About — team, mission, story, values
3. Features/Services — feature grid with icons, detailed sections
4. Pricing — plan comparison table, FAQ, CTA
5. Blog — post list, individual post page, categories
6. Contact — form, map, social links, office info
7. Auth — login, signup, forgot password, email verification
8. 404/Error — branded error page with navigation back

BRAND REFERENCES: Stripe (clean typography, gradient hero), Linear (minimal dark UI), Vercel (developer-focused landing), Notion (friendly illustrations), Apple (product showcase).

BUILD STRATEGY:
- Start with layout: header/nav + footer + responsive container
- Then landing page with real content structure (not lorem ipsum — generate realistic content)
- Add pages one by one, each fully complete with responsive design
- Navigation must link all pages properly
- Implement dark/light mode toggle from the start
- Add smooth scroll, hover animations, page transitions
- SEO: meta tags, Open Graph, semantic HTML
- Performance: image optimization, lazy loading, code splitting`,

  app: `You are a fullstack app developer and product designer building a WEB APP.

PAGES TO BUILD (in order):
1. Auth — login, signup, forgot password, OAuth (Google/GitHub), onboarding flow
2. Dashboard — overview cards, charts, recent activity, quick actions
3. Main Feature — the core functionality (list/detail/create/edit pattern)
4. Settings — profile, account, preferences, notifications, billing
5. Search/Explore — search with filters, categories, results
6. Notifications — notification center, read/unread, notification preferences
7. User Profile — avatar, bio, activity history, settings link
8. Admin Panel — user management, analytics, content moderation (if applicable)

BRAND REFERENCES: Notion (sidebar + workspace), Figma (collaborative UI), GitHub (dashboard + activity), Slack (messaging patterns), Discord (real-time UI), Spotify (content browsing), Linear (task management).

BUILD STRATEGY:
- Start with auth flow + protected routes
- Build app shell: sidebar navigation + header + main content area
- Implement state management (Zustand/Context) for user session
- Dashboard with real data patterns (use mock data, but realistic structure)
- Each feature: list view → detail view → create/edit forms → delete confirmation
- Add loading skeletons, empty states, error boundaries everywhere
- Real-time feel: optimistic updates, toast notifications
- Mobile responsive: collapsible sidebar, bottom nav on mobile
- Keyboard shortcuts for power users`,

  service: `You are a backend architect and API specialist building a SERVER/API SERVICE.

COMPONENTS TO BUILD (in order):
1. Project structure — src/, routes/, controllers/, models/, middleware/, utils/, config/
2. Server setup — Express/Fastify/Hono with CORS, helmet, rate limiting, error handling
3. Database — schema design, migrations, seed data, connection pooling
4. Auth system — JWT/session, register, login, refresh tokens, password hashing
5. Core API routes — CRUD for main resources, validation, pagination, filtering, sorting
6. Middleware — auth guard, role-based access, request logging, error handler
7. File upload — multipart handling, storage (local/S3), image processing
8. Background jobs — email sending, scheduled tasks, queue processing (if needed)
9. API documentation — OpenAPI/Swagger spec, auto-generated docs
10. Testing — unit tests for utils, integration tests for routes, test fixtures

BRAND REFERENCES: Stripe API (clean REST design, great error responses), GitHub API (pagination, filtering), Supabase (auto-generated types), Firebase (real-time patterns).

BUILD STRATEGY:
- Start with project scaffolding: package.json, tsconfig, folder structure
- Server entry point with middleware chain
- Database connection + first model + migration
- Auth routes (register/login/me) with proper error handling
- CRUD routes with validation (zod/joi)
- Every response follows consistent format: { success, data, error, pagination }
- Environment variables via .env with validation
- Health check endpoint, graceful shutdown
- Docker support: Dockerfile + docker-compose.yml
- README with setup instructions, API docs, environment variables`,

  tool: `You are a CLI/automation specialist building a DEVELOPER TOOL.

COMPONENTS TO BUILD (in order):
1. CLI entry point — argument parsing (commander/yargs), help text, version
2. Core logic — the main functionality as importable modules
3. Configuration — config file loading (.rc, .json, .yaml), defaults, validation
4. Commands — subcommands with options and flags
5. Output — colored terminal output, progress bars, spinners, tables
6. File operations — read/write/watch files, glob patterns, template rendering
7. Integration — API clients, webhook handlers, service connectors
8. Error handling — friendly error messages, debug mode, stack traces
9. Testing — unit tests for core logic, integration tests for commands
10. Distribution — package.json bin field, npm publish config, README

BRAND REFERENCES: Vite (fast DX, clear output), ESLint (plugin system), Prettier (opinionated defaults), Turborepo (monorepo tooling), Changesets (release management).

BUILD STRATEGY:
- Start with CLI scaffolding: bin entry, argument parser, help output
- Core module with pure functions (testable, no side effects)
- Config loading with sensible defaults and schema validation
- One command at a time, each fully working before moving to next
- Rich terminal output: chalk/picocolors for colors, ora for spinners
- Progress feedback for long operations
- --dry-run flag for destructive operations
- --verbose / --quiet output levels
- Watch mode for development workflows (if applicable)
- npx-ready: works without global install
- README with usage examples, GIFs of terminal output`,
};

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

  // File content cache — LRU with size limit to prevent memory bloat
  private fileCache = new Map<string, string>();
  private fileCacheMaxBytes = 30 * 1024 * 1024; // 30MB cap
  private fileCacheBytes = 0;

  private evictFileCache() {
    // Evict oldest entries (Map preserves insertion order)
    for (const [key, val] of this.fileCache) {
      if (this.fileCacheBytes <= this.fileCacheMaxBytes * 0.6) break;
      this.fileCacheBytes -= val.length;
      this.fileCache.delete(key);
    }
  }

  // Code pattern analysis cache (per rootDir, reused across sessions)
  private static codePatternsCache = new Map<string, string>();

  // Model routing: pick model based on round context
  private pickModel(round: number, lastToolNames: string[]): string {
    const base = this.config.modelId;
    // If user explicitly chose a model, respect it
    if (base !== "claude-sonnet-4-20250514") return base;

    // Round 0: planning phase → Sonnet (good reasoning)
    if (round === 0) return "claude-sonnet-4-20250514";

    // If last round was only read/list operations → Sonnet (reliable)
    const readOnlyTools = ["read_file", "list_files", "search_files"];
    if (lastToolNames.length > 0 && lastToolNames.every(t => readOnlyTools.includes(t))) {
      return "claude-sonnet-4-20250514";
    }

    // If error detected in recent messages → Opus (max reasoning for debugging)
    const recentMessages = this.messages.slice(-4);
    const hasError = recentMessages.some(m => {
      const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      return content.includes("Error") || content.includes("error") || content.includes("failed");
    });
    if (hasError) return "claude-sonnet-4-20250514"; // Sonnet for errors (Opus too expensive for every error)

    // Default: Sonnet for write operations
    return "claude-sonnet-4-20250514";
  }

  // Context compression: summarize old messages to save tokens
  private compressMessages(messages: Array<{ role: string; content: unknown }>): Array<{ role: string; content: unknown }> {
    // Compress when messages exceed 16 to prevent context overflow
    if (messages.length <= 16) return messages;

    // Keep first message (user's original request) + last 10 messages
    const first = messages[0];
    const recent = messages.slice(-10);

    // Summarize middle messages
    const middle = messages.slice(1, -10);
    const summary: string[] = [];
    for (const msg of middle) {
      if (msg.role === "assistant" && Array.isArray(msg.content)) {
        for (const block of msg.content as Array<{ type: string; text?: string; name?: string }>) {
          if (block.type === "text" && block.text) {
            summary.push(block.text.slice(0, 100));
          } else if (block.type === "tool_use") {
            summary.push(`[Used tool: ${block.name}]`);
          }
        }
      }
    }

    const compressed = [
      first,
      { role: "user", content: `[Previous context summary: ${summary.join(" → ")}]` },
      ...recent,
    ];
    return compressed;
  }

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
    this.cleanup();
  }

  // Free memory after session ends
  private cleanup() {
    this.fileCache.clear();
    this.fileCacheBytes = 0;
    this.messages.length = 0;
    if (typeof globalThis.gc === "function") globalThis.gc();
  }

  async run() {
    const { apiKey, rootDir, input, onEvent, maxRounds } = this.config;
    let lastToolNames: string[] = [];

    // Build system prompt
    const systemPrompt = await this.buildSystemPrompt(input);

    // Initial user message
    this.messages.push({ role: "user", content: input.command });

    for (let round = 0; round < maxRounds; round++) {
      if (this.abortController.signal.aborted) return;

      try {
        // Smart model routing based on round context
        const activeModel = this.pickModel(round, lastToolNames);
        lastToolNames = [];

        // Compress context if conversation is getting long
        const messagesForApi = this.compressMessages(this.messages);

        // Call Claude API (tool_use)
        const response = await this.callClaude(apiKey, activeModel, systemPrompt, messagesForApi);

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
          this.cleanup();
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
            lastToolNames.push(toolName);
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
    // Use prompt caching: system prompt and tools are cached after first call
    // This reduces input token cost by ~90% on subsequent rounds
    const systemBlocks = [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ];

    const tools = AGENT_TOOLS.map((t, i, arr) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
      // Cache control on last tool to cache the entire tool list
      ...(i === arr.length - 1 ? { cache_control: { type: "ephemeral" } } : {}),
    }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 8192,
        system: systemBlocks,
        messages,
        tools,
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
        // Return cached content if file hasn't been modified
        if (this.fileCache.has(relPath) && !this.filesChanged.has(relPath)) {
          const cached = this.fileCache.get(relPath)!;
          onEvent({ type: "file_read", filePath: relPath, preview: "(cached)" });
          return { text: cached, isError: false };
        }
        try {
          const content = await fs.promises.readFile(fullPath, "utf-8");
          const preview = content.length > 500 ? content.slice(0, 500) + "..." : content;
          this.filesRead.add(relPath);
          this.fileCacheBytes += content.length;
          this.fileCache.set(relPath, content);
          if (this.fileCacheBytes > this.fileCacheMaxBytes) this.evictFileCache();
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
          const oldSize = this.fileCache.get(relPath)?.length ?? 0;
          this.fileCacheBytes += newContent.length - oldSize;
          this.fileCache.set(relPath, newContent);
          if (this.fileCacheBytes > this.fileCacheMaxBytes) this.evictFileCache();
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
    let prompt = `You are Meld AI, an autonomous coding agent. You operate on a Think-Act-Observe loop — you plan, execute, verify, and repeat until the job is done.

═══ CORE LOOP: THINK → ACT → OBSERVE → REPEAT ═══

THINK (Plan before acting):
- Read .md files in project root (PLAN.md, README.md, PROJECT.md) to understand goals and identity.
- If no PLAN.md exists, CREATE one: purpose, target pages, features, tech stack, progress checklist.
- Decompose the user's request into concrete sub-tasks.
- Decide which tools to use and in what order.

ACT (Execute immediately — never ask, never describe, just do):
- Use list_files → read_file → write_file → run_command in sequence.
- Build complete, production-quality code. No placeholders, no "...rest of file".
- Install dependencies, create files, modify code — whatever is needed.

OBSERVE (Verify and self-correct):
- After every change, check if it works: read back the file, check terminal logs for errors.
- If something fails (build error, missing import, wrong port), FIX IT immediately.
- Do NOT report errors to the user — fix them yourself and move on.

REPEAT: Continue the loop until the task is FULLY complete. Then update PLAN.md with progress.

═══ AUTONOMOUS RULES ═══
- "이어서 진행해줘" / "continue" / "keep going" → Read project state, pick up where it left off, BUILD.
- Incomplete project → Proactively build what's missing.
- Terminal errors → Fix immediately without being asked.
- Never say "what would you like?" — analyze and decide yourself.
- Never apologize. Never narrate. Just execute.

═══ CODE RULES ═══
- ALWAYS read a file before editing — never assume contents.
- Preserve existing patterns: style, imports, naming, indentation.
- write_file must contain the COMPLETE working file. Explanation = ONE sentence.
- Multi-file changes: state the plan briefly, then execute file by file.
- Match the project's conventions exactly (TypeScript types, ESLint, comment style).

═══ PORT MANAGEMENT ═══
BANNED PORTS: ${this.getBannedPortsList()}
Use random port 18000-28000, hardcode in package.json scripts. If conflict, pick another.

═══ LANGUAGE (CRITICAL — HIGHEST PRIORITY) ═══
- Detect the language of the user's FIRST message and respond ONLY in that same language for the ENTIRE session.
- If the user writes in Korean (한국어), ALL your text responses MUST be in Korean. No exceptions.
- If the user writes in English, respond in English.
- This applies to: explanations in write_file, messages, tool call explanations — everything.
- Code itself and code comments can remain in English, but ALL conversational text must match the user's language.
- NEVER mix languages. NEVER default to English when the user wrote in another language.
`;

    // ─── Category persona specialization ───
    if (ctx?.category && CATEGORY_PERSONAS[ctx.category]) {
      prompt += `\nSPECIALIZATION:\n${CATEGORY_PERSONAS[ctx.category]}\n`;
    }

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
      prompt += `\n═══ ACTIVE DESIGN SYSTEM (MANDATORY — READ EVERY SECTION) ═══\n`;
      prompt += `A design system (DESIGN.md format) has been applied. You MUST follow it with ZERO deviations:\n\n`;
      prompt += `ENFORCEMENT RULES:\n`;
      prompt += `- EVERY color must come from the palette. Never write a raw hex value.\n`;
      prompt += `- EVERY font-size must match the type scale. Never use arbitrary px values.\n`;
      prompt += `- EVERY spacing (margin, padding, gap) must be a multiple of the base unit.\n`;
      prompt += `- EVERY border-radius must use a defined radius token.\n`;
      prompt += `- EVERY shadow must use a defined elevation level.\n`;
      prompt += `- Follow the Do's and Don'ts section strictly.\n`;
      prompt += `- Apply the Visual Atmosphere (glass effects, motion, surface layering).\n`;
      prompt += `- Support responsive breakpoints as defined.\n\n`;
      prompt += `DESIGN QUALITY STANDARDS:\n`;
      prompt += `- Spacing rhythm: consistent breathing room, generous whitespace\n`;
      prompt += `- Typography hierarchy: clear visual hierarchy using the type scale\n`;
      prompt += `- Color harmony: primary for CTAs, secondary for accents, neutral for text/surfaces\n`;
      prompt += `- Component states: every interactive element needs hover, focus, active, disabled\n`;
      prompt += `- Modern patterns: subtle glassmorphism for overlays, smooth gradients for brand accents, micro-interactions (200ms ease)\n`;
      prompt += `- Balance: content occupies 60-70% of space, never edge-to-edge cramped\n\n`;
      prompt += ctx.designSystemMd;
      prompt += `\n═══ END DESIGN SYSTEM ═══\n`;
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
      prompt += `\n═══ INSTALLED SKILLS (TOOLS) ═══\n`;
      prompt += `The user has installed these skills. Follow their rules and use their capabilities:\n`;
      prompt += ctx.skillsContent;
      prompt += `\nThese skills extend your capabilities. Use them proactively when relevant to the task.\n`;
      prompt += `═══ END SKILLS ═══\n`;
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
    if (ctx?.connectedServices) {
      prompt += `\n═══ CONNECTED SERVICES (MCP) ═══\n`;
      prompt += `These external services are connected and available to use:\n`;
      prompt += ctx.connectedServices;
      prompt += `\nYou can leverage these services in your work:\n`;
      prompt += `- GitHub: read repos, create issues/PRs, check CI status\n`;
      prompt += `- Figma: extract design tokens, inspect components\n`;
      prompt += `- Vercel: deploy, check deployment status, manage domains\n`;
      prompt += `- Supabase: manage database, auth, storage\n`;
      prompt += `- Sentry: check errors, resolve issues\n`;
      prompt += `- Linear: create/update issues, track progress\n`;
      prompt += `- Notion: read/write pages, manage databases\n`;
      prompt += `- Slack: send messages, read channels\n`;
      prompt += `When a task would benefit from a connected service, USE IT proactively.\n`;
      prompt += `If a service is needed but not connected, tell the user to connect it in Settings > MCP Servers.\n`;
      prompt += `═══ END SERVICES ═══\n`;
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
