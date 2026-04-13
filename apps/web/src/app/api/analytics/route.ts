import { NextRequest, NextResponse } from "next/server";

// ─── Analytics & Lead Collection API ──────────
// Track project usage, page views, leads

// In-memory store (production: Supabase)
const analytics = new Map<string, {
  pageViews: number;
  visitors: Set<string>;
  leads: { email: string; name?: string; source: string; timestamp: number }[];
  events: { name: string; data: Record<string, unknown>; timestamp: number }[];
}>();

function getOrCreate(projectId: string) {
  if (!analytics.has(projectId)) {
    analytics.set(projectId, { pageViews: 0, visitors: new Set(), leads: [], events: [] });
  }
  return analytics.get(projectId)!;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, projectId } = body;

  switch (action) {
    case "pageview": {
      const data = getOrCreate(projectId);
      data.pageViews++;
      if (body.visitorId) data.visitors.add(body.visitorId);
      return NextResponse.json({ ok: true });
    }

    case "lead": {
      const data = getOrCreate(projectId);
      data.leads.push({
        email: body.email,
        name: body.name,
        source: body.source || "form",
        timestamp: Date.now(),
      });
      return NextResponse.json({ ok: true, leadCount: data.leads.length });
    }

    case "event": {
      const data = getOrCreate(projectId);
      data.events.push({
        name: body.eventName,
        data: body.eventData || {},
        timestamp: Date.now(),
      });
      return NextResponse.json({ ok: true });
    }

    case "get": {
      const data = getOrCreate(projectId);
      return NextResponse.json({
        pageViews: data.pageViews,
        uniqueVisitors: data.visitors.size,
        leads: data.leads,
        leadCount: data.leads.length,
        recentEvents: data.events.slice(-50),
      });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
