import { NextRequest } from "next/server";
import { getGitHubAuthUrl, exchangeGitHubCode, getGitHubUser } from "@/lib/auth/github";
import { setSessionCookie } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/auth/github → GitHub OAuth 시작 (리다이렉트)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // code가 없으면 GitHub 인증 페이지로 리다이렉트
  if (!code) {
    const oauthState = crypto.randomUUID();
    const url = getGitHubAuthUrl(oauthState);
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Set-Cookie": `oauth_state=${oauthState}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
      },
    });
  }

  // code가 있으면 콜백 처리
  try {
    // 1. code → access token 교환
    const { accessToken } = await exchangeGitHubCode(code);

    // 2. GitHub 사용자 정보 조회
    const githubUser = await getGitHubUser(accessToken);

    // 3. Supabase에 사용자 upsert
    const supabase = createAdminClient();
    const { data: user, error } = await supabase
      .from("users")
      .upsert(
        {
          github_id: githubUser.id,
          github_username: githubUser.login,
          email: githubUser.email,
          avatar_url: githubUser.avatar_url,
          github_access_token: accessToken,
        },
        { onConflict: "github_id" }
      )
      .select("id")
      .single();

    if (error || !user) {
      throw new Error(`사용자 저장 실패: ${error?.message}`);
    }

    // 4. JWT 세션 쿠키 설정
    await setSessionCookie({
      userId: user.id,
      githubAccessToken: accessToken,
    });

    // 5. 대시보드로 리다이렉트
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://meld-psi.vercel.app";
    return Response.redirect(`${appUrl}/dashboard`);
  } catch (err) {
    console.error("GitHub OAuth 에러:", err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://meld-psi.vercel.app";
    return Response.redirect(
      `${appUrl}/login?error=github_auth_failed`
    );
  }
}
