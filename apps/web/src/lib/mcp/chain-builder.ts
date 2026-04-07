// ─── MCP Tool Chain Builder (#4) ────────────────────
// Engine that chains tools into workflows.
// Each step's result can be passed as input to the next step.

import type { MCPToolChain, MCPToolChainStep, MCPChainRef, MCPChainExecutionResult, MCPToolResult, MCPTool } from "./types";
import { executeTool, getConnectedServers } from "./registry";

// ─── Built-in chain templates ───────────────────────────
// Default chains users can use right away (not hardcoded — defined as data)
export function getBuiltinChains(): MCPToolChain[] {
  return [
    {
      id: "design-to-code-sync",
      name: "Design → Code Sync",
      description: "Extract Figma design specs, find matching code, and compare",
      trigger: "manual",
      createdAt: "builtin",
      steps: [
        {
          id: "extract-tokens",
          toolName: "figma_extract_tokens",
          serverId: "figma",
          inputMapping: { file_key: "{{input.figma_file_key}}" },
        },
        {
          id: "detect-framework",
          toolName: "github_detect_framework",
          serverId: "github",
          inputMapping: { owner: "{{input.github_owner}}", repo: "{{input.github_repo}}" },
        },
        {
          id: "search-component",
          toolName: "github_search_code",
          serverId: "github",
          inputMapping: {
            query: "{{input.component_name}}",
            owner: "{{input.github_owner}}",
            repo: "{{input.github_repo}}",
          },
        },
      ],
    },
    {
      id: "fidelity-pipeline",
      name: "Fidelity Check Pipeline",
      description: "Extract design spec → find code → fidelity comparison",
      trigger: "manual",
      createdAt: "builtin",
      steps: [
        {
          id: "get-design-spec",
          toolName: "fidelity_extract_design_spec",
          serverId: "fidelity",
          inputMapping: {
            figma_file_key: "{{input.figma_file_key}}",
            figma_node_ids: "{{input.figma_node_ids}}",
          },
        },
        {
          id: "get-design-image",
          toolName: "figma_get_images",
          serverId: "figma",
          inputMapping: {
            file_key: "{{input.figma_file_key}}",
            node_ids: "{{input.figma_node_ids}}",
            format: "png",
          },
        },
        {
          id: "run-fidelity-check",
          toolName: "fidelity_check",
          serverId: "fidelity",
          inputMapping: {
            figma_file_key: "{{input.figma_file_key}}",
            figma_node_id: "{{input.figma_node_id}}",
            code_file_path: "{{input.code_file_path}}",
            github_owner: "{{input.github_owner}}",
            github_repo: "{{input.github_repo}}",
          },
        },
      ],
    },
    {
      id: "component-audit",
      name: "Component Audit",
      description: "Analyze Figma file structure → search codebase for matches → coverage report",
      trigger: "manual",
      createdAt: "builtin",
      steps: [
        {
          id: "get-figma-structure",
          toolName: "figma_get_file",
          serverId: "figma",
          inputMapping: { file_key: "{{input.figma_file_key}}" },
        },
        {
          id: "list-code-files",
          toolName: "github_list_files",
          serverId: "github",
          inputMapping: { owner: "{{input.github_owner}}", repo: "{{input.github_repo}}" },
        },
      ],
    },
  ];
}

// ─── Chain execution engine ─────────────────────────────

export async function executeChain(
  userId: string,
  chain: MCPToolChain,
  input: Record<string, unknown>,
): Promise<MCPChainExecutionResult> {
  const startTime = Date.now();
  const stepResults: MCPChainExecutionResult["steps"] = [];
  const stepOutputs = new Map<string, MCPToolResult>();

  for (const step of chain.steps) {
    const stepStart = Date.now();

    // Condition check
    if (step.condition && !evaluateCondition(step.condition, input, stepOutputs)) {
      stepResults.push({
        stepId: step.id,
        toolName: step.toolName,
        result: { content: [{ type: "text", text: "Skipped due to unmet condition" }] },
        durationMs: 0,
        skipped: true,
      });
      continue;
    }

    // Resolve input mapping
    const resolvedArgs = resolveInputMapping(step.inputMapping, input, stepOutputs);

    // Execute tool
    const result = await executeTool(userId, step.toolName, resolvedArgs);

    stepOutputs.set(step.id, result);
    stepResults.push({
      stepId: step.id,
      toolName: step.toolName,
      result,
      durationMs: Date.now() - stepStart,
      skipped: false,
    });

    // Abort chain on error
    if (result.isError) break;
  }

  return {
    chainId: chain.id,
    steps: stepResults,
    totalDurationMs: Date.now() - startTime,
  };
}

// ─── Input mapping resolution ─────────────────────────────
function resolveInputMapping(
  mapping: Record<string, string | MCPChainRef>,
  input: Record<string, unknown>,
  stepOutputs: Map<string, MCPToolResult>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(mapping)) {
    if (typeof value === "string") {
      // Resolve template strings: "{{input.xxx}}" or "{{steps.xxx.result.yyy}}"
      resolved[key] = resolveTemplate(value, input, stepOutputs);
    } else if (value.type === "step_result") {
      // Extract value from previous step result
      const stepResult = stepOutputs.get(value.stepId);
      if (stepResult) {
        try {
          const data = JSON.parse(stepResult.content[0]?.text ?? "{}");
          resolved[key] = getNestedValue(data, value.path);
        } catch {
          resolved[key] = null;
        }
      }
    }
  }

  return resolved;
}

function resolveTemplate(
  template: string,
  input: Record<string, unknown>,
  stepOutputs: Map<string, MCPToolResult>,
): unknown {
  // "{{input.xxx}}" pattern
  const inputMatch = template.match(/^\{\{input\.(\w+)\}\}$/);
  if (inputMatch) return input[inputMatch[1]];

  // "{{steps.xxx.yyy}}" pattern
  const stepMatch = template.match(/^\{\{steps\.(\w+)\.(.+)\}\}$/);
  if (stepMatch) {
    const stepResult = stepOutputs.get(stepMatch[1]);
    if (stepResult) {
      try {
        const data = JSON.parse(stepResult.content[0]?.text ?? "{}");
        return getNestedValue(data, stepMatch[2]);
      } catch { return null; }
    }
  }

  // Return as-is (literal value)
  return template;
}

function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function evaluateCondition(
  condition: string,
  input: Record<string, unknown>,
  stepOutputs: Map<string, MCPToolResult>,
): boolean {
  // Simple condition evaluation: "input.xxx exists", "steps.xxx.success"
  if (condition.startsWith("input.")) {
    const key = condition.replace("input.", "").replace(" exists", "");
    return input[key] != null;
  }
  if (condition.startsWith("steps.")) {
    const parts = condition.replace("steps.", "").split(".");
    const stepResult = stepOutputs.get(parts[0]);
    return !!stepResult && !stepResult.isError;
  }
  return true;
}

// ─── Suggest chains from available tools ──────────────
export function suggestChains(
  userId: string,
): { available: MCPToolChain[]; unavailable: Array<{ chain: MCPToolChain; missing: string[] }> } {
  const connected = getConnectedServers(userId);
  const availableToolNames = new Set(connected.flatMap((s) => s.tools.map((t) => t.name)));
  // Fidelity tools are always available (built-in)
  availableToolNames.add("fidelity_check");
  availableToolNames.add("fidelity_extract_design_spec");

  const allChains = getBuiltinChains();
  const available: MCPToolChain[] = [];
  const unavailable: Array<{ chain: MCPToolChain; missing: string[] }> = [];

  for (const chain of allChains) {
    const missing = chain.steps
      .filter((s) => !availableToolNames.has(s.toolName))
      .map((s) => s.toolName);

    if (missing.length === 0) {
      available.push(chain);
    } else {
      unavailable.push({ chain, missing });
    }
  }

  return { available, unavailable };
}

// ─── Custom chain creation helper ──────────────────────
export function createChain(
  name: string,
  description: string,
  steps: MCPToolChainStep[],
  trigger: MCPToolChain["trigger"] = "manual",
): MCPToolChain {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    trigger,
    steps,
    createdAt: new Date().toISOString(),
  };
}

// All tools from connected servers (for chain builder UI)
export function getAvailableToolsForChaining(userId: string): Array<{ serverId: string; serverName: string; tools: MCPTool[] }> {
  const servers = getConnectedServers(userId);
  return servers.map((s) => ({
    serverId: s.adapterId,
    serverName: s.instance.meta?.userName as string ?? s.adapterId,
    tools: s.tools,
  }));
}
