"use client";

import { create } from "zustand";
import type { CodeEditResult } from "@figma-code-bridge/shared";

export type LLMProviderType = "claude" | "chatgpt" | "gemini";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  codeEdit?: CodeEditResult;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  error: string | null;
  provider: LLMProviderType;

  // Actions
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  setProvider: (provider: LLMProviderType) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isProcessing: false,
  error: null,
  provider: "claude",

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
      ],
    })),

  setProcessing: (isProcessing) => set({ isProcessing }),

  setError: (error) => set({ error, isProcessing: false }),

  setProvider: (provider) => set({ provider }),

  clearMessages: () => set({ messages: [], error: null }),
}));
