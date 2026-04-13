import { NextRequest, NextResponse } from "next/server";

// /api/browse — URL → 스크린샷 + Vision AI 분석 + 마크다운 추출
// Firecrawl로 스크린샷 캡처 → Claude Vision으로 UI/디자인 분석
// 유저 설정 없이 바로 동작 (API 키는 서버에만)

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";

interface BrowseRequest {
  url: string;
  /** 분석 관점 (e.g. "landing page design", "navigation pattern") */
  analyzeAs?: string;
}

// Claude Vision으로 스크린샷 분석
async function analyzeScreenshot(
  screenshotUrl: string,
  pageTitle: string,
  analyzeAs?: string,
): Promise<string> {
  if (!ANTHROPIC_API_KEY) return "";

  const focus = analyzeAs
    ? `The user wants to study this page for: "${analyzeAs}".`
    : "The user wants to use this page as design reference.";

  try {
    // 스크린샷 이미지를 base64로 가져오기
    const imgRes = await fetch(screenshotUrl, { signal: AbortSignal.timeout(10000) });
    if (!imgRes.ok) return "";
    const imgBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString("base64");
    const mediaType = imgRes.headers.get("content-type") || "image/png";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: `Analyze this screenshot of "${pageTitle}". ${focus}

Provide a concise analysis covering:
1. **Layout**: Overall structure, grid system, spacing patterns
2. **Colors**: Primary, secondary, accent colors (approximate hex values)
3. **Typography**: Font sizes, weights, hierarchy
4. **Components**: Key UI components visible (buttons, cards, nav, hero, etc.)
5. **Design patterns**: Visual effects (gradients, shadows, glassmorphism, animations)
6. **Spacing**: Padding, margins, gaps between elements

Format as markdown. Be specific with CSS-relevant details (px values, colors, border-radius).
Keep it under 500 words — focus on what's needed to recreate this design in code.`,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return "";

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    return text;
  } catch (err) {
    console.error("Vision analysis error:", err);
    return "";
  }
}

async function handler(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: BrowseRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, analyzeAs } = body;
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Firecrawl로 스크랩 (스크린샷 항상 포함)
  if (FIRECRAWL_API_KEY) {
    try {
      const scrapeRes = await fetch(`${FIRECRAWL_BASE}/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify({
          url,
          formats: ["markdown", "screenshot"],
          onlyMainContent: true,
          timeout: 15000,
        }),
      });

      if (scrapeRes.ok) {
        const data = await scrapeRes.json();
        const result = data.data;
        const title = result?.metadata?.title ?? "";
        const screenshotUrl = result?.screenshot ?? null;

        // Vision AI 분석 (스크린샷이 있으면)
        let visionAnalysis = "";
        if (screenshotUrl && ANTHROPIC_API_KEY) {
          visionAnalysis = await analyzeScreenshot(screenshotUrl, title, analyzeAs);
        }

        return NextResponse.json({
          url,
          title,
          description: result?.metadata?.description ?? "",
          markdown: result?.markdown ?? "",
          screenshot: screenshotUrl,
          visionAnalysis,
          statusCode: result?.metadata?.statusCode ?? 200,
        });
      }
    } catch (err) {
      console.error("Firecrawl error:", err);
      // fallthrough to basic fetch
    }
  }

  // Fallback: 기본 fetch (스크린샷/Vision 없음)
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MeldBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    const html = await res.text();
    const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] ?? "";
    const description = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "";

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 10000);

    return NextResponse.json({
      url,
      title,
      description,
      markdown: text,
      screenshot: null,
      visionAnalysis: "",
      statusCode: res.status,
    });
  } catch (err) {
    return NextResponse.json({
      error: `Failed to fetch URL: ${err instanceof Error ? err.message : "Unknown error"}`,
    }, { status: 502 });
  }
}

export { handler as POST };
