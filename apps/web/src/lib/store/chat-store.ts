"use client";

import { create } from "zustand";
import type { CodeEditResult } from "@figma-code-bridge/shared";

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

  // Actions
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isProcessing: false,
  error: null,

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

  clearMessages: () => set({ messages: [], error: null }),
}));
