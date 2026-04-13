import { NextRequest, NextResponse } from "next/server";

// /api/search — 웹 검색 API
// Firecrawl search 또는 Serper API 사용

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";

interface SearchRequest {
  query: string;
  maxResults?: number;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function handler(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: SearchRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query, maxResults = 5 } = body;
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  // Serper API (Google Search) — 더 정확한 결과
  if (SERPER_API_KEY) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": SERPER_API_KEY,
        },
        body: JSON.stringify({
          q: query,
          num: maxResults,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const results: SearchResult[] = (data.organic ?? []).slice(0, maxResults).map(
          (item: { title: string; link: string; snippet: string }) => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet,
          })
        );
        return NextResponse.json({ query, results });
      }
    } catch (err) {
      console.error("Serper error:", err);
      // fallthrough to Firecrawl
    }
  }

  // Firecrawl search
  if (FIRECRAWL_API_KEY) {
    try {
      const res = await fetch(`${FIRECRAWL_BASE}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          limit: maxResults,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const results: SearchResult[] = (data.data ?? []).map(
          (item: { title?: string; url: string; description?: string; markdown?: string }) => ({
            title: item.title ?? "",
            url: item.url,
            snippet: item.description ?? item.markdown?.slice(0, 200) ?? "",
          })
        );
        return NextResponse.json({ query, results });
      }
    } catch (err) {
      console.error("Firecrawl search error:", err);
    }
  }

  // 둘 다 없으면 에러
  return NextResponse.json(
    { error: "Search is not configured. Set SERPER_API_KEY or FIRECRAWL_API_KEY." },
    { status: 503 },
  );
}

export { handler as POST };
