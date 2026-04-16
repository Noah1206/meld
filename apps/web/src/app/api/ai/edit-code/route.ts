import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createProvider } from "@/lib/ai/provider";
import { selectModel, detectComplexity } from "@/lib/ai/meld-router";
import { collectTrainingData } from "@/lib/ai/training-collector";

// --- Types ---

interface ElementInfo {
  tagName: string;
  className: string;
  componentName?: string;
  selector: string;
  computedStyle?: Record<string, string>;
  rect?: { x: number; y: number; width: number; height: number };
}

interface EditCodeRequest {
  filePath: string;
  command: string;
  currentCode: string;
  modelId?: string;
  framework?: string;
  dependencies?: string[];
  designSystemMd?: string;
  elementHistory?: ElementInfo[];
}

interface CodeEditResult {
  filePath: string;
  original: string;
  modified: string;
  explanation: string;
}

// --- Daily limits per plan ---

const DAILY_LIMITS: Record<string, number> = {
  free: 50,
  pro: 500,
  unlimited: Infinity,
};

// --- Prompt builder ---

function buildMeldSystemPrompt(params: {
  filePath: string;
  framework?: string;
  dependencies?: string[];
  designSystemMd?: string;
  elementHistory?: ElementInfo[];
}): string {
  const { filePath, framework, dependencies, designSystemMd, elementHistory } =
    params;

  let prompt = `You are Meld AI, an expert code editor that modifies existing code based on user instructions.
You understand modern web frameworks and write clean, production-ready code.

RULES:
1. Only modify the parts of code the user asks about. Do NOT rewrite the entire file.
2. Preserve existing code style, indentation, and conventions.
3. If the user's instruction is about code editing, respond with ONLY this JSON format:
{
  "filePath": "${filePath}",
  "original": "the exact original code snippet that will be replaced",
  "modified": "the new code that replaces it",
  "explanation": "Brief explanation of what changed (Korean)"
}
4. If the user's instruction is a general question (not a code edit), respond with plain text in Korean.
5. The "original" field must contain the EXACT text from the current code that will be replaced.
6. The "modified" field should be a drop-in replacement for the "original" text.`;

  // Framework guidelines
  if (framework && framework !== "unknown") {
    prompt += `\n\nThis project uses ${framework}.`;
    prompt += getFrameworkHints(framework);
  }

  // Dependencies
  if (dependencies?.length) {
    prompt += `\nAvailable libraries: ${dependencies.join(", ")}`;
  }

  // Design system
  if (designSystemMd) {
    prompt += `\n\n--- DESIGN SYSTEM ---
Follow this design system strictly. Use these exact values for colors, fonts, spacing, etc.

${designSystemMd}
--- END DESIGN SYSTEM ---`;
  }

  // Element history (elements clicked in the inspector)
  if (elementHistory?.length) {
    prompt += `\n\n--- SELECTED ELEMENTS ---
The user selected these elements in the preview inspector. Use this context to understand WHICH part of the code they want to modify:
`;
    for (let i = 0; i < elementHistory.length; i++) {
      const el = elementHistory[i];
      prompt += `\n[Element ${i + 1}]`;
      prompt += `\n  Tag: <${el.tagName}>`;
      if (el.componentName) prompt += `\n  Component: ${el.componentName}`;
      prompt += `\n  CSS Classes: ${el.className || "(none)"}`;
      prompt += `\n  Selector: ${el.selector}`;
      if (el.rect) {
        prompt += `\n  Position: ${el.rect.x},${el.rect.y} Size: ${el.rect.width}x${el.rect.height}`;
      }
      if (el.computedStyle && Object.keys(el.computedStyle).length > 0) {
        const styleStr = Object.entries(el.computedStyle)
          .slice(0, 10) // Max 10 properties
          .map(([k, v]) => `${k}: ${v}`)
          .join("; ");
        prompt += `\n  Computed Style: ${styleStr}`;
      }
    }
    prompt += `\n--- END SELECTED ELEMENTS ---`;
  }

  return prompt;
}

function buildUserMessage(params: {
  filePath: string;
  command: string;
  currentCode: string;
}): string {
  return `File: ${params.filePath}

Current code:
\`\`\`
${params.currentCode}
\`\`\`

Instruction: ${params.command}`;
}

function getFrameworkHints(framework: string): string {
  switch (framework) {
    case "Next.js":
      return `
- Use App Router conventions. Server Components by default, add "use client" only when needed.
- Use next/image for images, next/link for navigation.`;
    case "React":
      return `
- Use functional components with hooks.
- Follow single responsibility principle for components.`;
    case "Vue":
      return `
- Use Composition API with <script setup>.
- Use ref()/reactive() for reactive state.`;
    case "Svelte":
      return `
- Use $: for reactive declarations.
- Use export let for component props.`;
    default:
      return "";
  }
}

// --- AI response parsing ---

function parseAiResponse(raw: string): CodeEditResult | { text: string } {
  // Attempt JSON parse
  const trimmed = raw.trim();

  // Handle JSON inside code blocks
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : trimmed;

  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.filePath && parsed.original !== undefined && parsed.modified !== undefined) {
      return {
        filePath: parsed.filePath,
        original: parsed.original,
        modified: parsed.modified,
        explanation: parsed.explanation ?? "",
      };
    }
  } catch {
    // JSON parse failed — plain text response
  }

  return { text: raw };
}

// --- Error formatting ---

function formatAiError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes("API error: 429")) {
      return "AI service is temporarily overloaded. Please try again shortly.";
    }
    if (err.message.includes("API error: 5")) {
      return "AI service encountered a temporary issue. Please try again shortly.";
    }
    if (err.message.includes("is not configured")) {
      return "AI service configuration error. Please contact the administrator.";
    }
    return err.message;
  }
  return "An unknown error occurred.";
}

// --- POST /api/ai/edit-code ---

export async function POST(req: Request) {
  // 1. Verify authentication
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  // 2. Parse request
  let body: EditCodeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request format." },
      { status: 400 }
    );
  }

  const { filePath, command, currentCode, modelId, framework, dependencies, designSystemMd, elementHistory } = body;

  if (!filePath || !command || !currentCode) {
    return NextResponse.json(
      { error: "filePath, command, and currentCode are required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // 3. Fetch user + verify plan
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, plan, credits")
    .eq("id", session.userId)
    .single();

  if (!user || userError) {
    return NextResponse.json(
      { error: "User not found." },
      { status: 404 }
    );
  }

  // 4. Check daily usage
  const today = new Date().toISOString().split("T")[0];
  const { data: usageData } = await supabase.rpc("get_daily_usage", {
    p_user_id: user.id,
    p_date: today,
  });

  const dailyCount = usageData?.[0]?.request_count ?? 0;
  const limit = DAILY_LIMITS[user.plan] ?? DAILY_LIMITS.free;

  if (dailyCount >= limit) {
    return NextResponse.json(
      {
        error: `Daily usage limit (${limit} requests) exceeded. Consider upgrading your plan.`,
        code: "DAILY_LIMIT_EXCEEDED",
        usage: { count: dailyCount, limit },
      },
      { status: 429 }
    );
  }

  // 5. Select model
  const complexity = detectComplexity(command);
  const selectedModel = selectModel({
    command,
    hasCode: !!currentCode,
    complexity,
    preferredModel: modelId,
  });

  // 6. Build prompt
  const systemPrompt = buildMeldSystemPrompt({
    filePath,
    framework,
    dependencies,
    designSystemMd,
    elementHistory,
  });

  const userMessage = buildUserMessage({ filePath, command, currentCode });

  // 7. Call AI
  let rawResponse: string;
  try {
    const provider = createProvider(selectedModel.provider);
    rawResponse = await provider.call(systemPrompt, userMessage);
  } catch (err) {
    return NextResponse.json(
      { error: formatAiError(err) },
      { status: 502 }
    );
  }

  // 8. Parse response
  const parsed = parseAiResponse(rawResponse);

  // 9. Usage logging (sync — important for cost tracking)
  const estimatedInputTokens = Math.ceil(
    (systemPrompt.length + userMessage.length) / 4
  );
  const estimatedOutputTokens = Math.ceil(rawResponse.length / 4);

  await supabase.from("ai_usage").insert({
    user_id: user.id,
    model: selectedModel.id,
    provider: selectedModel.provider,
    input_tokens: estimatedInputTokens,
    output_tokens: estimatedOutputTokens,
    cost_usd: estimateCost(
      selectedModel.id,
      estimatedInputTokens,
      estimatedOutputTokens
    ),
    endpoint: "edit-code",
  });

  // 10. Collect training data (fire-and-forget)
  collectTrainingData({
    userId: user.id,
    instruction: command,
    inputContext: `file: ${filePath}\n\n${currentCode}`,
    output: rawResponse,
    modelUsed: selectedModel.id,
    elementHistory,
    designSystemMd,
    framework,
    filePath,
  });

  // 11. Return response
  if ("text" in parsed) {
    return NextResponse.json({
      type: "chat",
      text: parsed.text,
      model: selectedModel.id,
    });
  }

  return NextResponse.json({
    type: "code-edit",
    ...parsed,
    model: selectedModel.id,
  });
}

// --- Cost estimation (approximate) ---

function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  // USD per 1M tokens (approximate)
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-sonnet-4-6": { input: 3, output: 15 },
    "gpt-4o": { input: 2.5, output: 10 },
    "gemini-2.5-flash": { input: 0.15, output: 0.6 },
    "qwen3-coder": { input: 0.5, output: 1.5 }, // Estimated price
  };

  const price = pricing[modelId] ?? pricing["claude-sonnet-4-6"];
  return (
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output
  );
}
