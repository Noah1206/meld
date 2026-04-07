import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createProvider } from "@/lib/ai/provider";
import { selectModel } from "@/lib/ai/meld-router";
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

interface ChatRequest {
  message: string;
  modelId?: string;
  context?: {
    filePath?: string;
    currentCode?: string;
    elementHistory?: ElementInfo[];
    designSystemMd?: string;
  };
}

// --- Daily limits per plan ---

const DAILY_LIMITS: Record<string, number> = {
  free: 50,
  pro: 500,
  unlimited: Infinity,
};

// --- System prompt ---

function buildChatSystemPrompt(context?: ChatRequest["context"]): string {
  let prompt = `You are Meld AI, a helpful assistant for web developers.
You help with code questions, design decisions, debugging, and general development topics.
Always respond in Korean unless the user writes in English.
Be concise and practical. Provide code examples when helpful.`;

  if (context?.filePath && context?.currentCode) {
    prompt += `\n\nThe user is currently working on this file:
File: ${context.filePath}
\`\`\`
${context.currentCode}
\`\`\``;
  }

  if (context?.elementHistory?.length) {
    prompt += `\n\nThe user selected these elements in the preview:`;
    for (const el of context.elementHistory) {
      prompt += `\n- <${el.tagName}> class="${el.className}"`;
      if (el.componentName) prompt += ` (component: ${el.componentName})`;
    }
  }

  if (context?.designSystemMd) {
    prompt += `\n\n--- DESIGN SYSTEM ---\n${context.designSystemMd}\n--- END ---`;
  }

  return prompt;
}

// --- POST /api/ai/chat ---

export async function POST(req: Request) {
  // 1. Authentication
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  // 2. Parse request
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request format." },
      { status: 400 }
    );
  }

  const { message, modelId, context } = body;

  if (!message) {
    return NextResponse.json(
      { error: "message is required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // 3. Fetch user + verify plan
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, plan")
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
        error: `Daily usage limit (${limit} requests) exceeded.`,
        code: "DAILY_LIMIT_EXCEEDED",
        usage: { count: dailyCount, limit },
      },
      { status: 429 }
    );
  }

  // 5. Select model
  const selectedModel = selectModel({
    command: message,
    hasCode: !!context?.currentCode,
    preferredModel: modelId,
  });

  // 6. Call AI
  const systemPrompt = buildChatSystemPrompt(context);
  let response: string;

  try {
    const provider = createProvider(selectedModel.provider);
    response = await provider.call(systemPrompt, message);
  } catch (err) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "AI service encountered an error.";
    return NextResponse.json({ error: errorMsg }, { status: 502 });
  }

  // 7. Usage logging
  const estimatedInputTokens = Math.ceil(
    (systemPrompt.length + message.length) / 4
  );
  const estimatedOutputTokens = Math.ceil(response.length / 4);

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
    endpoint: "chat",
  });

  // 8. Training data (fire-and-forget)
  collectTrainingData({
    userId: user.id,
    instruction: message,
    inputContext: context
      ? `file: ${context.filePath ?? "none"}\n${context.currentCode ?? ""}`
      : "",
    output: response,
    modelUsed: selectedModel.id,
    elementHistory: context?.elementHistory,
    designSystemMd: context?.designSystemMd,
    filePath: context?.filePath,
  });

  // 9. Response
  return NextResponse.json({
    type: "chat",
    text: response,
    model: selectedModel.id,
  });
}

function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-sonnet-4": { input: 3, output: 15 },
    "gpt-4o": { input: 2.5, output: 10 },
    "gemini-2.5-flash": { input: 0.15, output: 0.6 },
    "qwen3-coder": { input: 0.5, output: 1.5 },
  };

  const price = pricing[modelId] ?? pricing["claude-sonnet-4"];
  return (
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output
  );
}
