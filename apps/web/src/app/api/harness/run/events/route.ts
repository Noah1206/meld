// GET /api/harness/run/events?session=<id>&after=<index>
//
// Returns events that have been appended to the given harness session since
// `after`. Lightweight polling endpoint — the UI calls this every ~500ms.

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { SupabaseSessionStore } from "@/lib/harness/session/supabase";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session");
  const afterRaw = url.searchParams.get("after");
  const after = afterRaw ? parseInt(afterRaw, 10) : 0;

  if (!sessionId) {
    return Response.json({ error: "session param required" }, { status: 400 });
  }

  const store = new SupabaseSessionStore();
  const snapshot = await store.getSnapshot(sessionId);
  if (!snapshot) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  // Authorization: users can only read their own sessions.
  if (snapshot.userId !== session.userId) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const events = snapshot.events.slice(Number.isFinite(after) ? after : 0);

  return Response.json({
    sessionId,
    status: snapshot.status,
    cursor: snapshot.events.length,
    events,
    completed: snapshot.status !== "running",
  });
}
