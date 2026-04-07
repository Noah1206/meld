// ─── Agent Bridge ────────────────────────────────────
// Bridge that allows external AI agents (Claude Code, Cursor, GitHub Copilot, etc.)
// to use Meld features as MCP tools.
// Provides HTTP API endpoints + Claude API compatible tool definitions.

import type { MCPTool, MCPToolResult, ClaudeToolDef } from "./types";

// ─── Tool Definitions ──────────────────────────────────────

const AGENT_BRIDGE_TOOLS: MCPTool[] = [
  {
    name: "meld_read_file",
    description:
      "Read a file from the connected Meld project. Returns the file content as text. " +
      "Use this to inspect source code, config files, or any project file.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative file path from the project root (e.g., 'src/App.tsx')",
          required: true,
        },
        startLine: {
          type: "number",
          description: "Optional start line number (1-based). If omitted, reads from the beginning.",
        },
        endLine: {
          type: "number",
          description: "Optional end line number (1-based). If omitted, reads to the end.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "meld_write_file",
    description:
      "Write or edit a file in the connected Meld project. Changes go through the approval flow " +
      "so the user can review before applying. Returns a diff preview.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative file path from the project root (e.g., 'src/App.tsx')",
          required: true,
        },
        content: {
          type: "string",
          description: "The full new file content to write",
          required: true,
        },
        description: {
          type: "string",
          description: "Human-readable description of the change (shown in the approval UI)",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "meld_preview_screenshot",
    description:
      "Capture a screenshot of the current preview (dev server iframe). " +
      "Returns a base64-encoded PNG image. Useful for visual verification after edits.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "Optional CSS selector to capture a specific element instead of the full page",
        },
        width: {
          type: "number",
          description: "Viewport width in pixels (default: 1280)",
          default: 1280,
        },
        height: {
          type: "number",
          description: "Viewport height in pixels (default: 720)",
          default: 720,
        },
      },
      required: [],
    },
  },
  {
    name: "meld_get_file_tree",
    description:
      "Get the project file tree. Returns a hierarchical list of all files and directories. " +
      "Useful for understanding project structure before making edits.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Subdirectory to list (default: project root). e.g., 'src/components'",
        },
        depth: {
          type: "number",
          description: "Maximum directory depth to traverse (default: 3)",
          default: 3,
        },
        includeHidden: {
          type: "boolean",
          description: "Include hidden files/directories starting with '.' (default: false)",
          default: false,
        },
      },
      required: [],
    },
  },
  {
    name: "meld_run_command",
    description:
      "Run a terminal command in the project directory. Returns stdout and stderr. " +
      "Use for running tests, build commands, linters, etc. Commands are sandboxed to the project directory.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to execute (e.g., 'npm test', 'npx tsc --noEmit')",
          required: true,
        },
        cwd: {
          type: "string",
          description: "Working directory relative to project root (default: project root)",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 30000, max: 120000)",
          default: 30000,
        },
      },
      required: ["command"],
    },
  },
  {
    name: "meld_get_design_system",
    description:
      "Get the current design system tokens extracted from the project. " +
      "Returns colors, typography, spacing, and other design tokens as structured data.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Filter by token category",
          enum: ["colors", "typography", "spacing", "borders", "shadows", "all"],
          default: "all",
        },
      },
      required: [],
    },
  },
  {
    name: "meld_visual_edit",
    description:
      "Apply a visual edit to a specific element in the project. " +
      "Supports changing colors, spacing, typography, borders, etc. by CSS selector. " +
      "Meld will find the corresponding source code and apply the change.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector or component name to target (e.g., '.header', 'Button')",
          required: true,
        },
        changes: {
          type: "object",
          description:
            "Key-value pairs of CSS properties to change. " +
            "Example: { \"backgroundColor\": \"#3B82F6\", \"padding\": \"16px\" }",
          required: true,
        },
        filePath: {
          type: "string",
          description: "Optional file path hint if you know which file contains the element",
        },
      },
      required: ["selector", "changes"],
    },
  },
];

// ─── Agent Bridge Class ─────────────────────────────

export class AgentBridge {
  /**
   * Returns Claude API compatible tool definition list.
   * External agents can use this list in their tools parameter
   * to access Meld features as tools.
   */
  static getToolDefinitions(): ClaudeToolDef[] {
    return AGENT_BRIDGE_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: "object",
        properties: tool.inputSchema.properties as Record<string, unknown>,
        required: tool.inputSchema.required,
      },
    }));
  }

  /**
   * Returns MCP protocol compatible tool definition list.
   */
  static getMCPTools(): MCPTool[] {
    return [...AGENT_BRIDGE_TOOLS];
  }

  /**
   * Validate tool name.
   */
  static isValidTool(name: string): boolean {
    return AGENT_BRIDGE_TOOLS.some((t) => t.name === name);
  }

  /**
   * Execute a tool. Handler that interfaces with the actual project filesystem.
   *
   * Currently delegates to the local agent connected via WebSocket.
   * When no local agent is connected (cloud mode),
   * file read/write is handled through the GitHub API.
   */
  static async executeTool(
    name: string,
    args: Record<string, unknown>,
    context: AgentBridgeContext,
  ): Promise<MCPToolResult> {
    if (!this.isValidTool(name)) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}. Available: ${AGENT_BRIDGE_TOOLS.map((t) => t.name).join(", ")}` }],
        isError: true,
      };
    }

    const handler = TOOL_HANDLERS[name];
    if (!handler) {
      return {
        content: [{ type: "text", text: `Tool "${name}" is defined but not yet implemented.` }],
        isError: true,
      };
    }

    try {
      return await handler(args, context);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Tool execution failed (${name}): ${message}` }],
        isError: true,
      };
    }
  }
}

// ─── Execution Context ──────────────────────────────────

export interface AgentBridgeContext {
  /** Authenticated user ID */
  userId: string;
  /** Project root path (local mode) */
  projectRoot?: string;
  /** Whether a local agent is connected via WebSocket */
  hasLocalAgent: boolean;
  /** Function to send commands to the local agent */
  sendToAgent?: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
  /** GitHub info (cloud mode fallback) */
  github?: {
    owner: string;
    repo: string;
    branch: string;
    accessToken: string;
  };
}

// ─── Tool Handlers ─────────────────────────────────────

type ToolHandler = (
  args: Record<string, unknown>,
  ctx: AgentBridgeContext,
) => Promise<MCPToolResult>;

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  meld_read_file: async (args, ctx) => {
    const path = args.path as string;
    if (!path) {
      return errorResult("'path' parameter is required");
    }

    // Delegate to local agent if available
    if (ctx.hasLocalAgent && ctx.sendToAgent) {
      const result = await ctx.sendToAgent("readFile", {
        path,
        startLine: args.startLine,
        endLine: args.endLine,
      });
      return textResult(result);
    }

    // Cloud mode: read file via GitHub API
    if (ctx.github) {
      const { owner, repo, branch, accessToken } = ctx.github;
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github.v3.raw" } },
      );
      if (!res.ok) {
        return errorResult(`Failed to read file from GitHub: ${res.status} ${res.statusText}`);
      }
      const content = await res.text();
      return textResult({ path, content, source: "github" });
    }

    return errorResult("No local agent or GitHub connection available. Connect a project first.");
  },

  meld_write_file: async (args, ctx) => {
    const path = args.path as string;
    const content = args.content as string;
    const description = (args.description as string) ?? "File edit from external agent";

    if (!path || content === undefined) {
      return errorResult("'path' and 'content' parameters are required");
    }

    if (ctx.hasLocalAgent && ctx.sendToAgent) {
      const result = await ctx.sendToAgent("writeFile", { path, content, description });
      return textResult(result);
    }

    // In cloud mode, queue for approval (no direct writes)
    return textResult({
      status: "pending_approval",
      path,
      description,
      message: "File change queued for user approval. The user will review and apply the change in Meld.",
    });
  },

  meld_preview_screenshot: async (args, ctx) => {
    if (ctx.hasLocalAgent && ctx.sendToAgent) {
      const result = await ctx.sendToAgent("screenshot", {
        selector: args.selector,
        width: args.width ?? 1280,
        height: args.height ?? 720,
      });

      // Return as image type if base64 image is returned
      if (typeof result === "object" && result !== null && "base64" in result) {
        return {
          content: [{
            type: "image" as const,
            data: (result as { base64: string }).base64,
            mimeType: "image/png",
          }],
        };
      }

      return textResult(result);
    }

    return errorResult("Screenshot requires a local agent connection. Run 'npx figma-code-bridge' in your project.");
  },

  meld_get_file_tree: async (args, ctx) => {
    if (ctx.hasLocalAgent && ctx.sendToAgent) {
      const result = await ctx.sendToAgent("fileTree", {
        path: args.path ?? "",
        depth: args.depth ?? 3,
        includeHidden: args.includeHidden ?? false,
      });
      return textResult(result);
    }

    // GitHub fallback: fetch repo tree
    if (ctx.github) {
      const { owner, repo, branch, accessToken } = ctx.github;
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) {
        return errorResult(`Failed to get file tree from GitHub: ${res.status}`);
      }
      const data = await res.json();
      const tree = (data.tree as Array<{ path: string; type: string }>)
        .filter((item) => {
          const subpath = args.path as string | undefined;
          if (subpath) return item.path.startsWith(subpath);
          return true;
        })
        .map((item) => ({ path: item.path, type: item.type === "tree" ? "directory" : "file" }));
      return textResult({ tree, source: "github", truncated: data.truncated });
    }

    return errorResult("No local agent or GitHub connection available.");
  },

  meld_run_command: async (args, ctx) => {
    const command = args.command as string;
    if (!command) {
      return errorResult("'command' parameter is required");
    }

    // Security: block dangerous commands
    const blocked = ["rm -rf /", "rm -rf ~", "sudo", "mkfs", "dd if=", "> /dev/"];
    for (const pattern of blocked) {
      if (command.includes(pattern)) {
        return errorResult(`Command blocked for safety: contains '${pattern}'`);
      }
    }

    const timeout = Math.min((args.timeout as number) ?? 30000, 120000);

    if (ctx.hasLocalAgent && ctx.sendToAgent) {
      const result = await ctx.sendToAgent("runCommand", {
        command,
        cwd: args.cwd,
        timeout,
      });
      return textResult(result);
    }

    return errorResult("Terminal commands require a local agent connection. Run 'npx figma-code-bridge' in your project.");
  },

  meld_get_design_system: async (args, ctx) => {
    const category = (args.category as string) ?? "all";

    if (ctx.hasLocalAgent && ctx.sendToAgent) {
      const result = await ctx.sendToAgent("getDesignSystem", { category });
      return textResult(result);
    }

    return textResult({
      status: "unavailable",
      message: "Design system extraction requires a local agent or an analyzed project. Connect a project first.",
    });
  },

  meld_visual_edit: async (args, ctx) => {
    const selector = args.selector as string;
    const changes = args.changes as Record<string, string>;

    if (!selector || !changes) {
      return errorResult("'selector' and 'changes' parameters are required");
    }

    if (ctx.hasLocalAgent && ctx.sendToAgent) {
      const result = await ctx.sendToAgent("visualEdit", {
        selector,
        changes,
        filePath: args.filePath,
      });
      return textResult(result);
    }

    return textResult({
      status: "pending_approval",
      selector,
      changes,
      message: "Visual edit queued for user approval in Meld.",
    });
  },
};

// ─── Helpers ───────────────────────────────────────────

function textResult(data: unknown): MCPToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string): MCPToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
