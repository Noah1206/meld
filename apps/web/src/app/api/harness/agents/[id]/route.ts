// GET    /api/harness/agents/:id — fetch a single agent
// PATCH  /api/harness/agents/:id — update fields (draft semantics)
// DELETE /api/harness/agents/:id — hard delete (archive via PATCH isArchived)

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getAgent,
  updateAgent,
  deleteAgent,
  type AgentDefinitionDraft,
} from "@/lib/harness/agent-definition";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const agent = await getAgent(session.userId, id);
    if (!agent) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ agent });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  let patch: AgentDefinitionDraft;
  try {
    patch = (await req.json()) as AgentDefinitionDraft;
  } catch {
    return Response.json({ error: "invalid json body" }, { status: 400 });
  }
  try {
    const agent = await updateAgent(session.userId, id, patch);
    return Response.json({ agent });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    await deleteAgent(session.userId, id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
