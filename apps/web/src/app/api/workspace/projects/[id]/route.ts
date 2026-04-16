// GET    /api/workspace/projects/[id]  — fetch one project + its messages
// DELETE /api/workspace/projects/[id]  — delete a project (cascades messages)

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getWorkspaceProject,
  touchWorkspaceProject,
  listWorkspaceMessages,
  deleteWorkspaceProject,
  renameWorkspaceProject,
} from "@/lib/workspace/projects";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const project = await getWorkspaceProject(session.userId, id);
    if (!project) {
      return Response.json({ error: "not found" }, { status: 404 });
    }
    const messages = await listWorkspaceMessages(session.userId, id);
    // Bump last_opened_at for sidebar ordering.
    void touchWorkspaceProject(session.userId, id).catch(() => {});
    return Response.json({ project, messages });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    if (typeof body.name === "string") {
      await renameWorkspaceProject(session.userId, id, body.name);
    }
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteWorkspaceProject(session.userId, id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
