// In-memory session store
//
// Process-local snapshot storage. Used for tests and as the default store
// until the Supabase backend is wired up in Phase 3.
//
// NOTE: this store lives inside a single Node process. Across serverless
// function invocations it will not persist. That's fine for Phase 1 —
// the legacy /api/ai/agent-run events route has the same limitation.

import type {
  SessionStore,
  SessionInit,
  SessionHandle,
  SessionSnapshot,
  SessionCheckpoint,
  HarnessEvent,
} from "../types";

class InMemorySessionHandle implements SessionHandle {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly agentId?: string
  ) {}
}

export class InMemorySessionStore implements SessionStore {
  private readonly snapshots = new Map<string, SessionSnapshot>();

  async create(init: SessionInit): Promise<SessionHandle> {
    const id = `hs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const snapshot: SessionSnapshot = {
      id,
      userId: init.userId,
      agentId: init.agentId,
      prompt: init.prompt,
      status: "running",
      createdAt: Date.now(),
      events: [],
      checkpoints: [],
    };
    this.snapshots.set(id, snapshot);
    return new InMemorySessionHandle(id, init.userId, init.agentId);
  }

  async append(sessionId: string, event: HarnessEvent): Promise<void> {
    const snap = this.snapshots.get(sessionId);
    if (!snap) throw new Error(`Session not found: ${sessionId}`);
    snap.events.push(event);
  }

  async getEvents(sessionId: string, since = 0): Promise<HarnessEvent[]> {
    const snap = this.snapshots.get(sessionId);
    if (!snap) return [];
    return snap.events.slice(since);
  }

  async getSnapshot(sessionId: string): Promise<SessionSnapshot | null> {
    const snap = this.snapshots.get(sessionId);
    if (!snap) return null;
    // Return a shallow clone so callers can't mutate internal state.
    return {
      ...snap,
      events: [...snap.events],
      checkpoints: [...snap.checkpoints],
    };
  }

  async markComplete(
    sessionId: string,
    status: "completed" | "error" | "cancelled"
  ): Promise<void> {
    const snap = this.snapshots.get(sessionId);
    if (!snap) return;
    snap.status = status;
    snap.completedAt = Date.now();
  }

  async checkpoint(sessionId: string, label: string): Promise<SessionCheckpoint> {
    const snap = this.snapshots.get(sessionId);
    if (!snap) throw new Error(`Session not found: ${sessionId}`);
    const cp: SessionCheckpoint = {
      label,
      createdAt: Date.now(),
      eventCount: snap.events.length,
    };
    snap.checkpoints.push(cp);
    return cp;
  }

  async resume(sessionId: string): Promise<SessionSnapshot | null> {
    return this.getSnapshot(sessionId);
  }

  // ─── Test helpers ─────────────────────────────────────
  /** Test-only: drop all sessions. */
  _clear(): void {
    this.snapshots.clear();
  }

  /** Test-only: direct access to the raw snapshot. */
  _raw(sessionId: string): SessionSnapshot | undefined {
    return this.snapshots.get(sessionId);
  }
}
