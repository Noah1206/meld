// ─── Agent Bridge MCP Adapter ─────────────────────────────
// Connects to the local Meld Agent for filesystem and terminal operations.
// This bridges the web app to the local agent running via WebSocket.

import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

export class AgentBridgeMCPAdapter extends BaseMCPAdapter {
  readonly id = "agent-bridge";
  readonly name = "Agent Bridge";
  readonly description = "Local agent connection for file/terminal ops";
  readonly icon = "cpu";
  readonly category = "local";

  private ws: WebSocket | null = null;
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = new Map();

  async validateConnection(auth: MCPAuth) {
    const agentUrl = (auth.extra?.agentUrl as string) ?? "ws://localhost:9100";

    try {
      // Try HTTP health check first
      const httpUrl = agentUrl.replace("ws://", "http://").replace("wss://", "https://");
      const res = await fetch(`${httpUrl}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        return { valid: true, meta: { agentUrl, projectPath: data.projectPath } };
      }
    } catch {
      // Health check failed, try WebSocket
    }

    // Try WebSocket connection
    return new Promise<{ valid: boolean; error?: string; meta?: Record<string, unknown> }>((resolve) => {
      try {
        const testWs = new WebSocket(agentUrl);
        const timeout = setTimeout(() => {
          testWs.close();
          resolve({ valid: false, error: "Agent connection timeout" });
        }, 5000);

        testWs.onopen = () => {
          clearTimeout(timeout);
          testWs.close();
          resolve({ valid: true, meta: { agentUrl } });
        };

        testWs.onerror = () => {
          clearTimeout(timeout);
          resolve({ valid: false, error: "Cannot connect to local agent" });
        };
      } catch {
        resolve({ valid: false, error: "WebSocket connection failed" });
      }
    });
  }

  private async ensureConnection(auth: MCPAuth): Promise<WebSocket> {
    const agentUrl = (auth.extra?.agentUrl as string) ?? "ws://localhost:9100";

    if (this.ws?.readyState === WebSocket.OPEN) {
      return this.ws;
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(agentUrl);

      this.ws.onopen = () => resolve(this.ws!);

      this.ws.onerror = () => reject(new Error("Agent connection failed"));

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const pending = this.pendingRequests.get(msg.id);
          if (pending) {
            this.pendingRequests.delete(msg.id);
            if (msg.error) {
              pending.reject(new Error(msg.error));
            } else {
              pending.resolve(msg.result);
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        // Reject all pending requests
        for (const [, pending] of this.pendingRequests) {
          pending.reject(new Error("Connection closed"));
        }
        this.pendingRequests.clear();
      };
    });
  }

  private async sendRequest(auth: MCPAuth, method: string, params?: Record<string, unknown>): Promise<unknown> {
    const ws = await this.ensureConnection(auth);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error("Request timeout"));
      }, 30000);

      ws.send(JSON.stringify({ id, method, params }));

      // Modify resolve/reject to clear timeout
      const originalResolve = this.pendingRequests.get(id)!.resolve;
      const originalReject = this.pendingRequests.get(id)!.reject;

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          originalResolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          originalReject(error);
        },
      });
    });
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "agent_read_file",
        description: "Read a file from the project",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path relative to project root" },
          },
          required: ["path"],
        },
      },
      {
        name: "agent_write_file",
        description: "Write content to a file",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path relative to project root" },
            content: { type: "string", description: "File content" },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "agent_list_files",
        description: "List files in a directory",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Directory path (default: root)" },
            recursive: { type: "boolean", description: "Include subdirectories" },
          },
          required: [],
        },
      },
      {
        name: "agent_search_files",
        description: "Search for files or content",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            type: { type: "string", description: "Search type: filename, content, regex" },
          },
          required: ["query"],
        },
      },
      {
        name: "agent_run_command",
        description: "Execute a shell command",
        inputSchema: {
          type: "object",
          properties: {
            command: { type: "string", description: "Command to execute" },
            cwd: { type: "string", description: "Working directory" },
          },
          required: ["command"],
        },
      },
      {
        name: "agent_get_project_info",
        description: "Get project metadata and structure",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
    ];
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    agent_read_file: async (args, auth) => {
      try {
        const path = args.path as string;
        const result = await this.sendRequest(auth, "read_file", { path });
        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "Read file failed");
      }
    },

    agent_write_file: async (args, auth) => {
      try {
        const { path, content } = args as { path: string; content: string };
        const result = await this.sendRequest(auth, "write_file", { path, content });
        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "Write file failed");
      }
    },

    agent_list_files: async (args, auth) => {
      try {
        const path = (args.path as string) ?? "";
        const recursive = (args.recursive as boolean) ?? false;
        const result = await this.sendRequest(auth, "list_files", { path, recursive });
        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "List files failed");
      }
    },

    agent_search_files: async (args, auth) => {
      try {
        const { query, type } = args as { query: string; type?: string };
        const result = await this.sendRequest(auth, "search_files", {
          query, type: type ?? "content",
        });
        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "Search failed");
      }
    },

    agent_run_command: async (args, auth) => {
      try {
        const { command, cwd } = args as { command: string; cwd?: string };
        const result = await this.sendRequest(auth, "run_command", { command, cwd });
        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "Command failed");
      }
    },

    agent_get_project_info: async (_, auth) => {
      try {
        const result = await this.sendRequest(auth, "get_project_info", {});
        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "Get project info failed");
      }
    },
  };

  async gatherContext(auth: MCPAuth): Promise<MCPContextFragment> {
    try {
      const info = await this.sendRequest(auth, "get_project_info", {}) as Record<string, unknown>;
      return {
        serverId: this.id,
        serverName: this.name,
        summary: `Agent: ${info.projectPath ?? "Connected"}`,
        data: info,
        relevance: 0.9,
      };
    } catch {
      return {
        serverId: this.id, serverName: this.name,
        summary: "Agent Bridge (disconnected)", data: {}, relevance: 0.2,
      };
    }
  }

  // Cleanup when adapter is no longer needed
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
  }
}
