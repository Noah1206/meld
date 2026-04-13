import type { LLMProvider } from "./provider";
import type { ClaudeToolDef } from "@/lib/mcp/types";
import { executeTool, executeFidelityTool } from "@/lib/mcp";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface ContentBlock {
  type: "text" | "tool_use";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface AnthropicResponse {
  content: ContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens";
}

export class ClaudeProvider implements LLMProvider {
  async call(systemPrompt: string, userMessage: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API error: ${res.status} - ${err}`);
    }

    const data: AnthropicResponse = await res.json();
    return data.content.find((b) => b.type === "text")?.text ?? "";
  }

  // Claude API call with MCP tools (tool_use loop)
  async callWithTools(
    systemPrompt: string,
    userMessage: string,
    tools: ClaudeToolDef[],
    userId: string,
    maxToolRounds = 5,
  ): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const messages: Array<{ role: string; content: unknown }> = [
      { role: "user", content: userMessage },
    ];

    for (let round = 0; round < maxToolRounds; round++) {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          tools: tools.length > 0 ? tools : undefined,
          messages,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude API error: ${res.status} - ${err}`);
      }

      const data: AnthropicResponse = await res.json();

      if (data.stop_reason !== "tool_use") {
        return data.content.find((b) => b.type === "text")?.text ?? "";
      }

      const toolUseBlocks = data.content.filter((b) => b.type === "tool_use");
      if (toolUseBlocks.length === 0) {
        return data.content.find((b) => b.type === "text")?.text ?? "";
      }

      messages.push({ role: "assistant", content: data.content });

      // Execute each tool — fidelity tools use a separate executor
      const toolResults = [];
      for (const block of toolUseBlocks) {
        const result = block.name?.startsWith("fidelity_")
          ? await executeFidelityTool(userId, block.name!, block.input ?? {})
          : await executeTool(userId, block.name!, block.input ?? {});

        toolResults.push({
          type: "tool_result" as const,
          tool_use_id: block.id!,
          content: result.isError
            ? `Error: ${result.content[0]?.text ?? "Unknown error"}`
            : result.content[0]?.text ?? "",
        });
      }

      messages.push({ role: "user", content: toolResults });
    }

    return "Tool call round limit reached.";
  }
}
