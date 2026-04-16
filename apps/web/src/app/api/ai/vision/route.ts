import { NextRequest, NextResponse } from "next/server";

// /api/ai/vision — Analyze a screenshot with Claude Vision
// Used by: check_preview, browser_screenshot (agent tools)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let body: { image: string; prompt: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { image, prompt } = body;
  if (!image || !prompt) {
    return NextResponse.json({ error: "image and prompt are required" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: image,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Claude Vision error: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const analysis = data.content?.[0]?.text ?? "";

    return NextResponse.json({ analysis });
  } catch (err) {
    return NextResponse.json(
      { error: `Vision analysis failed: ${err instanceof Error ? err.message : "Unknown"}` },
      { status: 500 },
    );
  }
}
