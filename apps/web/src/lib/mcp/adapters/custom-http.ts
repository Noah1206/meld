// ─── Custom HTTP MCP Adapter ────────────────────────
// User enters an MCP server URL to connect directly.
// Calls MCP spec tools/list, tools/call endpoints.

import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

interface CustomServerConfig {
  id: string;
  name: string;
  description: string;
  endpoint: string;       // MCP server base URL
  icon?: string;
}

export class CustomHTTPAdapter extends BaseMCPAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly category = "custom";

  private endpoint: string;
  private cachedTools: MCPTool[] | null = null;

  constructor(config: CustomServerConfig) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.endpoint = config.endpoint.replace(/\/$/, "");
    this.icon = config.icon ?? "plug";
  }

  async validateConnection(auth: MCPAuth) {
    try {
      // MCP spec: verify connection + fetch tool list via tools/list
      const res = await fetch(`${this.endpoint}/tools/list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) return { valid: false, error: `Server response error: ${res.status}` };
      const data = await res.json();
      this.cachedTools = data.tools ?? [];
      return {
        valid: true,
        meta: { toolCount: this.cachedTools?.length ?? 0, serverName: data.name },
      };
    } catch (err) {
      return { valid: false, error: `Unable to connect to server: ${err instanceof Error ? err.message : ""}` };
    }
  }

  getTools(): MCPTool[] {
    return this.cachedTools ?? [];
  }

  // Custom server does not use toolHandlers map — calls HTTP directly
  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {};

  async executeTool(toolName: string, args: Record<string, unknown>, auth: MCPAuth): Promise<MCPToolResult> {
    try {
      const res = await fetch(`${this.endpoint}/tools/call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ name: toolName, arguments: args }),
      });

      if (!res.ok) {
        return this.errorResult(`MCP server error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      return {
        content: data.content ?? [{ type: "text", text: JSON.stringify(data) }],
        isError: data.isError,
      };
    } catch (err) {
      return this.errorResult(`Tool execution failed: ${err instanceof Error ? err.message : ""}`);
    }
  }

  async gatherContext(auth: MCPAuth, _hint?: string): Promise<MCPContextFragment> {
    const tools = this.getTools();
    return {
      serverId: this.id,
      serverName: this.name,
      summary: `${this.name} connected — ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`,
      data: { tools: tools.map((t) => t.name) },
      relevance: 0.3,
    };
  }
}
