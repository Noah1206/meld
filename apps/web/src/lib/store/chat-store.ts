"use client";

import { create } from "zustand";
import type { CodeEditResult } from "@figma-code-bridge/shared";

export type LLMProviderType = "claude" | "chatgpt" | "gemini";
export type InputPosition = "top" | "bottom";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  codeEdit?: CodeEditResult;
  timestamp: number;
  /** AI response duration (ms) — only for assistant messages */
  duration?: number;
  /** Processing phase hint */
  thinkingPhase?: string;
}

interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  processingStartTime: number | null;
  error: string | null;
  provider: LLMProviderType;
  inputPosition: InputPosition;

  // Actions
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  setProvider: (provider: LLMProviderType) => void;
  setInputPosition: (pos: InputPosition) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isProcessing: false,
  processingStartTime: null,
  error: null,
  provider: "claude",
  inputPosition: "top",

  addMessage: (message) => {
    const state = get();
    const duration = message.role === "assistant" && state.processingStartTime
      ? Date.now() - state.processingStartTime
      : undefined;
    set({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          duration,
        },
      ],
    });
  },

  setProcessing: (isProcessing) => set({
    isProcessing,
    processingStartTime: isProcessing ? Date.now() : null,
  }),

  setError: (error) => set({ error, isProcessing: false, processingStartTime: null }),

  setProvider: (provider) => set({ provider }),

  setInputPosition: (inputPosition) => set({ inputPosition }),

  clearMessages: () => set({ messages: [], error: null }),
}));
