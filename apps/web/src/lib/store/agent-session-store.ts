import { create } from "zustand";

// Agent event types (defined directly in web instead of importing from shared)
export type AgentEventType =
  | "thinking" | "tool_call" | "tool_result"
  | "file_read" | "file_edit" | "file_edit_auto" | "file_created" | "file_delete" | "file_rename"
  | "devServer"
  | "command_start" | "command_output" | "command_done"
  | "message" | "done" | "error" | "cancelled" | "awaiting_approval"
  | "rollback_available" | "rollback_complete"
  | "mcp_connect_required"
  // Autonomous agent events
  | "agent_plan" | "agent_plan_progress"
  | "agent_question" | "agent_service_request"
  | "agent_complete" | "preview_check"
  // Browser automation events
  | "browser_open" | "browser_click" | "browser_type"
  | "browser_screenshot" | "browser_evaluate" | "browser_scroll";

export interface AgentEvent {
  type: AgentEventType;
  [key: string]: unknown;
}

export interface PendingEdit {
  toolCallId: string;
  filePath: string;
  original: string;
  modified: string;
  explanation: string;
  status: "pending" | "approved" | "rejected";
}

export type SessionStatus = "idle" | "running" | "awaiting_approval" | "completed" | "error" | "cancelled";

interface AgentSessionStore {
  status: SessionStatus;
  events: AgentEvent[];
  pendingEdits: PendingEdit[];
  currentThinking: string;
  error: string | null;

  // Actions
  startSession: () => void;
  addEvent: (event: AgentEvent) => void;
  approveEdit: (toolCallId: string) => void;
  rejectEdit: (toolCallId: string) => void;
  approveAll: () => void;
  rejectAll: () => void;
  cancelSession: () => void;
  reset: () => void;
}

export const useAgentSessionStore = create<AgentSessionStore>((set, get) => ({
  status: "idle",
  events: [],
  pendingEdits: [],
  currentThinking: "",
  error: null,

  startSession: () => set({
    status: "running",
    events: [],
    pendingEdits: [],
    currentThinking: "",
    error: null,
  }),

  addEvent: (event) => {
    const state = get();

    switch (event.type) {
      case "thinking":
        set({
          currentThinking: event.content as string,
          events: [...state.events, event],
        });
        break;

      case "message":
        set({
          events: [...state.events, event],
          currentThinking: "",
        });
        break;

      case "file_edit":
        set({
          pendingEdits: [...state.pendingEdits, {
            toolCallId: event.toolCallId as string,
            filePath: event.filePath as string,
            original: event.original as string,
            modified: event.modified as string,
            explanation: event.explanation as string,
            status: "pending",
          }],
          status: "awaiting_approval",
          events: [...state.events, event],
        });
        break;

      case "done":
        set({
          status: "completed",
          events: [...state.events, event],
          currentThinking: "",
        });
        break;

      case "error":
        set({
          status: "error",
          error: event.message as string,
          events: [...state.events, event],
          currentThinking: "",
        });
        break;

      case "cancelled":
        set({
          status: "cancelled",
          currentThinking: "",
        });
        break;

      default:
        set({ events: [...state.events, event] });
        break;
    }
  },

  approveEdit: (toolCallId) => {
    set((state) => {
      const edits = state.pendingEdits.map((e) =>
        e.toolCallId === toolCallId ? { ...e, status: "approved" as const } : e
      );
      const allResolved = edits.every((e) => e.status !== "pending");
      return {
        pendingEdits: edits,
        status: allResolved ? "running" : "awaiting_approval",
      };
    });
    // IPC calls are handled by the component
  },

  rejectEdit: (toolCallId) => {
    set((state) => {
      const edits = state.pendingEdits.map((e) =>
        e.toolCallId === toolCallId ? { ...e, status: "rejected" as const } : e
      );
      const allResolved = edits.every((e) => e.status !== "pending");
      return {
        pendingEdits: edits,
        status: allResolved ? "running" : "awaiting_approval",
      };
    });
  },

  approveAll: () => {
    set((state) => ({
      pendingEdits: state.pendingEdits.map((e) =>
        e.status === "pending" ? { ...e, status: "approved" as const } : e
      ),
      status: "running",
    }));
  },

  rejectAll: () => {
    set((state) => ({
      pendingEdits: state.pendingEdits.map((e) =>
        e.status === "pending" ? { ...e, status: "rejected" as const } : e
      ),
      status: "running",
    }));
  },

  cancelSession: () => set({ status: "cancelled", currentThinking: "" }),

  reset: () => set({
    status: "idle",
    events: [],
    pendingEdits: [],
    currentThinking: "",
    error: null,
  }),
}));
