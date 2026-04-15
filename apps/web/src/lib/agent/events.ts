// Shared agent event schema.
//
// Both engines (the legacy /api/ai/agent-run single-loop and the harness
// pipeline under /lib/harness/) emit events into the same event stream
// for the workspace UI to consume. Defining the schema here means there's
// exactly one source of truth for event names + payload shapes — no
// drift between the two emitters.
//
// All events are JSON-serializable. The polling endpoint pushes them as
// raw objects; the workspace polling loop matches `event.type` and feeds
// the agent store.

export interface BaseAgentEvent {
  type: string;
  /** Wall-clock millisecond timestamp the event was emitted. */
  timestamp?: number;
}

// ─── Reasoning / output ──────────────────────────────

export interface ThinkingEvent extends BaseAgentEvent {
  type: "thinking";
  content: string;
}

export interface MessageEvent extends BaseAgentEvent {
  type: "message";
  content: string;
}

export interface ErrorEvent extends BaseAgentEvent {
  type: "error";
  message: string;
}

// ─── Tool call lifecycle ─────────────────────────────

export interface ToolCallEvent extends BaseAgentEvent {
  type: "tool_call";
  toolName: string;
  input?: Record<string, unknown>;
}

export interface ToolResultEvent extends BaseAgentEvent {
  type: "tool_result";
  toolName?: string;
  result?: string;
  isError?: boolean;
}

// ─── File system events ─────────────────────────────

export interface FileEditAutoEvent extends BaseAgentEvent {
  type: "file_edit_auto" | "file_edit";
  filePath: string;
  /** Full content the file was written with. Optional for legacy events. */
  content?: string;
  /** Brief explanation the agent supplied with the edit. */
  explanation?: string;
}

export interface FileReadEvent extends BaseAgentEvent {
  type: "file_read";
  filePath: string;
}

export interface FileDeleteEvent extends BaseAgentEvent {
  type: "file_delete";
  filePath: string;
}

export interface FileRenameEvent extends BaseAgentEvent {
  type: "file_rename";
  from: string;
  to: string;
}

// ─── Command execution ───────────────────────────────

export interface CommandStartEvent extends BaseAgentEvent {
  type: "command_start";
  command: string;
}

export interface CommandOutputEvent extends BaseAgentEvent {
  type: "command_output";
  stream: "stdout" | "stderr";
  data: string;
}

export interface CommandDoneEvent extends BaseAgentEvent {
  type: "command_done";
  command: string;
  exitCode: number;
}

// ─── Dev server detection ────────────────────────────

export interface DevServerEvent extends BaseAgentEvent {
  type: "devServer";
  url: string;
  port: number;
  framework?: string;
}

// ─── Web search / browsing ───────────────────────────

export interface SearchStartEvent extends BaseAgentEvent {
  type: "search_start";
  query: string;
}

export interface SearchResultsEvent extends BaseAgentEvent {
  type: "search_results";
  query: string;
  results: Array<{ title: string; url: string; snippet: string }>;
}

export interface SearchErrorEvent extends BaseAgentEvent {
  type: "search_error";
  query: string;
}

export interface BrowseStartEvent extends BaseAgentEvent {
  type: "browse_start";
  url: string;
}

export interface BrowserScreenshotEvent extends BaseAgentEvent {
  type: "browser_screenshot";
  url: string;
  title?: string;
  screenshotUrl?: string;
  description?: string;
}

// ─── MCP request flow ────────────────────────────────

export interface McpRequestEvent extends BaseAgentEvent {
  type: "mcp_request";
  /** MCP server id — must match an entry in lib/mcp/adapters. */
  serverId: string;
  /** One-sentence reason in the user's language. */
  reason: string;
}

// ─── Pipeline / orchestration (used by harness) ──────

export interface StageStartedEvent extends BaseAgentEvent {
  type: "stage_started";
  stage: "planner" | "generator" | "evaluator" | string;
}

export interface StageCompletedEvent extends BaseAgentEvent {
  type: "stage_completed";
  stage: "planner" | "generator" | "evaluator" | string;
  verdict?: unknown;
}

// ─── Discriminated union ────────────────────────────

export type AgentEvent =
  | ThinkingEvent
  | MessageEvent
  | ErrorEvent
  | ToolCallEvent
  | ToolResultEvent
  | FileEditAutoEvent
  | FileReadEvent
  | FileDeleteEvent
  | FileRenameEvent
  | CommandStartEvent
  | CommandOutputEvent
  | CommandDoneEvent
  | DevServerEvent
  | SearchStartEvent
  | SearchResultsEvent
  | SearchErrorEvent
  | BrowseStartEvent
  | BrowserScreenshotEvent
  | McpRequestEvent
  | StageStartedEvent
  | StageCompletedEvent;

/**
 * Type guard for narrowing a raw event from the polling endpoint
 * (which sends untyped JSON) into our discriminated union.
 */
export function isAgentEvent(value: unknown): value is AgentEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}
