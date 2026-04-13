import { NextRequest, NextResponse } from "next/server";

// ─── WebSocket Tunnel ──────────
// Proxies WebSocket connections from browser to EC2 instance
// Browser → /api/compute/ws?session=abc → EC2:3100

// Note: Next.js App Router doesn't natively support WebSocket upgrade.
// In production, this would be handled by a separate WebSocket server
// (e.g., on Railway/Fly.io) or using Next.js middleware with edge runtime.

// For now, this endpoint returns connection info for the client to connect directly.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session");

  if (!sessionId) {
    return NextResponse.json({ error: "session required" }, { status: 400 });
  }

  // In production: look up EC2 instance by sessionId from Supabase
  // Return the direct WebSocket URL for the client to connect
  // const instance = await supabase.from('compute_instances').select('public_ip').eq('session_id', sessionId).single();
  // const wsUrl = `ws://${instance.public_ip}:3100`;

  // For local dev: return localhost
  return NextResponse.json({
    wsUrl: "ws://localhost:3100",
    status: "ready",
    message: "Connect to this WebSocket URL for agent communication",
  });
}
