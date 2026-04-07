// ─── GitHub MCP Adapter ─────────────────────────────
// Wraps GitHub REST API (Octokit) as an MCP adapter.

import { Octokit } from "@octokit/rest";
import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

export class GitHubMCPAdapter extends BaseMCPAdapter {
  readonly id = "github";
  readonly name = "GitHub";
  readonly description = "Browse repos, read files, search code, detect frameworks";
  readonly icon = "github";
  readonly category = "code";

  private getOctokit(auth: MCPAuth): Octokit {
    return new Octokit({ auth: auth.token });
  }

  async validateConnection(auth: MCPAuth) {
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${auth.token}`, Accept: "application/vnd.github+json" },
      });
      if (!res.ok) return { valid: false, error: "GitHub token is invalid" };
      const user = await res.json();
      return { valid: true, meta: { login: user.login, name: user.name } };
    } catch {
      return { valid: false, error: "Unable to connect to GitHub API" };
    }
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "github_list_repos",
        description: "List authenticated user's GitHub repositories (sorted by recent update)",
        inputSchema: {
          type: "object",
          properties: {
            per_page: { type: "number", description: "Number of results (default 30, max 100)" },
          },
          required: [],
        },
      },
      {
        name: "github_get_repo",
        description: "Get detailed info for a specific repository (description, language, branches, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
          },
          required: ["owner", "repo"],
        },
      },
      {
        name: "github_list_files",
        description: "Get the file tree of a repository. Used to understand project structure.",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            branch: { type: "string", description: "Branch name (default main)" },
          },
          required: ["owner", "repo"],
        },
      },
      {
        name: "github_get_file",
        description: "Get the contents of a specific file from a repository.",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            path: { type: "string", description: "File path" },
            branch: { type: "string", description: "Branch name (default main)" },
          },
          required: ["owner", "repo", "path"],
        },
      },
      {
        name: "github_search_code",
        description: "Search code within a repository. Useful for finding components matching Figma nodes.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
          },
          required: ["query", "owner", "repo"],
        },
      },
      {
        name: "github_detect_framework",
        description: "Detect framework, styling, and dependencies by analyzing package.json.",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            branch: { type: "string", description: "Branch name (default main)" },
          },
          required: ["owner", "repo"],
        },
      },
    ];
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    github_list_repos: async (args, auth) => {
      const ok = this.getOctokit(auth);
      const perPage = Math.min((args.per_page as number) ?? 30, 100);
      const { data } = await ok.repos.listForAuthenticatedUser({ sort: "updated", per_page: perPage });
      return this.textResult(data.map((r) => ({
        fullName: r.full_name, name: r.name, owner: r.owner.login,
        description: r.description, language: r.language, isPrivate: r.private,
        updatedAt: r.updated_at, defaultBranch: r.default_branch,
      })));
    },

    github_get_repo: async (args, auth) => {
      const ok = this.getOctokit(auth);
      const { data } = await ok.repos.get({ owner: args.owner as string, repo: args.repo as string });
      return this.textResult({
        fullName: data.full_name, description: data.description, language: data.language,
        defaultBranch: data.default_branch, isPrivate: data.private, topics: data.topics,
        size: data.size, updatedAt: data.updated_at,
      });
    },

    github_list_files: async (args, auth) => {
      const ok = this.getOctokit(auth);
      const { data } = await ok.git.getTree({
        owner: args.owner as string, repo: args.repo as string,
        tree_sha: (args.branch as string) ?? "main", recursive: "1",
      });
      return this.textResult(data.tree.filter((i) => i.type === "blob" && i.path).map((i) => i.path!));
    },

    github_get_file: async (args, auth) => {
      const ok = this.getOctokit(auth);
      const { data } = await ok.repos.getContent({
        owner: args.owner as string, repo: args.repo as string,
        path: args.path as string, ref: (args.branch as string) ?? "main",
      });
      if ("content" in data && data.content) {
        return this.textResult({
          path: args.path, content: Buffer.from(data.content, "base64").toString("utf-8"), sha: data.sha,
        });
      }
      return this.errorResult("Unable to read file contents");
    },

    github_search_code: async (args, auth) => {
      const ok = this.getOctokit(auth);
      const { data } = await ok.search.code({
        q: `${args.query as string} repo:${args.owner}/${args.repo}`, per_page: 10,
      });
      return this.textResult({
        totalCount: data.total_count,
        results: data.items.map((i) => ({ path: i.path, name: i.name, sha: i.sha })),
      });
    },

    github_detect_framework: async (args, auth) => {
      const ok = this.getOctokit(auth);
      const branch = (args.branch as string) ?? "main";
      try {
        const { data } = await ok.repos.getContent({
          owner: args.owner as string, repo: args.repo as string, path: "package.json", ref: branch,
        });
        if ("content" in data && data.content) {
          const pkg = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
          const all = { ...pkg.dependencies, ...pkg.devDependencies };
          const fw = all.next ? "nextjs" : all.react ? "react" : all.vue ? "vue"
            : all["@angular/core"] ? "angular" : all.svelte ? "svelte" : all.astro ? "astro" : "unknown";
          const styling = [];
          if (all.tailwindcss) styling.push("tailwind");
          if (all["styled-components"]) styling.push("styled-components");
          if (all["@emotion/react"]) styling.push("emotion");
          if (all.sass) styling.push("sass");
          return this.textResult({
            framework: fw, name: pkg.name, styling, typescript: !!all.typescript,
            dependencies: Object.keys(pkg.dependencies ?? {}),
          });
        }
      } catch { /* no package.json */ }
      return this.textResult({ framework: "unknown" });
    },
  };

  // GitHub-specific context (#3)
  async gatherContext(auth: MCPAuth, hint?: string): Promise<MCPContextFragment> {
    if (hint?.includes("/")) {
      const [owner, repo] = hint.split("/");
      try {
        const result = await this.toolHandlers.github_detect_framework({ owner, repo }, auth);
        const data = JSON.parse(result.content[0]?.text ?? "{}");
        return {
          serverId: this.id,
          serverName: this.name,
          summary: `GitHub "${hint}" — ${data.framework} project, ${data.styling?.join("+") || "plain CSS"}`,
          data,
          relevance: 0.9,
        };
      } catch { /* fallback */ }
    }
    return {
      serverId: this.id,
      serverName: this.name,
      summary: "GitHub connected — repo browsing, file reading, code search available",
      data: {},
      relevance: 0.4,
    };
  }
}
