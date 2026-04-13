import { NextRequest, NextResponse } from "next/server";

// /api/ai/agent — Claude API 프록시
// 로컬 agent가 이 엔드포인트를 통해 Claude API 호출
// 유저는 API 키 불필요 — 서버 키 사용

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function handler(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Server API key not configured" }, { status: 503 });
  }

  let body: {
    model: string;
    max_tokens: number;
    system: unknown;
    messages: unknown;
    tools?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.model || !body.messages) {
    return NextResponse.json({ error: "model and messages are required" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Claude API error (${res.status}): ${errText}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: `Proxy error: ${err instanceof Error ? err.message : "Unknown"}` },
      { status: 502 },
    );
  }
}

export { handler as POST };
