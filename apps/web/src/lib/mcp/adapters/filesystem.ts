// ─── Filesystem MCP Adapter ─────────────────────────────
// Local filesystem access for AI agent operations.
// Note: This adapter requires Electron/Node.js runtime for file operations.

import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

export class FilesystemMCPAdapter extends BaseMCPAdapter {
  readonly id = "filesystem";
  readonly name = "Filesystem";
  readonly description = "Local file read/write, directory listing";
  readonly icon = "folder";
  readonly category = "local";

  // Filesystem operations are handled by the Electron main process
  // This adapter provides the MCP interface definition

  async validateConnection(auth: MCPAuth) {
    // Check if we're in Electron environment with filesystem access
    const rootPath = auth.extra?.rootPath as string | undefined;
    if (!rootPath) {
      return { valid: false, error: "Root path required in auth.extra.rootPath" };
    }

    // In browser, we can't validate directly - assume valid if we have electronAgent
    if (typeof window !== "undefined" && (window as unknown as { electronAgent?: unknown }).electronAgent) {
      return { valid: true, meta: { rootPath } };
    }

    return { valid: true, meta: { rootPath, note: "Server-side validation pending" } };
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "fs_read_file",
        description: "Read contents of a file",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path (relative to root)" },
            encoding: { type: "string", description: "File encoding (default: utf-8)" },
          },
          required: ["path"],
        },
      },
      {
        name: "fs_write_file",
        description: "Write contents to a file",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path (relative to root)" },
            content: { type: "string", description: "File content" },
            createDirs: { type: "boolean", description: "Create parent directories if missing" },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "fs_list_directory",
        description: "List files and directories",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Directory path (default: root)" },
            recursive: { type: "boolean", description: "Include subdirectories" },
            depth: { type: "number", description: "Max depth for recursive listing" },
          },
          required: [],
        },
      },
      {
        name: "fs_search_files",
        description: "Search for files by name pattern",
        inputSchema: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Glob pattern (e.g., **/*.ts)" },
            path: { type: "string", description: "Starting directory" },
          },
          required: ["pattern"],
        },
      },
      {
        name: "fs_file_info",
        description: "Get file metadata (size, modified time, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path" },
          },
          required: ["path"],
        },
      },
      {
        name: "fs_delete_file",
        description: "Delete a file or directory",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to delete" },
            recursive: { type: "boolean", description: "Delete directories recursively" },
          },
          required: ["path"],
        },
      },
    ];
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    fs_read_file: async (args, auth) => {
      // Delegate to Electron IPC or server-side handler
      const rootPath = auth.extra?.rootPath as string;
      const filePath = args.path as string;

      // In browser with Electron
      if (typeof window !== "undefined") {
        const electronAgent = (window as unknown as { electronAgent?: { readFile: (p: string) => Promise<string> } }).electronAgent;
        if (electronAgent?.readFile) {
          const content = await electronAgent.readFile(`${rootPath}/${filePath}`);
          return this.textResult({ path: filePath, content });
        }
      }

      // Fallback: indicate this needs to be handled by the runtime
      return this.errorResult("Filesystem operations require Electron runtime");
    },

    fs_write_file: async (args, auth) => {
      const rootPath = auth.extra?.rootPath as string;
      const filePath = args.path as string;
      const content = args.content as string;

      if (typeof window !== "undefined") {
        const electronAgent = (window as unknown as { electronAgent?: { writeFile: (p: string, c: string) => Promise<void> } }).electronAgent;
        if (electronAgent?.writeFile) {
          await electronAgent.writeFile(`${rootPath}/${filePath}`, content);
          return this.textResult({ success: true, path: filePath });
        }
      }

      return this.errorResult("Filesystem operations require Electron runtime");
    },

    fs_list_directory: async (args, auth) => {
      const rootPath = auth.extra?.rootPath as string;
      const dirPath = (args.path as string) ?? "";

      if (typeof window !== "undefined") {
        const electronAgent = (window as unknown as { electronAgent?: { listFiles: (p: string) => Promise<string[]> } }).electronAgent;
        if (electronAgent?.listFiles) {
          const files = await electronAgent.listFiles(`${rootPath}/${dirPath}`);
          return this.textResult({ path: dirPath, files });
        }
      }

      return this.errorResult("Filesystem operations require Electron runtime");
    },

    fs_search_files: async (args, auth) => {
      const rootPath = auth.extra?.rootPath as string;
      const pattern = args.pattern as string;

      if (typeof window !== "undefined") {
        const electronAgent = (window as unknown as { electronAgent?: { searchFiles: (r: string, p: string) => Promise<string[]> } }).electronAgent;
        if (electronAgent?.searchFiles) {
          const matches = await electronAgent.searchFiles(rootPath, pattern);
          return this.textResult({ pattern, matches });
        }
      }

      return this.errorResult("Filesystem operations require Electron runtime");
    },

    fs_file_info: async (args, auth) => {
      const rootPath = auth.extra?.rootPath as string;
      const filePath = args.path as string;

      if (typeof window !== "undefined") {
        const electronAgent = (window as unknown as { electronAgent?: { fileInfo: (p: string) => Promise<Record<string, unknown>> } }).electronAgent;
        if (electronAgent?.fileInfo) {
          const info = await electronAgent.fileInfo(`${rootPath}/${filePath}`);
          return this.textResult(info);
        }
      }

      return this.errorResult("Filesystem operations require Electron runtime");
    },

    fs_delete_file: async (args, auth) => {
      const rootPath = auth.extra?.rootPath as string;
      const filePath = args.path as string;

      if (typeof window !== "undefined") {
        const electronAgent = (window as unknown as { electronAgent?: { deleteFile: (p: string, r?: boolean) => Promise<void> } }).electronAgent;
        if (electronAgent?.deleteFile) {
          await electronAgent.deleteFile(`${rootPath}/${filePath}`, args.recursive as boolean);
          return this.textResult({ success: true, deleted: filePath });
        }
      }

      return this.errorResult("Filesystem operations require Electron runtime");
    },
  };

  async gatherContext(auth: MCPAuth): Promise<MCPContextFragment> {
    const rootPath = auth.extra?.rootPath as string | undefined;
    return {
      serverId: this.id,
      serverName: this.name,
      summary: rootPath ? `Filesystem: ${rootPath}` : "Filesystem (no root set)",
      data: { rootPath },
      relevance: rootPath ? 0.8 : 0.3,
    };
  }
}
