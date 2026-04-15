// Harness core types
//
// Shared contract for every harness provider. This file is the single source
// of truth for message shapes, events, and the HarnessConfig envelope.
//
// IMPORTANT: nothing in this file may import from apps/web/src/app/api/ai/agent-run
// or from lib/store/agent-session*. The harness is an independent subsystem.

// ─── Messages (model-facing) ──────────────────────────

export interface TextContentBlock {
  type: "text";
  text: string;
}

export interface ToolUseContentBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContentBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type ContentBlock = TextContentBlock | ToolUseContentBlock | ToolResultContentBlock;

export interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

// ─── Tool schema (wire format — matches Claude API shape) ──

export interface ToolSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

export interface ToolDef {
  name: string;
  description: string;
  input_schema: ToolSchema;
}

// ─── Events (what the harness emits to UI/session) ────

export type HarnessEventType =
  // model / loop lifecycle
  | "round_started"
  | "round_completed"
  | "thinking"
  | "message"
  | "done"
  | "error"
  | "cancelled"
  // tool activity
  | "tool_call"
  | "tool_result"
  // sandbox activity
  | "sandbox_acquired"
  | "sandbox_released"
  | "sandbox_restored"
  | "sandbox_snapshot_saved"
  | "dev_server_detected"
  | "command_output"
  // file activity
  | "file_read"
  | "file_write"
  | "file_delete"
  // 3-agent pipeline stage markers
  | "stage_started"
  | "stage_completed"
  | "plan_produced"
  | "evaluation_verdict";

export interface HarnessEvent {
  type: HarnessEventType;
  timestamp: number;
  // Discriminated payload — readers narrow by `type`.
  [key: string]: unknown;
}

// ─── Model provider ───────────────────────────────────

export interface ModelCompleteRequest {
  system: string;
  messages: Message[];
  tools: ToolDef[];
  maxTokens: number;
  temperature?: number;
}

export interface ModelCompleteResponse {
  content: ContentBlock[];
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
  };
}

export interface ModelProvider {
  readonly id: string;
  complete(req: ModelCompleteRequest): Promise<ModelCompleteResponse>;
}

// ─── Tool provider ────────────────────────────────────

export interface ToolExecutionContext {
  sandbox: SandboxHandle;
  emit: (event: HarnessEvent) => void;
  /** Opaque user/session identity — tools that need it (MCP) get it here. */
  userId: string;
  sessionId: string;
}

export interface ToolExecutionResult {
  text: string;
  isError: boolean;
  /** Optional structured artifact (screenshot URL, parsed JSON, etc). */
  artifact?: Record<string, unknown>;
}

export interface Tool {
  def: ToolDef;
  execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolExecutionResult>;
}

export interface ToolProvider {
  /** Returns the tool catalogue available to the model right now. */
  list(userId: string): Promise<Tool[]>;
}

// ─── Sandbox provider ─────────────────────────────────

export interface SandboxConfig {
  template: string;
  timeoutMs: number;
  workingDir?: string;
}

export interface ExecOptions {
  cwd?: string;
  timeoutMs?: number;
  background?: boolean;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SandboxHandle {
  readonly id: string;
  exec(command: string, options?: ExecOptions): Promise<ExecResult>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  /** Returns a public URL for a port exposed inside the sandbox. */
  getPublicUrl(port: number): string;
  /**
   * Tarball + base64 the sandbox's working directory so the result can
   * be persisted in metadata and later restored into a fresh sandbox.
   * Implementations may exclude `node_modules`, `.next`, `.git`, etc.
   * to keep the payload small.
   */
  dumpSnapshot?(): Promise<{ data: string; sizeBytes: number }>;
  /**
   * Inverse of dumpSnapshot — write a base64 tar.gz back into the
   * working directory. Existing files are overwritten.
   */
  restoreSnapshot?(data: string): Promise<void>;
}

export interface SandboxProvider {
  readonly id: string;
  acquire(config: SandboxConfig): Promise<SandboxHandle>;
  release(handle: SandboxHandle): Promise<void>;
}

// ─── Session store ────────────────────────────────────

export interface SessionInit {
  userId: string;
  agentId?: string;
  prompt: string;
}

export interface SessionCheckpoint {
  label: string;
  createdAt: number;
  eventCount: number;
}

export interface SessionSnapshot {
  id: string;
  userId: string;
  agentId?: string;
  prompt: string;
  status: "pending" | "running" | "completed" | "error" | "cancelled";
  createdAt: number;
  completedAt?: number;
  events: HarnessEvent[];
  checkpoints: SessionCheckpoint[];
}

export interface SessionHandle {
  readonly id: string;
  readonly userId: string;
  readonly agentId?: string;
}

export interface SessionStore {
  create(init: SessionInit): Promise<SessionHandle>;
  append(sessionId: string, event: HarnessEvent): Promise<void>;
  getEvents(sessionId: string, since?: number): Promise<HarnessEvent[]>;
  getSnapshot(sessionId: string): Promise<SessionSnapshot | null>;
  markComplete(sessionId: string, status: "completed" | "error" | "cancelled"): Promise<void>;
  checkpoint(sessionId: string, label: string): Promise<SessionCheckpoint>;
  resume(sessionId: string): Promise<SessionSnapshot | null>;

  /**
   * Optional sandbox snapshot persistence — lets the harness store a
   * tarball of the sandbox filesystem alongside the session so the
   * next resume can rehydrate the exact same working tree. Stores
   * that don't support snapshots (e.g. in-memory dev store) leave
   * these undefined.
   */
  saveSandboxSnapshot?(sessionId: string, data: string, sizeBytes: number): Promise<void>;
  loadSandboxSnapshot?(sessionId: string): Promise<{ data: string; sizeBytes: number; capturedAt: number } | null>;
}

// ─── Orchestration strategy ───────────────────────────

export interface OrchestrationState {
  round: number;
  /** Messages the model will see on the next call. */
  messages: Message[];
  /** Token budget tracking. */
  tokensUsed: number;
  /** Free-form state scratchpad for the strategy. */
  scratch: Record<string, unknown>;
}

export interface RoundResult {
  response: ModelCompleteResponse;
  toolResults: Array<{ callId: string; result: ToolExecutionResult }>;
}

export type NextStepDecision =
  | { type: "call_model" }
  | { type: "compress"; reason: string }
  | { type: "stop"; reason: string };

export interface OrchestrationStrategy {
  readonly id: string;
  initialState(init: { systemPrompt: string; userPrompt: string }): OrchestrationState;
  nextStep(state: OrchestrationState, lastRound: RoundResult | null): NextStepDecision;
  onRoundComplete(state: OrchestrationState, round: RoundResult): OrchestrationState;
  compress(state: OrchestrationState): OrchestrationState;
}

// ─── HarnessConfig — the envelope ─────────────────────

export interface HarnessConfig {
  userId: string;
  agentId?: string;
  initialPrompt: string;
  systemPrompt: string;
  maxTokens: number;
  sandboxConfig: SandboxConfig;

  model: ModelProvider;
  tools: ToolProvider;
  sandbox: SandboxProvider;
  session: SessionStore;
  orchestration: OrchestrationStrategy;
}

export interface HarnessResult {
  sessionId: string;
  status: "completed" | "error" | "cancelled";
  finalMessage?: string;
  error?: string;
}
