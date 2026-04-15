// Client-side MCP preset catalog.
//
// Single source of truth for the 14 MCP servers users can connect to
// from any page (workspace, settings, future hub). Previously lived
// inside workspace/page.tsx — extracted so settings can render the
// same list without duplicating metadata.
//
// The auth-backend lookup (tokens, refresh, validation) still lives
// in the tRPC `mcp.connect` router; this file only describes what the
// UI should show and which auth method to ask for.

export interface MCPPreset {
  id: string;
  name: string;
  icon: string;
  logo: string;
  category: string;
  hint: string;
  /** How the user grants access. */
  auth: "oauth" | "token" | "none";
  /** OAuth redirect URL when `auth === "oauth"` and a dedicated route exists. */
  authUrl?: string;
  /** Human-readable list of what the agent will be allowed to do. */
  permissions: string[];
  /** If true, the user must also log in separately (beyond Meld auth). */
  requiresLogin: boolean;
  /**
   * True for services that ONLY accept OAuth2 access tokens (no PAT
   * concept at all, e.g. Notion integration tokens, Gmail, Slack,
   * Canva). Until we register OAuth apps with those platforms the
   * Connect button is disabled and the row shows an explanatory
   * notice instead of surfacing a raw API error.
   */
  oauthOnly?: boolean;
  /**
   * True when the adapter needs an additional project / workspace
   * identifier alongside the token (currently only Supabase, which
   * requires a `projectRef`). The token modal renders an extra field.
   */
  requiresProjectRef?: boolean;
}

export const MCP_PRESETS: MCPPreset[] = [
  {
    id: "figma", name: "Figma", icon: "figma", logo: "/mcp-icons/figma.svg", category: "design",
    hint: "Design files, node trees, styles, image rendering",
    auth: "oauth", authUrl: "/api/auth/figma", requiresLogin: true,
    permissions: ["Read design files and components", "Render frames as images", "Extract design tokens and styles"],
  },
  {
    id: "github", name: "GitHub", icon: "github", logo: "/mcp-icons/github.svg", category: "code",
    hint: "Repos, file browsing, code search, framework detection",
    auth: "oauth", requiresLogin: false,
    permissions: ["Browse repositories and files", "Search code across repos", "Detect frameworks and dependencies", "Read and write file contents"],
  },
  {
    id: "vercel", name: "Vercel", icon: "triangle", logo: "/mcp-icons/vercel.svg", category: "deploy",
    hint: "Deployments, preview URLs, environment variables",
    auth: "token", requiresLogin: true,
    permissions: ["List and manage deployments", "Get preview URLs", "Read environment variables", "Check build logs"],
  },
  {
    id: "supabase", name: "Supabase", icon: "database", logo: "/mcp-icons/supabase.svg", category: "data",
    hint: "Database schema, tables, auth users, storage",
    auth: "token", requiresLogin: true, requiresProjectRef: true,
    permissions: ["Read database schema and tables", "Query table data", "Manage auth users", "Access storage buckets"],
  },
  {
    id: "sentry", name: "Sentry", icon: "bug", logo: "/mcp-icons/sentry.svg", category: "monitoring",
    hint: "Error tracking, stack traces, performance issues",
    auth: "token", requiresLogin: true,
    permissions: ["List recent errors and exceptions", "Read stack traces", "View performance data"],
  },
  {
    id: "linear", name: "Linear", icon: "list-checks", logo: "/mcp-icons/linear.svg", category: "project",
    hint: "Issues, projects, cycles, team workflows",
    auth: "token", requiresLogin: true,
    permissions: ["List issues and their status", "Get project details", "Search team workflows"],
  },
  {
    id: "notion", name: "Notion", icon: "book-open", logo: "/mcp-icons/notion.svg", category: "docs",
    hint: "Pages, databases, docs, knowledge base",
    auth: "oauth", authUrl: "/api/auth/mcp?service=notion", requiresLogin: true, oauthOnly: true,
    permissions: ["Search pages and databases", "Read page content", "Access workspace structure"],
  },
  {
    id: "slack", name: "Slack", icon: "message-square", logo: "/mcp-icons/slack.svg", category: "communication",
    hint: "Channels, messages, notifications",
    auth: "oauth", authUrl: "/api/auth/mcp?service=slack", requiresLogin: true, oauthOnly: true,
    permissions: ["List channels and conversations", "Read message history", "Search messages"],
  },
  {
    id: "gmail", name: "Gmail", icon: "mail", logo: "/mcp-icons/gmail.svg", category: "communication",
    hint: "Read, draft, and send emails",
    auth: "oauth", authUrl: "/api/auth/mcp?service=gmail", requiresLogin: true, oauthOnly: true,
    permissions: ["Read email threads", "Draft and send emails", "Search inbox"],
  },
  {
    id: "canva", name: "Canva", icon: "palette", logo: "/mcp-icons/canva.svg", category: "design",
    hint: "Create, edit, and export designs",
    auth: "oauth", authUrl: "/api/auth/mcp?service=canva", requiresLogin: true, oauthOnly: true,
    permissions: ["Search designs", "Create and edit designs", "Export as images"],
  },
  {
    id: "filesystem", name: "Filesystem", icon: "folder", logo: "/mcp-icons/filesystem.svg", category: "system",
    hint: "Read and write files on local filesystem",
    auth: "none", requiresLogin: false,
    permissions: ["Read files and directories", "Write and modify files", "Watch file changes"],
  },
  {
    id: "windows-mcp", name: "Windows MCP", icon: "monitor", logo: "/mcp-icons/windows.svg", category: "system",
    hint: "Windows OS integration and system control",
    auth: "none", requiresLogin: false,
    permissions: ["Manage files and folders", "Control system processes", "Access Windows settings"],
  },
  {
    id: "pdf-viewer", name: "PDF Viewer", icon: "file-text", logo: "/mcp-icons/pdf.svg", category: "docs",
    hint: "Read, search, and extract text from PDFs",
    auth: "none", requiresLogin: false,
    permissions: ["Read PDF documents", "Search text content", "Extract pages and images"],
  },
  {
    id: "agent-bridge", name: "Agent Bridge", icon: "plug", logo: "/mcp-icons/meld.svg", category: "integration",
    hint: "External AI agent integration (Cursor, Copilot)",
    auth: "token", requiresLogin: false,
    permissions: ["Receive commands from external agents", "Execute Meld operations", "Return results to agents"],
  },
];

export const MCP_LOGO_MAP: Record<string, string> = Object.fromEntries(
  MCP_PRESETS.map((p) => [p.id, p.logo]),
);

export function getMCPPreset(id: string): MCPPreset | undefined {
  return MCP_PRESETS.find((p) => p.id === id);
}
