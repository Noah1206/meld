import { getSession } from "@/lib/auth/session";

// GET /api/ai/api-key — Provide server API key to authenticated users (for Desktop Agent Loop)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  return Response.json({ key });
}
