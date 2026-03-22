import type { LLMProvider } from "./provider";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface AnthropicResponse {
  content: Array<{ type: "text"; text: string }>;
}

export class ClaudeProvider implements LLMProvider {
  async call(systemPrompt: string, userMessage: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다");
    }

    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API 에러: ${res.status} - ${err}`);
    }

    const data: AnthropicResponse = await res.json();
    return data.content[0]?.text ?? "";
  }
}
