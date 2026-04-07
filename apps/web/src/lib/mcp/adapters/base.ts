// ─── Base Adapter ────────────────────────────────────
// Base class for all MCP server adapters.
// Common logic is handled here; each adapter only defines tools.

import type { MCPServerAdapter, MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

export abstract class BaseMCPAdapter implements MCPServerAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly icon: string;
  abstract readonly category: string;

  // Tool map each adapter must implement: toolName → handler
  protected abstract toolHandlers: Record<
    string,
    (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>
  >;

  abstract getTools(): MCPTool[];
  abstract validateConnection(auth: MCPAuth): Promise<{ valid: boolean; error?: string; meta?: Record<string, unknown> }>;

  // Default execution — find and run handler from toolHandlers map
  async executeTool(toolName: string, args: Record<string, unknown>, auth: MCPAuth): Promise<MCPToolResult> {
    const handler = this.toolHandlers[toolName];
    if (!handler) {
      return {
        content: [{ type: "text", text: `Tool not found: ${toolName}` }],
        isError: true,
      };
    }

    try {
      return await handler(args, auth);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Tool execution failed (${toolName}): ${message}` }],
        isError: true,
      };
    }
  }

  // Default context — can be overridden
  async gatherContext(auth: MCPAuth, _hint?: string): Promise<MCPContextFragment> {
    return {
      serverId: this.id,
      serverName: this.name,
      summary: `${this.name} connected (${this.getTools().length} tools available)`,
      data: {},
      relevance: 0.3,
    };
  }

  // Helper: create JSON text result
  protected textResult(data: unknown): MCPToolResult {
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }

  protected errorResult(message: string): MCPToolResult {
    return {
      content: [{ type: "text", text: message }],
      isError: true,
    };
  }
}
