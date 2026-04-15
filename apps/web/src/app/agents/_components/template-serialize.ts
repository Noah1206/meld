// Serializes an AgentDefinitionDraft into the Claude Console-style YAML
// and JSON formats shown in the template detail view.
//
// We hand-roll a tiny YAML writer instead of pulling in a dependency —
// the shape is fixed and small, so a schema-aware writer stays clean.

import type { AgentDefinitionDraft } from "@/lib/harness/agent-definition";
import type { AgentTemplate } from "./agent-templates";

const MCP_ENDPOINTS: Record<string, { name: string; url: string }> = {
  notion: { name: "notion", url: "https://mcp.notion.com/mcp" },
  slack: { name: "slack", url: "https://mcp.slack.com/mcp" },
  github: { name: "github", url: "https://mcp.github.com/mcp" },
  linear: { name: "linear", url: "https://mcp.linear.app/mcp" },
  supabase: { name: "supabase", url: "https://mcp.supabase.com/mcp" },
  figma: { name: "figma", url: "https://mcp.figma.com/mcp" },
  vercel: { name: "vercel", url: "https://mcp.vercel.com/mcp" },
  sentry: { name: "sentry", url: "https://mcp.sentry.io/mcp" },
  gmail: { name: "gmail", url: "https://mcp.gmail.com/mcp" },
  canva: { name: "canva", url: "https://mcp.canva.com/mcp" },
};

export interface SerializedTemplate {
  yaml: string;
  json: string;
  lineCount: number;
}

/**
 * Build the Claude Console-style YAML representation of a template.
 */
export function serializeTemplate(template: AgentTemplate): SerializedTemplate {
  const draft = template.draft;
  const yaml = buildYaml(template, draft);
  const json = JSON.stringify(buildJsonShape(template, draft), null, 2);
  return {
    yaml,
    json,
    lineCount: yaml.split("\n").length,
  };
}

// ─── YAML ────────────────────────────────────────────
function buildYaml(template: AgentTemplate, draft: AgentDefinitionDraft): string {
  const lines: string[] = [];
  lines.push(`name: ${yamlScalar(draft.name ?? template.name)}`);
  lines.push(`description: ${yamlScalar(draft.description ?? template.description)}`);
  lines.push(`model: ${yamlScalar(draft.modelId ?? "claude-sonnet-4-6")}`);

  // system prompt as block scalar (|-)
  lines.push(`system: |-`);
  const sysLines = (draft.systemPrompt ?? "").split("\n");
  for (const l of sysLines) {
    lines.push(l.length > 0 ? `  ${l}` : "");
  }

  // mcp_servers
  const mcpIds = draft.mcpServerIds ?? [];
  if (mcpIds.length > 0) {
    lines.push("mcp_servers:");
    for (const id of mcpIds) {
      const ep = MCP_ENDPOINTS[id] ?? { name: id, url: `https://mcp.${id}.com/mcp` };
      lines.push(`  - name: ${ep.name}`);
      lines.push(`    type: url`);
      lines.push(`    url: ${ep.url}`);
    }
  }

  // tools
  lines.push("tools:");
  lines.push(`  - type: agent_toolset_20260414`);
  for (const mcp of mcpIds) {
    lines.push(`  - type: mcp_toolset`);
    lines.push(`    mcp_server_name: ${mcp}`);
    lines.push(`    default_config:`);
    lines.push(`      permission_policy:`);
    lines.push(`        type: always_allow`);
  }

  // metadata
  lines.push("metadata:");
  lines.push(`  template: ${template.id}`);
  lines.push(`  category: ${template.category}`);
  if (draft.orchestration) {
    if (draft.orchestration.maxRounds)
      lines.push(`  max_rounds: ${draft.orchestration.maxRounds}`);
    if (draft.orchestration.maxIterations)
      lines.push(`  max_iterations: ${draft.orchestration.maxIterations}`);
  }
  lines.push(`  pipeline: ${draft.pipeline ?? "three-agent"}`);
  lines.push("");

  return lines.join("\n");
}

// Minimal YAML scalar quoting: quote if the string contains special chars.
function yamlScalar(value: string): string {
  if (value === "") return '""';
  if (/^[\w\-/.]+$/.test(value) && !/^\d+$/.test(value)) return value;
  // Use single quotes and escape single quotes by doubling
  const escaped = value.replace(/'/g, "''");
  return `'${escaped}'`;
}

// ─── JSON shape ──────────────────────────────────────
function buildJsonShape(template: AgentTemplate, draft: AgentDefinitionDraft) {
  const mcpIds = draft.mcpServerIds ?? [];
  return {
    name: draft.name ?? template.name,
    description: draft.description ?? template.description,
    model: draft.modelId ?? "claude-sonnet-4-6",
    system: draft.systemPrompt ?? "",
    mcp_servers: mcpIds.map(id => {
      const ep = MCP_ENDPOINTS[id] ?? { name: id, url: `https://mcp.${id}.com/mcp` };
      return { name: ep.name, type: "url", url: ep.url };
    }),
    tools: [
      { type: "agent_toolset_20260414" },
      ...mcpIds.map(mcp => ({
        type: "mcp_toolset",
        mcp_server_name: mcp,
        default_config: {
          permission_policy: { type: "always_allow" },
        },
      })),
    ],
    metadata: {
      template: template.id,
      category: template.category,
      pipeline: draft.pipeline ?? "three-agent",
      max_rounds: draft.orchestration?.maxRounds,
      max_iterations: draft.orchestration?.maxIterations,
    },
  };
}
