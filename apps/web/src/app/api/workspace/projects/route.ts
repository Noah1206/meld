// GET  /api/workspace/projects — list the current user's workspace projects
// POST /api/workspace/projects — create a new workspace project (from the
//                                 first prompt or explicitly via the UI)

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  listWorkspaceProjects,
  createWorkspaceProject,
} from "@/lib/workspace/projects";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const projects = await listWorkspaceProjects(session.userId);
    return Response.json({ projects });
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
  let body: {
    name?: string;
    firstPrompt?: string;
    category?: string;
    framework?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json body" }, { status: 400 });
  }
  try {
    const project = await createWorkspaceProject(session.userId, body);
    return Response.json({ project }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
