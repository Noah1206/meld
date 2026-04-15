// Async history summarization (Phase 4 of P0-4 context engineering).
//
// The synchronous `compressMessages` helper bounds the message list
// by inserting a placeholder "[I completed N earlier steps]" marker.
// That keeps the token budget in check but throws away real progress
// signal — the agent can no longer recall what it already tried.
//
// This module replaces that placeholder with a real summary produced
// by a cheap Claude model (Haiku). One call per activation, at most
// once per round, and only when the history crosses the ACTIVATION
// threshold so the cache prefix isn't thrashed.
//
// The caller still owns message-list mutation. This module only takes
// an input array and returns a new array; it never mutates.

export interface SummarizableMessage {
  role: string;
  content: unknown;
}

export interface SummarizationConfig {
  /** Total messages in the transcript before we consider summarizing. */
  activationLength: number;
  /** How many of the oldest messages to fold into the summary. */
  summarizeCount: number;
  /** How many of the most recent messages to keep verbatim. */
  keepTailCount: number;
  /** Haiku model id. */
  model: string;
  /** max_tokens for the summary call. */
  summaryMaxTokens: number;
  /** Hard cap on characters per extracted-read card. */
  readCardMaxChars: number;
}

export const DEFAULT_SUMMARY_CONFIG: SummarizationConfig = {
  // Raised from 30 to 50 once filesystem external memory (Phase 4-fix)
  // took over as the primary long-context strategy. Haiku summaries
  // are now a last-resort fallback for sessions that genuinely grow
  // past ~50 messages without ever hitting the stash threshold.
  activationLength: 50,
  summarizeCount: 30,
  keepTailCount: 15,
  model: "claude-haiku-4-5-20251001",
  summaryMaxTokens: 1024,
  readCardMaxChars: 400,
};

/** Extract plain text from an assistant / user message content field. */
function messageToText(msg: SummarizableMessage): string {
  const c = msg.content;
  if (typeof c === "string") return c;
  if (!Array.isArray(c)) return "";
  const parts: string[] = [];
  for (const block of c as Array<Record<string, unknown>>) {
    const type = block.type as string | undefined;
    if (type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    } else if (type === "tool_use") {
      const name = block.name as string | undefined;
      const input = block.input;
      parts.push(`[tool_use ${name}] ${JSON.stringify(input).slice(0, 300)}`);
    } else if (type === "tool_result") {
      const content = block.content;
      if (typeof content === "string") {
        parts.push(`[tool_result] ${content.slice(0, 400)}`);
      } else if (Array.isArray(content)) {
        for (const inner of content as Array<Record<string, unknown>>) {
          if (inner.type === "text" && typeof inner.text === "string") {
            parts.push(`[tool_result] ${inner.text.slice(0, 400)}`);
          }
        }
      }
    }
  }
  return parts.join("\n");
}

/** Render a compact transcript for the Haiku summarizer prompt. */
function renderTranscript(messages: SummarizableMessage[]): string {
  return messages
    .map((m, i) => {
      const text = messageToText(m).slice(0, 600);
      return `#${i + 1} [${m.role}] ${text}`;
    })
    .join("\n\n");
}

/**
 * Call Haiku once to summarize a range of messages. Returns the
 * summary text. On any failure the caller should fall back to a
 * deterministic placeholder so the loop never blocks.
 */
async function callHaikuSummary(
  transcript: string,
  apiKey: string,
  config: SummarizationConfig,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.summaryMaxTokens,
      system:
        "You compress a coding agent's transcript. Given the tool calls and messages so far, produce a terse progress log the agent can read to remember what it already did, what's left, and any errors it hit. Use bullet points. Do not repeat file contents verbatim — reference them by path. Keep it under 500 words.",
      messages: [
        {
          role: "user",
          content: `Summarize the following agent transcript for continuation:\n\n${transcript}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Haiku summary failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const block = (data.content ?? []).find((b) => b.type === "text");
  return block?.text ?? "(summary produced no text)";
}

/**
 * Replace past `read_file` tool_result content with a compact card so
 * the agent still sees it was already read. Only touches messages in
 * the summarized region — the tail stays verbatim to preserve cache
 * friendliness for the active working set.
 */
export function collapseReadFileCards<T extends SummarizableMessage>(
  messages: T[],
  readFilePaths: Map<string, number>,
  maxChars: number,
): T[] {
  return messages.map((msg) => {
    if (msg.role !== "user") return msg;
    if (!Array.isArray(msg.content)) return msg;
    const blocks = msg.content as Array<Record<string, unknown>>;
    let changed = false;
    const nextBlocks = blocks.map((block) => {
      if (block.type !== "tool_result") return block;
      const raw = typeof block.content === "string" ? block.content : "";
      if (raw.length <= maxChars) return block;
      // Heuristic: if any tracked read path appears in the raw content,
      // replace with a card. This is conservative — tool_result blocks
      // for commands that happen to echo a path won't match the size
      // filter above unless they're genuinely large.
      for (const [path, lineCount] of readFilePaths.entries()) {
        if (raw.includes(path)) {
          changed = true;
          return {
            ...block,
            content:
              `[이미 읽음] ${path} · ${lineCount}줄 · 필요 시 read_file 재호출\n` +
              raw.slice(0, 120) + " …",
          };
        }
      }
      return block;
    });
    if (!changed) return msg;
    return { ...msg, content: nextBlocks } as T;
  });
}

/**
 * Summarize the oldest segment of a transcript and return a new
 * message list: [first user message, summary assistant message,
 * continue user message, ...recent tail]. Same shape as the
 * synchronous `compressMessages` fallback so callers can substitute
 * one for the other.
 *
 * If the transcript is shorter than the activation threshold, returns
 * the input unchanged (async no-op).
 */
export async function summarizeHistory<T extends SummarizableMessage>(
  messages: T[],
  apiKey: string | undefined,
  config: SummarizationConfig = DEFAULT_SUMMARY_CONFIG,
): Promise<{ messages: T[]; didSummarize: boolean; summaryText?: string }> {
  if (messages.length < config.activationLength) {
    return { messages, didSummarize: false };
  }

  const first = messages[0];
  const summarizeEnd = Math.max(1, messages.length - config.keepTailCount);
  const summarizeStart = 1; // preserve the very first user prompt
  if (summarizeEnd - summarizeStart < config.summarizeCount) {
    return { messages, didSummarize: false };
  }

  const toSummarize = messages.slice(summarizeStart, summarizeEnd);
  const tail = messages.slice(summarizeEnd);
  const transcript = renderTranscript(toSummarize);

  let summaryText: string;
  try {
    if (!apiKey) throw new Error("missing ANTHROPIC_API_KEY");
    summaryText = await callHaikuSummary(transcript, apiKey, config);
  } catch (err) {
    // Deterministic fallback so the loop keeps going even if Haiku is
    // down. Matches the legacy compressMessages behavior.
    const completedSteps = Math.floor(toSummarize.length / 2);
    summaryText = `[summarized: rounds 1-${toSummarize.length} — Haiku unavailable, ${completedSteps} steps elided. Reason: ${err instanceof Error ? err.message : "unknown"}]`;
  }

  const summaryMessage = {
    role: "assistant",
    content: [
      {
        type: "text",
        text: `[summarized: rounds 1-${toSummarize.length}]\n${summaryText}`,
      },
    ],
  } as unknown as T;

  const continueMessage = {
    role: "user",
    content: "Continue with the remaining work.",
  } as unknown as T;

  return {
    messages: [first, summaryMessage, continueMessage, ...tail],
    didSummarize: true,
    summaryText,
  };
}
