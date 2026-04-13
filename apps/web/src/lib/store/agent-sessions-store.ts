"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentEvent, SessionStatus } from "./agent-session-store";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
  duration?: number;
  timestamp?: number;
  showSteps?: boolean;
}

export interface AgentSessionMeta {
  id: string;
  /** Backend agent-run sessionId returned from /api/ai/agent-run (for polling). */
  backendSessionId?: string;
  /** Last `after` index polled from the backend events endpoint. */
  pollCursor?: number;
  title: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  prompt: string;
  eventCount: number;
  elapsedMs: number;
  sandboxId?: string;
  previewUrl?: string;
  events: AgentEvent[];
  /** Chat messages (user prompts + assistant replies) for this session. */
  messages: ChatMessage[];
}

interface AgentSessionsStore {
  sessions: Record<string, AgentSessionMeta>;
  activeSessionId: string | null;

  createSession: (prompt: string) => string;
  setActiveSession: (sessionId: string | null) => void;
  updateSession: (sessionId: string, patch: Partial<AgentSessionMeta>) => void;
  appendEvent: (sessionId: string, event: AgentEvent) => void;
  setMessages: (sessionId: string, messages: ChatMessage[]) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, title: string) => void;
  getSession: (sessionId: string) => AgentSessionMeta | undefined;
  listSessions: () => AgentSessionMeta[];
}

function makeId(): string {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (!trimmed) return "New agent";
  if (trimmed.length <= 48) return trimmed;
  return trimmed.slice(0, 45) + "…";
}

export const useAgentSessionsStore = create<AgentSessionsStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      activeSessionId: null,

      createSession: (prompt) => {
        const id = makeId();
        const now = Date.now();
        const meta: AgentSessionMeta = {
          id,
          title: deriveTitle(prompt),
          status: "running",
          createdAt: now,
          updatedAt: now,
          prompt,
          eventCount: 0,
          elapsedMs: 0,
          events: [],
          messages: [],
        };
        set((state) => ({
          sessions: { ...state.sessions, [id]: meta },
          activeSessionId: id,
        }));
        return id;
      },

      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

      updateSession: (sessionId, patch) =>
        set((state) => {
          const existing = state.sessions[sessionId];
          if (!existing) return state;
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, ...patch, updatedAt: Date.now() },
            },
          };
        }),

      appendEvent: (sessionId, event) =>
        set((state) => {
          const existing = state.sessions[sessionId];
          if (!existing) return state;
          const nextEvents = [...existing.events, event];
          let nextStatus: SessionStatus = existing.status;
          if (event.type === "done") nextStatus = "completed";
          else if (event.type === "error") nextStatus = "error";
          else if (event.type === "cancelled") nextStatus = "cancelled";
          else if (event.type === "awaiting_approval") nextStatus = "awaiting_approval";
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                events: nextEvents,
                eventCount: nextEvents.length,
                status: nextStatus,
                elapsedMs: Date.now() - existing.createdAt,
                updatedAt: Date.now(),
              },
            },
          };
        }),

      setMessages: (sessionId, messages) =>
        set((state) => {
          const existing = state.sessions[sessionId];
          if (!existing) return state;
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, messages, updatedAt: Date.now() },
            },
          };
        }),

      deleteSession: (sessionId) =>
        set((state) => {
          const rest: Record<string, AgentSessionMeta> = {};
          for (const [id, meta] of Object.entries(state.sessions)) {
            if (id !== sessionId) rest[id] = meta;
          }
          const nextActive =
            state.activeSessionId === sessionId ? null : state.activeSessionId;
          return { sessions: rest, activeSessionId: nextActive };
        }),

      renameSession: (sessionId, title) =>
        set((state) => {
          const existing = state.sessions[sessionId];
          if (!existing) return state;
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, title, updatedAt: Date.now() },
            },
          };
        }),

      getSession: (sessionId) => get().sessions[sessionId],

      listSessions: () => {
        const all = Object.values(get().sessions);
        return all.sort((a, b) => b.updatedAt - a.updatedAt);
      },
    }),
    {
      name: "meld-agent-sessions",
      partialize: (state) => ({
        sessions: Object.fromEntries(
          Object.entries(state.sessions).map(([id, meta]) => [
            id,
            { ...meta, events: meta.events.slice(-200) },
          ])
        ),
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);
