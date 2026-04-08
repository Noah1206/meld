// ─── Vercel MCP Adapter ─────────────────────────────
// Wraps Vercel REST API as an MCP adapter.

import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

const VERCEL_API = "https://api.vercel.com";

export class VercelMCPAdapter extends BaseMCPAdapter {
  readonly id = "vercel";
  readonly name = "Vercel";
  readonly description = "Deployments, preview URLs, environment variables, logs";
  readonly icon = "triangle";
  readonly category = "deploy";

  private async fetchVercel(auth: MCPAuth, endpoint: string) {
    const res = await fetch(`${VERCEL_API}${endpoint}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!res.ok) throw new Error(`Vercel API error: ${res.status}`);
    return res.json();
  }

  async validateConnection(auth: MCPAuth) {
    try {
      const user = await this.fetchVercel(auth, "/v2/user");
      return { valid: true, meta: { username: user.user?.username, email: user.user?.email } };
    } catch {
      return { valid: false, error: "Invalid Vercel token" };
    }
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "vercel_list_projects",
        description: "List all Vercel projects for the authenticated user",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "vercel_get_project",
        description: "Get details of a specific Vercel project",
        inputSchema: {
          type: "object",
          properties: { projectId: { type: "string", description: "Project ID or name" } },
          required: ["projectId"],
        },
      },
      {
        name: "vercel_list_deployments",
        description: "List deployments for a project",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "string", description: "Project ID" },
            limit: { type: "number", description: "Max results (default 10)" },
          },
          required: ["projectId"],
        },
      },
      {
        name: "vercel_get_deployment",
        description: "Get detailed info about a specific deployment",
        inputSchema: {
          type: "object",
          properties: { deploymentId: { type: "string", description: "Deployment ID" } },
          required: ["deploymentId"],
        },
      },
      {
        name: "vercel_list_env_vars",
        description: "List environment variables for a project",
        inputSchema: {
          type: "object",
          properties: { projectId: { type: "string", description: "Project ID" } },
          required: ["projectId"],
        },
      },
      {
        name: "vercel_get_domains",
        description: "Get domains configured for a project",
        inputSchema: {
          type: "object",
          properties: { projectId: { type: "string", description: "Project ID" } },
          required: ["projectId"],
        },
      },
    ];
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    vercel_list_projects: async (_, auth) => {
      const data = await this.fetchVercel(auth, "/v9/projects");
      return this.textResult(data.projects?.map((p: Record<string, unknown>) => {
        const deployments = p.latestDeployments as Array<{ url?: string }> | undefined;
        return {
          id: p.id, name: p.name, framework: p.framework,
          updatedAt: p.updatedAt, latestDeployment: deployments?.[0]?.url,
        };
      }) ?? []);
    },

    vercel_get_project: async (args, auth) => {
      const data = await this.fetchVercel(auth, `/v9/projects/${args.projectId}`);
      return this.textResult({
        id: data.id, name: data.name, framework: data.framework,
        nodeVersion: data.nodeVersion, buildCommand: data.buildCommand,
        devCommand: data.devCommand, outputDirectory: data.outputDirectory,
      });
    },

    vercel_list_deployments: async (args, auth) => {
      const limit = (args.limit as number) ?? 10;
      const data = await this.fetchVercel(auth, `/v6/deployments?projectId=${args.projectId}&limit=${limit}`);
      return this.textResult(data.deployments?.map((d: Record<string, unknown>) => ({
        id: d.uid, url: d.url, state: d.state, target: d.target,
        createdAt: d.createdAt, ready: d.ready,
      })) ?? []);
    },

    vercel_get_deployment: async (args, auth) => {
      const data = await this.fetchVercel(auth, `/v13/deployments/${args.deploymentId}`);
      return this.textResult({
        id: data.id, url: data.url, state: data.readyState,
        target: data.target, createdAt: data.createdAt,
        buildingAt: data.buildingAt, ready: data.ready,
        errorMessage: data.errorMessage,
      });
    },

    vercel_list_env_vars: async (args, auth) => {
      const data = await this.fetchVercel(auth, `/v9/projects/${args.projectId}/env`);
      return this.textResult(data.envs?.map((e: Record<string, unknown>) => ({
        key: e.key, target: e.target, type: e.type,
        // Don't expose actual values for security
        hasValue: !!e.value,
      })) ?? []);
    },

    vercel_get_domains: async (args, auth) => {
      const data = await this.fetchVercel(auth, `/v9/projects/${args.projectId}/domains`);
      return this.textResult(data.domains ?? []);
    },
  };

  async gatherContext(auth: MCPAuth, hint?: string): Promise<MCPContextFragment> {
    try {
      const projects = await this.fetchVercel(auth, "/v9/projects?limit=5");
      const projectNames = projects.projects?.map((p: Record<string, string>) => p.name).join(", ") ?? "none";
      return {
        serverId: this.id,
        serverName: this.name,
        summary: `Vercel connected — Projects: ${projectNames}`,
        data: { projectCount: projects.projects?.length ?? 0 },
        relevance: 0.6,
      };
    } catch {
      return {
        serverId: this.id, serverName: this.name,
        summary: "Vercel connected", data: {}, relevance: 0.3,
      };
    }
  }
}
