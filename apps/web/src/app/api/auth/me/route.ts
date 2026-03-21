import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/auth/me → 현재 로그인 사용자 정보
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ user: null }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, github_username, email, avatar_url, figma_access_token, plan")
    .eq("id", session.userId)
    .single();

  if (!user) {
    return Response.json({ user: null }, { status: 401 });
  }

  return Response.json({
    user: {
      id: user.id,
      githubUsername: user.github_username,
      email: user.email,
      avatarUrl: user.avatar_url,
      hasFigmaToken: !!user.figma_access_token,
      plan: user.plan,
    },
  });
}
