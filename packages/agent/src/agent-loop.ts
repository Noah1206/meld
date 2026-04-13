import * as fs from "node:fs";
import * as path from "node:path";
import * as net from "node:net";
import * as childProcess from "node:child_process";
import * as os from "node:os";
import type { AgentEvent, AgentLoopInput } from "@figma-code-bridge/shared";
import { AGENT_TOOLS } from "@figma-code-bridge/shared";
import { analyzeCodePatterns } from "./code-patterns.js";

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

interface BackupData {
  sessionId: string;
  rootDir: string;
  createdAt: string;
  files: Record<string, string | null>;
}

const backupStore = new Map<string, BackupData>();

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
        await fs.promises.unlink(fullPath);
      } else {
        await fs.promises.writeFile(fullPath, originalContent, "utf-8");
      }
      rolledBack.push(relPath);
    } catch (err) {
      errors.push(`${relPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  backupStore.delete(targetId);

  const backupFilePath = path.join(backup.rootDir, ".meld", "backups", `${targetId}.json`);
  try { await fs.promises.unlink(backupFilePath); } catch { /* ignore */ }

  return { rolledBack, errors };
}

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
  /** Meld server URL for web_search/browse_url (default: https://meld-psi.vercel.app) */
  serverUrl?: string;
}

type ApprovalResolver = (approved: boolean) => void;

export interface SessionRecord {
  sessionId: string;
  timestamp: string;
  command: string;
  modelId: string;
  duration: number;
  status: "completed" | "error" | "cancelled";
  filesChanged: string[];
  filesRead: string[];
  toolCalls: number;
  errorMessage?: string;
  summary?: string;
}

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
  private autoApproveMode = true;
  private toolCallHistory: string[] = [];

  private fileCache = new Map<string, string>();
  private fileCacheMaxBytes = 30 * 1024 * 1024;
  private fileCacheBytes = 0;

  private evictFileCache() {
    for (const [key, val] of this.fileCache) {
      if (this.fileCacheBytes <= this.fileCacheMaxBytes * 0.6) break;
      this.fileCacheBytes -= val.length;
      this.fileCache.delete(key);
    }
  }

  private static codePatternsCache = new Map<string, string>();

  private pickModel(round: number, lastToolNames: string[]): string {
    const base = this.config.modelId;
    if (base !== "claude-sonnet-4-20250514") return base;
    if (round === 0) return "claude-sonnet-4-20250514";
    const readOnlyTools = ["read_file", "list_files", "search_files"];
    if (lastToolNames.length > 0 && lastToolNames.every(t => readOnlyTools.includes(t))) {
      return "claude-sonnet-4-20250514";
    }
    return "claude-sonnet-4-20250514";
  }

  /**
   * Advanced Context Management
   *
   * Based on research from Claude Code, Manus, Cursor, and academic papers:
   *
   * 1. KV-Cache optimization: stable prefix, append-only, deterministic serialization
   * 2. Observation masking: old tool results → masked (not summarized), keep recent 10 turns full
   * 3. Error preservation: all errors stay in context (Manus pattern)
   * 4. Hierarchical compression: detailed(5) → moderate(25) → high-level(100)
   * 5. File-based memory: PLAN.md goals appended at end (attention manipulation)
   * 6. Restorable compression: keep URLs/paths so content can be re-fetched
   *
   * Priority: raw context > observation masking > compaction > summarization
   * (JetBrains research: masking is 52% cheaper and more accurate than summarization)
   */
  private compressMessages(messages: Array<{ role: string; content: unknown }>): Array<{ role: string; content: unknown }> {
    if (messages.length <= 20) return messages;

    const first = messages[0]; // System context — always kept (KV-cache prefix)
    const RECENT_WINDOW = 10; // Keep last 10 turns fully intact (JetBrains optimal)
    const recent = messages.slice(-RECENT_WINDOW);
    const older = messages.slice(1, -RECENT_WINDOW);

    // ─── Phase 1: Extract errors (always preserve — Manus pattern) ───
    const errors: string[] = [];
    for (const msg of older) {
      if (msg.role === "user" && typeof msg.content === "string") {
        if (msg.content.includes("Error") || msg.content.includes("failed") || msg.content.includes("❌")) {
          errors.push(msg.content.slice(0, 300));
        }
      }
      if (Array.isArray(msg.content)) {
        for (const block of msg.content as Array<{ type?: string; is_error?: boolean; content?: string }>) {
          if (block.is_error && block.content) {
            errors.push(block.content.slice(0, 300));
          }
        }
      }
    }

    // ─── Phase 2: Observation masking (not summarization) ───
    // Replace old tool results with minimal placeholders preserving paths/URLs
    // This is 52% cheaper than summarization while maintaining solve rate (JetBrains)
    const maskedOlder: Array<{ role: string; content: unknown }> = [];
    for (const msg of older) {
      if (msg.role === "assistant" && Array.isArray(msg.content)) {
        // Keep tool_use blocks (they're small), mask tool_result content
        const masked = (msg.content as Array<{ type: string; text?: string; name?: string; id?: string }>).map((block) => {
          if (block.type === "text" && block.text) {
            // Keep assistant text but truncate
            return { ...block, text: block.text.slice(0, 150) };
          }
          if (block.type === "tool_use") {
            // Keep tool calls (shows what was done)
            return block;
          }
          return block;
        });
        maskedOlder.push({ ...msg, content: masked });
      } else if (msg.role === "user" && Array.isArray(msg.content)) {
        // Tool results — mask content but keep metadata
        const masked = (msg.content as Array<{ type?: string; tool_use_id?: string; content?: string; is_error?: boolean }>).map((block) => {
          if (block.type === "tool_result" && block.content && !block.is_error) {
            // Restorable compression: keep file paths and URLs
            const paths = block.content.match(/[\w/.-]+\.(tsx?|jsx?|json|md|css|html)/g) || [];
            const urls = block.content.match(/https?:\/\/[^\s]+/g) || [];
            const restorable = [...paths.slice(0, 5), ...urls.slice(0, 3)].join(", ");
            return {
              ...block,
              content: `[Masked — ${block.content.length} chars${restorable ? `. Refs: ${restorable}` : ""}]`,
            };
          }
          return block; // Keep errors unmasked
        });
        maskedOlder.push({ ...msg, content: masked });
      } else {
        maskedOlder.push(msg);
      }
    }

    // ─── Phase 3: Hierarchical compression for very old messages ───
    // If maskedOlder is still large, create tiered summaries
    let compressedOlder = maskedOlder;
    if (maskedOlder.length > 30) {
      // Keep every 5th message from the oldest portion
      const veryOld = maskedOlder.slice(0, -15);
      const lessOld = maskedOlder.slice(-15);
      const sampled = veryOld.filter((_, i) => i % 5 === 0);

      compressedOlder = [...sampled, ...lessOld];
    }

    // ─── Phase 4: Assemble final context ───
    const compressed: Array<{ role: string; content: unknown }> = [first];

    // Masked older messages (preserves structure, minimal tokens)
    compressed.push(...compressedOlder);

    // Error log (Manus: errors always visible to avoid repetition)
    if (errors.length > 0) {
      compressed.push({
        role: "user",
        content: `[⚠️ Previous errors — do NOT repeat these:\n${errors.slice(-5).join("\n---\n")}]`,
      });
    }

    // Recent messages (full detail — active working memory)
    compressed.push(...recent);

    // ─── Phase 5: Attention manipulation (Manus todo.md trick) ───
    // Append goals at end of context → pushes into recent attention span
    // Addresses "lost-in-the-middle" (U-shaped attention, Stanford)
    const planFile = path.join(this.config.rootDir, "PLAN.md");
    try {
      const plan = fs.readFileSync(planFile, "utf-8");
      if (plan.trim()) {
        compressed.push({
          role: "user",
          content: `[📋 CURRENT PLAN — focus on ☐ incomplete items:\n${plan.slice(0, 1500)}]`,
        });
      }
    } catch { /* no plan file */ }

    return compressed;
  }

  constructor(config: AgentLoopConfig) {
    this.config = { maxRounds: 50, ...config };
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.backupData = {
      sessionId: this.sessionId,
      rootDir: config.rootDir,
      createdAt: new Date().toISOString(),
      files: {},
    };
    backupStore.set(this.sessionId, this.backupData);
  }

  approveEdit(toolCallId: string, approved: boolean) {
    const resolver = this.approvalResolvers.get(toolCallId);
    if (resolver) {
      resolver(approved);
      this.approvalResolvers.delete(toolCallId);
    }
  }

  /** Respond to an agent_question or service_request */
  respondToAgent(questionId: string, response: string) {
    const resolver = this.approvalResolvers.get(questionId);
    if (resolver) {
      // Cast: we pass string through the boolean resolver channel
      (resolver as unknown as (val: string) => void)(response);
      this.approvalResolvers.delete(questionId);
    }
  }

  /** Enable auto-approve mode (plan approved by user) */
  setAutoApprove(enabled: boolean) {
    this.autoApproveMode = enabled;
  }

  cancel() {
    this.abortController.abort();
    this.emitRollbackAvailable();
    this.config.onEvent({ type: "cancelled" });
    this.saveSession("cancelled").catch(() => {});
    this.cleanup();
  }

  private cleanup() {
    this.fileCache.clear();
    this.fileCacheBytes = 0;
    this.messages.length = 0;
  }

  async run() {
    const { apiKey, rootDir, input, onEvent, maxRounds } = this.config;
    let lastToolNames: string[] = [];

    const systemPrompt = await this.buildSystemPrompt(input);
    this.messages.push({ role: "user", content: input.command });

    for (let round = 0; round < maxRounds; round++) {
      if (this.abortController.signal.aborted) return;

      try {
        const activeModel = this.pickModel(round, lastToolNames);
        lastToolNames = [];

        const messagesForApi = this.compressMessages(this.messages);
        const response = await this.callClaude(apiKey, activeModel, systemPrompt, messagesForApi);

        const assistantContent = response.content;
        this.messages.push({ role: "assistant", content: assistantContent });

        for (const block of assistantContent) {
          if (block.type === "text" && block.text) {
            onEvent({ type: "message", content: block.text });
          }
        }

        if (response.stop_reason === "end_turn") {
          const summary = assistantContent
            .filter((b: { type: string }) => b.type === "text")
            .map((b: { text: string }) => b.text)
            .join("\n");

          // Check if verification was performed during this session
          const verificationDone = this.toolCallHistory.some(
            (t) => t === "check_preview" || t === "browser_screenshot" || t === "browser_open",
          );

          // Emit completion with verification status
          onEvent({
            type: "agent_complete",
            summary: {
              filesCreated: Array.from(this.filesChanged).filter((f) => this.backupData.files[f] === null),
              filesModified: Array.from(this.filesChanged).filter((f) => this.backupData.files[f] !== null),
              packagesInstalled: [],
              servicesConnected: [],
              previewVerified: verificationDone,
              notes: summary,
            },
          } as AgentEvent);

          onEvent({ type: "done", summary });
          await this.saveSession("completed", summary);
          this.cleanup();
          return;
        }

        if (response.stop_reason === "tool_use") {
          const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean }> = [];

          for (const block of assistantContent) {
            if (block.type !== "tool_use") continue;
            if (this.abortController.signal.aborted) return;

            const { id: toolCallId, name: toolName, input: toolInput } = block;
            this.toolCallCount++;
            this.toolCallHistory.push(toolName);
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
      ...(i === arr.length - 1 ? { cache_control: { type: "ephemeral" } } : {}),
    }));

    const body = {
      model: modelId,
      max_tokens: 8192,
      system: systemBlocks,
      messages,
      tools,
    };

    // If API key available → call Claude directly
    // Otherwise → proxy through Meld server (no user API key needed)
    const serverUrl = this.config.serverUrl || "https://meld-psi.vercel.app";
    const useProxy = !apiKey;

    const url = useProxy
      ? `${serverUrl}/api/ai/agent`
      : "https://api.anthropic.com/v1/messages";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (!useProxy) {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      headers["anthropic-beta"] = "prompt-caching-2024-07-31";
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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
        if (this.fileCache.has(relPath) && !this.filesChanged.has(relPath)) {
          onEvent({ type: "file_read", filePath: relPath, preview: "(cached)" });
          return { text: this.fileCache.get(relPath)!, isError: false };
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

        let original = "";
        try { original = await fs.promises.readFile(fullPath, "utf-8"); } catch { /* new file */ }

        // Always auto-approve — fully autonomous agent
        onEvent({
          type: "file_edit_auto",
          filePath: relPath,
          explanation,
        } as AgentEvent);

        if (!(relPath in this.backupData.files)) {
          this.backupData.files[relPath] = original === "" ? null : original;
          await this.persistBackupToDisk();
        }

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

        const portInCmd = command.match(/(?:--port|PORT=|-p)\s*(\d+)/);
        if (portInCmd) {
          const port = parseInt(portInCmd[1], 10);
          if (await this.isPortInUse(port)) {
            const freePort = await this.findFreePort();
            command = command.replace(portInCmd[0], portInCmd[0].replace(String(port), String(freePort)));
            onEvent({ type: "command_output", data: `[meld] Port ${port} is in use. Switching to ${freePort}\n` });
          }
        }

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

      case "web_search": {
        const query = String(input.query ?? "");
        const maxResults = Math.min(Number(input.maxResults ?? 5), 10);
        const serverUrl = this.config.serverUrl || "https://meld-psi.vercel.app";

        try {
          const res = await fetch(`${serverUrl}/api/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, maxResults }),
            signal: AbortSignal.timeout(15000),
          });

          if (!res.ok) {
            const errText = await res.text();
            return { text: `Search failed (${res.status}): ${errText}`, isError: true };
          }

          const data = await res.json();
          if (data.error) {
            return { text: `Search error: ${data.error}`, isError: true };
          }

          const results = (data.results ?? []) as Array<{ title: string; url: string; snippet: string }>;
          if (results.length === 0) {
            return { text: "No search results found.", isError: false };
          }

          const formatted = results.map((r, i) =>
            `[${i + 1}] ${r.title}\n    ${r.url}\n    ${r.snippet}`
          ).join("\n\n");

          return { text: `Search results for "${query}":\n\n${formatted}`, isError: false };
        } catch (err) {
          return { text: `Search failed: ${err instanceof Error ? err.message : "Unknown error"}`, isError: true };
        }
      }

      case "mcp_tool": {
        const mcpToolName = String(input.toolName ?? "");
        const mcpArgs = (input.args as Record<string, unknown>) ?? {};
        const serverUrl = this.config.serverUrl || "https://meld-psi.vercel.app";

        if (!mcpToolName) {
          return { text: "Error: toolName is required for mcp_tool.", isError: true };
        }

        try {
          const res = await fetch(`${serverUrl}/api/mcp/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ toolName: mcpToolName, args: mcpArgs }),
            signal: AbortSignal.timeout(30000),
          });

          if (res.status === 401) {
            // 유저가 로그인 안 됨 — 이벤트로 알림
            onEvent({
              type: "error",
              message: `MCP tool "${mcpToolName}" requires authentication. Please log in to use connected services.`,
            } as AgentEvent);
            return { text: `Error: Authentication required to use MCP tool "${mcpToolName}". The user needs to log in.`, isError: true };
          }

          const data = await res.json();

          if (data.isError) {
            const errorText = data.content?.[0]?.text ?? "Unknown MCP error";
            // 서비스 미연결 감지 — 연결 요청 이벤트 발송
            if (errorText.includes("No connected MCP server")) {
              onEvent({
                type: "mcp_connect_required" as AgentEvent["type"],
                toolName: mcpToolName,
                message: `Service not connected. Please connect the required MCP service to use "${mcpToolName}".`,
              } as AgentEvent);
            }
            return { text: `MCP Error: ${errorText}`, isError: true };
          }

          const resultText = data.content?.map((c: { text?: string }) => c.text ?? "").join("\n") ?? "(no result)";
          return { text: resultText, isError: false };
        } catch (err) {
          return { text: `MCP tool failed: ${err instanceof Error ? err.message : "Unknown error"}`, isError: true };
        }
      }

      case "browse_url": {
        const url = String(input.url ?? "");
        const analyzeAs = String(input.analyzeAs ?? "");
        const serverUrl = this.config.serverUrl || "https://meld-psi.vercel.app";

        try {
          new URL(url);
        } catch {
          return { text: `Invalid URL: "${url}"`, isError: true };
        }

        try {
          const res = await fetch(`${serverUrl}/api/browse`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, analyzeAs: analyzeAs || undefined }),
            signal: AbortSignal.timeout(30000),
          });

          if (!res.ok) {
            const errText = await res.text();
            return { text: `Browse failed (${res.status}): ${errText}`, isError: true };
          }

          const data = await res.json();
          if (data.error) {
            return { text: `Browse error: ${data.error}`, isError: true };
          }

          let result = "";
          if (data.title) result += `Title: ${data.title}\n`;
          if (data.description) result += `Description: ${data.description}\n`;
          result += `URL: ${data.url}\n\n`;

          // Vision AI 분석 결과 (스크린샷 기반)
          if (data.visionAnalysis) {
            result += `═══ VISUAL DESIGN ANALYSIS (from screenshot) ═══\n`;
            result += data.visionAnalysis;
            result += `\n═══ END VISUAL ANALYSIS ═══\n\n`;
          }

          // 페이지 콘텐츠 (마크다운)
          result += `═══ PAGE CONTENT ═══\n`;
          result += data.markdown?.slice(0, 10000) ?? "(no content)";

          return { text: result, isError: false };
        } catch (err) {
          return { text: `Browse failed: ${err instanceof Error ? err.message : "Unknown error"}`, isError: true };
        }
      }

      // ─── Autonomous Agent Tools ────────────────────

      case "ask_user": {
        const question = String(input.question ?? "");
        const inputType = String(input.input_type ?? "text") as "choice" | "text" | "secret" | "confirm";
        const options = (input.options as string[]) ?? [];
        const context = String(input.context ?? "");
        const questionId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

        onEvent({
          type: "agent_question",
          question: { id: questionId, question, inputType, options: options.length > 0 ? options : undefined, context: context || undefined },
        } as AgentEvent);

        // Wait for user response (same pattern as write_file approval)
        const userResponse = await new Promise<string>((resolve) => {
          this.approvalResolvers.set(questionId, ((response: boolean | string) => {
            resolve(typeof response === "string" ? response : response ? "yes" : "no");
          }) as ApprovalResolver);
        });

        return { text: `User response: ${userResponse}`, isError: false };
      }

      case "request_mcp_connection": {
        const serviceId = String(input.service_id ?? "");
        const reason = String(input.reason ?? "");
        const requiredCredentials = (input.required_credentials as string[]) ?? [];
        const requestId = `svc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

        const serviceNames: Record<string, string> = {
          supabase: "Supabase", github: "GitHub", vercel: "Vercel",
          stripe: "Stripe", sentry: "Sentry", linear: "Linear",
          notion: "Notion", slack: "Slack", gmail: "Gmail",
          canva: "Canva", filesystem: "File System", custom_http: "Custom API",
          "toss-payments": "Toss Payments", portone: "PortOne",
        };

        onEvent({
          type: "agent_service_request",
          request: {
            id: requestId,
            serviceId,
            serviceName: serviceNames[serviceId] || serviceId,
            reason,
            credentials: requiredCredentials.map((key) => ({
              key,
              label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
              placeholder: key.includes("key") ? "sk_..." : key.includes("url") ? "https://..." : "",
              isSecret: key.includes("key") || key.includes("secret") || key.includes("token") || key.includes("password"),
            })),
          },
        } as AgentEvent);

        // Wait for user to provide credentials
        const serviceResponse = await new Promise<string>((resolve) => {
          this.approvalResolvers.set(requestId, ((response: boolean | string) => {
            resolve(typeof response === "string" ? response : response ? "connected" : "skipped");
          }) as ApprovalResolver);
        });

        if (serviceResponse === "skipped") {
          return { text: `User skipped connecting ${serviceNames[serviceId] || serviceId}.`, isError: false };
        }

        return { text: `${serviceNames[serviceId] || serviceId} connected successfully. Credentials: ${serviceResponse}`, isError: false };
      }

      case "check_preview": {
        const checkDescription = String(input.check_description ?? "");

        // Find dev server URL
        let devUrl = "http://localhost:3000";
        const portFile = path.join(rootDir, ".meld", "port");
        try {
          const savedPort = (await fs.promises.readFile(portFile, "utf-8")).trim();
          if (savedPort) devUrl = `http://localhost:${savedPort}`;
        } catch { /* use default */ }

        try {
          // Use VM Screen if running (AI and user see the same screen)
          const vm = await import("./vm-screen.js").catch(() => null);
          if (vm && vm.isVMScreenRunning()) {
            // Navigate to dev server in the shared VM screen
            await vm.vmNavigate(devUrl);
            const { screenshot } = await vm.vmScreenshot();

            // Vision analysis
            let analysis = `Preview loaded: ${devUrl}`;
            if (screenshot && checkDescription) {
              const serverUrl = this.config.serverUrl || "https://meld-psi.vercel.app";
              try {
                const res = await fetch(`${serverUrl}/api/ai/vision`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    image: screenshot,
                    prompt: `Check if: "${checkDescription}". Reply PASS or FAIL + brief reason.`,
                  }),
                  signal: AbortSignal.timeout(30000),
                });
                if (res.ok) {
                  const data = await res.json();
                  analysis = data.analysis || data.text || analysis;
                }
              } catch { /* vision unavailable */ }
            }

            onEvent({ type: "preview_check", screenshot, analysis } as AgentEvent);
            const passed = analysis.toLowerCase().includes("pass");
            return { text: `Preview check: ${passed ? "✅ PASS" : "❌ FAIL"}\n${analysis}`, isError: !passed };
          }

          // Fallback: standalone preview checker
          const { checkPreview: runPreviewCheck } = await import("./preview-checker.js");
          const result = await runPreviewCheck(devUrl, checkDescription, {
            apiKey: this.config.apiKey,
            serverUrl: this.config.serverUrl,
          });

          onEvent({ type: "preview_check", screenshot: result.screenshot || "", analysis: result.analysis } as AgentEvent);
          return { text: `Preview check: ${result.success ? "✅" : "❌"}\n${result.analysis}`, isError: !result.success };
        } catch (err) {
          return {
            text: `Preview check failed: ${err instanceof Error ? err.message : "Unknown error"}`,
            isError: false,
          };
        }
      }

      case "set_env_variable": {
        const envKey = String(input.key ?? "");
        const envValue = String(input.value ?? "");
        const isSecret = Boolean(input.is_secret);

        if (!envKey) {
          return { text: "Error: key is required.", isError: true };
        }

        const envPath = path.resolve(rootDir, ".env.local");
        let envContent = "";
        try {
          envContent = await fs.promises.readFile(envPath, "utf-8");
        } catch {
          // File doesn't exist, will create
        }

        // Update or append
        const regex = new RegExp(`^${envKey}=.*$`, "m");
        const newLine = `${envKey}=${envValue}`;
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, newLine);
        } else {
          envContent = envContent.trimEnd() + (envContent ? "\n" : "") + newLine + "\n";
        }

        await fs.promises.writeFile(envPath, envContent, "utf-8");

        const displayValue = isSecret ? envValue.slice(0, 4) + "****" : envValue;
        onEvent({ type: "file_edit_auto", filePath: ".env.local", explanation: `Set ${envKey}=${displayValue}` } as AgentEvent);

        return { text: `Environment variable ${envKey} set in .env.local`, isError: false };
      }

      case "run_and_check": {
        const cmd = String(input.command ?? "");
        const successPattern = String(input.success_pattern ?? "");
        const failurePattern = String(input.failure_pattern ?? "");
        const autoRetry = Boolean(input.auto_retry);

        if (!cmd) {
          return { text: "Error: command is required.", isError: true };
        }

        onEvent({ type: "command_start", command: cmd, cwd: rootDir });

        const result = await this.runCommand(cmd, rootDir, onEvent);
        onEvent({ type: "command_done", command: cmd, exitCode: result.exitCode });

        const output = result.output || "(no output)";
        const isSuccess = result.exitCode === 0
          && (!failurePattern || !output.includes(failurePattern))
          && (!successPattern || output.includes(successPattern));

        if (isSuccess) {
          return { text: `✅ Command succeeded: ${cmd}\n\nOutput:\n${output.slice(0, 3000)}`, isError: false };
        }

        // Failed — return error with context for self-healing
        const errorInfo = `❌ Command failed: ${cmd}\nExit code: ${result.exitCode}\n\nOutput:\n${output.slice(0, 3000)}`;

        if (autoRetry) {
          return {
            text: `${errorInfo}\n\n[AUTO_RETRY] This command failed. Analyze the error above, fix the root cause, and retry. You have up to 3 attempts.`,
            isError: true,
          };
        }

        return { text: errorInfo, isError: true };
      }

      case "deploy_preview": {
        const deployMessage = String(input.message ?? "Preview deployment");

        // Try using Vercel MCP if connected
        const serverUrl = this.config.serverUrl || "https://meld-psi.vercel.app";
        try {
          const res = await fetch(`${serverUrl}/api/mcp/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              toolName: "vercel_deploy",
              args: { message: deployMessage },
            }),
            signal: AbortSignal.timeout(60000),
          });

          if (res.ok) {
            const data = await res.json();
            if (!data.isError) {
              const resultText = data.content?.map((c: { text?: string }) => c.text ?? "").join("\n") ?? "";
              return { text: `✅ Deployed: ${resultText}`, isError: false };
            }
          }
        } catch {
          // Vercel MCP not available
        }

        return {
          text: `Deploy preview requested. To deploy, connect Vercel via MCP or use run_command("npx vercel --yes") if Vercel CLI is installed.`,
          isError: false,
        };
      }

      // ─── Browser Automation Tools (VM Screen — shared with user) ────
      // Auto-Vision: after navigation/click/type, automatically capture + analyze
      // Like Manus — the agent "sees" the result of every meaningful action

      case "browser_open": {
        const url = String(input.url ?? "");
        const waitFor = input.wait_for ? String(input.wait_for) : undefined;

        try {
          new URL(url);
        } catch {
          return { text: `Invalid URL: "${url}"`, isError: true };
        }

        try {
          // Use VM Screen (shared with user) if available, fall back to standalone browser
          const vm = await import("./vm-screen.js").catch(() => null);
          if (vm && vm.isVMScreenRunning()) {
            const result = await vm.vmNavigate(url, { waitFor });
            const { screenshot } = await vm.vmScreenshot();
            // Auto-Vision: analyze what the page looks like
            let visionResult = "";
            if (screenshot) {
              visionResult = await this.autoVisionAnalyze(screenshot, `Page just opened: ${url}. Describe what you see — layout, main content, any errors or loading states.`);
              onEvent({ type: "preview_check", screenshot, analysis: visionResult } as AgentEvent);
            }
            return {
              text: `Page opened: ${result.title}\nURL: ${result.url}\n\n🔍 Vision: ${visionResult || "[screenshot captured]"}`,
              isError: !result.success,
            };
          }

          const { browserOpen } = await import("./browser-agent.js");
          const result = await browserOpen(url, {
            waitFor,
            serverUrl: this.config.serverUrl || "https://meld-psi.vercel.app",
          });
          return {
            text: `Page opened: ${result.title}\nURL: ${result.url}\n\nContent:\n${result.content}`,
            isError: false,
          };
        } catch (err) {
          return { text: `Browser open failed: ${err instanceof Error ? err.message : "Unknown error"}`, isError: true };
        }
      }

      case "browser_click": {
        const selector = input.selector ? String(input.selector) : undefined;
        const text = input.text ? String(input.text) : undefined;

        try {
          const vm = await import("./vm-screen.js").catch(() => null);
          if (vm && vm.isVMScreenRunning()) {
            const result = await vm.vmClick({ selector, text });
            // Auto-Vision after click
            if (result.success) {
              const { screenshot } = await vm.vmScreenshot();
              if (screenshot) {
                const vision = await this.autoVisionAnalyze(screenshot, `Just clicked "${selector || text}". What changed on the page? Any navigation, modal, or state change?`);
                onEvent({ type: "preview_check", screenshot, analysis: vision } as AgentEvent);
                return { text: `${result.message}\n\n🔍 Vision: ${vision}`, isError: false };
              }
            }
            return { text: result.message, isError: !result.success };
          }

          const { browserClick } = await import("./browser-agent.js");
          const result = await browserClick({ selector, text });
          return { text: result.message, isError: !result.success };
        } catch (err) {
          return { text: `Browser click failed: ${err instanceof Error ? err.message : "Unknown error"}`, isError: true };
        }
      }

      case "browser_type": {
        const selector = String(input.selector ?? "");
        const text = String(input.text ?? "");
        const clearFirst = input.clear_first !== false;

        try {
          const vm = await import("./vm-screen.js").catch(() => null);
          if (vm && vm.isVMScreenRunning()) {
            const result = await vm.vmType(selector, text, clearFirst);
            // Auto-Vision after typing (to see validation, autocomplete, etc.)
            if (result.success) {
              const { screenshot } = await vm.vmScreenshot();
              if (screenshot) {
                const vision = await this.autoVisionAnalyze(screenshot, `Just typed "${text.slice(0, 30)}${text.length > 30 ? "..." : ""}" into "${selector}". Is the text visible? Any validation errors or suggestions?`);
                return { text: `${result.message}\n\n🔍 Vision: ${vision}`, isError: false };
              }
            }
            return { text: result.message, isError: !result.success };
          }

          const { browserType } = await import("./browser-agent.js");
          const result = await browserType(selector, text, clearFirst);
          return { text: result.message, isError: !result.success };
        } catch (err) {
          return { text: `Browser type failed: ${err instanceof Error ? err.message : "Unknown error"}`, isError: true };
        }
      }

      case "browser_screenshot": {
        const analyze = input.analyze ? String(input.analyze) : undefined;

        try {
          const vm = await import("./vm-screen.js").catch(() => null);
          if (vm && vm.isVMScreenRunning()) {
            const { screenshot, url: pageUrl, title } = await vm.vmScreenshot();

            // If analysis requested, send to Vision
            let analysis = "";
            if (analyze && screenshot) {
              const serverUrl = this.config.serverUrl || "https://meld-psi.vercel.app";
              try {
                const res = await fetch(`${serverUrl}/api/ai/vision`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ image: screenshot, prompt: analyze }),
                  signal: AbortSignal.timeout(30000),
                });
                if (res.ok) {
                  const data = await res.json();
                  analysis = data.analysis || data.text || "";
                }
              } catch { /* vision unavailable */ }
            }

            onEvent({ type: "preview_check", screenshot, analysis: analysis || `Screenshot of ${pageUrl}` } as AgentEvent);
            return { text: analysis || `[Screenshot captured: ${title} — ${pageUrl}]`, isError: false };
          }

          // Fallback
          const { browserScreenshot } = await import("./browser-agent.js");
          const result = await browserScreenshot({
            analyze,
            serverUrl: this.config.serverUrl || "https://meld-psi.vercel.app",
          });
          if (result.screenshot) {
            onEvent({ type: "preview_check", screenshot: result.screenshot, analysis: result.analysis || "Screenshot captured" } as AgentEvent);
          }
          return { text: result.analysis || "[Screenshot captured]", isError: false };
        } catch (err) {
          return { text: `Screenshot failed: ${err instanceof Error ? err.message : "Unknown error"}`, isError: true };
        }
      }

      case "browser_evaluate": {
        const script = String(input.script ?? "");
        if (!script) return { text: "Error: script is required.", isError: true };

        try {
          const vm = await import("./vm-screen.js").catch(() => null);
          if (vm && vm.isVMScreenRunning()) {
            const result = await vm.vmEvaluate(script);
            return { text: result.result, isError: !result.success };
          }

          const { browserEvaluate } = await import("./browser-agent.js");
          const result = await browserEvaluate(script);
          return { text: result.result, isError: !result.success };
        } catch (err) {
          return { text: `Evaluate failed: ${err instanceof Error ? err.message : "Unknown error"}`, isError: true };
        }
      }

      case "browser_scroll": {
        const direction = String(input.direction ?? "down") as "up" | "down" | "top" | "bottom";
        const amount = Number(input.amount ?? 500);

        try {
          const vm = await import("./vm-screen.js").catch(() => null);
          if (vm && vm.isVMScreenRunning()) {
            const result = await vm.vmScroll(direction, amount);
            return { text: result.success ? `Scrolled ${direction}` : "Scroll failed", isError: !result.success };
          }

          const { browserScroll } = await import("./browser-agent.js");
          const result = await browserScroll(direction, amount);
          return { text: result.message, isError: !result.success };
        } catch (err) {
          return { text: `Scroll failed: ${err instanceof Error ? err.message : "Unknown error"}`, isError: true };
        }
      }

      default:
        return { text: `Unknown tool: ${toolName}`, isError: true };
    }
  }

  // ─── Session saving ──────────────────────────────────────

  // ─── Auto Vision Analysis (Manus-style) ──────────
  // Called after browser actions to "see" the result
  private async autoVisionAnalyze(screenshotBase64: string, prompt: string): Promise<string> {
    const serverUrl = this.config.serverUrl || "https://meld-psi.vercel.app";
    try {
      const res = await fetch(`${serverUrl}/api/ai/vision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: screenshotBase64, prompt }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.analysis || data.text || "";
      }
      return "";
    } catch {
      return "";
    }
  }

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

  private getSystemPorts(): number[] {
    try {
      let output: string;
      if (os.platform() === "win32") {
        output = childProcess.execSync("netstat -an | findstr LISTENING", { encoding: "utf-8", timeout: 3000 });
        const matches = output.matchAll(/:(\d+)\s/g);
        return [...new Set([...matches].map(m => parseInt(m[1], 10)).filter(p => p > 1024))];
      } else {
        output = childProcess.execSync("lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null | awk '{print $9}'", { encoding: "utf-8", timeout: 3000 });
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
    for (const p of this.getSystemPorts()) banned.add(p);
    return Array.from(banned).filter(p => p > 1024).sort((a, b) => a - b).join(", ");
  }

  private isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
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

    // ─── TIER 1: Core identity + rules (ALWAYS present, ~800 tokens) ───
    let prompt = `You are Meld AI, a fully autonomous coding agent.

CORE LOOP: PLAN → BUILD → VERIFY → FIX → DELIVER
- PLAN: Analyze request, create structured plan with tech stack decisions, write PLAN.md.
- BUILD: Execute plan. Complete files only. No placeholders.
- VERIFY: MUST test via browser_open + browser_screenshot + Vision AI. Never skip.
- FIX: Self-heal errors (3 retries). Read error → diagnose → fix → re-verify.
- DELIVER: Only after build passes + browser works + UI verified via screenshot.

RULES:
- Never ask "what would you like?" — decide yourself.
- Never deliver unverified code. You are a developer who tests their own work.
- Read files before editing. Preserve existing patterns.
- write_file = COMPLETE file. Explanation = ONE sentence.
- Maintain PLAN.md as checkpoint. Write results to files, not just context.
- Match user's language (Korean → Korean, English → English).
- Ports: use 18000-28000. Banned: ${this.getBannedPortsList()}
`;

    // ─── TIER 2: Conditional capabilities (loaded when relevant) ───

    // Planning engine — only for non-trivial requests
    const command = input.command.toLowerCase();
    const isNonTrivial = command.length > 30 || /만들|build|create|implement|add.*feature|추가/i.test(command);

    if (isNonTrivial) {
      prompt += `
PLANNING: For this request, first output a plan:
**기술 설계** — Architecture, tech stack (with WHY), DB schema, phases, required services/packages.
Decide: simplest solution, serverless > servers, Supabase Auth+RT > separate services.
Payments: Global → Stripe, Korean → Toss Payments/PortOne, Both → ask_user.
`;
    }

    // Self-healing — always compact
    prompt += `
SELF-HEAL: Error → read → diagnose → fix → retry (3x). Then ask_user.
`;

    // Browser/Vision — only mention if tools are available
    prompt += `
VISION: You have eyes. After build/feature/fix, use browser_screenshot({ analyze: "..." }) to SEE the result. browser_open → browser_click → browser_type → browser_screenshot for full flow testing.
`;

    // ─── TIER 3: Dynamic context (selective, compressed) ───

    // Category persona — compact version
    if (ctx?.category && CATEGORY_PERSONAS[ctx.category]) {
      // Only include first 500 chars of persona (key strategy, not full detail)
      prompt += `\nROLE: ${ctx.category.toUpperCase()} specialist.\n${CATEGORY_PERSONAS[ctx.category].slice(0, 500)}\n`;
    }

    // Framework — one-liner + key rules only
    if (ctx?.framework) {
      prompt += `\nFRAMEWORK: ${ctx.framework}.\n`;
      prompt += this.getFrameworkGuidelines(ctx.framework, ctx.dependencies);
    }

    // Dependencies — just the list, no verbose instructions
    if (ctx?.dependencies?.length) {
      prompt += `\nDEPS: ${ctx.dependencies.slice(0, 30).join(", ")}. Use these; don't install alternatives.\n`;
    }

    // Design system — compressed: only first 1000 chars
    if (ctx?.designSystemMd) {
      prompt += `\nDESIGN SYSTEM (follow strictly):\n${ctx.designSystemMd.slice(0, 1000)}\n`;
    }

    // File tree — only first 50 files
    if (ctx?.fileTree?.length) {
      prompt += `\nFILES:\n${ctx.fileTree.slice(0, 50).join("\n")}\n`;
    }

    // Selected file — include full code (this is what the user is working on)
    if (ctx?.selectedFile) {
      prompt += `\nSELECTED: ${ctx.selectedFile}\n`;
    }
    if (ctx?.currentCode) {
      prompt += `\`\`\`\n${ctx.currentCode.slice(0, 3000)}\n\`\`\`\n`;
    }

    // Related files — only function signatures, not full code
    if (ctx?.nearbyFiles && Object.keys(ctx.nearbyFiles).length > 0) {
      prompt += `\nRELATED FILES:\n`;
      for (const [filePath, content] of Object.entries(ctx.nearbyFiles)) {
        // Extract only exports/function signatures (first 300 chars)
        prompt += `--- ${filePath} ---\n${content.slice(0, 300)}\n`;
      }
    }

    // Element history — compact
    if (ctx?.elementHistory?.length) {
      prompt += `\nELEMENT HISTORY: ${ctx.elementHistory.slice(-3).join(" | ")}\n`;
    }

    // Custom instructions — always include (user explicitly set these)
    if (ctx?.customInstructions) {
      prompt += `\nCUSTOM RULES:\n${ctx.customInstructions}\n`;
    }

    // Skills — compact
    if (ctx?.skillsContent) {
      prompt += `\nSKILLS:\n${ctx.skillsContent.slice(0, 500)}\n`;
    }

    // Preferences — compact
    if (ctx?.preferences) {
      prompt += `\nPREFERENCES: ${ctx.preferences}\n`;
    }

    // Terminal — only last 500 chars (most recent errors)
    if (ctx?.terminalLogs) {
      prompt += `\nTERMINAL (recent):\n${ctx.terminalLogs.slice(-500)}\n`;
    }

    // Connected services — one-liner
    if (ctx?.connectedServices) {
      prompt += `\nSERVICES: ${ctx.connectedServices}\n`;
    }

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
      // Ignore pattern analysis failure
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
