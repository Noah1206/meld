// ─── Slack MCP Adapter ─────────────────────────────
// Wraps Slack Web API as an MCP adapter for team communication.

import { BaseMCPAdapter } from "./base";
import type { MCPTool, MCPToolResult, MCPAuth, MCPContextFragment } from "../types";

const SLACK_API = "https://slack.com/api";

export class SlackMCPAdapter extends BaseMCPAdapter {
  readonly id = "slack";
  readonly name = "Slack";
  readonly description = "Channels, messages, notifications, thread context";
  readonly icon = "message-square";
  readonly category = "communication";

  private async slackApi(auth: MCPAuth, method: string, params?: Record<string, unknown>) {
    const url = new URL(`${SLACK_API}/${method}`);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: params ? JSON.stringify(params) : undefined,
    });

    const data = await res.json();
    if (!data.ok) throw new Error(data.error ?? "Slack API error");
    return data;
  }

  async validateConnection(auth: MCPAuth) {
    try {
      const data = await this.slackApi(auth, "auth.test");
      return { valid: true, meta: { team: data.team, user: data.user, userId: data.user_id } };
    } catch (e) {
      return { valid: false, error: e instanceof Error ? e.message : "Invalid Slack token" };
    }
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "slack_list_channels",
        description: "List channels the bot has access to",
        inputSchema: {
          type: "object",
          properties: {
            types: { type: "string", description: "Channel types: public_channel, private_channel (comma-separated)" },
            limit: { type: "number", description: "Max results (default 100)" },
          },
          required: [],
        },
      },
      {
        name: "slack_get_channel_history",
        description: "Get recent messages from a channel",
        inputSchema: {
          type: "object",
          properties: {
            channel: { type: "string", description: "Channel ID" },
            limit: { type: "number", description: "Number of messages (default 20)" },
          },
          required: ["channel"],
        },
      },
      {
        name: "slack_get_thread",
        description: "Get replies in a message thread",
        inputSchema: {
          type: "object",
          properties: {
            channel: { type: "string", description: "Channel ID" },
            ts: { type: "string", description: "Thread timestamp (message ts)" },
          },
          required: ["channel", "ts"],
        },
      },
      {
        name: "slack_search_messages",
        description: "Search messages across channels",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            count: { type: "number", description: "Max results (default 20)" },
          },
          required: ["query"],
        },
      },
      {
        name: "slack_get_user",
        description: "Get user profile info",
        inputSchema: {
          type: "object",
          properties: { userId: { type: "string", description: "User ID" } },
          required: ["userId"],
        },
      },
      {
        name: "slack_post_message",
        description: "Send a message to a channel",
        inputSchema: {
          type: "object",
          properties: {
            channel: { type: "string", description: "Channel ID" },
            text: { type: "string", description: "Message text" },
            threadTs: { type: "string", description: "Thread timestamp to reply to" },
          },
          required: ["channel", "text"],
        },
      },
    ];
  }

  protected toolHandlers: Record<string, (args: Record<string, unknown>, auth: MCPAuth) => Promise<MCPToolResult>> = {
    slack_list_channels: async (args, auth) => {
      const types = (args.types as string) ?? "public_channel,private_channel";
      const limit = (args.limit as number) ?? 100;
      const data = await this.slackApi(auth, "conversations.list", { types, limit, exclude_archived: true });

      return this.textResult(data.channels?.map((c: Record<string, unknown>) => ({
        id: c.id, name: c.name, topic: (c.topic as Record<string, string>)?.value,
        purpose: (c.purpose as Record<string, string>)?.value,
        isPrivate: c.is_private, memberCount: c.num_members,
      })) ?? []);
    },

    slack_get_channel_history: async (args, auth) => {
      const channel = args.channel as string;
      const limit = (args.limit as number) ?? 20;
      const data = await this.slackApi(auth, "conversations.history", { channel, limit });

      return this.textResult(data.messages?.map((m: Record<string, unknown>) => ({
        ts: m.ts, user: m.user, text: m.text, type: m.type,
        threadTs: m.thread_ts, replyCount: m.reply_count,
      })) ?? []);
    },

    slack_get_thread: async (args, auth) => {
      const { channel, ts } = args as { channel: string; ts: string };
      const data = await this.slackApi(auth, "conversations.replies", { channel, ts, limit: 50 });

      return this.textResult(data.messages?.map((m: Record<string, unknown>) => ({
        ts: m.ts, user: m.user, text: m.text,
      })) ?? []);
    },

    slack_search_messages: async (args, auth) => {
      const query = args.query as string;
      const count = (args.count as number) ?? 20;
      const data = await this.slackApi(auth, "search.messages", { query, count });

      return this.textResult(data.messages?.matches?.map((m: Record<string, unknown>) => ({
        ts: m.ts, text: m.text, user: m.user,
        channel: (m.channel as Record<string, string>)?.name,
        permalink: m.permalink,
      })) ?? []);
    },

    slack_get_user: async (args, auth) => {
      const userId = args.userId as string;
      const data = await this.slackApi(auth, "users.info", { user: userId });

      const user = data.user as Record<string, unknown>;
      const profile = user?.profile as Record<string, string>;
      return this.textResult({
        id: user?.id, name: user?.name, realName: user?.real_name,
        displayName: profile?.display_name, email: profile?.email,
        title: profile?.title, isBot: user?.is_bot,
      });
    },

    slack_post_message: async (args, auth) => {
      const { channel, text, threadTs } = args as { channel: string; text: string; threadTs?: string };
      const params: Record<string, unknown> = { channel, text };
      if (threadTs) params.thread_ts = threadTs;

      const data = await this.slackApi(auth, "chat.postMessage", params);
      return this.textResult({
        ok: data.ok, ts: data.ts, channel: data.channel,
      });
    },
  };

  async gatherContext(auth: MCPAuth): Promise<MCPContextFragment> {
    try {
      const data = await this.slackApi(auth, "auth.test");
      return {
        serverId: this.id,
        serverName: this.name,
        summary: `Slack connected — Team: ${data.team}, User: ${data.user}`,
        data: { team: data.team, user: data.user },
        relevance: 0.5,
      };
    } catch {
      return {
        serverId: this.id, serverName: this.name,
        summary: "Slack connected", data: {}, relevance: 0.3,
      };
    }
  }
}
