// ─── Sentry MCP Adapter ─────────────────────────────
// Wraps Sentry API as an MCP adapter for error tracking and monitoring.

import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

const SENTRY_API = "https://sentry.io/api/0";

export class SentryMCPAdapter extends BaseMCPAdapter {
  readonly id = "sentry";
  readonly name = "Sentry";
  readonly description = "Error tracking, stack traces, performance issues";
  readonly icon = "bug";
  readonly category = "monitoring";

  private async fetchSentry(auth: MCPAuth, endpoint: string) {
    const res = await fetch(`${SENTRY_API}${endpoint}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!res.ok) throw new Error(`Sentry API error: ${res.status}`);
    return res.json();
  }

  async validateConnection(auth: MCPAuth) {
    try {
      const orgs = await this.fetchSentry(auth, "/organizations/");
      return { valid: true, meta: { organizations: orgs.map((o: Record<string, string>) => o.slug) } };
    } catch {
      return { valid: false, error: "Invalid Sentry token" };
    }
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "sentry_list_organizations",
        description: "List organizations the user has access to",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "sentry_list_projects",
        description: "List projects in an organization",
        inputSchema: {
          type: "object",
          properties: { org: { type: "string", description: "Organization slug" } },
          required: ["org"],
        },
      },
      {
        name: "sentry_list_issues",
        description: "List recent issues (errors) for a project",
        inputSchema: {
          type: "object",
          properties: {
            org: { type: "string", description: "Organization slug" },
            project: { type: "string", description: "Project slug" },
            query: { type: "string", description: "Search query (optional)" },
            limit: { type: "number", description: "Max results (default 25)" },
          },
          required: ["org", "project"],
        },
      },
      {
        name: "sentry_get_issue",
        description: "Get detailed info about a specific issue including stack trace",
        inputSchema: {
          type: "object",
          properties: { issueId: { type: "string", description: "Issue ID" } },
          required: ["issueId"],
        },
      },
      {
        name: "sentry_get_issue_events",
        description: "Get recent events (occurrences) for an issue",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "string", description: "Issue ID" },
            limit: { type: "number", description: "Max results" },
          },
          required: ["issueId"],
        },
      },
      {
        name: "sentry_get_event",
        description: "Get full details of a specific event including stack trace",
        inputSchema: {
          type: "object",
          properties: {
            org: { type: "string", description: "Organization slug" },
            project: { type: "string", description: "Project slug" },
            eventId: { type: "string", description: "Event ID" },
          },
          required: ["org", "project", "eventId"],
        },
      },
    ];
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    sentry_list_organizations: async (_, auth) => {
      const data = await this.fetchSentry(auth, "/organizations/");
      return this.textResult(data.map((o: Record<string, unknown>) => ({
        slug: o.slug, name: o.name, id: o.id,
      })));
    },

    sentry_list_projects: async (args, auth) => {
      const org = args.org as string;
      const data = await this.fetchSentry(auth, `/organizations/${org}/projects/`);
      return this.textResult(data.map((p: Record<string, unknown>) => ({
        slug: p.slug, name: p.name, id: p.id, platform: p.platform,
      })));
    },

    sentry_list_issues: async (args, auth) => {
      const org = args.org as string;
      const project = args.project as string;
      const query = args.query ? `&query=${encodeURIComponent(args.query as string)}` : "";
      const limit = args.limit ?? 25;
      const data = await this.fetchSentry(
        auth,
        `/projects/${org}/${project}/issues/?limit=${limit}${query}`
      );
      return this.textResult(data.map((i: Record<string, unknown>) => ({
        id: i.id, shortId: i.shortId, title: i.title, culprit: i.culprit,
        level: i.level, status: i.status, count: i.count,
        firstSeen: i.firstSeen, lastSeen: i.lastSeen,
      })));
    },

    sentry_get_issue: async (args, auth) => {
      const issueId = args.issueId as string;
      const data = await this.fetchSentry(auth, `/issues/${issueId}/`);
      return this.textResult({
        id: data.id, shortId: data.shortId, title: data.title,
        culprit: data.culprit, level: data.level, status: data.status,
        count: data.count, userCount: data.userCount,
        firstSeen: data.firstSeen, lastSeen: data.lastSeen,
        metadata: data.metadata, type: data.type,
      });
    },

    sentry_get_issue_events: async (args, auth) => {
      const issueId = args.issueId as string;
      const limit = args.limit ?? 10;
      const data = await this.fetchSentry(auth, `/issues/${issueId}/events/?limit=${limit}`);
      return this.textResult(data.map((e: Record<string, unknown>) => ({
        id: e.id, eventID: e.eventID, title: e.title,
        dateCreated: e.dateCreated, user: e.user,
      })));
    },

    sentry_get_event: async (args, auth) => {
      const { org, project, eventId } = args as { org: string; project: string; eventId: string };
      const data = await this.fetchSentry(auth, `/projects/${org}/${project}/events/${eventId}/`);

      // Extract stack trace info
      const exception = data.entries?.find((e: Record<string, string>) => e.type === "exception");
      const stacktrace = exception?.data?.values?.[0]?.stacktrace?.frames?.slice(-10) ?? [];

      return this.textResult({
        id: data.id, eventID: data.eventID, title: data.title,
        message: data.message, dateCreated: data.dateCreated,
        platform: data.platform, tags: data.tags,
        context: data.contexts, stacktrace,
      });
    },
  };

  async gatherContext(auth: MCPAuth): Promise<MCPContextFragment> {
    try {
      const orgs = await this.fetchSentry(auth, "/organizations/");
      return {
        serverId: this.id,
        serverName: this.name,
        summary: `Sentry connected — ${orgs.length} organization(s): ${orgs.map((o: Record<string, string>) => o.slug).join(", ")}`,
        data: { organizations: orgs.map((o: Record<string, string>) => o.slug) },
        relevance: 0.5,
      };
    } catch {
      return {
        serverId: this.id, serverName: this.name,
        summary: "Sentry connected", data: {}, relevance: 0.3,
      };
    }
  }
}
