// ─── Windows MCP Adapter ─────────────────────────────
// Windows-specific system operations via MCP protocol.
// Provides clipboard, system info, and native Windows features.

import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

export class WindowsMCPAdapter extends BaseMCPAdapter {
  readonly id = "windows-mcp";
  readonly name = "Windows MCP";
  readonly description = "Clipboard, screenshots, system info";
  readonly icon = "monitor";
  readonly category = "system";

  async validateConnection(auth: MCPAuth) {
    // Check if running on Windows or has Windows MCP server
    if (typeof window !== "undefined") {
      const electronAgent = (window as unknown as { electronAgent?: { platform?: string } }).electronAgent;
      if (electronAgent?.platform === "win32") {
        return { valid: true, meta: { platform: "win32" } };
      }
    }

    // Check for external Windows MCP server URL
    const serverUrl = auth.extra?.serverUrl as string | undefined;
    if (serverUrl) {
      try {
        const res = await fetch(`${serverUrl}/health`);
        if (res.ok) return { valid: true, meta: { serverUrl } };
      } catch {
        return { valid: false, error: "Cannot connect to Windows MCP server" };
      }
    }

    return { valid: false, error: "Windows MCP requires Windows platform or external server" };
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "windows_clipboard_read",
        description: "Read text from Windows clipboard",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "windows_clipboard_write",
        description: "Write text to Windows clipboard",
        inputSchema: {
          type: "object",
          properties: { text: { type: "string", description: "Text to copy" } },
          required: ["text"],
        },
      },
      {
        name: "windows_screenshot",
        description: "Take a screenshot (full screen or window)",
        inputSchema: {
          type: "object",
          properties: {
            target: { type: "string", description: "Target: fullscreen, window, region" },
            windowTitle: { type: "string", description: "Window title to capture" },
          },
          required: [],
        },
      },
      {
        name: "windows_system_info",
        description: "Get Windows system information",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "windows_list_windows",
        description: "List open windows",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "windows_run_powershell",
        description: "Execute a PowerShell command (read-only queries only)",
        inputSchema: {
          type: "object",
          properties: {
            command: { type: "string", description: "PowerShell command to execute" },
          },
          required: ["command"],
        },
      },
    ];
  }

  private async callWindowsMcp(auth: MCPAuth, method: string, params?: Record<string, unknown>): Promise<unknown> {
    const serverUrl = auth.extra?.serverUrl as string | undefined;

    // Try Electron IPC first
    if (typeof window !== "undefined") {
      const electronAgent = (window as unknown as {
        electronAgent?: { windowsMcp?: (m: string, p?: Record<string, unknown>) => Promise<unknown> }
      }).electronAgent;
      if (electronAgent?.windowsMcp) {
        return electronAgent.windowsMcp(method, params);
      }
    }

    // Fall back to HTTP server
    if (serverUrl) {
      const res = await fetch(`${serverUrl}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, params }),
      });
      if (!res.ok) throw new Error(`Windows MCP error: ${res.status}`);
      return res.json();
    }

    throw new Error("Windows MCP not available");
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    windows_clipboard_read: async (_, auth) => {
      try {
        const result = await this.callWindowsMcp(auth, "clipboard.read");
        return this.textResult({ text: result });
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "Clipboard read failed");
      }
    },

    windows_clipboard_write: async (args, auth) => {
      try {
        const text = args.text as string;
        await this.callWindowsMcp(auth, "clipboard.write", { text });
        return this.textResult({ success: true, text: text.slice(0, 100) });
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "Clipboard write failed");
      }
    },

    windows_screenshot: async (args, auth) => {
      try {
        const target = (args.target as string) ?? "fullscreen";
        const result = await this.callWindowsMcp(auth, "screenshot.capture", {
          target,
          windowTitle: args.windowTitle,
        });
        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "Screenshot failed");
      }
    },

    windows_system_info: async (_, auth) => {
      try {
        const result = await this.callWindowsMcp(auth, "system.info");
        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "System info failed");
      }
    },

    windows_list_windows: async (_, auth) => {
      try {
        const result = await this.callWindowsMcp(auth, "windows.list");
        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "List windows failed");
      }
    },

    windows_run_powershell: async (args, auth) => {
      try {
        const command = args.command as string;

        // Block dangerous commands
        const dangerous = ["rm", "del", "format", "remove-", "stop-", "restart-", "shutdown"];
        const lowerCmd = command.toLowerCase();
        if (dangerous.some(d => lowerCmd.includes(d))) {
          return this.errorResult("Command blocked: potentially destructive operation");
        }

        const result = await this.callWindowsMcp(auth, "powershell.run", { command });
        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "PowerShell execution failed");
      }
    },
  };

  async gatherContext(auth: MCPAuth): Promise<MCPContextFragment> {
    try {
      const info = await this.callWindowsMcp(auth, "system.info") as Record<string, unknown>;
      return {
        serverId: this.id,
        serverName: this.name,
        summary: `Windows: ${info.osVersion ?? "Connected"}`,
        data: info,
        relevance: 0.4,
      };
    } catch {
      return {
        serverId: this.id, serverName: this.name,
        summary: "Windows MCP connected", data: {}, relevance: 0.3,
      };
    }
  }
}
