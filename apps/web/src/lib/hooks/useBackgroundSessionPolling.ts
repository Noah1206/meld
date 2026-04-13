"use client";

import { useEffect, useRef } from "react";
import { useAgentSessionsStore } from "@/lib/store/agent-sessions-store";

/**
 * Polls every non-active running session in the multi-session store so that
 * background agents keep updating their event history even when the user is
 * viewing a different session.
 *
 * The currently active session is still polled by workspace/page.tsx via its
 * original loop — this hook only handles the background ones to avoid duplicate
 * event insertion.
 *
 * Polls each background session every 1s (slower than active 500ms to save
 * bandwidth). Stops as soon as the session reports `complete: true`.
 */
export function useBackgroundSessionPolling() {
  const workersRef = useRef<Map<string, { stopped: boolean }>>(new Map());

  useEffect(() => {
    const workers = workersRef.current;
    const unsubscribe = useAgentSessionsStore.subscribe((state) => {
      const active = state.activeSessionId;
      const running = Object.values(state.sessions).filter(
        (s) =>
          s.status === "running" &&
          s.id !== active &&
          s.backendSessionId &&
          !workers.has(s.id)
      );

      for (const session of running) {
        const handle = { stopped: false };
        workers.set(session.id, handle);
        startWorker(session.id, session.backendSessionId!, handle).finally(() => {
          workers.delete(session.id);
        });
      }
    });

    return () => {
      unsubscribe();
      for (const handle of workers.values()) handle.stopped = true;
      workers.clear();
    };
  }, []);
}

async function startWorker(
  localId: string,
  backendId: string,
  handle: { stopped: boolean }
) {
  const store = useAgentSessionsStore.getState();
  const meta = store.getSession(localId);
  if (!meta) return;

  let cursor = meta.pollCursor ?? 0;
  let consecutiveErrors = 0;

  while (!handle.stopped) {
    // If the session was switched back to active, let workspace's main loop
    // take over — stop this worker. The main loop polls from its own cursor
    // but our appended events are already in the multi-store, so reseeding
    // on switch will show them.
    const state = useAgentSessionsStore.getState();
    if (state.activeSessionId === localId) return;

    const current = state.sessions[localId];
    if (!current || current.status !== "running") return;

    try {
      const res = await fetch(
        `/api/ai/agent-run/events?session=${backendId}&after=${cursor}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        events: Array<Record<string, unknown>>;
        complete: boolean;
        nextIndex: number;
      };

      for (const event of data.events) {
        useAgentSessionsStore.getState().appendEvent(localId, event as never);
      }
      cursor = data.nextIndex;
      useAgentSessionsStore.getState().updateSession(localId, {
        pollCursor: cursor,
      });
      consecutiveErrors = 0;

      if (data.complete) {
        // Backend signals done — mark as completed if it isn't already via an event
        const final = useAgentSessionsStore.getState().sessions[localId];
        if (final && final.status === "running") {
          useAgentSessionsStore.getState().updateSession(localId, {
            status: "completed",
          });
        }
        return;
      }
    } catch {
      consecutiveErrors += 1;
      if (consecutiveErrors > 10) {
        useAgentSessionsStore.getState().updateSession(localId, {
          status: "error",
        });
        return;
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
  }
}
