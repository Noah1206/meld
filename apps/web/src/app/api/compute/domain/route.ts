import { NextRequest, NextResponse } from "next/server";

// ─── Custom Domain Management ──────────
// Connect custom domains to deployed projects

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, domain, projectId } = body;

  switch (action) {
    case "check": {
      // Check if domain DNS is properly configured
      try {
        const res = await fetch(`https://dns.google/resolve?name=${domain}&type=CNAME`, {
          signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        const hasCname = data.Answer?.some((a: { type: number; data: string }) =>
          a.type === 5 && a.data.includes("vercel")
        );
        return NextResponse.json({
          domain,
          configured: hasCname,
          message: hasCname
            ? "DNS is properly configured"
            : "Add a CNAME record pointing to cname.vercel-dns.com",
        });
      } catch {
        return NextResponse.json({ domain, configured: false, message: "Could not verify DNS" });
      }
    }

    case "connect": {
      // Connect domain via Vercel MCP
      // In production: call Vercel API to add domain
      return NextResponse.json({
        success: true,
        domain,
        message: `Domain ${domain} connected. It may take a few minutes to provision SSL.`,
      });
    }

    case "disconnect": {
      return NextResponse.json({ success: true, domain, message: `Domain ${domain} disconnected.` });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
