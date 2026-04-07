import { NextRequest } from "next/server";
import { getFigmaAuthUrl, exchangeFigmaCode } from "@/lib/auth/figma";
import { getSession, setSessionCookie, verifySessionToken } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/auth/figma → Figma OAuth start/callback
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://meld-psi.vercel.app";

  // Only logged-in users can connect Figma
  // Electron: system browser has no cookies, so support session_token (query or state)
  let session = await getSession();
  if (!session) {
    // 1st: session_token from query params (OAuth start phase)
    let sessionToken = searchParams.get("session_token");
    // 2nd: session_token from state (OAuth callback phase — Figma returns state)
    if (!sessionToken) {
      const stateParam = searchParams.get("state");
      if (stateParam) {
        try {
          const parsed = JSON.parse(Buffer.from(stateParam, "base64url").toString());
          if (parsed.sessionToken) sessionToken = parsed.sessionToken;
        } catch { /* ignore */ }
      }
    }
    if (sessionToken) {
      session = await verifySessionToken(sessionToken);
    }
  }
  if (!session) {
    return Response.redirect(`${appUrl}/login`);
  }

  // No code — redirect to Figma auth page
  if (!code) {
    const redirectTo = searchParams.get("redirect_to") ?? "";
    const sessionToken = searchParams.get("session_token") ?? "";
    // Encode redirect_to + session_token in state (avoids cookie domain mismatch)
    const statePayload = JSON.stringify({ nonce: crypto.randomUUID(), redirectTo, sessionToken });
    const state = Buffer.from(statePayload).toString("base64url");
    const url = getFigmaAuthUrl(state);
    const headers = new Headers({ Location: url });
    // Keep cookie as fallback
    if (redirectTo) {
      headers.append("Set-Cookie", `figma_redirect_to=${encodeURIComponent(redirectTo)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300`);
    }
    return new Response(null, { status: 302, headers });
  }

  // Code present — handle callback
  try {
    // 1. Exchange code for access token
    const { accessToken, refreshToken } = await exchangeFigmaCode(code);

    // 2. Save Figma tokens to Supabase
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("users")
      .update({
        figma_access_token: accessToken,
        figma_refresh_token: refreshToken,
      })
      .eq("id", session.userId);

    if (error) {
      throw new Error(`Failed to save Figma token: ${error.message}`);
    }

    // 3. Add Figma token to session
    await setSessionCookie({
      ...session,
      figmaAccessToken: accessToken,
    });

    // 4. Redirect to original page
    // Recover redirect_to from state param (handles cross-domain for Electron etc.)
    let redirectTo = "/project/workspace";
    const stateParam = searchParams.get("state");
    if (stateParam) {
      try {
        const parsed = JSON.parse(Buffer.from(stateParam, "base64url").toString());
        if (parsed.redirectTo) redirectTo = parsed.redirectTo;
      } catch { /* state parse failed — cookie fallback */ }
    }
    // Cookie fallback (same domain)
    if (redirectTo === "/dashboard") {
      const cookies = req.headers.get("cookie") ?? "";
      const redirectMatch = cookies.match(/figma_redirect_to=([^;]+)/);
      if (redirectMatch) redirectTo = decodeURIComponent(redirectMatch[1]);
    }

    // From Electron desktop app — show success page (desktop app detects via polling)
    if (redirectTo.startsWith("electron:")) {
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Figma Connected</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #FAFAF9; }
          .card { text-align: center; padding: 48px; border-radius: 20px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h1 { font-size: 20px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px; }
          p { font-size: 14px; color: #787774; margin: 0; }
        </style></head><body>
        <div class="card">
          <div class="icon">&#10003;</div>
          <h1>Figma Connected</h1>
          <p>This tab will close automatically.</p>
        </div>
        <script>setTimeout(()=>{window.close()},1500)</script>
        </body></html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": "figma_redirect_to=; Path=/; Max-Age=0" } },
      );
    }

    // Append mcp_connected param when returning to workspace
    if (redirectTo.includes("/project/workspace")) {
      const sep = redirectTo.includes("?") ? "&" : "?";
      redirectTo += `${sep}mcp_connected=figma`;
    }
    const headers = new Headers({ Location: `${appUrl}${redirectTo}` });
    headers.append("Set-Cookie", "figma_redirect_to=; Path=/; Max-Age=0");
    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error("Figma OAuth error:", err);
    return Response.redirect(
      `${appUrl}/dashboard?error=figma_auth_failed`
    );
  }
}
