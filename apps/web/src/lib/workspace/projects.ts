// CRUD helpers for workspace_projects + workspace_messages.
//
// Used by the /project/workspace page to persist chat history across
// browser sessions and devices. The sidebar reads the list; the
// workspace page reads + writes individual conversations.

import { createAdminClient } from "@/lib/supabase/admin";

export interface WorkspaceProjectRow {
  id: string;
  user_id: string;
  name: string;
  first_prompt: string | null;
  category: string | null;
  framework: string | null;
  last_preview_url: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  firstPrompt: string | null;
  category: string | null;
  framework: string | null;
  lastPreviewUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}

export interface WorkspaceMessageRow {
  id: string;
  project_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  client_id: string;
  client_ts: number;
  duration_ms: number | null;
  created_at: string;
}

export interface WorkspaceMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  clientId: string;
  clientTs: number;
  durationMs: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rawAdmin(): any {
  return createAdminClient();
}

function rowToProject(row: WorkspaceProjectRow): WorkspaceProject {
  return {
    id: row.id,
    name: row.name,
    firstPrompt: row.first_prompt,
    category: row.category,
    framework: row.framework,
    lastPreviewUrl: row.last_preview_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastOpenedAt: row.last_opened_at,
  };
}

function rowToMessage(row: WorkspaceMessageRow): WorkspaceMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    clientId: row.client_id,
    clientTs: Number(row.client_ts),
    durationMs: row.duration_ms,
  };
}

// ─── Projects ──────────────────────────────────────

export async function listWorkspaceProjects(userId: string): Promise<WorkspaceProject[]> {
  const { data, error } = await rawAdmin()
    .from("workspace_projects")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("last_opened_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`listWorkspaceProjects: ${error.message}`);
  return (data ?? []).map(rowToProject);
}

export async function getWorkspaceProject(
  userId: string,
  projectId: string
): Promise<WorkspaceProject | null> {
  const { data, error } = await rawAdmin()
    .from("workspace_projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`getWorkspaceProject: ${error.message}`);
  return data ? rowToProject(data) : null;
}

export async function createWorkspaceProject(
  userId: string,
  input: { name?: string; firstPrompt?: string; category?: string; framework?: string }
): Promise<WorkspaceProject> {
  const name =
    input.name?.trim() ||
    input.firstPrompt?.trim().slice(0, 60) ||
    "Untitled project";
  const { data, error } = await rawAdmin()
    .from("workspace_projects")
    .insert({
      user_id: userId,
      name,
      first_prompt: input.firstPrompt ?? null,
      category: input.category ?? null,
      framework: input.framework ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`createWorkspaceProject: ${error?.message ?? "no data"}`);
  return rowToProject(data);
}

export async function touchWorkspaceProject(userId: string, projectId: string): Promise<void> {
  const { error } = await rawAdmin()
    .from("workspace_projects")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("user_id", userId);
  if (error) throw new Error(`touchWorkspaceProject: ${error.message}`);
}

export async function renameWorkspaceProject(
  userId: string,
  projectId: string,
  name: string
): Promise<void> {
  const { error } = await rawAdmin()
    .from("workspace_projects")
    .update({ name })
    .eq("id", projectId)
    .eq("user_id", userId);
  if (error) throw new Error(`renameWorkspaceProject: ${error.message}`);
}

export async function deleteWorkspaceProject(
  userId: string,
  projectId: string
): Promise<void> {
  const { error } = await rawAdmin()
    .from("workspace_projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", userId);
  if (error) throw new Error(`deleteWorkspaceProject: ${error.message}`);
}

// ─── Messages ──────────────────────────────────────

export async function listWorkspaceMessages(
  userId: string,
  projectId: string
): Promise<WorkspaceMessage[]> {
  const { data, error } = await rawAdmin()
    .from("workspace_messages")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("client_ts", { ascending: true })
    .limit(500);
  if (error) throw new Error(`listWorkspaceMessages: ${error.message}`);
  return (data ?? []).map(rowToMessage);
}

export interface WorkspaceMessageInput {
  role: "user" | "assistant";
  content: string;
  clientId: string;
  clientTs: number;
  durationMs?: number | null;
}

/**
 * Upsert a batch of messages for a project. The (project_id, client_id)
 * unique constraint dedupes re-sends from the client, so the workspace
 * can safely push its full buffer each time without creating duplicates.
 */
export async function upsertWorkspaceMessages(
  userId: string,
  projectId: string,
  messages: WorkspaceMessageInput[]
): Promise<void> {
  if (messages.length === 0) return;
  const rows = messages.map((m) => ({
    project_id: projectId,
    user_id: userId,
    role: m.role,
    content: m.content,
    client_id: m.clientId,
    client_ts: m.clientTs,
    duration_ms: m.durationMs ?? null,
  }));
  const { error } = await rawAdmin()
    .from("workspace_messages")
    .upsert(rows, { onConflict: "project_id,client_id" });
  if (error) throw new Error(`upsertWorkspaceMessages: ${error.message}`);
}
