// Shared message-compression helper.
//
// Both the legacy /api/ai/agent-run loop and the harness orchestration
// strategies need to keep the conversation under ~20 turns to avoid
// blowing the model context. This module is the single source of truth
// for that policy.
//
// Strategy: keep the very first user message (the original prompt),
// drop the middle, replace it with a one-line "[I completed N earlier
// steps]" marker + a "Continue." pivot, and keep the most recent ~14
// messages intact.

export interface CompressibleMessage {
  role: string;
  content: unknown;
}

/**
 * Compress a long chat history while preserving the original prompt
 * and the most recent context. Returns the input unchanged when it's
 * short enough or when no clean compression boundary can be found.
 */
export function compressMessages<T extends CompressibleMessage>(messages: T[]): T[] {
  if (messages.length <= 20) return messages;

  let keepFrom = messages.length - 14;
  if (keepFrom < 3) return messages;

  // Slide forward to a clean (user → assistant) boundary so we don't
  // cut the conversation mid-tool-call.
  while (keepFrom < messages.length - 4) {
    const msg = messages[keepFrom];
    const next = messages[keepFrom + 1];
    if (msg?.role === "user" && next?.role === "assistant") {
      keepFrom = keepFrom + 1;
      break;
    }
    keepFrom++;
  }

  if (keepFrom >= messages.length - 4) return messages;

  const first = messages[0];
  const recent = messages.slice(keepFrom);
  const omitted = keepFrom - 1;

  // The summary messages are typed as the input message shape so the
  // returned array stays a `T[]`. Both engines accept this loose
  // text-content shape (assistant content blocks vs strings).
  const summary = [
    {
      role: "assistant",
      content: [
        {
          type: "text",
          text: `[I completed ${Math.floor(omitted / 2)} earlier steps. Continuing with the current task.]`,
        },
      ],
    } as unknown as T,
    {
      role: "user",
      content: "Continue.",
    } as unknown as T,
  ];

  return [first, ...summary, ...recent];
}
