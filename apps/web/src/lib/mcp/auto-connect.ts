// Server-side helper for the agent's `request_mcp` tool.
//
// When the agent asks for an MCP connection, we first check whether
// the user already has a credential stored (from a prior OAuth login
// or a PAT entered in Settings → Integrations). If so, we connect
// silently via `connectServer` and let the agent keep going — the
// user never sees a modal.
//
// This intentionally mirrors the tRPC `mcp.connect` resolver's token
// lookup logic. Keep them in sync when adding new services.

import { createAdminClient } from "@/lib/supabase/admin";
import { connectServer, getConnectedServers } from "./registry";

export interface AutoConnectResult {
  ok: boolean;
  toolCount?: number;
  reason?: string;
}

export async function tryAutoConnect(
  userId: string,
  adapterId: string,
): Promise<AutoConnectResult> {
  if (!userId || !adapterId) {
    return { ok: false, reason: "missing userId or adapterId" };
  }

  // Fast path: already connected in the current in-memory registry
  // (common when the user hit Connect earlier in the same session).
  const existing = getConnectedServers(userId).find(
    (s) => s.adapterId === adapterId,
  );
  if (existing) {
    return { ok: true, toolCount: existing.tools.length };
  }

  // Look up a stored token for this adapter. Figma and GitHub have
  // dedicated columns; everything else follows the `{id}_access_token`
  // convention from migration 005.
  const supabase = createAdminClient();
  let token: string | null = null;
  try {
    if (adapterId === "figma") {
      const { data } = await supabase
        .from("users")
        .select("figma_access_token")
        .eq("id", userId)
        .single();
      token = data?.figma_access_token ?? null;
    } else if (adapterId === "github") {
      const { data } = await supabase
        .from("users")
        .select("github_access_token")
        .eq("id", userId)
        .single();
      token = data?.github_access_token ?? null;
    } else {
      const column = `${adapterId}_access_token`;
      const { data, error } = await supabase
        .from("users")
        .select(column)
        .eq("id", userId)
        .single();
      if (!error && data) {
        token = (data[column as keyof typeof data] as string | null) ?? null;
      }
    }
  } catch {
    return { ok: false, reason: "token lookup failed" };
  }

  if (!token) {
    return { ok: false, reason: "no stored token" };
  }

  // Attempt the connection. `connectServer` runs the adapter's
  // `validateConnection` which actually hits the upstream API — so
  // a stale / revoked token will surface as an error here and we
  // fall back to prompting the user.
  try {
    const instance = await connectServer(userId, adapterId, {
      type: "bearer",
      token,
    });
    return { ok: true, toolCount: instance.toolCount };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "validation failed",
    };
  }
}
