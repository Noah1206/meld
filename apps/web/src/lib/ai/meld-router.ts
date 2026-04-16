import type { LLMProviderType } from "./provider";

// --- Model Definitions ---

export interface ModelConfig {
  id: string;
  label: string;
  sub: string;
  provider: LLMProviderType;
  available: boolean;
  /** Internal model name for routing (used in API calls) */
  internalModel: string;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "claude-sonnet-4-6",
    label: "Claude",
    sub: "Sonnet 4.6",
    provider: "claude",
    available: true,
    internalModel: "claude-sonnet-4-6-20250514",
  },
  {
    id: "gpt-4o",
    label: "GPT",
    sub: "4o",
    provider: "chatgpt",
    available: true,
    internalModel: "gpt-4o",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini",
    sub: "2.5 Flash",
    provider: "gemini",
    available: true,
    internalModel: "gemini-2.5-flash",
  },
  {
    id: "qwen3-coder",
    label: "Meld",
    sub: "Coder v1",
    provider: "qwen",
    // Enabled if Together API key or custom model key is available
    available: !!(process.env.TOGETHER_API_KEY || process.env.MELD_MODEL_API_KEY),
    internalModel: "qwen3-coder",
  },
];

// --- Complexity Detection ---

export type Complexity = "simple" | "moderate" | "complex";

const SIMPLE_KEYWORDS = [
  "color", "colour", "text", "font",
  "size", "spacing", "padding", "margin",
  "border", "radius", "opacity", "shadow", "background", "bg",
  "hide", "show", "align",
];

const COMPLEX_KEYWORDS = [
  "refactor", "extract component",
  "new feature", "state management",
  "api integration", "authentication",
  "optimize", "performance", "routing",
  "database", "migration",
  "test", "animation", "transition",
];

export function detectComplexity(command: string): Complexity {
  const lower = command.toLowerCase();
  const wordCount = command.split(/\s+/).length;

  // Compound keyword matching
  const complexHits = COMPLEX_KEYWORDS.filter((k) => lower.includes(k)).length;
  const simpleHits = SIMPLE_KEYWORDS.filter((k) => lower.includes(k)).length;

  if (complexHits >= 2 || wordCount > 50) return "complex";
  if (complexHits >= 1) return "moderate";
  if (simpleHits >= 1 && wordCount < 20) return "simple";

  // Default: based on command length
  if (wordCount <= 10) return "simple";
  if (wordCount <= 30) return "moderate";
  return "complex";
}

// --- Model Routing ---

export interface ModelSelectionInput {
  command: string;
  hasCode: boolean;
  complexity?: Complexity;
  preferredModel?: string;
}

export function selectModel(input: ModelSelectionInput): ModelConfig {
  const { command, preferredModel } = input;
  const complexity = input.complexity ?? detectComplexity(command);

  // User explicitly selected a model
  if (preferredModel) {
    const found = AVAILABLE_MODELS.find(
      (m) => m.id === preferredModel && m.available
    );
    if (found) return found;
    // Selected model not found or unavailable — fall back to default
  }

  // Auto-routing: use Qwen3-Coder for simple tasks when available
  const qwen = AVAILABLE_MODELS.find(
    (m) => m.id === "qwen3-coder" && m.available
  );
  if (qwen && complexity === "simple") {
    return qwen;
  }

  // Default: Claude Sonnet
  const claude = AVAILABLE_MODELS.find((m) => m.id === "claude-sonnet-4-6")!;
  return claude;
}
