// Supabase-backed SessionStore
//
// Persists harness sessions across serverless invocations. Uses the admin
// (service-role) client so RLS does not block writes from the harness.
//
// The harness_* tables are not in the generated Supabase type file, so this
// module works with the untyped query builder to avoid polluting the global
// Database type.

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  SessionStore,
  SessionInit,
  SessionHandle,
  SessionSnapshot,
  SessionCheckpoint,
  HarnessEvent,
} from "../types";

interface HarnessSessionRow {
  id: string;
  user_id: string;
  agent_id: string | null;
  prompt: string;
  status: "pending" | "running" | "completed" | "error" | "cancelled";
  events: HarnessEvent[];
  metadata: { checkpoints?: SessionCheckpoint[] } & Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

class SupabaseSessionHandle implements SessionHandle {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly agentId: string | undefined
  ) {}
}

/**
 * Returns an untyped supabase client. The generated Database type does not
 * yet include the harness_* tables, so we intentionally drop the type
 * parameter here and work with plain objects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rawAdmin(): any {
  return createAdminClient();
}

export class SupabaseSessionStore implements SessionStore {
  // Cursor tracking: next seq number per session. In-memory so we don't
  // round-trip to Postgres on every append. Correct within a single Node
  // process; across processes the DB's UNIQUE (session_id, seq) would
  // conflict — for that case, switch to a server-side next_seq RPC.
  private readonly seqCursors = new Map<string, number>();

  async create(init: SessionInit): Promise<SessionHandle> {
    const { data, error } = await rawAdmin()
      .from("harness_sessions")
      .insert({
        user_id: init.userId,
        agent_id: init.agentId ?? null,
        prompt: init.prompt,
        status: "running",
        events: [],
        metadata: {},
      })
      .select("id, user_id, agent_id")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create harness session: ${error?.message ?? "no data"}`);
    }
    const row = data as { id: string; user_id: string; agent_id: string | null };
    this.seqCursors.set(row.id, 0);
    return new SupabaseSessionHandle(row.id, row.user_id, row.agent_id ?? undefined);
  }

  async append(sessionId: string, event: HarnessEvent): Promise<void> {
    const seq = this.nextSeq(sessionId);
    const client = rawAdmin();

    // Read-modify-write on the events JSONB array. Low contention (one
    // writer per session), so no locking needed.
    const fetchResult = await client
      .from("harness_sessions")
      .select("events")
      .eq("id", sessionId)
      .single();
    if (fetchResult.error) {
      throw new Error(`append: fetch failed: ${fetchResult.error.message}`);
    }
    const currentEvents = (fetchResult.data?.events ?? []) as HarnessEvent[];
    const nextEvents = [...currentEvents, event];

    const updateResult = await client
      .from("harness_sessions")
      .update({ events: nextEvents })
      .eq("id", sessionId);
    if (updateResult.error) {
      throw new Error(`append: update failed: ${updateResult.error.message}`);
    }

    // Append-only event log (for streaming / cursor-based tailing)
    const logResult = await client.from("harness_session_events").insert({
      session_id: sessionId,
      seq,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });
    if (logResult.error) {
      console.error(`[SupabaseSessionStore] event log insert failed:`, logResult.error);
    }
  }

  async getEvents(sessionId: string, since = 0): Promise<HarnessEvent[]> {
    const { data, error } = await rawAdmin()
      .from("harness_sessions")
      .select("events")
      .eq("id", sessionId)
      .single();
    if (error || !data) return [];
    const events = (data.events ?? []) as HarnessEvent[];
    return events.slice(since);
  }

  async getSnapshot(sessionId: string): Promise<SessionSnapshot | null> {
    const { data, error } = await rawAdmin()
      .from("harness_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    if (error || !data) return null;
    const row = data as HarnessSessionRow;
    return {
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id ?? undefined,
      prompt: row.prompt,
      status: row.status,
      createdAt: new Date(row.created_at).getTime(),
      completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
      events: row.events ?? [],
      checkpoints: row.metadata?.checkpoints ?? [],
    };
  }

  async markComplete(
    sessionId: string,
    status: "completed" | "error" | "cancelled"
  ): Promise<void> {
    const { error } = await rawAdmin()
      .from("harness_sessions")
      .update({
        status,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    if (error) {
      throw new Error(`markComplete failed: ${error.message}`);
    }
  }

  async checkpoint(sessionId: string, label: string): Promise<SessionCheckpoint> {
    const snapshot = await this.getSnapshot(sessionId);
    if (!snapshot) throw new Error(`Session not found: ${sessionId}`);
    const cp: SessionCheckpoint = {
      label,
      createdAt: Date.now(),
      eventCount: snapshot.events.length,
    };
    const nextCheckpoints = [...snapshot.checkpoints, cp];
    const { error } = await rawAdmin()
      .from("harness_sessions")
      .update({
        metadata: { checkpoints: nextCheckpoints },
      })
      .eq("id", sessionId);
    if (error) {
      throw new Error(`checkpoint failed: ${error.message}`);
    }
    return cp;
  }

  async resume(sessionId: string): Promise<SessionSnapshot | null> {
    const snap = await this.getSnapshot(sessionId);
    if (snap) {
      this.seqCursors.set(sessionId, snap.events.length);
    }
    return snap;
  }

  /**
   * Persist a base64-encoded tar.gz snapshot of the sandbox filesystem
   * into the session's metadata. This is the foundation of long-running
   * session persistence: callers tar up `/home/user/project`, base64 it,
   * and call this so the next resume() can pour it back into a fresh
   * sandbox.
   *
   * NOTE: Supabase JSONB has a practical limit (~1 MB per row works
   * fine; larger gets slow). Project tarballs of typical Meld web apps
   * are well under that. If you outgrow it, move to Supabase Storage
   * and put the URL in metadata instead.
   */
  async saveSandboxSnapshot(
    sessionId: string,
    snapshotBase64: string,
    sizeBytes: number
  ): Promise<void> {
    const snap = await this.getSnapshot(sessionId);
    const prevMeta = (snap?.checkpoints !== undefined
      ? { checkpoints: snap.checkpoints }
      : {}) as Record<string, unknown>;
    const { error } = await rawAdmin()
      .from("harness_sessions")
      .update({
        metadata: {
          ...prevMeta,
          sandboxSnapshot: {
            data: snapshotBase64,
            sizeBytes,
            capturedAt: Date.now(),
          },
        },
      })
      .eq("id", sessionId);
    if (error) {
      throw new Error(`saveSandboxSnapshot failed: ${error.message}`);
    }
  }

  /**
   * Read back a previously-saved sandbox snapshot. Returns null when
   * the session has no snapshot (e.g. fresh session or pre-snapshot
   * sessions written before this feature shipped).
   */
  async loadSandboxSnapshot(
    sessionId: string
  ): Promise<{ data: string; sizeBytes: number; capturedAt: number } | null> {
    const { data, error } = await rawAdmin()
      .from("harness_sessions")
      .select("metadata")
      .eq("id", sessionId)
      .maybeSingle();
    if (error) {
      throw new Error(`loadSandboxSnapshot failed: ${error.message}`);
    }
    const meta = (data?.metadata ?? {}) as {
      sandboxSnapshot?: { data: string; sizeBytes: number; capturedAt: number };
    };
    return meta.sandboxSnapshot ?? null;
  }

  // ─── Helpers ──────────────────────────────────────
  private nextSeq(sessionId: string): number {
    const current = this.seqCursors.get(sessionId) ?? 0;
    this.seqCursors.set(sessionId, current + 1);
    return current;
  }
}
