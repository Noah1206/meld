// AgentDefinition — the serializable form of a user-authored harness agent.
//
// Stored in harness_agents.config as JSONB. The runtime hydrates this into
// a full HarnessConfig by attaching concrete providers (Claude, E2B, etc).
//
// Keep this type PURE — no functions, no class instances, only JSON.

import { createAdminClient } from "@/lib/supabase/admin";

export type PipelineKind = "single-loop" | "three-agent";

export interface AgentDefinition {
  id: string;
  userId: string;
  name: string;
  description: string;

  /** Which pipeline the harness should run. */
  pipeline: PipelineKind;

  /** Optional custom system prompt prepended to each stage. */
  systemPrompt: string;

  /** Claude model ID. */
  modelId: string;
  maxTokens: number;

  /** Built-in tool names to expose (subset of the 9 core tools). */
  builtinToolIds: string[];

  /** MCP server adapter IDs to expose (e.g. "github", "vercel"). */
  mcpServerIds: string[];

  /** E2B template name. */
  sandboxTemplate: string;
  sandboxTimeoutMs: number;

  /** Pipeline-specific knobs. */
  orchestration: {
    maxRounds?: number;
    maxIterations?: number;
    compressThreshold?: number;
  };

  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface AgentDefinitionDraft {
  name: string;
  description?: string;
  pipeline?: PipelineKind;
  systemPrompt?: string;
  modelId?: string;
  maxTokens?: number;
  builtinToolIds?: string[];
  mcpServerIds?: string[];
  sandboxTemplate?: string;
  sandboxTimeoutMs?: number;
  orchestration?: AgentDefinition["orchestration"];
}

// ─── Defaults ────────────────────────────────────────

export const DEFAULT_BUILTIN_TOOLS = [
  "read_file",
  "write_file",
  "delete_file",
  "rename_file",
  "list_files",
  "search_files",
  "run_command",
  "web_search",
  "browse_url",
];

export function fillDefaults(draft: AgentDefinitionDraft): Omit<
  AgentDefinition,
  "id" | "userId" | "createdAt" | "updatedAt" | "isArchived"
> {
  return {
    name: draft.name,
    description: draft.description ?? "",
    pipeline: draft.pipeline ?? "three-agent",
    systemPrompt: draft.systemPrompt ?? "",
    modelId: draft.modelId ?? "claude-sonnet-4-6-20250514",
    maxTokens: draft.maxTokens ?? 16384,
    builtinToolIds: draft.builtinToolIds ?? DEFAULT_BUILTIN_TOOLS,
    mcpServerIds: draft.mcpServerIds ?? [],
    sandboxTemplate: draft.sandboxTemplate ?? "meld-agent",
    sandboxTimeoutMs: draft.sandboxTimeoutMs ?? 30 * 60 * 1000,
    orchestration: draft.orchestration ?? {
      maxRounds: 50,
      maxIterations: 2,
      compressThreshold: 20,
    },
  };
}

// ─── Validation ─────────────────────────────────────

export function validateDraft(draft: AgentDefinitionDraft): { ok: true } | { ok: false; error: string } {
  if (!draft.name || draft.name.trim().length === 0) {
    return { ok: false, error: "Agent name is required" };
  }
  if (draft.name.length > 100) {
    return { ok: false, error: "Agent name must be 100 characters or fewer" };
  }
  if (draft.pipeline && !["single-loop", "three-agent"].includes(draft.pipeline)) {
    return { ok: false, error: `Unknown pipeline: ${draft.pipeline}` };
  }
  if (draft.maxTokens !== undefined && (draft.maxTokens < 512 || draft.maxTokens > 200000)) {
    return { ok: false, error: "maxTokens must be between 512 and 200000" };
  }
  if (draft.sandboxTimeoutMs !== undefined && draft.sandboxTimeoutMs < 60000) {
    return { ok: false, error: "sandboxTimeoutMs must be at least 60000 (1 min)" };
  }
  if (draft.builtinToolIds) {
    const unknown = draft.builtinToolIds.filter(t => !DEFAULT_BUILTIN_TOOLS.includes(t));
    if (unknown.length > 0) {
      return { ok: false, error: `Unknown built-in tool(s): ${unknown.join(", ")}` };
    }
  }
  return { ok: true };
}

// ─── CRUD ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rawAdmin(): any {
  return createAdminClient();
}

function rowToDefinition(row: {
  id: string;
  user_id: string;
  name: string;
  description: string;
  config: Omit<AgentDefinition, "id" | "userId" | "createdAt" | "updatedAt" | "isArchived">;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}): AgentDefinition {
  return {
    ...row.config,
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isArchived: row.is_archived,
  };
}

export async function listAgents(userId: string): Promise<AgentDefinition[]> {
  const { data, error } = await rawAdmin()
    .from("harness_agents")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`listAgents: ${error.message}`);
  return (data ?? []).map(rowToDefinition);
}

export async function getAgent(userId: string, agentId: string): Promise<AgentDefinition | null> {
  const { data, error } = await rawAdmin()
    .from("harness_agents")
    .select("*")
    .eq("id", agentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`getAgent: ${error.message}`);
  return data ? rowToDefinition(data) : null;
}

export async function createAgent(
  userId: string,
  draft: AgentDefinitionDraft
): Promise<AgentDefinition> {
  const validation = validateDraft(draft);
  if (!validation.ok) throw new Error(validation.error);

  const filled = fillDefaults(draft);

  const { data, error } = await rawAdmin()
    .from("harness_agents")
    .insert({
      user_id: userId,
      name: filled.name,
      description: filled.description,
      config: filled,
      model_id: filled.modelId,
      pipeline: filled.pipeline,
      tool_ids: filled.builtinToolIds,
      mcp_server_ids: filled.mcpServerIds,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`createAgent: ${error?.message ?? "no data"}`);
  return rowToDefinition(data);
}

export async function updateAgent(
  userId: string,
  agentId: string,
  patch: AgentDefinitionDraft
): Promise<AgentDefinition> {
  const existing = await getAgent(userId, agentId);
  if (!existing) throw new Error(`Agent not found: ${agentId}`);

  const merged = fillDefaults({
    name: patch.name ?? existing.name,
    description: patch.description ?? existing.description,
    pipeline: patch.pipeline ?? existing.pipeline,
    systemPrompt: patch.systemPrompt ?? existing.systemPrompt,
    modelId: patch.modelId ?? existing.modelId,
    maxTokens: patch.maxTokens ?? existing.maxTokens,
    builtinToolIds: patch.builtinToolIds ?? existing.builtinToolIds,
    mcpServerIds: patch.mcpServerIds ?? existing.mcpServerIds,
    sandboxTemplate: patch.sandboxTemplate ?? existing.sandboxTemplate,
    sandboxTimeoutMs: patch.sandboxTimeoutMs ?? existing.sandboxTimeoutMs,
    orchestration: patch.orchestration ?? existing.orchestration,
  });

  const validation = validateDraft(merged);
  if (!validation.ok) throw new Error(validation.error);

  const { data, error } = await rawAdmin()
    .from("harness_agents")
    .update({
      name: merged.name,
      description: merged.description,
      config: merged,
      model_id: merged.modelId,
      pipeline: merged.pipeline,
      tool_ids: merged.builtinToolIds,
      mcp_server_ids: merged.mcpServerIds,
    })
    .eq("id", agentId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error || !data) throw new Error(`updateAgent: ${error?.message ?? "no data"}`);
  return rowToDefinition(data);
}

export async function archiveAgent(userId: string, agentId: string): Promise<void> {
  const { error } = await rawAdmin()
    .from("harness_agents")
    .update({ is_archived: true })
    .eq("id", agentId)
    .eq("user_id", userId);
  if (error) throw new Error(`archiveAgent: ${error.message}`);
}

export async function deleteAgent(userId: string, agentId: string): Promise<void> {
  const { error } = await rawAdmin()
    .from("harness_agents")
    .delete()
    .eq("id", agentId)
    .eq("user_id", userId);
  if (error) throw new Error(`deleteAgent: ${error.message}`);
}
