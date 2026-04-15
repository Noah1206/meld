// Claude model provider
//
// Thin wrapper over the Anthropic Messages API with prompt caching + retries.
// Replicates the behavior in apps/web/src/app/api/ai/agent-run/route.ts's
// callClaude() so the harness can run without touching the original route.

import type {
  ModelProvider,
  ModelCompleteRequest,
  ModelCompleteResponse,
  ContentBlock,
} from "../types";

export interface ClaudeModelConfig {
  apiKey: string;
  model: string;
  maxRetries?: number;
}

export class ClaudeModelProvider implements ModelProvider {
  readonly id: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxRetries: number;

  constructor(config: ClaudeModelConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.maxRetries = config.maxRetries ?? 3;
    this.id = `claude:${config.model}`;
  }

  async complete(req: ModelCompleteRequest): Promise<ModelCompleteResponse> {
    const systemWithCache = [
      { type: "text", text: req.system, cache_control: { type: "ephemeral" } },
    ];

    const toolsWithCache = req.tools.map((tool, i) =>
      i === req.tools.length - 1
        ? { ...tool, cache_control: { type: "ephemeral" } }
        : tool
    );

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "prompt-caching-2024-07-31",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: req.maxTokens,
          temperature: req.temperature,
          system: systemWithCache,
          messages: req.messages,
          tools: toolsWithCache,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return this.parseResponse(data);
      }

      const raw = await res.text();

      if ((res.status === 529 || res.status === 429) && attempt < this.maxRetries - 1) {
        const wait = (attempt + 1) * 3000;
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      let msg = `Claude API error (${res.status})`;
      try {
        const parsed = JSON.parse(raw);
        msg = parsed?.error?.message ?? msg;
      } catch {
        // ignore parse failure
      }
      if (res.status === 529) msg = "Claude is currently overloaded. Please try again in a moment.";
      if (res.status === 429) msg = "Rate limit exceeded. Please wait a moment and try again.";
      throw new Error(msg);
    }

    throw new Error("Max retries exceeded");
  }

  private parseResponse(data: {
    content: ContentBlock[];
    stop_reason: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  }): ModelCompleteResponse {
    return {
      content: data.content,
      stopReason: this.mapStopReason(data.stop_reason),
      usage: data.usage
        ? {
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
            cacheReadTokens: data.usage.cache_read_input_tokens,
            cacheCreationTokens: data.usage.cache_creation_input_tokens,
          }
        : undefined,
    };
  }

  private mapStopReason(raw: string): ModelCompleteResponse["stopReason"] {
    switch (raw) {
      case "end_turn":
      case "tool_use":
      case "max_tokens":
      case "stop_sequence":
        return raw;
      default:
        return "end_turn";
    }
  }
}
