import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/auth/desktop — Deliver logged-in user info via meld:// protocol
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(
        page("Login required", "Please log in with GitHub first, then reopen this page.", null),
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users")
      .select("id, github_username, email, avatar_url, figma_access_token")
      .eq("id", session.userId)
      .single();

    if (!user) {
      return new Response(
        page("User not found", "Please log in again.", null),
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Read remember_me preference from cookie
    const cookieHeader = req.headers.get("cookie") ?? "";
    const rememberMatch = cookieHeader.match(/remember_me=([^;]*)/);
    const rememberMe = rememberMatch ? rememberMatch[1] === "true" : false;

    const userInfo = encodeURIComponent(JSON.stringify({
      id: user.id,
      githubUsername: user.github_username,
      email: user.email,
      avatarUrl: user.avatar_url,
      hasFigmaToken: !!user.figma_access_token,
    }));

    const meldUrl = `meld://auth?user=${userInfo}&remember_me=${rememberMe}`;

    return new Response(
      page("Login successful!", "Returning to the Meld app...", meldUrl),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch {
    return new Response(
      page("An error occurred", "Please try again.", null),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

function page(title: string, desc: string, meldUrl: string | null) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Meld</title></head>
<body style="background:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,system-ui,sans-serif;margin:0">
<div style="text-align:center;max-width:320px">
  <div style="width:48px;height:48px;background:#1A1A1A;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="24" height="24"><circle cx="9" cy="12" r="5.5" opacity="0.9"/><circle cx="15" cy="12" r="5.5" opacity="0.9"/></svg>
  </div>
  <p style="font-size:18px;color:#1A1A1A;font-weight:600;margin:0">${title}</p>
  <p style="font-size:13px;color:#787774;margin:8px 0 0">${desc}</p>
  ${meldUrl ? `
  <a href="${meldUrl}" style="display:inline-block;margin-top:24px;background:#1A1A1A;color:white;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none">Open Meld App</a>
  <script>setTimeout(()=>{window.location.href="${meldUrl}"},500);</script>
  ` : ""}
</div>
</body></html>`;
}
