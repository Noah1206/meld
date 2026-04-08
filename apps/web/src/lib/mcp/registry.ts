// ─── MCP Server Registry ────────────────────────────
// Dynamic server registry. Any MCP server can be registered via adapter pattern.
// Figma/GitHub are just "built-in adapters" — no special treatment.

import type { MCPServerAdapter, MCPServerInstance, MCPServerPreset, MCPAuth, MCPTool, MCPToolResult, ClaudeToolDef, MCPContextMesh, MCPContextFragment } from "./types";
import {
  FigmaMCPAdapter,
  GitHubMCPAdapter,
  CustomHTTPAdapter,
  BaseMCPAdapter,
  VercelMCPAdapter,
  SupabaseMCPAdapter,
  SentryMCPAdapter,
  LinearMCPAdapter,
  NotionMCPAdapter,
  SlackMCPAdapter,
  GmailMCPAdapter,
  CanvaMCPAdapter,
  FilesystemMCPAdapter,
  WindowsMCPAdapter,
  PDFViewerMCPAdapter,
  AgentBridgeMCPAdapter,
} from "./adapters";

// ─── Built-in presets (not hardcoded — just provided by default) ─────
const BUILTIN_PRESETS: MCPServerPreset[] = [
  // ── Design ──
  {
    adapterId: "figma",
    name: "Figma",
    description: "Design files, node trees, styles, image rendering",
    icon: "figma",
    category: "design",
    authHint: "Figma OAuth Bearer token",
    authType: "bearer",
    docsUrl: "https://www.figma.com/developers/api",
  },
  // ── Code ──
  {
    adapterId: "github",
    name: "GitHub",
    description: "Repos, file browsing, code search, framework detection",
    icon: "github",
    category: "code",
    authHint: "GitHub Personal Access Token",
    authType: "bearer",
    docsUrl: "https://docs.github.com/en/rest",
  },
  // ── Deploy ──
  {
    adapterId: "vercel",
    name: "Vercel",
    description: "Deployments, preview URLs, environment variables, logs",
    icon: "triangle",
    category: "deploy",
    authHint: "Vercel Access Token",
    authType: "bearer",
    docsUrl: "https://vercel.com/docs/rest-api",
  },
  // ── Data ──
  {
    adapterId: "supabase",
    name: "Supabase",
    description: "Database schema, tables, auth users, storage buckets",
    icon: "database",
    category: "data",
    authHint: "Supabase service_role key",
    authType: "api_key",
    docsUrl: "https://supabase.com/docs/guides/api",
  },
  // ── Monitoring ──
  {
    adapterId: "sentry",
    name: "Sentry",
    description: "Error tracking, stack traces, performance issues",
    icon: "bug",
    category: "monitoring",
    authHint: "Sentry Auth Token",
    authType: "bearer",
    docsUrl: "https://docs.sentry.io/api/",
  },
  // ── Project Management ──
  {
    adapterId: "linear",
    name: "Linear",
    description: "Issues, projects, cycles, team workflows",
    icon: "list-checks",
    category: "project",
    authHint: "Linear API Key",
    authType: "bearer",
    docsUrl: "https://developers.linear.app",
  },
  {
    adapterId: "notion",
    name: "Notion",
    description: "Pages, databases, docs, knowledge base",
    icon: "book-open",
    category: "docs",
    authHint: "Notion Integration Token",
    authType: "bearer",
    docsUrl: "https://developers.notion.com",
  },
  // ── Communication ──
  {
    adapterId: "slack",
    name: "Slack",
    description: "Channels, messages, notifications, thread context",
    icon: "message-square",
    category: "communication",
    authHint: "Slack Bot Token (xoxb-...)",
    authType: "bearer",
    docsUrl: "https://api.slack.com",
  },
  {
    adapterId: "gmail",
    name: "Gmail",
    description: "Read, draft, and send emails",
    icon: "mail",
    category: "communication",
    authHint: "Google OAuth",
    authType: "oauth",
    docsUrl: "https://developers.google.com/gmail/api",
  },
  // ── Design ──
  {
    adapterId: "canva",
    name: "Canva",
    description: "Create, edit, and export designs",
    icon: "palette",
    category: "design",
    authHint: "Canva OAuth",
    authType: "oauth",
    docsUrl: "https://www.canva.com/developers/",
  },
  // ── System ──
  {
    adapterId: "filesystem",
    name: "Filesystem",
    description: "Read and write files on local filesystem",
    icon: "folder",
    category: "system",
    authHint: "No authentication required",
    authType: "none",
  },
  {
    adapterId: "windows-mcp",
    name: "Windows MCP",
    description: "Windows OS integration and system control",
    icon: "monitor",
    category: "system",
    authHint: "No authentication required",
    authType: "none",
  },
  {
    adapterId: "pdf-viewer",
    name: "PDF Viewer",
    description: "Read, search, and extract text from PDFs",
    icon: "file-text",
    category: "docs",
    authHint: "No authentication required",
    authType: "none",
  },
  // ── Integration ──
  {
    adapterId: "agent-bridge",
    name: "Agent Bridge",
    description: "External AI agent integration (Cursor, Copilot)",
    icon: "plug",
    category: "integration",
    authHint: "API Key for agent authentication",
    authType: "api_key",
    docsUrl: "https://meld.run/docs/agent-bridge",
  },
];

// ─── Adapter factory ─────────────────────────────────
// Known MCP server endpoints (official/community)
const MCP_ENDPOINTS: Record<string, string> = {
  // These are npx-based MCP servers that users run locally
  // For now, we support token-based connection where the adapter
  // stores the token and makes it available to the AI agent
};

function createBuiltinAdapter(adapterId: string): MCPServerAdapter | null {
  switch (adapterId) {
    // Core
    case "figma": return new FigmaMCPAdapter();
    case "github": return new GitHubMCPAdapter();
    // Cloud & DevOps
    case "vercel": return new VercelMCPAdapter();
    case "supabase": return new SupabaseMCPAdapter();
    case "sentry": return new SentryMCPAdapter();
    // Project Management
    case "linear": return new LinearMCPAdapter();
    case "notion": return new NotionMCPAdapter();
    // Communication
    case "slack": return new SlackMCPAdapter();
    case "gmail": return new GmailMCPAdapter();
    // Design
    case "canva": return new CanvaMCPAdapter();
    // Local / System
    case "filesystem": return new FilesystemMCPAdapter();
    case "windows-mcp": return new WindowsMCPAdapter();
    case "pdf-viewer": return new PDFViewerMCPAdapter();
    case "agent-bridge": return new AgentBridgeMCPAdapter();
    default: {
      // For unknown presets, create a token-storage adapter
      const preset = BUILTIN_PRESETS.find(p => p.adapterId === adapterId);
      if (preset) {
        return new TokenStorageAdapter(preset);
      }
      return null;
    }
  }
}

// Simple adapter that stores a token and provides context
// Used for services without a running MCP server (Vercel, Supabase, etc.)
class TokenStorageAdapter extends BaseMCPAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly category: string;

  private preset: MCPServerPreset;

  constructor(preset: MCPServerPreset) {
    super();
    this.id = preset.adapterId;
    this.name = preset.name;
    this.description = preset.description;
    this.icon = preset.icon;
    this.category = preset.category;
    this.preset = preset;
  }

  async validateConnection(auth: MCPAuth) {
    // Just verify token is not empty
    if (!auth.token || auth.token.trim().length < 5) {
      return { valid: false, error: "Invalid token. Please provide a valid API key." };
    }
    return {
      valid: true,
      meta: { service: this.name, tokenPreview: auth.token.slice(0, 8) + "..." },
    };
  }

  getTools(): MCPTool[] {
    // Token-based adapters expose service info as context, not tools
    // The AI agent uses the token info to know it can reference this service
    return [{
      name: `${this.id}_status`,
      description: `Check ${this.name} connection status`,
      inputSchema: { type: "object", properties: {}, required: [] },
    }];
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {};

  async executeTool(toolName: string, _args: Record<string, unknown>, auth: MCPAuth): Promise<MCPToolResult> {
    return {
      content: [{ type: "text", text: `${this.name} connected with token ${auth.token.slice(0, 8)}...` }],
      isError: false,
    };
  }

  async gatherContext(auth: MCPAuth, _hint?: string): Promise<MCPContextFragment> {
    return {
      serverId: this.id,
      serverName: this.name,
      summary: `${this.name} is connected. API key available for ${this.description}.`,
      data: { connected: true, service: this.name },
      relevance: 0.5,
    };
  }
}

// ─── Registry (per-user server management) ────────────────────
// User ID → Server ID → { adapter, instance }
const userServers = new Map<string, Map<string, { adapter: MCPServerAdapter; instance: MCPServerInstance }>>();
// Custom adapter storage
const customAdapters = new Map<string, MCPServerAdapter>();

function getUserServers(userId: string) {
  if (!userServers.has(userId)) userServers.set(userId, new Map());
  return userServers.get(userId)!;
}

// ─── Public API ─────────────────────────────────────

// Preset list (selection options for "Add Server" UI)
export function getPresets(): MCPServerPreset[] {
  return [...BUILTIN_PRESETS];
}

// Register custom MCP server
export function registerCustomAdapter(config: {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  icon?: string;
}): MCPServerPreset {
  const adapter = new CustomHTTPAdapter(config);
  customAdapters.set(config.id, adapter);

  const preset: MCPServerPreset = {
    adapterId: config.id,
    name: config.name,
    description: config.description,
    icon: config.icon ?? "plug",
    category: "custom",
    authHint: "API key or Bearer token",
    authType: "bearer",
  };

  return preset;
}

// Connect server
export async function connectServer(
  userId: string,
  adapterId: string,
  auth: MCPAuth,
): Promise<MCPServerInstance> {
  // Find adapter: built-in → custom
  let adapter = createBuiltinAdapter(adapterId);
  if (!adapter) adapter = customAdapters.get(adapterId) ?? null;
  if (!adapter) throw new Error(`Unknown MCP server: ${adapterId}`);

  // Validate connection
  const validation = await adapter.validateConnection(auth);
  if (!validation.valid) throw new Error(validation.error ?? "Connection failed");

  const instance: MCPServerInstance = {
    adapterId,
    auth,
    connected: true,
    connectedAt: new Date().toISOString(),
    meta: validation.meta ?? {},
    toolCount: adapter.getTools().length,
  };

  getUserServers(userId).set(adapterId, { adapter, instance });
  return instance;
}

// Disconnect server
export function disconnectServer(userId: string, adapterId: string): void {
  getUserServers(userId).delete(adapterId);
}

// Connected server list
export function getConnectedServers(userId: string): Array<{ adapterId: string; instance: MCPServerInstance; tools: MCPTool[] }> {
  const servers = getUserServers(userId);
  return [...servers.entries()].map(([id, { adapter, instance }]) => ({
    adapterId: id,
    instance,
    tools: adapter.getTools(),
  }));
}

// Check if a specific server is connected
export function isConnected(userId: string, adapterId: string): boolean {
  return getUserServers(userId).has(adapterId);
}

// ─── Tool execution ──────────────────────────────────────

// Auto-find server by tool name + execute
export async function executeTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<MCPToolResult> {
  const servers = getUserServers(userId);

  // Find server that has the requested tool among all connected servers
  for (const [, { adapter, instance }] of servers) {
    const tools = adapter.getTools();
    if (tools.some((t) => t.name === toolName)) {
      return adapter.executeTool(toolName, args, instance.auth);
    }
  }

  return {
    content: [{ type: "text", text: `No connected MCP server can execute tool "${toolName}".` }],
    isError: true,
  };
}

// ─── Claude integration ────────────────────────────────────

// Convert all connected servers' tools to Claude tool_use format
export function getClaudeTools(userId: string): ClaudeToolDef[] {
  const servers = getUserServers(userId);
  const tools: ClaudeToolDef[] = [];

  for (const [, { adapter }] of servers) {
    for (const tool of adapter.getTools()) {
      tools.push({
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: "object",
          properties: tool.inputSchema.properties,
          required: tool.inputSchema.required,
        },
      });
    }
  }

  return tools;
}

// ─── Context Mesh (#3) ──────────────────────────────

// Gather context from all connected servers
export async function gatherContextMesh(
  userId: string,
  hints?: Record<string, string>,  // adapterId → hint (e.g., { figma: "fileKey", github: "owner/repo" })
): Promise<MCPContextMesh> {
  const servers = getUserServers(userId);
  const fragments = await Promise.all(
    [...servers.entries()].map(async ([id, { adapter, instance }]) => {
      if (!adapter.gatherContext) {
        return {
          serverId: id,
          serverName: adapter.name,
          summary: `${adapter.name} connected`,
          data: {},
          relevance: 0.2,
        };
      }
      return adapter.gatherContext(instance.auth, hints?.[id]);
    }),
  );

  // Sort by relevance
  fragments.sort((a, b) => b.relevance - a.relevance);

  // Token estimation (roughly 4 chars = 1 token)
  const totalTokenEstimate = fragments.reduce((sum, f) => {
    return sum + Math.ceil((f.summary.length + JSON.stringify(f.data).length) / 4);
  }, 0);

  return { fragments, totalTokenEstimate };
}

// Convert Context Mesh to text for system prompt injection
export function contextMeshToPrompt(mesh: MCPContextMesh): string {
  if (mesh.fragments.length === 0) return "";

  const lines = ["[Connected MCP Servers Context]"];
  for (const f of mesh.fragments) {
    lines.push(`- ${f.serverName}: ${f.summary}`);
    if (Object.keys(f.data).length > 0 && f.relevance > 0.5) {
      lines.push(`  Details: ${JSON.stringify(f.data)}`);
    }
  }
  return lines.join("\n");
}
