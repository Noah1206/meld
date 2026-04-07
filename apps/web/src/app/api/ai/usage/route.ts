import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// --- Daily limits per plan ---

const DAILY_LIMITS: Record<string, number> = {
  free: 50,
  pro: 500,
  unlimited: -1, // -1 = unlimited
};

// GET /api/ai/usage → Current user's AI usage statistics
export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  // Fetch user plan
  const { data: user } = await supabase
    .from("users")
    .select("id, plan, credits")
    .eq("id", session.userId)
    .single();

  if (!user) {
    return NextResponse.json(
      { error: "User not found." },
      { status: 404 }
    );
  }

  // Today's usage
  const today = new Date().toISOString().split("T")[0];
  const { data: dailyData } = await supabase.rpc("get_daily_usage", {
    p_user_id: user.id,
    p_date: today,
  });

  const daily = dailyData?.[0] ?? {
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cost_usd: 0,
    request_count: 0,
  };

  const limit = DAILY_LIMITS[user.plan] ?? DAILY_LIMITS.free;

  // Last 7 days usage (by date)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: weeklyData } = await supabase
    .from("daily_ai_usage")
    .select("*")
    .eq("user_id", user.id)
    .gte("usage_date", sevenDaysAgo.toISOString().split("T")[0])
    .order("usage_date", { ascending: true });

  return NextResponse.json({
    plan: user.plan,
    credits: user.credits,
    today: {
      requestCount: daily.request_count,
      inputTokens: daily.total_input_tokens,
      outputTokens: daily.total_output_tokens,
      costUsd: daily.total_cost_usd,
      limit: limit === -1 ? null : limit,
      remaining: limit === -1 ? null : Math.max(0, limit - daily.request_count),
    },
    weekly: (weeklyData ?? []).map((d) => ({
      date: d.usage_date,
      requestCount: d.request_count,
      inputTokens: d.total_input_tokens,
      outputTokens: d.total_output_tokens,
      costUsd: d.total_cost_usd,
    })),
  });
}
