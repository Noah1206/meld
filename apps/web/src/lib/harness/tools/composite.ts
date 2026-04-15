// Composite tool provider
//
// Merges a static ToolRegistry (built-ins + manually added) with a dynamic
// source (MCP snapshot rebuilt per-call). The harness sees this as a single
// ToolProvider.

import type { Tool, ToolProvider, ToolExecutionContext, ToolExecutionResult } from "../types";
import { ToolRegistry } from "./registry";
import { buildMCPTools } from "./mcp-bridge";

export interface CompositeToolProviderOptions {
  static: ToolRegistry;
  includeMCP?: boolean;
}

export class CompositeToolProvider implements ToolProvider {
  private readonly staticRegistry: ToolRegistry;
  private readonly includeMCP: boolean;

  constructor(options: CompositeToolProviderOptions) {
    this.staticRegistry = options.static;
    this.includeMCP = options.includeMCP ?? false;
  }

  async list(userId: string): Promise<Tool[]> {
    const builtin = await this.staticRegistry.list(userId);
    if (!this.includeMCP) return builtin;
    const mcp = await buildMCPTools(userId);
    return [...builtin, ...mcp];
  }

  async execute(
    name: string,
    input: Record<string, unknown>,
    ctx: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    // Try static first — builtins always win on name collision.
    const tools = await this.list(ctx.userId);
    const tool = tools.find(t => t.def.name === name);
    if (!tool) {
      return { text: `Unknown tool: ${name}`, isError: true };
    }
    return tool.execute(ctx, input);
  }
}
