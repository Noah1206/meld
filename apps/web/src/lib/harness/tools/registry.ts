// Tool registry — single catalogue that merges built-in tools and MCP tools.
//
// The harness only ever calls `list()` + `execute(name, input, ctx)` on this
// object. It does not know which tool came from where.

import type { Tool, ToolProvider, ToolExecutionContext, ToolExecutionResult } from "../types";
import { BUILTIN_TOOLS } from "./builtin";

export interface ToolRegistryOptions {
  /** Subset of built-in tool names to expose. Omit = all 9. */
  builtin?: string[];
  /** Extra tools from MCP, plugins, etc. */
  extra?: Tool[];
}

export class ToolRegistry implements ToolProvider {
  private readonly tools: Tool[];

  constructor(options: ToolRegistryOptions = {}) {
    const builtinSet = options.builtin
      ? new Set(options.builtin)
      : null;
    const builtin = builtinSet
      ? BUILTIN_TOOLS.filter(t => builtinSet.has(t.def.name))
      : BUILTIN_TOOLS;
    this.tools = [...builtin, ...(options.extra ?? [])];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async list(_userId: string): Promise<Tool[]> {
    return [...this.tools];
  }

  async execute(
    name: string,
    input: Record<string, unknown>,
    ctx: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.find(t => t.def.name === name);
    if (!tool) {
      return { text: `Unknown tool: ${name}`, isError: true };
    }
    return tool.execute(ctx, input);
  }
}
