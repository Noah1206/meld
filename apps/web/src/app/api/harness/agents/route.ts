// GET  /api/harness/agents      — list the current user's agents
// POST /api/harness/agents      — create a new agent from an AgentDefinitionDraft

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  listAgents,
  createAgent,
  type AgentDefinitionDraft,
} from "@/lib/harness/agent-definition";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const agents = await listAgents(session.userId);
    return Response.json({ agents });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  let draft: AgentDefinitionDraft;
  try {
    draft = (await req.json()) as AgentDefinitionDraft;
  } catch {
    return Response.json({ error: "invalid json body" }, { status: 400 });
  }
  try {
    const agent = await createAgent(session.userId, draft);
    return Response.json({ agent }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return Response.json({ error: message }, { status: 400 });
  }
}
