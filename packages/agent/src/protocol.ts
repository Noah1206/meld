// Re-export shared protocol types + 에이전트 전용 유틸

import type { AgentMessage } from "@figma-code-bridge/shared";

export type { AgentMessage, FileEntry } from "@figma-code-bridge/shared";

export function createMessage(type: string, payload: unknown): AgentMessage {
  return {
    type,
    id: crypto.randomUUID(),
    payload,
  };
}

export function parseMessage(raw: string): AgentMessage | null {
  try {
    const msg = JSON.parse(raw) as AgentMessage;
    if (!msg.type || !msg.id) return null;
    return msg;
  } catch {
    return null;
  }
}
