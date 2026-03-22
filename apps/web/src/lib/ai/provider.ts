import { ClaudeProvider } from "./claude";
import { ChatGPTProvider } from "./chatgpt";
import { GeminiProvider } from "./gemini";

export type LLMProviderType = "claude" | "chatgpt" | "gemini";

export interface LLMProvider {
  call(systemPrompt: string, userMessage: string): Promise<string>;
}

export function createProvider(type: LLMProviderType): LLMProvider {
  switch (type) {
    case "claude":
      return new ClaudeProvider();
    case "chatgpt":
      return new ChatGPTProvider();
    case "gemini":
      return new GeminiProvider();
    default:
      throw new Error(`지원하지 않는 LLM provider: ${type}`);
  }
}
