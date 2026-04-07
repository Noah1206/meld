import type { LLMProvider } from "./provider";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIResponse {
  choices: Array<{
    message: { role: string; content: string };
  }>;
}

export class ChatGPTProvider implements LLMProvider {
  async call(systemPrompt: string, userMessage: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ChatGPT API error: ${res.status} - ${err}`);
    }

    const data: OpenAIResponse = await res.json();
    return data.choices[0]?.message?.content ?? "";
  }
}
