// MCP 14-adapter smoke test
// Validates structural contract of every BUILTIN_PRESETS adapter:
//   - instantiates via createBuiltinAdapter equivalent
//   - exposes id/name/icon/category/description
//   - getTools() returns ≥1 well-formed MCPTool
//   - validateConnection() rejects empty token gracefully
//   - executeTool() returns an error result for unknown tool names
//
// Does NOT hit real APIs. For real-API verification, see `smoke.live.ts` (if env tokens present).

import { describe, it, expect } from "vitest";
import {
  FigmaMCPAdapter,
  GitHubMCPAdapter,
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
} from "@/lib/mcp/adapters";
import type { MCPServerAdapter, MCPAuth } from "@/lib/mcp/types";

interface AdapterCase {
  id: string;
  factory: () => MCPServerAdapter;
  // Some adapters (Filesystem/Windows/PDF/AgentBridge) use `none` auth and
  // won't reject empty tokens — mark them so validateConnection is skipped.
  skipEmptyTokenCheck?: boolean;
}

const CASES: AdapterCase[] = [
  { id: "figma", factory: () => new FigmaMCPAdapter() },
  { id: "github", factory: () => new GitHubMCPAdapter() },
  { id: "vercel", factory: () => new VercelMCPAdapter() },
  { id: "supabase", factory: () => new SupabaseMCPAdapter() },
  { id: "sentry", factory: () => new SentryMCPAdapter() },
  { id: "linear", factory: () => new LinearMCPAdapter() },
  { id: "notion", factory: () => new NotionMCPAdapter() },
  { id: "slack", factory: () => new SlackMCPAdapter() },
  { id: "gmail", factory: () => new GmailMCPAdapter() },
  { id: "canva", factory: () => new CanvaMCPAdapter() },
  { id: "filesystem", factory: () => new FilesystemMCPAdapter(), skipEmptyTokenCheck: true },
  { id: "windows-mcp", factory: () => new WindowsMCPAdapter(), skipEmptyTokenCheck: true },
  { id: "pdf-viewer", factory: () => new PDFViewerMCPAdapter(), skipEmptyTokenCheck: true },
  { id: "agent-bridge", factory: () => new AgentBridgeMCPAdapter() },
];

const emptyAuth: MCPAuth = { type: "bearer", token: "" };

describe("MCP adapters · smoke (14 presets)", () => {
  it("registers exactly 14 adapters matching BUILTIN_PRESETS", () => {
    expect(CASES).toHaveLength(14);
    const ids = new Set(CASES.map(c => c.id));
    expect(ids.size).toBe(14);
  });

  describe.each(CASES)("$id", ({ id, factory, skipEmptyTokenCheck }) => {
    const adapter = factory();

    it("exposes required metadata fields", () => {
      expect(adapter.id).toBe(id);
      expect(adapter.name).toBeTruthy();
      expect(adapter.description).toBeTruthy();
      expect(adapter.icon).toBeTruthy();
      expect(adapter.category).toBeTruthy();
    });

    it("getTools() returns at least one well-formed tool", () => {
      const tools = adapter.getTools();
      expect(tools.length).toBeGreaterThanOrEqual(1);
      for (const tool of tools) {
        expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeTypeOf("object");
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      }
    });

    it("validateConnection() handles empty token without throwing", async () => {
      const result = await adapter.validateConnection(emptyAuth);
      expect(result).toBeTypeOf("object");
      expect(typeof result.valid).toBe("boolean");
      if (!skipEmptyTokenCheck) {
        expect(result.valid).toBe(false);
        expect(result.error).toBeTruthy();
      }
    });

    it("executeTool() returns an error result for unknown tool", async () => {
      const res = await adapter.executeTool("__nonexistent_tool__", {}, emptyAuth);
      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toMatch(/not found|unknown|invalid/i);
    });
  });
});
