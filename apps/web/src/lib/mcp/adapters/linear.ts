// ─── Linear MCP Adapter ─────────────────────────────
// Wraps Linear GraphQL API as an MCP adapter for project management.

import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

const LINEAR_API = "https://api.linear.app/graphql";

export class LinearMCPAdapter extends BaseMCPAdapter {
  readonly id = "linear";
  readonly name = "Linear";
  readonly description = "Issues, projects, cycles, team workflows";
  readonly icon = "list-checks";
  readonly category = "project";

  private async gql(auth: MCPAuth, query: string, variables?: Record<string, unknown>) {
    const res = await fetch(LINEAR_API, {
      method: "POST",
      headers: {
        Authorization: auth.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`Linear API error: ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0]?.message ?? "GraphQL error");
    return json.data;
  }

  async validateConnection(auth: MCPAuth) {
    try {
      const data = await this.gql(auth, `query { viewer { id name email } }`);
      return { valid: true, meta: { user: data.viewer?.name, email: data.viewer?.email } };
    } catch {
      return { valid: false, error: "Invalid Linear API key" };
    }
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "linear_list_teams",
        description: "List all teams the user has access to",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "linear_list_issues",
        description: "List issues, optionally filtered by team, state, or assignee",
        inputSchema: {
          type: "object",
          properties: {
            teamId: { type: "string", description: "Filter by team ID" },
            state: { type: "string", description: "Filter by state name (e.g., 'In Progress')" },
            assignedToMe: { type: "boolean", description: "Only my assigned issues" },
            limit: { type: "number", description: "Max results (default 25)" },
          },
          required: [],
        },
      },
      {
        name: "linear_get_issue",
        description: "Get detailed info about a specific issue",
        inputSchema: {
          type: "object",
          properties: { issueId: { type: "string", description: "Issue ID or identifier (e.g., ENG-123)" } },
          required: ["issueId"],
        },
      },
      {
        name: "linear_search_issues",
        description: "Search issues by text query",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            limit: { type: "number", description: "Max results" },
          },
          required: ["query"],
        },
      },
      {
        name: "linear_list_projects",
        description: "List projects",
        inputSchema: {
          type: "object",
          properties: { teamId: { type: "string", description: "Filter by team ID" } },
          required: [],
        },
      },
      {
        name: "linear_list_cycles",
        description: "List active and upcoming cycles",
        inputSchema: {
          type: "object",
          properties: { teamId: { type: "string", description: "Team ID" } },
          required: ["teamId"],
        },
      },
    ];
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    linear_list_teams: async (_, auth) => {
      const data = await this.gql(auth, `
        query { teams { nodes { id name key description } } }
      `);
      return this.textResult(data.teams?.nodes ?? []);
    },

    linear_list_issues: async (args, auth) => {
      const limit = (args.limit as number) ?? 25;
      const filters: string[] = [];
      if (args.teamId) filters.push(`team: { id: { eq: "${args.teamId}" } }`);
      if (args.state) filters.push(`state: { name: { eq: "${args.state}" } }`);
      if (args.assignedToMe) filters.push(`assignee: { isMe: { eq: true } }`);

      const filterStr = filters.length > 0 ? `filter: { ${filters.join(", ")} }` : "";

      const data = await this.gql(auth, `
        query {
          issues(first: ${limit}, ${filterStr}) {
            nodes {
              id identifier title description priority
              state { name } assignee { name } project { name }
              createdAt updatedAt
            }
          }
        }
      `);
      return this.textResult(data.issues?.nodes?.map((i: Record<string, unknown>) => ({
        id: i.id, identifier: i.identifier, title: i.title,
        priority: i.priority, state: (i.state as Record<string, string>)?.name,
        assignee: (i.assignee as Record<string, string>)?.name,
        project: (i.project as Record<string, string>)?.name,
      })) ?? []);
    },

    linear_get_issue: async (args, auth) => {
      const issueId = args.issueId as string;
      // Check if it's an identifier (e.g., ENG-123) or UUID
      const isIdentifier = issueId.includes("-") && !issueId.match(/^[0-9a-f-]{36}$/i);

      let data;
      if (isIdentifier) {
        data = await this.gql(auth, `
          query($id: String!) {
            issueSearch(query: $id, first: 1) {
              nodes {
                id identifier title description priority estimate
                state { name } assignee { name email }
                project { name } team { name key }
                labels { nodes { name color } }
                comments { nodes { body user { name } createdAt } }
                createdAt updatedAt
              }
            }
          }
        `, { id: issueId });
        data = { issue: data.issueSearch?.nodes?.[0] };
      } else {
        data = await this.gql(auth, `
          query($id: String!) {
            issue(id: $id) {
              id identifier title description priority estimate
              state { name } assignee { name email }
              project { name } team { name key }
              labels { nodes { name color } }
              comments { nodes { body user { name } createdAt } }
              createdAt updatedAt
            }
          }
        `, { id: issueId });
      }

      const issue = data.issue;
      if (!issue) return this.errorResult("Issue not found");

      return this.textResult({
        id: issue.id, identifier: issue.identifier, title: issue.title,
        description: issue.description, priority: issue.priority,
        estimate: issue.estimate, state: issue.state?.name,
        assignee: issue.assignee, project: issue.project?.name,
        team: issue.team, labels: issue.labels?.nodes,
        comments: issue.comments?.nodes?.slice(0, 5),
        createdAt: issue.createdAt, updatedAt: issue.updatedAt,
      });
    },

    linear_search_issues: async (args, auth) => {
      const query = args.query as string;
      const limit = (args.limit as number) ?? 10;
      const data = await this.gql(auth, `
        query($query: String!) {
          issueSearch(query: $query, first: ${limit}) {
            nodes {
              id identifier title state { name } assignee { name }
            }
          }
        }
      `, { query });
      return this.textResult(data.issueSearch?.nodes ?? []);
    },

    linear_list_projects: async (args, auth) => {
      const teamFilter = args.teamId ? `, filter: { accessibleTeams: { id: { eq: "${args.teamId}" } } }` : "";
      const data = await this.gql(auth, `
        query { projects(first: 50 ${teamFilter}) {
          nodes { id name description state startDate targetDate progress }
        } }
      `);
      return this.textResult(data.projects?.nodes ?? []);
    },

    linear_list_cycles: async (args, auth) => {
      const teamId = args.teamId as string;
      const data = await this.gql(auth, `
        query($teamId: String!) {
          team(id: $teamId) {
            cycles(first: 5, filter: { isCompleted: { eq: false } }) {
              nodes { id number name startsAt endsAt progress }
            }
          }
        }
      `, { teamId });
      return this.textResult(data.team?.cycles?.nodes ?? []);
    },
  };

  async gatherContext(auth: MCPAuth): Promise<MCPContextFragment> {
    try {
      const data = await this.gql(auth, `
        query {
          viewer { assignedIssues(first: 5) { nodes { identifier title state { name } } } }
        }
      `);
      const issues = data.viewer?.assignedIssues?.nodes ?? [];
      return {
        serverId: this.id,
        serverName: this.name,
        summary: `Linear connected — ${issues.length} assigned issues`,
        data: { assignedIssues: issues },
        relevance: 0.6,
      };
    } catch {
      return {
        serverId: this.id, serverName: this.name,
        summary: "Linear connected", data: {}, relevance: 0.3,
      };
    }
  }
}
