import type { LLMProvider } from "./provider";

// Call Qwen3-Coder via Together AI
// Custom fine-tuned models can also use the same endpoint
const TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions";

// Replace this URL with Modal/Together fine-tuned model when self-hosting
const CUSTOM_MODEL_URL = process.env.MELD_CUSTOM_MODEL_URL;

interface OpenAICompatibleResponse {
  choices: Array<{
    message: { role: string; content: string };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class QwenProvider implements LLMProvider {
  async call(systemPrompt: string, userMessage: string): Promise<string> {
    // Prefer custom model URL if available (fine-tuned Meld-Coder)
    const apiUrl = CUSTOM_MODEL_URL || TOGETHER_API_URL;
    const apiKey = process.env.TOGETHER_API_KEY || process.env.MELD_MODEL_API_KEY;

    if (!apiKey) {
      throw new Error("TOGETHER_API_KEY or MELD_MODEL_API_KEY is not configured");
    }

    const modelId = process.env.MELD_CUSTOM_MODEL_ID || "Qwen/Qwen3-Coder-Next";

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 4096,
        temperature: 0.2, // Low temperature for code edits
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Qwen API error: ${res.status} - ${err}`);
    }

    const data: OpenAICompatibleResponse = await res.json();
    return data.choices[0]?.message?.content ?? "";
  }
}
