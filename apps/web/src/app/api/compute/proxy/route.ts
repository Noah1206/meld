import { NextRequest, NextResponse } from "next/server";

// ─── EC2 Preview Proxy ──────────────────────────
// Proxies requests from user's browser to the EC2 dev server
// URL: /api/compute/proxy?session=abc123&path=/

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session");
  const proxyPath = req.nextUrl.searchParams.get("path") || "/";

  if (!sessionId) {
    return NextResponse.json({ error: "session required" }, { status: 400 });
  }

  try {
    // In production: look up EC2 IP from Supabase by sessionId
    // const instance = await supabase.from('compute_instances').select('public_ip').eq('session_id', sessionId).single();
    // const targetUrl = `http://${instance.public_ip}:3000${proxyPath}`;

    // For MVP: return placeholder
    const targetUrl = `http://localhost:3000${proxyPath}`;

    const response = await fetch(targetUrl, {
      headers: {
        "Accept": req.headers.get("accept") || "*/*",
        "User-Agent": "Meld-Proxy/1.0",
      },
      signal: AbortSignal.timeout(30000),
    });

    // Forward response with appropriate headers
    const body = await response.arrayBuffer();
    const headers = new Headers();

    // Copy content-type and other important headers
    const contentType = response.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);

    // Allow iframe embedding
    headers.set("X-Frame-Options", "ALLOWALL");
    headers.delete("x-frame-options");

    return new NextResponse(body, {
      status: response.status,
      headers,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach dev server on compute instance" },
      { status: 502 },
    );
  }
}
