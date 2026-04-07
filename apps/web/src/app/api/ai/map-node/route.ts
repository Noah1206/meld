import { NextResponse } from "next/server";
import { buildMappingPrompt } from "@/lib/mapping/engine";

interface MapNodeRequest {
  figmaNodeName: string;
  figmaNodeType: string;
  filePaths: string[];
}

/**
 * POST /api/ai/map-node
 *
 * AI infers the most relevant code file based on Figma node name and type.
 * Used as fallback when matchByNaming fails.
 */
export async function POST(request: Request) {
  try {
    const body: MapNodeRequest = await request.json();
    const { figmaNodeName, figmaNodeType, filePaths } = body;

    if (!figmaNodeName || !filePaths?.length) {
      return NextResponse.json(
        { error: "figmaNodeName and filePaths are required" },
        { status: 400 }
      );
    }

    // Truncate file paths to save tokens
    const limitedPaths = filePaths.slice(0, 200);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const prompt = buildMappingPrompt(figmaNodeName, figmaNodeType, limitedPaths);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20250514",
        max_tokens: 256,
        system: `You are a code mapping assistant. Given a Figma design node name and a list of project file paths, determine which file most likely implements that UI element. Return ONLY valid JSON with no extra text: {"filePath": "path/to/file", "confidence": 0.0-1.0}. If no file matches, return {"filePath": "", "confidence": 0.0}.`,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[map-node] Claude API error:", res.status, errText);
      return NextResponse.json(
        { error: `AI inference failed: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text = data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";

    // Parse JSON (extract JSON from Claude response)
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return NextResponse.json({ filePath: "", confidence: 0 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const filePath = typeof parsed.filePath === "string" ? parsed.filePath : "";
    const confidence = typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0;

    // Verify returned filePath exists in the actual list
    if (filePath && !limitedPaths.includes(filePath)) {
      // AI may return a slightly different path, so try partial matching
      const matched = limitedPaths.find(
        (p) => p.endsWith(filePath) || filePath.endsWith(p) || p.includes(filePath.split("/").pop() ?? "")
      );
      return NextResponse.json({
        filePath: matched ?? "",
        confidence: matched ? confidence * 0.9 : 0,
      });
    }

    return NextResponse.json({ filePath, confidence });
  } catch (err) {
    console.error("[map-node] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
