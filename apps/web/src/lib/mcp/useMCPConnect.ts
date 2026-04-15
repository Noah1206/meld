"use client";

// Shared MCP connection hook.
//
// Previously `handleMCPConnect` lived inside workspace/page.tsx and
// was the only place where a user could actually connect to an MCP
// server. Settings → Integrations was a static placeholder. This
// hook factors the connect flow out so any page can reuse it with
// the same store, same error formatter, same token-modal contract.
//
// Usage:
//   const { connect, disconnect, connecting, lastError } = useMCPConnect();
//   await connect("figma", optionalToken);

import { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useMCPStore } from "@/lib/store/mcp-store";
import { getMCPPreset } from "./presets-client";
import { formatMCPError } from "./error";

export interface ConnectOptions {
  /** Skip the "just connected" visual highlight (used by silent retries). */
  silent?: boolean;
  /**
   * Additional auth metadata forwarded to `auth.extra` on the adapter
   * (e.g. Supabase `projectRef`, filesystem `rootPath`).
   */
  extra?: Record<string, string>;
}

export interface ConnectResult {
  ok: boolean;
  adapterId: string;
  toolCount?: number;
  /** User-friendly error string when `ok === false`. */
  error?: string;
  /** Raw sentinel for callers that need to branch (e.g. open token modal). */
  code?: "TOKEN_REQUIRED" | "LOGIN_REQUIRED" | "OTHER";
}

export function useMCPConnect() {
  const connectMutation = trpc.mcp.connect.useMutation();
  const disconnectMutation = trpc.mcp.disconnect.useMutation();
  const mcpStore = useMCPStore();

  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const connect = useCallback(
    async (
      adapterId: string,
      token?: string,
      opts?: ConnectOptions,
    ): Promise<ConnectResult> => {
      if (!adapterId) {
        return { ok: false, adapterId, error: "adapter id missing", code: "OTHER" };
      }

      // Register with the local store if this is the first time we
      // see this adapter id (e.g. custom MCP or settings-only flow).
      if (!mcpStore.getServer(adapterId)) {
        const preset = getMCPPreset(adapterId);
        mcpStore.addServer({
          adapterId,
          name: preset?.name ?? adapterId,
          icon: preset?.icon ?? adapterId,
          category: preset?.category ?? "custom",
        });
      }

      mcpStore.setConnecting(adapterId);
      if (!opts?.silent) setConnectingId(adapterId);
      setLastError(null);

      try {
        const result = await connectMutation.mutateAsync({ adapterId, token, extra: opts?.extra });
        const toolCount = result?.toolCount ?? 0;
        const meta = (result?.meta ?? {}) as Record<string, unknown>;
        mcpStore.setConnected(adapterId, toolCount, meta);
        setConnectingId(null);
        return { ok: true, adapterId, toolCount };
      } catch (err) {
        setConnectingId(null);
        const raw = err instanceof Error ? err.message : String(err);
        const pretty = formatMCPError(err, adapterId);
        let code: ConnectResult["code"] = "OTHER";
        if (raw === "TOKEN_REQUIRED" || raw.includes("TOKEN_REQUIRED")) {
          code = "TOKEN_REQUIRED";
          mcpStore.setDisconnected(adapterId);
        } else if (raw.startsWith("LOGIN_REQUIRED:")) {
          code = "LOGIN_REQUIRED";
          mcpStore.setDisconnected(adapterId);
        } else {
          mcpStore.setError(adapterId, pretty);
        }
        setLastError(pretty);
        return { ok: false, adapterId, error: pretty, code };
      }
    },
    [connectMutation, mcpStore],
  );

  const disconnect = useCallback(
    async (adapterId: string): Promise<boolean> => {
      try {
        await disconnectMutation.mutateAsync({ adapterId });
        mcpStore.setDisconnected(adapterId);
        return true;
      } catch (err) {
        mcpStore.setError(adapterId, formatMCPError(err, adapterId));
        return false;
      }
    },
    [disconnectMutation, mcpStore],
  );

  return {
    connect,
    disconnect,
    connectingId,
    lastError,
    isConnecting: connectMutation.isPending,
  };
}
