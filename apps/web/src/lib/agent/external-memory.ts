// Filesystem-backed external memory for the agent (Phase 4-fix).
//
// Manus calls this "file system as context": instead of shrinking
// big tool_results with a summary (lossy) or relying on a sliding
// summarizer (expensive), we persist the raw payload to a stable
// location inside the sandbox and leave only a compact card in the
// LLM context. When the agent needs the full content later, it can
// read the file back deterministically.
//
// Key properties:
//   - lossless  — the sandbox file IS the full payload
//   - cache-friendly  — the card inserted into context is short and
//     deterministic, so prompt caching stays warm
//   - agent-discoverable  — the card contains an explicit read_file
//     hint so Claude knows how to recover the data
//
// The `stash` helper takes the raw body plus some metadata and
// returns `{ card, path }`. The caller decides whether to feed the
// card or the full body to the LLM based on size thresholds.

import type { Sandbox } from "e2b";

const CACHE_DIR = "/home/user/project/.meld/cache";

/** Threshold above which a tool_result gets stashed. Tuned so we
 *  only pay the sandbox write cost for genuinely big payloads. */
export const STASH_THRESHOLD_CHARS = 4096;

export interface StashInput {
  sandbox: Sandbox;
  /** Tool name that produced this payload (`run_command`, `read_file`, `browse_url`, or an MCP tool name). */
  tool: string;
  /** Short identifier: filename, URL, command, etc. Used in the card and filename. */
  ref: string;
  /** The full body to stash. */
  body: string;
  /** Optional pre-computed line count so we don't split twice. */
  lineCount?: number;
}

export interface StashedCard {
  /** The compact card text to feed back to the LLM. */
  card: string;
  /** Path inside the sandbox where the full body was written. */
  path: string;
  /** Original byte-length. */
  originalChars: number;
}

/**
 * Write `body` to the sandbox cache and return a compact card the
 * LLM sees instead of the raw payload. The card always points to
 * the path so the agent can `read_file` it back on demand.
 *
 * If the sandbox write fails for any reason, we fall back to an
 * in-context truncated preview — the agent still gets something.
 */
export async function stashToSandbox(input: StashInput): Promise<StashedCard | null> {
  const { sandbox, tool, ref, body } = input;
  if (!body || body.length === 0) return null;

  const lines = input.lineCount ?? body.split("\n").length;
  const safeRef = ref.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40);
  const stamp = Date.now();
  const path = `${CACHE_DIR}/${stamp}-${tool}-${safeRef}.txt`;

  try {
    await sandbox.commands.run(`mkdir -p ${CACHE_DIR}`, { timeoutMs: 5000 }).catch(() => {});
    await sandbox.files.write(path, body);
  } catch {
    return null;
  }

  const preview = body.slice(0, 300).replace(/\n/g, " ⏎ ");
  const card =
    `[stashed to ${path}]\n` +
    `tool: ${tool}\n` +
    `ref: ${ref}\n` +
    `size: ${body.length} chars · ${lines} lines\n` +
    `preview: ${preview}${body.length > 300 ? "…" : ""}\n` +
    `\n` +
    `→ Full payload saved to the sandbox. To read it back, call:\n` +
    `  read_file { path: "${path.replace("/home/user/project/", "")}" }\n` +
    `Or grep a narrower slice with run_command:\n` +
    `  run_command { command: "grep -n 'PATTERN' ${path}" }\n`;

  return { card, path, originalChars: body.length };
}
