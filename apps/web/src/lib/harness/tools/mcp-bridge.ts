// MCP → Harness tool bridge
//
// READ-ONLY adapter over lib/mcp/registry. The harness sees MCP tools as
// regular Tool objects; the underlying registry is not modified.

import type { Tool, ToolExecutionContext, ToolExecutionResult, ToolDef } from "../types";
import { getClaudeTools, executeTool as mcpExecuteTool } from "@/lib/mcp/registry";

/**
 * Build a fresh list of MCP-backed Tool objects for a given user.
 * This snapshots the user's currently connected MCP servers — re-invoke
 * it between rounds if the catalogue may have changed.
 */
export async function buildMCPTools(userId: string): Promise<Tool[]> {
  const claudeTools = getClaudeTools(userId);

  return claudeTools.map((def): Tool => {
    const toolDef: ToolDef = {
      name: def.name,
      description: def.description,
      input_schema: {
        type: "object",
        properties: def.input_schema.properties,
        required: def.input_schema.required,
      },
    };
    return {
      def: toolDef,
      async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolExecutionResult> {
        const result = await mcpExecuteTool(ctx.userId, def.name, input);
        const text = result.content
          .map(c => {
            if (c.type === "text") return c.text ?? "";
            if (c.type === "image") return `[image:${c.mimeType ?? "unknown"}]`;
            if (c.type === "resource") return `[resource]`;
            return "";
          })
          .filter(Boolean)
          .join("\n");
        return { text: text || "(empty)", isError: !!result.isError };
      },
    };
  });
}
