// PUT /api/workspace/projects/[id]/messages — upsert chat messages
//
// The client sends its current chat buffer; the server dedupes by
// (project_id, client_id) and stores new rows. This lets the workspace
// safely call the endpoint on every message change without creating
// duplicates.

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  upsertWorkspaceMessages,
  type WorkspaceMessageInput,
} from "@/lib/workspace/projects";

interface PutBody {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    clientId: string;
    clientTs: number;
    durationMs?: number | null;
  }>;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return Response.json({ error: "invalid json body" }, { status: 400 });
  }
  if (!Array.isArray(body.messages)) {
    return Response.json({ error: "messages must be an array" }, { status: 400 });
  }

  const messages: WorkspaceMessageInput[] = body.messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        typeof m.clientId === "string" &&
        typeof m.clientTs === "number"
    )
    .map((m) => ({
      role: m.role,
      content: m.content,
      clientId: m.clientId,
      clientTs: m.clientTs,
      durationMs: typeof m.durationMs === "number" ? m.durationMs : null,
    }));

  try {
    await upsertWorkspaceMessages(session.userId, id, messages);
    return Response.json({ ok: true, count: messages.length });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
