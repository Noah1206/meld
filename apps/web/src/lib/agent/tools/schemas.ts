// Shared tool schemas — single source of truth for the 9 builtin tools
// + request_mcp. Both engines (the legacy /api/ai/agent-run single-loop
// and the harness pipeline) advertise the SAME tools to Claude. Keep
// the names, descriptions, and input_schemas here so they can never
// drift between the two callers.
//
// NOTE: these are wire-format schemas only (the shape Claude sees). The
// actual sandbox-bound execution lives next to each engine because
// E2B sandbox handles vary.

export interface BuiltinToolInputSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

/** Wire-format tool definition shared by both Meld engines. */
export interface BuiltinToolDef {
  name: string;
  description: string;
  input_schema: BuiltinToolInputSchema;
}

export const READ_FILE_TOOL: BuiltinToolDef = {
  name: "read_file",
  description: "Read a file's contents",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative path from project root" },
    },
    required: ["path"],
  },
};

export const WRITE_FILE_TOOL: BuiltinToolDef = {
  name: "write_file",
  description: "Create or overwrite a file with complete content",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative path from project root" },
      content: { type: "string", description: "Complete file content" },
      explanation: { type: "string", description: "Brief explanation of changes" },
    },
    required: ["path", "content"],
  },
};

export const DELETE_FILE_TOOL: BuiltinToolDef = {
  name: "delete_file",
  description: "Delete a file or directory",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative path to delete" },
    },
    required: ["path"],
  },
};

export const RENAME_FILE_TOOL: BuiltinToolDef = {
  name: "rename_file",
  description: "Rename or move a file",
  input_schema: {
    type: "object",
    properties: {
      from: { type: "string", description: "Current path" },
      to: { type: "string", description: "New path" },
    },
    required: ["from", "to"],
  },
};

export const LIST_FILES_TOOL: BuiltinToolDef = {
  name: "list_files",
  description: "List files and directories in the project",
  input_schema: {
    type: "object",
    properties: {
      directory: {
        type: "string",
        description: "Subdirectory to list (empty for root)",
      },
      maxDepth: {
        type: "number",
        description: "Max directory depth (default 10)",
      },
    },
  },
};

export const SEARCH_FILES_TOOL: BuiltinToolDef = {
  name: "search_files",
  description: "Search for text across all project files",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Text or regex to search for" },
      fileExtensions: {
        type: "string",
        description:
          "Comma-separated extensions to filter (e.g. 'ts,tsx,css'). Empty = all files",
      },
    },
    required: ["query"],
  },
};

export const RUN_COMMAND_TOOL: BuiltinToolDef = {
  name: "run_command",
  description: "Run any shell command (npm, git, curl, python, etc.)",
  input_schema: {
    type: "object",
    properties: {
      command: { type: "string", description: "Shell command to execute" },
    },
    required: ["command"],
  },
};

export const WEB_SEARCH_TOOL: BuiltinToolDef = {
  name: "web_search",
  description: "Search the web for documentation, examples, or solutions",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
    },
    required: ["query"],
  },
};

export const BROWSE_URL_TOOL: BuiltinToolDef = {
  name: "browse_url",
  description: "Fetch and read content from a URL",
  input_schema: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to browse" },
    },
    required: ["url"],
  },
};

export const REQUEST_MCP_TOOL: BuiltinToolDef = {
  name: "request_mcp",
  description:
    "Ask the user to connect an MCP server (Notion, GitHub, Supabase, Figma, etc.) when you need external data from a system you cannot access yourself. Use sparingly — only when there is no way to proceed without that connection.",
  input_schema: {
    type: "object",
    properties: {
      serverId: {
        type: "string",
        description:
          "MCP server id. Allowed: notion, github, supabase, vercel, figma, linear, slack, sentry, gmail, canva.",
      },
      reason: {
        type: "string",
        description:
          "One short sentence in the user's language explaining why this MCP is required right now.",
      },
    },
    required: ["serverId", "reason"],
  },
};

/** All builtin tools the workspace single-loop agent uses. */
export const BUILTIN_TOOLS: BuiltinToolDef[] = [
  READ_FILE_TOOL,
  WRITE_FILE_TOOL,
  DELETE_FILE_TOOL,
  RENAME_FILE_TOOL,
  LIST_FILES_TOOL,
  SEARCH_FILES_TOOL,
  RUN_COMMAND_TOOL,
  WEB_SEARCH_TOOL,
  BROWSE_URL_TOOL,
];

/** Builtin tools + the request_mcp escape hatch. */
export const BUILTIN_TOOLS_WITH_MCP_REQUEST: BuiltinToolDef[] = [
  ...BUILTIN_TOOLS,
  REQUEST_MCP_TOOL,
];

/** IDs only — useful for filtering. */
export const BUILTIN_TOOL_IDS = BUILTIN_TOOLS.map((t) => t.name);
