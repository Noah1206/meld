// ─── MCP Type System ─────────────────────────────────
// No hardcoding. All MCP servers are handled via the same interface.

// ─── Tool Definition (based on MCP Protocol Spec) ────────
export interface MCPToolParam {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required?: boolean;
  enum?: string[];
  items?: { type: string };
  default?: unknown;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, MCPToolParam>;
    required: string[];
  };
}

export interface MCPToolResult {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// ─── Server Adapter (core abstraction) ────────────────────
// All MCP servers implement this interface.
// Figma, GitHub, Vercel, custom... all the same.
export interface MCPServerAdapter {
  readonly id: string;            // Unique identifier (e.g., "figma", "github", "custom-xyz")
  readonly name: string;          // Display name
  readonly description: string;   // Description
  readonly icon: string;          // lucide icon name
  readonly category: string;      // "design" | "code" | "deploy" | "data" | "custom"

  // Connection
  validateConnection(auth: MCPAuth): Promise<{ valid: boolean; error?: string; meta?: Record<string, unknown> }>;

  // Tools
  getTools(): MCPTool[];
  executeTool(toolName: string, args: Record<string, unknown>, auth: MCPAuth): Promise<MCPToolResult>;

  // Context mesh (#3) — context this server can provide given current state
  gatherContext?(auth: MCPAuth, hint?: string): Promise<MCPContextFragment>;
}

// ─── Auth (generic) ───────────────────────────────────
export type MCPAuthType = "bearer" | "api_key" | "oauth" | "none" | "custom";

export interface MCPAuth {
  type: MCPAuthType;
  token: string;
  extra?: Record<string, string>;  // Additional auth info (e.g., org ID)
}

// ─── Server Instance (runtime state) ───────────────────
export interface MCPServerInstance {
  adapterId: string;
  auth: MCPAuth;
  connected: boolean;
  connectedAt: string | null;
  meta: Record<string, unknown>;   // Metadata received on connection (username, org, etc.)
  toolCount: number;
}

// ─── Registry Entry (preset + custom) ────────────────
export interface MCPServerPreset {
  adapterId: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  authHint: string;                // Hint text like "Figma OAuth token"
  authType: MCPAuthType;
  docsUrl?: string;
}

// ─── Context Mesh (#3) ──────────────────────────────
export interface MCPContextFragment {
  serverId: string;
  serverName: string;
  summary: string;                 // Summary to pass to AI
  data: Record<string, unknown>;   // Structured data
  relevance: number;               // 0-1, relevance to current request
}

export interface MCPContextMesh {
  fragments: MCPContextFragment[];
  totalTokenEstimate: number;
}

// ─── Tool Chain (#4) ────────────────────────────────
export interface MCPToolChainStep {
  id: string;
  toolName: string;               // e.g., "figma_get_file"
  serverId: string;
  inputMapping: Record<string, string | MCPChainRef>;  // Can reference previous step results
  condition?: string;             // Execution condition (simple expression)
}

export interface MCPChainRef {
  type: "step_result";
  stepId: string;
  path: string;                   // JSON path (e.g., "data.framework")
}

export interface MCPToolChain {
  id: string;
  name: string;
  description: string;
  trigger: "manual" | "figma_change" | "git_push" | "schedule";
  steps: MCPToolChainStep[];
  createdAt: string;
}

export interface MCPChainExecutionResult {
  chainId: string;
  steps: Array<{
    stepId: string;
    toolName: string;
    result: MCPToolResult;
    durationMs: number;
    skipped: boolean;
  }>;
  totalDurationMs: number;
}

// ─── Claude API compatible ────────────────────────────
export interface ClaudeToolDef {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

// ─── Design Fidelity (#2) ───────────────────────────
export interface FidelityCheckResult {
  overall: number;                 // 0-100 score
  checks: FidelityCheck[];
  figmaImageUrl?: string;
  implementationImageUrl?: string;
}

export interface FidelityCheck {
  category: "color" | "spacing" | "typography" | "layout" | "border" | "shadow" | "size";
  element: string;
  expected: string;
  actual: string;
  match: boolean;
  severity: "critical" | "warning" | "info";
}
