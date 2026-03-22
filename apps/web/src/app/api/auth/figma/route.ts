import { NextRequest } from "next/server";
import { getFigmaAuthUrl, exchangeFigmaCode } from "@/lib/auth/figma";
import { getSession, setSessionCookie } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/auth/figma → Figma OAuth 시작/콜백
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:9000";

  // 로그인된 사용자만 Figma 연결 가능
  const session = await getSession();
  if (!session) {
    return Response.redirect(`${appUrl}/login`);
  }

  // code가 없으면 Figma 인증 페이지로 리다이렉트
  if (!code) {
    const state = crypto.randomUUID();
    const url = getFigmaAuthUrl(state);
    return Response.redirect(url);
  }

  // code가 있으면 콜백 처리
  try {
    // 1. code → access token 교환
    const { accessToken, refreshToken } = await exchangeFigmaCode(code);

    // 2. Supabase에 Figma 토큰 저장
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("users")
      .update({
        figma_access_token: accessToken,
        figma_refresh_token: refreshToken,
      })
      .eq("id", session.userId);

    if (error) {
      throw new Error(`Figma 토큰 저장 실패: ${error.message}`);
    }

    // 3. 세션에 Figma 토큰 추가
    await setSessionCookie({
      ...session,
      figmaAccessToken: accessToken,
    });

    // 4. 대시보드로 리다이렉트
    return Response.redirect(`${appUrl}/dashboard`);
  } catch (err) {
    console.error("Figma OAuth 에러:", err);
    return Response.redirect(
      `${appUrl}/dashboard?error=figma_auth_failed`
    );
  }
}
