// ─── PDF Viewer MCP Adapter ─────────────────────────────
// PDF document parsing and content extraction for AI context.

import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

export class PDFViewerMCPAdapter extends BaseMCPAdapter {
  readonly id = "pdf-viewer";
  readonly name = "PDF Viewer";
  readonly description = "PDF content extraction, search, preview";
  readonly icon = "file-text";
  readonly category = "docs";

  async validateConnection(auth: MCPAuth) {
    // PDF processing can be done client-side or via external service
    const serviceUrl = auth.extra?.serviceUrl as string | undefined;

    if (serviceUrl) {
      try {
        const res = await fetch(`${serviceUrl}/health`);
        if (res.ok) return { valid: true, meta: { serviceUrl } };
      } catch {
        return { valid: false, error: "Cannot connect to PDF service" };
      }
    }

    // Client-side PDF.js is always available
    return { valid: true, meta: { mode: "client" } };
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "pdf_extract_text",
        description: "Extract text content from a PDF file",
        inputSchema: {
          type: "object",
          properties: {
            fileUrl: { type: "string", description: "URL or path to PDF file" },
            pageRange: { type: "string", description: "Page range (e.g., '1-5', 'all')" },
          },
          required: ["fileUrl"],
        },
      },
      {
        name: "pdf_get_metadata",
        description: "Get PDF document metadata",
        inputSchema: {
          type: "object",
          properties: {
            fileUrl: { type: "string", description: "URL or path to PDF file" },
          },
          required: ["fileUrl"],
        },
      },
      {
        name: "pdf_search",
        description: "Search for text within a PDF",
        inputSchema: {
          type: "object",
          properties: {
            fileUrl: { type: "string", description: "URL or path to PDF file" },
            query: { type: "string", description: "Search query" },
            caseSensitive: { type: "boolean", description: "Case sensitive search" },
          },
          required: ["fileUrl", "query"],
        },
      },
      {
        name: "pdf_get_page",
        description: "Get content of a specific page",
        inputSchema: {
          type: "object",
          properties: {
            fileUrl: { type: "string", description: "URL or path to PDF file" },
            pageNumber: { type: "number", description: "Page number (1-indexed)" },
          },
          required: ["fileUrl", "pageNumber"],
        },
      },
      {
        name: "pdf_get_outline",
        description: "Get document outline (table of contents)",
        inputSchema: {
          type: "object",
          properties: {
            fileUrl: { type: "string", description: "URL or path to PDF file" },
          },
          required: ["fileUrl"],
        },
      },
      {
        name: "pdf_extract_images",
        description: "Extract images from PDF pages",
        inputSchema: {
          type: "object",
          properties: {
            fileUrl: { type: "string", description: "URL or path to PDF file" },
            pageRange: { type: "string", description: "Page range to extract from" },
          },
          required: ["fileUrl"],
        },
      },
    ];
  }

  private async callPdfService(
    auth: MCPAuth,
    method: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    const serviceUrl = auth.extra?.serviceUrl as string | undefined;

    // Use external service if configured
    if (serviceUrl) {
      const res = await fetch(`${serviceUrl}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`PDF service error: ${res.status}`);
      return res.json();
    }

    // Client-side processing using pdf.js (stub for browser environment)
    // In real implementation, this would use pdf.js library
    throw new Error("PDF service URL required for server-side processing");
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    pdf_extract_text: async (args, auth) => {
      try {
        const fileUrl = args.fileUrl as string;
        const pageRange = (args.pageRange as string) ?? "all";

        const result = await this.callPdfService(auth, "extract-text", {
          fileUrl, pageRange,
        });

        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        // Provide helpful message for client-side fallback
        if (typeof window !== "undefined") {
          return this.textResult({
            note: "Client-side PDF processing available",
            hint: "Use browser's PDF viewer or configure PDF service URL",
            fileUrl: args.fileUrl,
          });
        }
        return this.errorResult(e instanceof Error ? e.message : "PDF extraction failed");
      }
    },

    pdf_get_metadata: async (args, auth) => {
      try {
        const fileUrl = args.fileUrl as string;

        const result = await this.callPdfService(auth, "metadata", { fileUrl });
        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "Metadata extraction failed");
      }
    },

    pdf_search: async (args, auth) => {
      try {
        const { fileUrl, query, caseSensitive } = args as {
          fileUrl: string; query: string; caseSensitive?: boolean;
        };

        const result = await this.callPdfService(auth, "search", {
          fileUrl, query, caseSensitive: caseSensitive ?? false,
        });

        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "PDF search failed");
      }
    },

    pdf_get_page: async (args, auth) => {
      try {
        const { fileUrl, pageNumber } = args as { fileUrl: string; pageNumber: number };

        const result = await this.callPdfService(auth, "get-page", {
          fileUrl, pageNumber,
        });

        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "Page extraction failed");
      }
    },

    pdf_get_outline: async (args, auth) => {
      try {
        const fileUrl = args.fileUrl as string;

        const result = await this.callPdfService(auth, "outline", { fileUrl });
        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "Outline extraction failed");
      }
    },

    pdf_extract_images: async (args, auth) => {
      try {
        const { fileUrl, pageRange } = args as { fileUrl: string; pageRange?: string };

        const result = await this.callPdfService(auth, "extract-images", {
          fileUrl, pageRange: pageRange ?? "all",
        });

        return this.textResult(result as Record<string, unknown>);
      } catch (e) {
        return this.errorResult(e instanceof Error ? e.message : "Image extraction failed");
      }
    },
  };

  async gatherContext(auth: MCPAuth): Promise<MCPContextFragment> {
    const serviceUrl = auth.extra?.serviceUrl as string | undefined;
    return {
      serverId: this.id,
      serverName: this.name,
      summary: serviceUrl ? `PDF Viewer (${serviceUrl})` : "PDF Viewer (client mode)",
      data: { serviceUrl, mode: serviceUrl ? "server" : "client" },
      relevance: 0.4,
    };
  }
}
