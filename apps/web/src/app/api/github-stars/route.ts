import { NextRequest, NextResponse } from "next/server";

// Cache stars for 1 hour
let cache: { data: Record<string, number>; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

// Extract owner/repo from GitHub URL
function parseGithubUrl(url: string): string | null {
  const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
  return match ? match[1] : null;
}

export async function POST(req: NextRequest) {
  try {
    const { repos } = (await req.json()) as { repos: string[] };
    if (!repos || !Array.isArray(repos)) {
      return NextResponse.json({ error: "repos array required" }, { status: 400 });
    }

    // Return cache if fresh
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data);
    }

    const results: Record<string, number> = {};
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Fetch in parallel, max 10 concurrent
    const chunks: string[][] = [];
    for (let i = 0; i < repos.length; i += 10) {
      chunks.push(repos.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (url) => {
        const repo = parseGithubUrl(url);
        if (!repo) return;
        try {
          const res = await fetch(`https://api.github.com/repos/${repo}`, {
            headers,
            next: { revalidate: 3600 },
          });
          if (res.ok) {
            const data = await res.json();
            results[url] = data.stargazers_count ?? 0;
          } else {
            results[url] = -1; // not found or rate limited
          }
        } catch {
          results[url] = -1;
        }
      });
      await Promise.all(promises);
    }

    cache = { data: results, ts: Date.now() };
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
