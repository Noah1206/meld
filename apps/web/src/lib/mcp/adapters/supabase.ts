// ─── Supabase MCP Adapter ─────────────────────────────
// Wraps Supabase Management API as an MCP adapter.

import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

export class SupabaseMCPAdapter extends BaseMCPAdapter {
  readonly id = "supabase";
  readonly name = "Supabase";
  readonly description = "Database schema, tables, auth users, storage buckets";
  readonly icon = "database";
  readonly category = "data";

  private getHeaders(auth: MCPAuth) {
    return {
      apikey: auth.token,
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    };
  }

  private getProjectUrl(auth: MCPAuth): string {
    // Token format: project_ref is stored in extra or extracted from service_role key
    const projectRef = auth.extra?.projectRef ?? auth.extra?.project_ref;
    if (projectRef) return `https://${projectRef}.supabase.co`;
    // Fallback: assume token contains project info
    return auth.extra?.url ?? "";
  }

  async validateConnection(auth: MCPAuth) {
    const url = this.getProjectUrl(auth);
    if (!url) {
      return { valid: false, error: "Project URL or reference required in auth.extra" };
    }
    try {
      const res = await fetch(`${url}/rest/v1/`, { headers: this.getHeaders(auth) });
      if (res.ok || res.status === 404) {
        return { valid: true, meta: { projectUrl: url } };
      }
      return { valid: false, error: "Invalid Supabase credentials" };
    } catch {
      return { valid: false, error: "Unable to connect to Supabase" };
    }
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "supabase_list_tables",
        description: "List all tables in the database schema",
        inputSchema: {
          type: "object",
          properties: { schema: { type: "string", description: "Schema name (default: public)" } },
          required: [],
        },
      },
      {
        name: "supabase_get_table_schema",
        description: "Get column definitions for a specific table",
        inputSchema: {
          type: "object",
          properties: { table: { type: "string", description: "Table name" } },
          required: ["table"],
        },
      },
      {
        name: "supabase_query",
        description: "Execute a read-only SELECT query",
        inputSchema: {
          type: "object",
          properties: {
            table: { type: "string", description: "Table name" },
            select: { type: "string", description: "Columns to select (default: *)" },
            filter: { type: "string", description: "Filter conditions (e.g., id=eq.1)" },
            limit: { type: "number", description: "Max rows to return" },
          },
          required: ["table"],
        },
      },
      {
        name: "supabase_list_buckets",
        description: "List storage buckets",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "supabase_list_bucket_files",
        description: "List files in a storage bucket",
        inputSchema: {
          type: "object",
          properties: {
            bucket: { type: "string", description: "Bucket name" },
            path: { type: "string", description: "Folder path (default: root)" },
          },
          required: ["bucket"],
        },
      },
      {
        name: "supabase_rpc",
        description: "Call a Postgres function (RPC)",
        inputSchema: {
          type: "object",
          properties: {
            fn: { type: "string", description: "Function name" },
            params: { type: "object", description: "Function parameters" },
          },
          required: ["fn"],
        },
      },
    ];
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    supabase_list_tables: async (args, auth) => {
      const url = this.getProjectUrl(auth);
      const schema = (args.schema as string) ?? "public";
      const res = await fetch(
        `${url}/rest/v1/?apikey=${auth.token}`,
        { headers: this.getHeaders(auth) }
      );
      // OpenAPI spec endpoint
      const spec = await res.json();
      const tables = Object.keys(spec.definitions ?? {}).filter(t => !t.startsWith("_"));
      return this.textResult({ schema, tables });
    },

    supabase_get_table_schema: async (args, auth) => {
      const url = this.getProjectUrl(auth);
      const table = args.table as string;
      // Query information_schema
      const res = await fetch(
        `${url}/rest/v1/rpc/get_table_columns?table_name=${table}`,
        { headers: this.getHeaders(auth) }
      );
      if (!res.ok) {
        // Fallback: return column info from a limit 0 query
        const fallback = await fetch(
          `${url}/rest/v1/${table}?limit=0`,
          { headers: this.getHeaders(auth) }
        );
        return this.textResult({ table, note: "Schema details require function. Table exists: " + fallback.ok });
      }
      return this.textResult(await res.json());
    },

    supabase_query: async (args, auth) => {
      const url = this.getProjectUrl(auth);
      const table = args.table as string;
      const select = (args.select as string) ?? "*";
      const filter = args.filter ? `&${args.filter}` : "";
      const limit = args.limit ? `&limit=${args.limit}` : "&limit=100";

      const res = await fetch(
        `${url}/rest/v1/${table}?select=${select}${filter}${limit}`,
        { headers: this.getHeaders(auth) }
      );
      if (!res.ok) return this.errorResult(`Query failed: ${res.status}`);
      return this.textResult(await res.json());
    },

    supabase_list_buckets: async (_, auth) => {
      const url = this.getProjectUrl(auth);
      const res = await fetch(`${url}/storage/v1/bucket`, { headers: this.getHeaders(auth) });
      if (!res.ok) return this.errorResult(`Storage API error: ${res.status}`);
      return this.textResult(await res.json());
    },

    supabase_list_bucket_files: async (args, auth) => {
      const url = this.getProjectUrl(auth);
      const bucket = args.bucket as string;
      const path = (args.path as string) ?? "";
      const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
        method: "POST",
        headers: this.getHeaders(auth),
        body: JSON.stringify({ prefix: path, limit: 100 }),
      });
      if (!res.ok) return this.errorResult(`Storage API error: ${res.status}`);
      return this.textResult(await res.json());
    },

    supabase_rpc: async (args, auth) => {
      const url = this.getProjectUrl(auth);
      const fn = args.fn as string;
      const params = args.params ?? {};
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: this.getHeaders(auth),
        body: JSON.stringify(params),
      });
      if (!res.ok) return this.errorResult(`RPC error: ${res.status}`);
      return this.textResult(await res.json());
    },
  };

  async gatherContext(auth: MCPAuth): Promise<MCPContextFragment> {
    try {
      const tablesResult = await this.toolHandlers.supabase_list_tables({}, auth);
      const data = JSON.parse(tablesResult.content[0]?.text ?? "{}");
      return {
        serverId: this.id,
        serverName: this.name,
        summary: `Supabase connected — ${data.tables?.length ?? 0} tables in ${data.schema}`,
        data,
        relevance: 0.7,
      };
    } catch {
      return {
        serverId: this.id, serverName: this.name,
        summary: "Supabase connected", data: {}, relevance: 0.3,
      };
    }
  }
}
