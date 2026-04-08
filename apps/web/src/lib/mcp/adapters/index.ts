// ─── MCP Adapters Index ─────────────────────────────
// Export all MCP adapter implementations

// Base
export { BaseMCPAdapter } from "./base";

// Core adapters
export { FigmaMCPAdapter } from "./figma";
export { GitHubMCPAdapter } from "./github";
export { CustomHTTPAdapter } from "./custom-http";

// Cloud & DevOps
export { VercelMCPAdapter } from "./vercel";
export { SupabaseMCPAdapter } from "./supabase";
export { SentryMCPAdapter } from "./sentry";

// Project Management
export { LinearMCPAdapter } from "./linear";
export { NotionMCPAdapter } from "./notion";

// Communication
export { SlackMCPAdapter } from "./slack";
export { GmailMCPAdapter } from "./gmail";

// Design
export { CanvaMCPAdapter } from "./canva";

// Local / System
export { FilesystemMCPAdapter } from "./filesystem";
export { WindowsMCPAdapter } from "./windows-mcp";
export { PDFViewerMCPAdapter } from "./pdf-viewer";
export { AgentBridgeMCPAdapter } from "./agent-bridge";
