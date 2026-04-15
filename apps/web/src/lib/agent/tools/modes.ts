// Dynamic tool-subset selection (Phase 3 of P0-4 context engineering).
//
// Instead of sending Claude all 10 tools on every round, we infer a
// coarse "mode" from recent tool activity and advertise only the
// tools relevant to that mode. Tool definitions alone are 2~5K tokens;
// trimming them to ~half saves directly on input cost AND reduces the
// odds the model reaches for an irrelevant tool.
//
// CACHE CONSTRAINT (important):
//   The `tools` array is part of the cache prefix. Swapping it
//   invalidates `cache_control` markers. Therefore:
//     1. We default to `implement` which is the richest subset —
//        most sessions complete without ever switching modes.
//     2. We only switch when the classifier is confident the agent
//        has left `implement`. No round-by-round thrashing.
//     3. On switch, one cache rebuild is acceptable; staying in the
//        same mode for the rest of the session recovers the cost.
//
// The classifier is rule-based (no LLM call): it looks at the last
// `RECENT_WINDOW` tool invocations and picks the mode whose signature
// matches best.

import {
  BUILTIN_TOOLS_WITH_MCP_REQUEST,
  READ_FILE_TOOL,
  LIST_FILES_TOOL,
  SEARCH_FILES_TOOL,
  RUN_COMMAND_TOOL,
  WEB_SEARCH_TOOL,
  BROWSE_URL_TOOL,
  REQUEST_MCP_TOOL,
  type BuiltinToolDef,
} from "./schemas";

export type AgentMode = "explore" | "implement" | "verify" | "browse" | "debug";

export const DEFAULT_MODE: AgentMode = "implement";

/** How many recent tool calls the classifier looks at. */
const RECENT_WINDOW = 5;

/**
 * Per-mode tool subsets. Ordered so that the last tool in each array
 * is a stable choice for `cache_control: { type: "ephemeral" }` (the
 * workspace loop sets cache_control on `tools[tools.length - 1]`).
 *
 * - explore: reading + searching + web research. No writes.
 * - implement: full power. Default. Includes everything except the
 *   dedicated browse subset.
 * - verify: run commands, read files, peek at URLs — post-build sanity
 *   checks without tempting the model to edit more files.
 * - browse: reading the web. Used when the agent is in research mode.
 * - debug: investigation + command re-runs. Reads, searches, runs.
 *
 * `request_mcp` is always present — it's the escape hatch for external
 * data and costs almost nothing in tokens.
 */
export const MODE_TOOL_SUBSETS: Record<AgentMode, BuiltinToolDef[]> = {
  explore: [
    LIST_FILES_TOOL,
    READ_FILE_TOOL,
    SEARCH_FILES_TOOL,
    WEB_SEARCH_TOOL,
    REQUEST_MCP_TOOL,
  ],
  implement: BUILTIN_TOOLS_WITH_MCP_REQUEST,
  verify: [
    READ_FILE_TOOL,
    RUN_COMMAND_TOOL,
    BROWSE_URL_TOOL,
    REQUEST_MCP_TOOL,
  ],
  browse: [
    READ_FILE_TOOL,
    WEB_SEARCH_TOOL,
    BROWSE_URL_TOOL,
    REQUEST_MCP_TOOL,
  ],
  debug: [
    READ_FILE_TOOL,
    SEARCH_FILES_TOOL,
    LIST_FILES_TOOL,
    RUN_COMMAND_TOOL,
    WEB_SEARCH_TOOL,
    REQUEST_MCP_TOOL,
  ],
};

/** A minimal trace entry the classifier inspects. */
export interface ToolTraceEntry {
  name: string;
  isError: boolean;
}

/** Append a trace entry, keeping the buffer bounded. */
export function appendTrace(
  buffer: ToolTraceEntry[],
  entry: ToolTraceEntry,
): ToolTraceEntry[] {
  const next = [...buffer, entry];
  if (next.length > RECENT_WINDOW * 2) {
    return next.slice(next.length - RECENT_WINDOW * 2);
  }
  return next;
}

/**
 * Classify the recent trace into a mode. Returns `DEFAULT_MODE` when
 * there's no clear signal — most sessions stay here.
 *
 * Rules (in priority order, first match wins):
 *   1. debug   — at least one `run_command` + error in the window
 *   2. browse  — `browse_url` present AND no writes
 *   3. verify  — `run_command` present AND at least one `read_file`
 *                AND no writes in the window (post-build sanity)
 *   4. explore — only reads / lists / searches / web_search, no writes
 *   5. implement — default (writes present OR mixed)
 */
export function classifyMode(trace: ToolTraceEntry[]): AgentMode {
  const recent = trace.slice(-RECENT_WINDOW);
  if (recent.length === 0) return DEFAULT_MODE;

  const names = recent.map((e) => e.name);
  const has = (n: string) => names.includes(n);
  const countOf = (n: string) => names.filter((x) => x === n).length;
  const writeNames = ["write_file", "delete_file", "rename_file"];
  const hasWrite = recent.some((e) => writeNames.includes(e.name));
  const hasError = recent.some((e) => e.isError);

  if (has("run_command") && hasError) return "debug";
  if (has("browse_url") && !hasWrite) return "browse";
  if (has("run_command") && has("read_file") && !hasWrite) return "verify";

  const readOnlyNames = new Set([
    "read_file",
    "list_files",
    "search_files",
    "web_search",
  ]);
  const allReadOnly = recent.every((e) => readOnlyNames.has(e.name));
  if (allReadOnly && countOf("write_file") === 0) return "explore";

  return DEFAULT_MODE;
}

/** Pick the subset for a given mode. */
export function toolsForMode(mode: AgentMode): BuiltinToolDef[] {
  return MODE_TOOL_SUBSETS[mode];
}
