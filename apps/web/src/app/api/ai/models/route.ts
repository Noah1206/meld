import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { AVAILABLE_MODELS } from "@/lib/ai/meld-router";

// GET /api/ai/models → List of available AI models
export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  // Determine actual availability by checking API key existence
  const envAvailability: Record<string, boolean> = {
    claude: !!process.env.ANTHROPIC_API_KEY,
    chatgpt: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GOOGLE_GEMINI_API_KEY,
    qwen: !!(process.env.TOGETHER_API_KEY || process.env.MELD_MODEL_API_KEY),
  };

  const models = AVAILABLE_MODELS.map((m) => ({
    id: m.id,
    label: m.label,
    sub: m.sub,
    provider: m.provider,
    available: m.available && (envAvailability[m.provider] ?? false),
  }));

  return NextResponse.json({ models });
}
