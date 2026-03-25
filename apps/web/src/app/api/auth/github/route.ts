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
    const redirectTo = searchParams.get("redirect_to") ?? "";
    const desktop = searchParams.get("desktop");
    const cookies = [
      `oauth_state=${oauthState}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    ];
    if (desktop) {
      cookies.push(`desktop_auth=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
    }
    if (redirectTo) {
      cookies.push(`redirect_to=${encodeURIComponent(redirectTo)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
    }
    return new Response(null, {
      status: 302,
      headers: [
        ["Location", url],
        ...cookies.map((c) => ["Set-Cookie", c] as [string, string]),
      ],
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

    // 5. 데스크톱 앱이면 meld:// 프로토콜로, 아니면 대시보드로 리다이렉트
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://meld-psi.vercel.app";
    const cookieHeader = req.headers.get("cookie") ?? "";
    const desktopMatch = cookieHeader.match(/desktop_auth=([^;]*)/);
    const redirectMatch = cookieHeader.match(/redirect_to=([^;]*)/);

    if (desktopMatch) {
      // 데스크톱 앱: meld:// 프로토콜로 유저 정보 전달
      const userInfo = encodeURIComponent(JSON.stringify({
        id: user.id,
        githubUsername: githubUser.login,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        accessToken,
      }));
      const meldUrl = `meld://auth?user=${userInfo}`;
      // Response.redirect는 커스텀 프로토콜 미지원 → HTML로 리다이렉트
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Meld</title></head><body style="background:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui"><div style="text-align:center"><p style="font-size:16px;color:#1A1A1A;font-weight:600">로그인 성공!</p><p style="font-size:13px;color:#787774;margin-top:8px">Meld 앱으로 돌아가는 중...</p></div><script>window.location.href="${meldUrl}";</script></body></html>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Set-Cookie": "desktop_auth=; Path=/; HttpOnly; Max-Age=0",
          },
        }
      );
    }

    const redirectTo = redirectMatch ? decodeURIComponent(redirectMatch[1]) : "/dashboard";
    const res = Response.redirect(`${appUrl}${redirectTo}`);
    res.headers.append("Set-Cookie", "redirect_to=; Path=/; HttpOnly; Max-Age=0");
    return res;
  } catch (err) {
    console.error("GitHub OAuth 에러:", err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://meld-psi.vercel.app";
    const cookieHeader = req.headers.get("cookie") ?? "";
    if (cookieHeader.includes("desktop_auth")) {
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>window.location.href="meld://auth?error=github_auth_failed";</script></body></html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": "desktop_auth=; Path=/; HttpOnly; Max-Age=0" } }
      );
    }
    return Response.redirect(
      `${appUrl}/login?error=github_auth_failed`
    );
  }
}
