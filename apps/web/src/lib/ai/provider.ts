import { ClaudeProvider } from "./claude";
import { ChatGPTProvider } from "./chatgpt";
import { GeminiProvider } from "./gemini";
import { QwenProvider } from "./qwen";
import type { ClaudeToolDef } from "@/lib/mcp/types";

export type LLMProviderType = "claude" | "chatgpt" | "gemini" | "qwen";

export interface LLMProvider {
  call(systemPrompt: string, userMessage: string): Promise<string>;
  callWithTools?(
    systemPrompt: string,
    userMessage: string,
    tools: ClaudeToolDef[],
    userId: string,
    maxToolRounds?: number,
  ): Promise<string>;
}

export function createProvider(type: LLMProviderType): LLMProvider {
  switch (type) {
    case "claude":
      return new ClaudeProvider();
    case "chatgpt":
      return new ChatGPTProvider();
    case "gemini":
      return new GeminiProvider();
    case "qwen":
      return new QwenProvider();
    default:
      throw new Error(`Unsupported LLM provider: ${type}`);
  }
}
