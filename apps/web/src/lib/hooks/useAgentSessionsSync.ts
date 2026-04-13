"use client";

import { useEffect, useRef } from "react";
import { useAgentSessionStore } from "@/lib/store/agent-session-store";
import {
  useAgentSessionsStore,
  type ChatMessage,
} from "@/lib/store/agent-sessions-store";

/**
 * Mirrors the single-session `useAgentSessionStore` into the multi-session
 * `useAgentSessionsStore`. On every status transition from `idle`/`completed`
 * to `running`, a new session is created. All subsequent events and chat
 * messages are appended to that active session until it finishes.
 *
 * Pass the workspace `chatMessages` array so the sidebar can restore the
 * full user+assistant conversation when the user clicks an older session.
 */
export function useAgentSessionsSync(chatMessages?: ChatMessage[]) {
  const status = useAgentSessionStore((s) => s.status);
  const events = useAgentSessionStore((s) => s.events);

  const activeSessionId = useAgentSessionsStore((s) => s.activeSessionId);
  const createSession = useAgentSessionsStore((s) => s.createSession);
  const appendEvent = useAgentSessionsStore((s) => s.appendEvent);
  const updateSession = useAgentSessionsStore((s) => s.updateSession);
  const setMessages = useAgentSessionsStore((s) => s.setMessages);

  const lastEventLenRef = useRef(0);
  const syncedSessionIdRef = useRef<string | null>(null);
  const prevStatusRef = useRef(status);

  // Detect start of a new run → create session
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === "running" && prev !== "running" && prev !== "awaiting_approval") {
      // Prefer the latest user chat message as the session title/prompt.
      const lastUser = chatMessages
        ? [...chatMessages].reverse().find((m) => m.role === "user")
        : undefined;
      const firstThinking = events.find((e) => e.type === "thinking");
      const promptText =
        lastUser?.content ||
        (firstThinking?.content as string) ||
        `Session ${new Date().toLocaleTimeString()}`;
      const id = createSession(promptText);
      syncedSessionIdRef.current = id;
      lastEventLenRef.current = 0;
    }
  }, [status, events, createSession, chatMessages]);

  // Mirror new events into the active session
  useEffect(() => {
    const sid = syncedSessionIdRef.current ?? activeSessionId;
    if (!sid) return;
    if (events.length <= lastEventLenRef.current) return;

    const fresh = events.slice(lastEventLenRef.current);
    for (const ev of fresh) {
      appendEvent(sid, ev);
    }
    lastEventLenRef.current = events.length;
  }, [events, activeSessionId, appendEvent]);

  // Mirror chat messages into the active session on every change.
  useEffect(() => {
    const sid = syncedSessionIdRef.current ?? activeSessionId;
    if (!sid || !chatMessages) return;
    setMessages(sid, chatMessages);
  }, [chatMessages, activeSessionId, setMessages]);

  // Propagate terminal status
  useEffect(() => {
    const sid = syncedSessionIdRef.current;
    if (!sid) return;
    if (status === "completed" || status === "error" || status === "cancelled") {
      updateSession(sid, { status });
    }
  }, [status, updateSession]);
}
