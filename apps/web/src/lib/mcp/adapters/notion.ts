// ─── Notion MCP Adapter ─────────────────────────────
// Wraps Notion API as an MCP adapter for docs and knowledge base.

import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export class NotionMCPAdapter extends BaseMCPAdapter {
  readonly id = "notion";
  readonly name = "Notion";
  readonly description = "Pages, databases, docs, knowledge base";
  readonly icon = "book-open";
  readonly category = "docs";

  private getHeaders(auth: MCPAuth) {
    return {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    };
  }

  private async fetchNotion(auth: MCPAuth, endpoint: string, options?: RequestInit) {
    const res = await fetch(`${NOTION_API}${endpoint}`, {
      ...options,
      headers: { ...this.getHeaders(auth), ...options?.headers },
    });
    if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
    return res.json();
  }

  async validateConnection(auth: MCPAuth) {
    try {
      const data = await this.fetchNotion(auth, "/users/me");
      return { valid: true, meta: { user: data.name, type: data.type } };
    } catch {
      return { valid: false, error: "Invalid Notion integration token" };
    }
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "notion_search",
        description: "Search pages and databases by title or content",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            filter: { type: "string", description: "Filter type: page, database, or all (default)" },
          },
          required: ["query"],
        },
      },
      {
        name: "notion_get_page",
        description: "Get a page's properties and metadata",
        inputSchema: {
          type: "object",
          properties: { pageId: { type: "string", description: "Page ID" } },
          required: ["pageId"],
        },
      },
      {
        name: "notion_get_page_content",
        description: "Get the content blocks of a page",
        inputSchema: {
          type: "object",
          properties: { pageId: { type: "string", description: "Page ID" } },
          required: ["pageId"],
        },
      },
      {
        name: "notion_list_databases",
        description: "List all databases the integration has access to",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "notion_query_database",
        description: "Query a database with optional filters",
        inputSchema: {
          type: "object",
          properties: {
            databaseId: { type: "string", description: "Database ID" },
            filter: { type: "object", description: "Filter object (Notion API format)" },
            sorts: { type: "array", description: "Sort array" },
            limit: { type: "number", description: "Max results (default 100)" },
          },
          required: ["databaseId"],
        },
      },
      {
        name: "notion_get_database",
        description: "Get database schema (properties and their types)",
        inputSchema: {
          type: "object",
          properties: { databaseId: { type: "string", description: "Database ID" } },
          required: ["databaseId"],
        },
      },
    ];
  }

  private extractPlainText(richText: Array<{ plain_text?: string }> | undefined): string {
    return richText?.map(t => t.plain_text).join("") ?? "";
  }

  private extractBlockContent(block: Record<string, unknown>): string {
    const type = block.type as string;
    const data = block[type] as Record<string, unknown> | undefined;
    if (!data) return "";

    if ("rich_text" in data) {
      return this.extractPlainText(data.rich_text as Array<{ plain_text?: string }>);
    }
    if (type === "image") {
      const img = data as { external?: { url: string }; file?: { url: string } };
      return `[Image: ${img.external?.url ?? img.file?.url ?? ""}]`;
    }
    if (type === "code") {
      const code = data as { rich_text: Array<{ plain_text: string }>; language: string };
      return `\`\`\`${code.language}\n${this.extractPlainText(code.rich_text)}\n\`\`\``;
    }
    return "";
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    notion_search: async (args, auth) => {
      const query = args.query as string;
      const filter = args.filter as string | undefined;

      const body: Record<string, unknown> = { query, page_size: 20 };
      if (filter === "page") body.filter = { property: "object", value: "page" };
      if (filter === "database") body.filter = { property: "object", value: "database" };

      const data = await this.fetchNotion(auth, "/search", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return this.textResult(data.results?.map((r: Record<string, unknown>) => ({
        id: r.id, type: r.object,
        title: r.object === "page"
          ? this.extractPlainText((r.properties as Record<string, Record<string, unknown>>)?.title?.title as Array<{ plain_text: string }>)
            || this.extractPlainText((r.properties as Record<string, Record<string, unknown>>)?.Name?.title as Array<{ plain_text: string }>)
          : (r as Record<string, Array<{ plain_text: string }>>).title?.map(t => t.plain_text).join(""),
        url: r.url,
      })) ?? []);
    },

    notion_get_page: async (args, auth) => {
      const pageId = args.pageId as string;
      const data = await this.fetchNotion(auth, `/pages/${pageId}`);

      // Extract title from properties
      const props = data.properties as Record<string, Record<string, unknown>> | undefined;
      let title = "";
      if (props) {
        const titleProp = Object.values(props).find((p: Record<string, unknown>) => p.type === "title");
        if (titleProp) title = this.extractPlainText(titleProp.title as Array<{ plain_text: string }>);
      }

      return this.textResult({
        id: data.id, title, url: data.url,
        createdTime: data.created_time, lastEditedTime: data.last_edited_time,
        properties: Object.fromEntries(
          Object.entries(props ?? {}).map(([key, val]) => [key, (val as Record<string, unknown>).type])
        ),
      });
    },

    notion_get_page_content: async (args, auth) => {
      const pageId = args.pageId as string;
      const data = await this.fetchNotion(auth, `/blocks/${pageId}/children?page_size=100`);

      const blocks = (data.results as Array<Record<string, unknown>>)?.map(block => ({
        type: block.type,
        content: this.extractBlockContent(block),
      })).filter(b => b.content);

      return this.textResult({
        pageId,
        content: blocks.map(b => b.content).join("\n\n"),
        blocks,
      });
    },

    notion_list_databases: async (_, auth) => {
      const data = await this.fetchNotion(auth, "/search", {
        method: "POST",
        body: JSON.stringify({
          filter: { property: "object", value: "database" },
          page_size: 50,
        }),
      });

      return this.textResult(data.results?.map((db: Record<string, unknown>) => ({
        id: db.id,
        title: (db.title as Array<{ plain_text: string }>)?.map(t => t.plain_text).join(""),
        url: db.url,
      })) ?? []);
    },

    notion_query_database: async (args, auth) => {
      const databaseId = args.databaseId as string;
      const body: Record<string, unknown> = {
        page_size: Math.min((args.limit as number) ?? 100, 100),
      };
      if (args.filter) body.filter = args.filter;
      if (args.sorts) body.sorts = args.sorts;

      const data = await this.fetchNotion(auth, `/databases/${databaseId}/query`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      return this.textResult(data.results?.map((page: Record<string, unknown>) => {
        const props = page.properties as Record<string, Record<string, unknown>>;
        const simplified: Record<string, unknown> = { id: page.id, url: page.url };
        for (const [key, val] of Object.entries(props)) {
          const type = val.type as string;
          if (type === "title") simplified[key] = this.extractPlainText(val.title as Array<{ plain_text: string }>);
          else if (type === "rich_text") simplified[key] = this.extractPlainText(val.rich_text as Array<{ plain_text: string }>);
          else if (type === "number") simplified[key] = val.number;
          else if (type === "select") simplified[key] = (val.select as Record<string, string>)?.name;
          else if (type === "multi_select") simplified[key] = (val.multi_select as Array<{ name: string }>)?.map(s => s.name);
          else if (type === "date") simplified[key] = val.date;
          else if (type === "checkbox") simplified[key] = val.checkbox;
          else if (type === "url") simplified[key] = val.url;
          else if (type === "email") simplified[key] = val.email;
          else if (type === "status") simplified[key] = (val.status as Record<string, string>)?.name;
        }
        return simplified;
      }) ?? []);
    },

    notion_get_database: async (args, auth) => {
      const databaseId = args.databaseId as string;
      const data = await this.fetchNotion(auth, `/databases/${databaseId}`);

      const properties = Object.fromEntries(
        Object.entries(data.properties as Record<string, Record<string, unknown>>).map(([key, val]) => [
          key,
          {
            type: val.type,
            ...(val.type === "select" && { options: (val.select as Record<string, Array<{ name: string }>>)?.options?.map(o => o.name) }),
            ...(val.type === "multi_select" && { options: (val.multi_select as Record<string, Array<{ name: string }>>)?.options?.map(o => o.name) }),
            ...(val.type === "status" && { options: (val.status as Record<string, Array<{ name: string }>>)?.options?.map(o => o.name) }),
          },
        ])
      );

      return this.textResult({
        id: data.id,
        title: (data.title as Array<{ plain_text: string }>)?.map(t => t.plain_text).join(""),
        url: data.url,
        properties,
      });
    },
  };

  async gatherContext(auth: MCPAuth): Promise<MCPContextFragment> {
    try {
      const data = await this.fetchNotion(auth, "/search", {
        method: "POST",
        body: JSON.stringify({ page_size: 5 }),
      });
      const items = data.results?.length ?? 0;
      return {
        serverId: this.id,
        serverName: this.name,
        summary: `Notion connected — ${items} recent pages/databases accessible`,
        data: { recentItems: items },
        relevance: 0.5,
      };
    } catch {
      return {
        serverId: this.id, serverName: this.name,
        summary: "Notion connected", data: {}, relevance: 0.3,
      };
    }
  }
}
