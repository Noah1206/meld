// ─── Canva MCP Adapter ─────────────────────────────
// Wraps Canva Connect API as an MCP adapter for design assets.

import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

const CANVA_API = "https://api.canva.com/rest/v1";

export class CanvaMCPAdapter extends BaseMCPAdapter {
  readonly id = "canva";
  readonly name = "Canva";
  readonly description = "Design assets, brand kits, templates";
  readonly icon = "palette";
  readonly category = "design";

  private async fetchCanva(auth: MCPAuth, endpoint: string, options?: RequestInit) {
    const res = await fetch(`${CANVA_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`Canva API error: ${res.status}`);
    return res.json();
  }

  async validateConnection(auth: MCPAuth) {
    try {
      const data = await this.fetchCanva(auth, "/users/me");
      return { valid: true, meta: { userId: data.user?.id, displayName: data.user?.display_name } };
    } catch {
      return { valid: false, error: "Invalid Canva OAuth token" };
    }
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "canva_list_designs",
        description: "List user's designs with optional filters",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            ownership: { type: "string", description: "Filter: owned, shared, any (default)" },
            limit: { type: "number", description: "Max results (default 20)" },
          },
          required: [],
        },
      },
      {
        name: "canva_get_design",
        description: "Get details of a specific design",
        inputSchema: {
          type: "object",
          properties: { designId: { type: "string", description: "Design ID" } },
          required: ["designId"],
        },
      },
      {
        name: "canva_list_folders",
        description: "List folders in the user's account",
        inputSchema: {
          type: "object",
          properties: {
            parentFolderId: { type: "string", description: "Parent folder ID (root if omitted)" },
          },
          required: [],
        },
      },
      {
        name: "canva_get_brand_templates",
        description: "List brand templates for the user's team",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            limit: { type: "number", description: "Max results" },
          },
          required: [],
        },
      },
      {
        name: "canva_export_design",
        description: "Export a design to various formats",
        inputSchema: {
          type: "object",
          properties: {
            designId: { type: "string", description: "Design ID" },
            format: { type: "string", description: "Export format: png, jpg, pdf, svg" },
            pages: { type: "array", items: { type: "number" }, description: "Page numbers to export" },
          },
          required: ["designId", "format"],
        },
      },
      {
        name: "canva_get_assets",
        description: "List uploaded assets (images, videos)",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", description: "Asset type: image, video" },
            limit: { type: "number", description: "Max results" },
          },
          required: [],
        },
      },
    ];
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    canva_list_designs: async (args, auth) => {
      const params = new URLSearchParams();
      if (args.query) params.append("query", args.query as string);
      if (args.ownership) params.append("ownership", args.ownership as string);
      params.append("limit", String((args.limit as number) ?? 20));

      const data = await this.fetchCanva(auth, `/designs?${params}`);

      return this.textResult(data.items?.map((d: Record<string, unknown>) => ({
        id: d.id, title: d.title,
        thumbnail: (d.thumbnail as Record<string, string>)?.url,
        createdAt: d.created_at, updatedAt: d.updated_at,
        urls: d.urls,
      })) ?? []);
    },

    canva_get_design: async (args, auth) => {
      const designId = args.designId as string;
      const data = await this.fetchCanva(auth, `/designs/${designId}`);

      const design = data.design as Record<string, unknown>;
      return this.textResult({
        id: design.id, title: design.title,
        thumbnail: (design.thumbnail as Record<string, string>)?.url,
        pageCount: design.page_count,
        createdAt: design.created_at, updatedAt: design.updated_at,
        urls: design.urls, owner: design.owner,
      });
    },

    canva_list_folders: async (args, auth) => {
      const parentId = args.parentFolderId as string | undefined;
      const endpoint = parentId
        ? `/folders/${parentId}/items`
        : "/folders";

      const data = await this.fetchCanva(auth, endpoint);

      return this.textResult(data.items?.map((f: Record<string, unknown>) => ({
        id: f.id, name: f.name, type: f.type,
        createdAt: f.created_at, updatedAt: f.updated_at,
      })) ?? []);
    },

    canva_get_brand_templates: async (args, auth) => {
      const params = new URLSearchParams();
      if (args.query) params.append("query", args.query as string);
      if (args.limit) params.append("limit", String(args.limit));

      const data = await this.fetchCanva(auth, `/brand-templates?${params}`);

      return this.textResult(data.items?.map((t: Record<string, unknown>) => ({
        id: t.id, title: t.title,
        thumbnail: (t.thumbnail as Record<string, string>)?.url,
        createdAt: t.created_at,
      })) ?? []);
    },

    canva_export_design: async (args, auth) => {
      const { designId, format, pages } = args as {
        designId: string; format: string; pages?: number[];
      };

      const body: Record<string, unknown> = { format };
      if (pages?.length) body.pages = pages;

      const data = await this.fetchCanva(auth, `/designs/${designId}/exports`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      // Export is async, return job info
      return this.textResult({
        jobId: data.job?.id,
        status: data.job?.status,
        // If completed, return URLs
        urls: data.job?.result?.urls,
      });
    },

    canva_get_assets: async (args, auth) => {
      const params = new URLSearchParams();
      if (args.type) params.append("type", args.type as string);
      params.append("limit", String((args.limit as number) ?? 20));

      const data = await this.fetchCanva(auth, `/assets?${params}`);

      return this.textResult(data.items?.map((a: Record<string, unknown>) => ({
        id: a.id, name: a.name, type: a.type,
        thumbnail: (a.thumbnail as Record<string, string>)?.url,
        createdAt: a.created_at,
      })) ?? []);
    },
  };

  async gatherContext(auth: MCPAuth): Promise<MCPContextFragment> {
    try {
      const [user, designs] = await Promise.all([
        this.fetchCanva(auth, "/users/me"),
        this.fetchCanva(auth, "/designs?limit=5"),
      ]);
      return {
        serverId: this.id,
        serverName: this.name,
        summary: `Canva connected — ${user.user?.display_name}, ${designs.items?.length ?? 0} recent designs`,
        data: { user: user.user?.display_name, recentDesigns: designs.items?.length },
        relevance: 0.5,
      };
    } catch {
      return {
        serverId: this.id, serverName: this.name,
        summary: "Canva connected", data: {}, relevance: 0.3,
      };
    }
  }
}
