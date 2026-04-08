import { NextRequest } from "next/server";
import { getGitHubAuthUrl, exchangeGitHubCode, getGitHubUser } from "@/lib/auth/github";
import { setSessionCookie } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/auth/github → Start GitHub OAuth (redirect)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // If no code, redirect to GitHub authorization page
  if (!code) {
    const oauthState = crypto.randomUUID();
    const url = getGitHubAuthUrl(oauthState);
    const redirectTo = searchParams.get("redirect_to") ?? "";
    const rememberMe = searchParams.get("remember_me") ?? "false";
    const cookies = [
      `oauth_state=${oauthState}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    ];
    if (redirectTo) {
      cookies.push(`redirect_to=${encodeURIComponent(redirectTo)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
    }
    // Store remember_me preference for desktop auth
    cookies.push(`remember_me=${rememberMe}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
    return new Response(null, {
      status: 302,
      headers: [
        ["Location", url],
        ...cookies.map((c) => ["Set-Cookie", c] as [string, string]),
      ],
    });
  }

  // If code is present, handle callback
  try {
    // 1. Exchange code → access token
    const { accessToken } = await exchangeGitHubCode(code);

    // 2. Fetch GitHub user info
    const githubUser = await getGitHubUser(accessToken);

    // 3. Upsert user in Supabase
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
      throw new Error(`Failed to save user: ${error?.message}`);
    }

    // 4. Set JWT session cookie
    await setSessionCookie({
      userId: user.id,
      githubAccessToken: accessToken,
    });

    // 5. Check redirect_to cookie → redirect to original destination or tutorial
    const cookieHeader = req.headers.get("cookie") ?? "";
    const redirectMatch = cookieHeader.match(/redirect_to=([^;]*)/);
    const redirectTo = redirectMatch ? decodeURIComponent(redirectMatch[1]) : "/tutorial";

    // Desktop app: redirect_to=/api/auth/desktop → always use localhost
    // because Desktop app runs on localhost:9090
    const isDesktopAuth = redirectTo === "/api/auth/desktop";
    const appUrl = isDesktopAuth
      ? "http://localhost:9090"
      : (process.env.NEXT_PUBLIC_APP_URL ?? "https://meld-psi.vercel.app");

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${appUrl}${redirectTo}`,
        "Set-Cookie": "redirect_to=; Path=/; HttpOnly; Max-Age=0",
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("GitHub OAuth error:", errorMsg, err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://meld-psi.vercel.app";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${appUrl}/login?error=github_auth_failed&detail=${encodeURIComponent(errorMsg)}`,
      },
    });
  }
}
