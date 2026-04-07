// ─── Meld AI Agent Protocol ──────────────────────────
// Event & type definitions for the Claude tool_use-based agent loop

// Tool definitions for the agent (Claude tool_use schema)
export interface AgentTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Agent → renderer streaming events
export type AgentEvent =
  | { type: "thinking"; content: string }
  | { type: "tool_call"; toolName: string; input: Record<string, unknown>; toolCallId: string }
  | { type: "tool_result"; toolCallId: string; result: string; isError: boolean }
  | { type: "file_read"; filePath: string; preview: string }
  | { type: "file_edit"; toolCallId: string; filePath: string; original: string; modified: string; explanation: string }
  | { type: "file_created"; filePath: string }
  | { type: "command_start"; command: string; cwd: string }
  | { type: "command_output"; data: string }
  | { type: "command_done"; command: string; exitCode: number }
  | { type: "message"; content: string }
  | { type: "done"; summary: string }
  | { type: "error"; message: string }
  | { type: "cancelled" }
  | { type: "awaiting_approval"; editCount: number }
  | { type: "rollback_available"; sessionId: string; fileCount: number; files: string[] }
  | { type: "rollback_complete"; rolledBack: string[]; errors: string[] };

// Agent session status
export type AgentSessionStatus =
  | "idle"
  | "running"
  | "awaiting_approval"
  | "completed"
  | "error"
  | "cancelled";

// Pending file edit
export interface PendingEdit {
  toolCallId: string;
  filePath: string;
  original: string;
  modified: string;
  explanation: string;
  status: "pending" | "approved" | "rejected";
}

// Agent loop start input
export interface AgentLoopInput {
  command: string;
  modelId?: string;
  context?: {
    selectedFile?: string;
    currentCode?: string;
    framework?: string;
    dependencies?: string[];
    designSystemMd?: string;
    fileTree?: string[];
    elementHistory?: string[];
    /** Related files content keyed by relative path (imports/dependents of selectedFile) */
    nearbyFiles?: Record<string, string>;
    /** Custom instructions from Super-Context settings */
    customInstructions?: string;
    /** Installed skills content (concatenated rules) */
    skillsContent?: string;
    /** Behavioral preferences (e.g. "prefers tailwind +0.8, avoids css-modules -0.6") */
    preferences?: string;
    /** Recent terminal logs for error context */
    terminalLogs?: string;
    /** Connected MCP services summary */
    connectedServices?: string;
  };
}

// ─── Tool definitions (passed to Claude) ───────────────────────

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "read_file",
    description: "Read the contents of a file. Always read before editing.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from project root" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a file. The user will review changes before applying.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from project root" },
        content: { type: "string", description: "Full file content to write" },
        explanation: { type: "string", description: "Brief explanation of what changed and why" },
      },
      required: ["path", "content", "explanation"],
    },
  },
  {
    name: "list_files",
    description: "List files in a directory. Use to understand project structure.",
    input_schema: {
      type: "object",
      properties: {
        directory: { type: "string", description: "Relative directory path (default: project root)" },
        pattern: { type: "string", description: "Glob pattern to filter (e.g. '*.tsx')" },
      },
    },
  },
  {
    name: "search_files",
    description: "Search for a text pattern across project files. Like grep.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (regex supported)" },
        glob: { type: "string", description: "File pattern to search in (e.g. 'src/**/*.ts')" },
        maxResults: { type: "number", description: "Max results to return (default: 20)" },
      },
      required: ["query"],
    },
  },
  {
    name: "run_command",
    description: "Execute a shell command in the project directory. Use for npm install, git, build tools, etc.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
      },
      required: ["command"],
    },
  },
];
