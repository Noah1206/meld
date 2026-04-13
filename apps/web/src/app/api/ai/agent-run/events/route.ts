import { NextRequest, NextResponse } from "next/server";

// ─── Event polling endpoint ──────────
// Agent loop pushes events here, browser polls to fetch them.

// Use globalThis to share state across Next.js module instances (Turbopack dev mode)
const globalStore = globalThis as unknown as {
  __meldEventStore?: Map<string, { events: unknown[]; complete: boolean }>;
};
if (!globalStore.__meldEventStore) {
  globalStore.__meldEventStore = new Map();
}
const eventStore = globalStore.__meldEventStore;

// Called by agent-run to push events
export function pushEvent(sessionId: string, event: unknown) {
  if (!eventStore.has(sessionId)) {
    eventStore.set(sessionId, { events: [], complete: false });
  }
  eventStore.get(sessionId)!.events.push(event);
}

export function markComplete(sessionId: string) {
  const store = eventStore.get(sessionId);
  if (store) store.complete = true;
}

// Browser polls this endpoint
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session");
  const afterIndex = parseInt(req.nextUrl.searchParams.get("after") || "0");

  if (!sessionId) {
    return NextResponse.json({ error: "session required" }, { status: 400 });
  }

  const store = eventStore.get(sessionId);
  if (!store) {
    return NextResponse.json({ events: [], complete: false, nextIndex: 0 });
  }

  const newEvents = store.events.slice(afterIndex);

  // Cleanup old sessions (older than 10 min)
  for (const [id, s] of eventStore) {
    if (s.complete && s.events.length > 0) {
      const lastEvent = s.events[s.events.length - 1] as { _timestamp?: number };
      if (lastEvent._timestamp && Date.now() - lastEvent._timestamp > 10 * 60 * 1000) {
        eventStore.delete(id);
      }
    }
  }

  return NextResponse.json({
    events: newEvents,
    complete: store.complete,
    nextIndex: store.events.length,
  });
}
