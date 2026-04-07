// ─── Figma MCP Adapter ──────────────────────────────
// Wraps Figma REST API as an MCP adapter.
// Not hardcoded — a plugin that extends BaseMCPAdapter.

import { BaseMCPAdapter } from "./base";
import { FigmaClient } from "@/lib/figma/client";
import type { FigmaNodeData } from "@figma-code-bridge/shared";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

export class FigmaMCPAdapter extends BaseMCPAdapter {
  readonly id = "figma";
  readonly name = "Figma";
  readonly description = "Fetch node trees, styles, and images from design files";
  readonly icon = "figma";
  readonly category = "design";

  private getClient(auth: MCPAuth): FigmaClient {
    return new FigmaClient(auth.token);
  }

  async validateConnection(auth: MCPAuth) {
    try {
      const res = await fetch("https://api.figma.com/v1/me", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`[Figma validateConnection] ${res.status} ${res.statusText}:`, body);
        return { valid: false, error: `Figma token is invalid (${res.status})` };
      }
      const user = await res.json();
      return { valid: true, meta: { userName: user.handle, email: user.email } };
    } catch (err) {
      console.error(`[Figma validateConnection] error:`, err);
      return { valid: false, error: "Unable to connect to Figma API" };
    }
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "figma_get_file",
        description: "Get the full node tree of a Figma file. Use to understand Page → Frame → Component structure.",
        inputSchema: {
          type: "object",
          properties: {
            file_key: { type: "string", description: "Figma file key (extracted from URL)" },
          },
          required: ["file_key"],
        },
      },
      {
        name: "figma_get_nodes",
        description: "Get detailed info (styles, child nodes, etc.) for specific nodes in a Figma file.",
        inputSchema: {
          type: "object",
          properties: {
            file_key: { type: "string", description: "Figma file key" },
            node_ids: { type: "array", description: "List of node IDs", items: { type: "string" } },
          },
          required: ["file_key", "node_ids"],
        },
      },
      {
        name: "figma_get_images",
        description: "Render Figma nodes as PNG/SVG images. Use for design preview or fidelity checks.",
        inputSchema: {
          type: "object",
          properties: {
            file_key: { type: "string", description: "Figma file key" },
            node_ids: { type: "array", description: "List of node IDs", items: { type: "string" } },
            format: { type: "string", description: "Image format", enum: ["png", "svg", "jpg"] },
          },
          required: ["file_key", "node_ids"],
        },
      },
      {
        name: "figma_extract_tokens",
        description: "Extract design tokens (colors, fonts, effects) from a Figma file. Use for design system construction.",
        inputSchema: {
          type: "object",
          properties: {
            file_key: { type: "string", description: "Figma file key" },
          },
          required: ["file_key"],
        },
      },
    ];
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    figma_get_file: async (args, auth) => {
      const client = this.getClient(auth);
      const data = await client.getFile(args.file_key as string);
      return this.textResult({
        name: data.name,
        lastModified: data.lastModified,
        version: data.version,
        pages: data.document?.children?.map((page: FigmaNodeData) => ({
          id: page.id,
          name: page.name,
          type: page.type,
          childCount: page.children?.length ?? 0,
          children: page.children?.map((c: FigmaNodeData) => ({
            id: c.id, name: c.name, type: c.type,
            childCount: c.children?.length ?? 0,
          })),
        })),
      });
    },

    figma_get_nodes: async (args, auth) => {
      const client = this.getClient(auth);
      const data = await client.getFileNodes(args.file_key as string, args.node_ids as string[]);
      return this.textResult(data);
    },

    figma_get_images: async (args, auth) => {
      const client = this.getClient(auth);
      const format = (args.format as "png" | "svg" | "jpg") ?? "png";
      const images = await client.getImages(args.file_key as string, args.node_ids as string[], format);
      return this.textResult(images);
    },

    figma_extract_tokens: async (args, auth) => {
      const client = this.getClient(auth);
      const data = await client.getFile(args.file_key as string);

      const colors = new Set<string>();
      const fonts = new Set<string>();
      const effects: string[] = [];

      function walk(nodes: FigmaNodeData[]) {
        for (const n of nodes) {
          if (n.fills) {
            for (const f of n.fills) {
              if (f.color) {
                const { r, g, b, a } = f.color;
                colors.add(`rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a?.toFixed(2) ?? 1})`);
              }
            }
          }
          if (n.style?.fontFamily) fonts.add(n.style.fontFamily);
          if (n.effects) for (const e of n.effects) if (e.visible !== false) effects.push(e.type);
          if (n.children) walk(n.children);
        }
      }
      if (data.document?.children) walk(data.document.children);

      return this.textResult({
        fileName: data.name,
        colors: [...colors],
        fonts: [...fonts],
        effects: [...new Set(effects)],
      });
    },
  };

  // Figma-specific context (#3 Context Mesh)
  async gatherContext(auth: MCPAuth, hint?: string): Promise<MCPContextFragment> {
    // If hint contains a fileKey, provide that file's structure as context
    if (hint) {
      try {
        const client = this.getClient(auth);
        const data = await client.getFile(hint);
        const pageNames = data.document?.children?.map((p: FigmaNodeData) => p.name) ?? [];
        return {
          serverId: this.id,
          serverName: this.name,
          summary: `Figma file "${data.name}" — pages: ${pageNames.join(", ")}`,
          data: { fileName: data.name, pages: pageNames, lastModified: data.lastModified },
          relevance: 0.9,
        };
      } catch {
        // Fall back to default context on file access failure
      }
    }
    return {
      serverId: this.id,
      serverName: this.name,
      summary: "Figma connected — design files, styles, and images accessible",
      data: {},
      relevance: 0.5,
    };
  }
}
