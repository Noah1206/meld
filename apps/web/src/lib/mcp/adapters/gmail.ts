// ─── Gmail MCP Adapter ─────────────────────────────
// Wraps Gmail API as an MCP adapter for email management.

import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

export class GmailMCPAdapter extends BaseMCPAdapter {
  readonly id = "gmail";
  readonly name = "Gmail";
  readonly description = "Email inbox, threads, labels, search";
  readonly icon = "mail";
  readonly category = "communication";

  private async fetchGmail(auth: MCPAuth, endpoint: string, options?: RequestInit) {
    const res = await fetch(`${GMAIL_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
    return res.json();
  }

  async validateConnection(auth: MCPAuth) {
    try {
      const data = await this.fetchGmail(auth, "/users/me/profile");
      return { valid: true, meta: { email: data.emailAddress, messagesTotal: data.messagesTotal } };
    } catch {
      return { valid: false, error: "Invalid Gmail OAuth token" };
    }
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "gmail_list_messages",
        description: "List messages in the user's mailbox",
        inputSchema: {
          type: "object",
          properties: {
            q: { type: "string", description: "Search query (Gmail search syntax)" },
            labelIds: { type: "array", items: { type: "string" }, description: "Filter by label IDs" },
            maxResults: { type: "number", description: "Max results (default 20)" },
          },
          required: [],
        },
      },
      {
        name: "gmail_get_message",
        description: "Get a specific message by ID",
        inputSchema: {
          type: "object",
          properties: {
            messageId: { type: "string", description: "Message ID" },
            format: { type: "string", description: "Format: full, metadata, minimal (default: full)" },
          },
          required: ["messageId"],
        },
      },
      {
        name: "gmail_get_thread",
        description: "Get a conversation thread",
        inputSchema: {
          type: "object",
          properties: {
            threadId: { type: "string", description: "Thread ID" },
          },
          required: ["threadId"],
        },
      },
      {
        name: "gmail_list_labels",
        description: "List all labels in the mailbox",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "gmail_search",
        description: "Search messages with Gmail search syntax",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query (e.g., 'from:user@example.com is:unread')" },
            maxResults: { type: "number", description: "Max results (default 10)" },
          },
          required: ["query"],
        },
      },
      {
        name: "gmail_send_message",
        description: "Send an email message",
        inputSchema: {
          type: "object",
          properties: {
            to: { type: "string", description: "Recipient email address" },
            subject: { type: "string", description: "Email subject" },
            body: { type: "string", description: "Email body (plain text)" },
            threadId: { type: "string", description: "Thread ID to reply to (optional)" },
          },
          required: ["to", "subject", "body"],
        },
      },
    ];
  }

  private decodeBody(payload: Record<string, unknown>): string {
    const body = payload.body as { data?: string } | undefined;
    if (body?.data) {
      return Buffer.from(body.data, "base64url").toString("utf-8");
    }

    const parts = payload.parts as Array<Record<string, unknown>> | undefined;
    if (parts) {
      for (const part of parts) {
        const mimeType = part.mimeType as string;
        if (mimeType === "text/plain" || mimeType === "text/html") {
          const partBody = part.body as { data?: string } | undefined;
          if (partBody?.data) {
            return Buffer.from(partBody.data, "base64url").toString("utf-8");
          }
        }
        // Check nested parts
        if (part.parts) {
          const nested = this.decodeBody(part as Record<string, unknown>);
          if (nested) return nested;
        }
      }
    }
    return "";
  }

  private extractHeaders(headers: Array<{ name: string; value: string }>) {
    const result: Record<string, string> = {};
    const wanted = ["From", "To", "Subject", "Date", "Cc", "Bcc"];
    for (const h of headers) {
      if (wanted.includes(h.name)) {
        result[h.name.toLowerCase()] = h.value;
      }
    }
    return result;
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    gmail_list_messages: async (args, auth) => {
      const params = new URLSearchParams();
      if (args.q) params.append("q", args.q as string);
      if (args.labelIds) (args.labelIds as string[]).forEach(l => params.append("labelIds", l));
      params.append("maxResults", String((args.maxResults as number) ?? 20));

      const data = await this.fetchGmail(auth, `/users/me/messages?${params}`);

      // Fetch basic info for each message
      const messages = await Promise.all(
        (data.messages ?? []).slice(0, 10).map(async (m: { id: string }) => {
          try {
            const msg = await this.fetchGmail(auth, `/users/me/messages/${m.id}?format=metadata`);
            const headers = this.extractHeaders(msg.payload?.headers ?? []);
            return {
              id: msg.id, threadId: msg.threadId,
              snippet: msg.snippet, ...headers,
            };
          } catch {
            return { id: m.id, error: "Failed to fetch" };
          }
        })
      );

      return this.textResult({
        resultSizeEstimate: data.resultSizeEstimate,
        messages,
      });
    },

    gmail_get_message: async (args, auth) => {
      const messageId = args.messageId as string;
      const format = (args.format as string) ?? "full";
      const data = await this.fetchGmail(auth, `/users/me/messages/${messageId}?format=${format}`);

      const headers = this.extractHeaders(data.payload?.headers ?? []);
      const body = format === "full" ? this.decodeBody(data.payload ?? {}) : undefined;

      return this.textResult({
        id: data.id, threadId: data.threadId,
        labelIds: data.labelIds, snippet: data.snippet,
        ...headers, body: body?.slice(0, 5000), // Limit body size
      });
    },

    gmail_get_thread: async (args, auth) => {
      const threadId = args.threadId as string;
      const data = await this.fetchGmail(auth, `/users/me/threads/${threadId}`);

      const messages = (data.messages ?? []).map((msg: Record<string, unknown>) => {
        const headers = this.extractHeaders((msg.payload as Record<string, unknown>)?.headers as Array<{ name: string; value: string }> ?? []);
        return {
          id: msg.id, snippet: msg.snippet, ...headers,
        };
      });

      return this.textResult({
        id: data.id, historyId: data.historyId,
        messages,
      });
    },

    gmail_list_labels: async (_, auth) => {
      const data = await this.fetchGmail(auth, "/users/me/labels");
      return this.textResult(data.labels?.map((l: Record<string, unknown>) => ({
        id: l.id, name: l.name, type: l.type,
        messagesTotal: l.messagesTotal, messagesUnread: l.messagesUnread,
      })) ?? []);
    },

    gmail_search: async (args, auth) => {
      const query = args.query as string;
      const maxResults = (args.maxResults as number) ?? 10;
      const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });

      const data = await this.fetchGmail(auth, `/users/me/messages?${params}`);

      const messages = await Promise.all(
        (data.messages ?? []).slice(0, maxResults).map(async (m: { id: string }) => {
          try {
            const msg = await this.fetchGmail(auth, `/users/me/messages/${m.id}?format=metadata`);
            const headers = this.extractHeaders(msg.payload?.headers ?? []);
            return { id: msg.id, threadId: msg.threadId, snippet: msg.snippet, ...headers };
          } catch {
            return { id: m.id };
          }
        })
      );

      return this.textResult({ query, count: messages.length, messages });
    },

    gmail_send_message: async (args, auth) => {
      const { to, subject, body, threadId } = args as {
        to: string; subject: string; body: string; threadId?: string;
      };

      // Build RFC 2822 message
      const messageParts = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        body,
      ];
      const rawMessage = Buffer.from(messageParts.join("\r\n")).toString("base64url");

      const payload: Record<string, unknown> = { raw: rawMessage };
      if (threadId) payload.threadId = threadId;

      const data = await this.fetchGmail(auth, "/users/me/messages/send", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return this.textResult({
        id: data.id, threadId: data.threadId,
        labelIds: data.labelIds,
      });
    },
  };

  async gatherContext(auth: MCPAuth): Promise<MCPContextFragment> {
    try {
      const [profile, unread] = await Promise.all([
        this.fetchGmail(auth, "/users/me/profile"),
        this.fetchGmail(auth, "/users/me/messages?q=is:unread&maxResults=1"),
      ]);
      return {
        serverId: this.id,
        serverName: this.name,
        summary: `Gmail connected — ${profile.emailAddress}, ~${unread.resultSizeEstimate ?? 0} unread`,
        data: { email: profile.emailAddress, unreadEstimate: unread.resultSizeEstimate },
        relevance: 0.5,
      };
    } catch {
      return {
        serverId: this.id, serverName: this.name,
        summary: "Gmail connected", data: {}, relevance: 0.3,
      };
    }
  }
}
