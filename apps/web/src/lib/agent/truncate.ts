// Tool-output truncation layer (Phase 2 of P0-4 context engineering).
//
// Raw tool results (command stdout, file reads, browse HTML) balloon
// the agent's context window. This module is the single place where
// we shrink them before they're fed back as `tool_result` blocks. Each
// function returns the compacted text plus bookkeeping so the caller
// can log leverage and emit metrics.
//
// Policy (tuned to Phase 2 budgets in TODO.md P0-4):
//   run_command: 4KB window  → head 1.5KB + tail 1.5KB
//   read_file:   500 lines   → head 100 + tail 100
//   browse_url:  8KB window  → strip html, keep headers on overflow
//   list_files:  directory histogram instead of raw find output
//
// All functions are pure and character-count based.

export interface TruncationResult {
  text: string;
  originalChars: number;
  omittedChars: number;
}

const RUN_COMMAND_LIMIT = 4096;
const RUN_COMMAND_HEAD = 1536;
const RUN_COMMAND_TAIL = 1536;

const READ_FILE_LINE_LIMIT = 500;
const READ_FILE_HEAD_LINES = 100;
const READ_FILE_TAIL_LINES = 100;

const BROWSE_LIMIT = 8192;

/**
 * Shrink run_command output. On failure we bias toward stderr so the
 * agent can still see the error. On success we keep head + tail and
 * elide the middle.
 */
export function truncateCommandOutput(
  stdout: string,
  stderr: string,
  isError: boolean,
): TruncationResult {
  const combined = isError
    ? (stderr || stdout || "(no output)")
    : ((stdout || "") + (stderr || "") || "(no output)");

  const originalChars = combined.length;
  if (originalChars <= RUN_COMMAND_LIMIT) {
    return { text: combined, originalChars, omittedChars: 0 };
  }

  const head = combined.slice(0, RUN_COMMAND_HEAD);
  const tail = combined.slice(combined.length - RUN_COMMAND_TAIL);
  const omittedChars = originalChars - head.length - tail.length;
  const headLines = head.split("\n").length;
  const tailLines = tail.split("\n").length;
  const totalLines = combined.split("\n").length;
  const skippedLines = Math.max(0, totalLines - headLines - tailLines);

  const marker = `\n... [${skippedLines}줄 / ${omittedChars} chars 생략] ...\n`;
  return {
    text: head + marker + tail,
    originalChars,
    omittedChars,
  };
}

/**
 * Shrink read_file output. Keep head + tail of the file and inject a
 * hint pointing the agent at `grep`/`sed` for targeted reads.
 */
export function truncateFileContent(
  content: string,
  path: string,
): TruncationResult {
  const originalChars = content.length;
  const lines = content.split("\n");
  if (lines.length <= READ_FILE_LINE_LIMIT) {
    return { text: content, originalChars, omittedChars: 0 };
  }

  const head = lines.slice(0, READ_FILE_HEAD_LINES).join("\n");
  const tail = lines.slice(lines.length - READ_FILE_TAIL_LINES).join("\n");
  const skipped = lines.length - READ_FILE_HEAD_LINES - READ_FILE_TAIL_LINES;
  const text =
    `${head}\n` +
    `\n... [${skipped}줄 생략 · 필요한 부분만 grep "..." ${path} 또는 sed -n 'A,Bp' ${path} 로 다시 읽으세요] ...\n\n` +
    `${tail}`;

  return {
    text,
    originalChars,
    omittedChars: originalChars - text.length,
  };
}

/**
 * Shrink browse_url output. Strip obvious HTML noise, hard-cap at the
 * browse budget, and on overflow collapse to markdown headings so the
 * agent can still navigate the page structure.
 */
export function truncateBrowseResult(raw: string): TruncationResult {
  // Cheap HTML strip for cases where the upstream returns raw HTML.
  // If the upstream already gave us markdown (common path), these
  // replacements are no-ops.
  const stripped = raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  const originalChars = stripped.length;
  if (originalChars <= BROWSE_LIMIT) {
    return { text: stripped, originalChars, omittedChars: 0 };
  }

  // Overflow path: pull markdown headings (`#`, `##`, ...) as an
  // outline, then append a head slice so the agent still has prose.
  const headingLines = stripped
    .split("\n")
    .filter((ln) => /^\s{0,3}#{1,6}\s/.test(ln))
    .slice(0, 40)
    .join("\n");
  const budgetForBody = Math.max(0, BROWSE_LIMIT - headingLines.length - 200);
  const bodyHead = stripped.slice(0, budgetForBody);
  const text =
    (headingLines ? `# 페이지 구조 (${headingLines.split("\n").length}개 헤딩)\n${headingLines}\n\n---\n\n` : "") +
    `${bodyHead}\n\n... [${originalChars - bodyHead.length} chars 생략] ...`;

  return {
    text,
    originalChars,
    omittedChars: originalChars - text.length,
  };
}

/**
 * Collapse a raw `find` listing into a per-directory histogram plus a
 * tiny sample. The agent can still ask for a specific subtree with
 * `list_files` on a narrower directory.
 */
export function truncateListFiles(findOutput: string): TruncationResult {
  const originalChars = findOutput.length;
  const entries = findOutput
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    return { text: "(empty)", originalChars, omittedChars: 0 };
  }
  if (entries.length <= 80) {
    return { text: findOutput, originalChars, omittedChars: 0 };
  }

  const counts = new Map<string, number>();
  for (const entry of entries) {
    // /home/user/project/src/app/page.tsx → src/app
    const rel = entry.replace(/^\/home\/user\/project\/?/, "");
    const parts = rel.split("/");
    const dir = parts.length <= 1 ? "." : parts.slice(0, -1).join("/");
    counts.set(dir, (counts.get(dir) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const histogram = sorted
    .slice(0, 30)
    .map(([dir, n]) => `${dir}/ (${n} files)`)
    .join(" • ");
  const moreDirs = sorted.length > 30 ? ` … +${sorted.length - 30} dirs` : "";
  const sample = entries.slice(0, 10).join("\n");

  const text =
    `${entries.length} files · ${counts.size} dirs\n` +
    `${histogram}${moreDirs}\n\n` +
    `Sample (first 10):\n${sample}\n\n` +
    `[전체 목록은 더 좁은 directory로 list_files를 다시 호출하세요]`;

  return {
    text,
    originalChars,
    omittedChars: originalChars - text.length,
  };
}
