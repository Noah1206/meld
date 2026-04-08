"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── MCP Server UI State ────────────────────────────
// Dynamic server list. No hardcoding — updates whenever servers are added/removed.

interface MCPServerUI {
  adapterId: string;
  name: string;
  icon: string;
  category: string;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  toolCount: number;
  meta: Record<string, unknown>;
}

interface MCPChainUI {
  id: string;
  name: string;
  description: string;
  available: boolean;
  missing: string[];
}

interface MCPStoreState {
  // Server state (dynamic)
  servers: MCPServerUI[];
  activeToolCall: { toolName: string; adapterId: string } | null;

  // Chain state
  availableChains: MCPChainUI[];

  // Server management
  addServer: (server: Omit<MCPServerUI, "connected" | "connecting" | "error" | "toolCount" | "meta">) => void;
  removeServer: (adapterId: string) => void;
  setConnecting: (adapterId: string) => void;
  setConnected: (adapterId: string, toolCount: number, meta?: Record<string, unknown>) => void;
  setDisconnected: (adapterId: string) => void;
  setError: (adapterId: string, error: string) => void;

  // Tool execution state
  setActiveToolCall: (toolName: string, adapterId: string) => void;
  clearActiveToolCall: () => void;

  // Chain management
  setChains: (chains: MCPChainUI[]) => void;

  // Helpers
  isConnected: (adapterId: string) => boolean;
  getServer: (adapterId: string) => MCPServerUI | undefined;
  connectedCount: () => number;
}

export const useMCPStore = create<MCPStoreState>()(
  persist(
    (set, get) => ({
  servers: [],
  activeToolCall: null,
  availableChains: [],

  addServer: (server) =>
    set((s) => {
      if (s.servers.some((srv) => srv.adapterId === server.adapterId)) return s;
      return {
        servers: [...s.servers, { ...server, connected: false, connecting: false, error: null, toolCount: 0, meta: {} }],
      };
    }),

  removeServer: (adapterId) =>
    set((s) => ({ servers: s.servers.filter((srv) => srv.adapterId !== adapterId) })),

  setConnecting: (adapterId) =>
    set((s) => ({
      servers: s.servers.map((srv) =>
        srv.adapterId === adapterId ? { ...srv, connecting: true, error: null } : srv,
      ),
    })),

  setConnected: (adapterId, toolCount, meta) =>
    set((s) => ({
      servers: s.servers.map((srv) =>
        srv.adapterId === adapterId
          ? { ...srv, connected: true, connecting: false, error: null, toolCount, meta: meta ?? srv.meta }
          : srv,
      ),
    })),

  setDisconnected: (adapterId) =>
    set((s) => ({
      servers: s.servers.map((srv) =>
        srv.adapterId === adapterId
          ? { ...srv, connected: false, connecting: false, error: null, toolCount: 0 }
          : srv,
      ),
    })),

  setError: (adapterId, error) =>
    set((s) => ({
      servers: s.servers.map((srv) =>
        srv.adapterId === adapterId ? { ...srv, connecting: false, error } : srv,
      ),
    })),

  setActiveToolCall: (toolName, adapterId) =>
    set({ activeToolCall: { toolName, adapterId } }),

  clearActiveToolCall: () =>
    set({ activeToolCall: null }),

  setChains: (chains) =>
    set({ availableChains: chains }),

  isConnected: (adapterId) =>
    get().servers.some((s) => s.adapterId === adapterId && s.connected),

  getServer: (adapterId) =>
    get().servers.find((s) => s.adapterId === adapterId),

  connectedCount: () =>
    get().servers.filter((s) => s.connected).length,
}),
    {
      name: "meld-mcp-servers",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        servers: state.servers.map((s) => ({
          ...s,
          connecting: false,
          error: null,
        })),
      }),
    },
  ),
);
