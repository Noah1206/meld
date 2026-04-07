import { NextRequest } from "next/server";
import { getSession, verifySessionToken } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// --- Service OAuth configuration registry ---

type ServiceId = "vercel" | "linear" | "notion" | "slack" | "sentry" | "gmail";

interface OAuthServiceConfig {
  authUrl: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  scopes?: string;
  // Notion uses Basic auth for token exchange
  tokenAuthMethod: "body" | "basic";
  // DB column to store access token
  dbColumn: string;
  // DB column to store refresh token (if applicable)
  dbRefreshColumn?: string;
  // Display name for error messages
  displayName: string;
}

const SERVICE_CONFIGS: Record<ServiceId, OAuthServiceConfig> = {
  vercel: {
    authUrl: "https://vercel.com/oauth/authorize",
    tokenUrl: "https://api.vercel.com/v2/oauth/access_token",
    clientIdEnv: "VERCEL_CLIENT_ID",
    clientSecretEnv: "VERCEL_CLIENT_SECRET",
    tokenAuthMethod: "body",
    dbColumn: "vercel_access_token",
    displayName: "Vercel",
  },
  linear: {
    authUrl: "https://linear.app/oauth/authorize",
    tokenUrl: "https://api.linear.app/oauth/token",
    clientIdEnv: "LINEAR_CLIENT_ID",
    clientSecretEnv: "LINEAR_CLIENT_SECRET",
    tokenAuthMethod: "body",
    dbColumn: "linear_access_token",
    displayName: "Linear",
  },
  notion: {
    authUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    clientIdEnv: "NOTION_CLIENT_ID",
    clientSecretEnv: "NOTION_CLIENT_SECRET",
    tokenAuthMethod: "basic",
    dbColumn: "notion_access_token",
    displayName: "Notion",
  },
  slack: {
    authUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    clientIdEnv: "SLACK_CLIENT_ID",
    clientSecretEnv: "SLACK_CLIENT_SECRET",
    scopes: "channels:read,chat:write,search:read",
    tokenAuthMethod: "body",
    dbColumn: "slack_access_token",
    displayName: "Slack",
  },
  sentry: {
    authUrl: "https://sentry.io/oauth/authorize/",
    tokenUrl: "https://sentry.io/oauth/token/",
    clientIdEnv: "SENTRY_CLIENT_ID",
    clientSecretEnv: "SENTRY_CLIENT_SECRET",
    tokenAuthMethod: "body",
    dbColumn: "sentry_access_token",
    dbRefreshColumn: "sentry_refresh_token",
    displayName: "Sentry",
  },
  gmail: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    scopes: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
    tokenAuthMethod: "body",
    dbColumn: "gmail_access_token",
    dbRefreshColumn: "gmail_refresh_token",
    displayName: "Gmail",
  },
};

const VALID_SERVICES = new Set(Object.keys(SERVICE_CONFIGS));

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:9090";

// --- Helpers ---

function getServiceConfig(service: string): OAuthServiceConfig | null {
  if (!VALID_SERVICES.has(service)) return null;
  return SERVICE_CONFIGS[service as ServiceId];
}

function getClientCredentials(config: OAuthServiceConfig): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  if (!clientId || !clientSecret) {
    throw new Error(
      `${config.displayName} OAuth env vars (${config.clientIdEnv}, ${config.clientSecretEnv}) are not configured`
    );
  }
  return { clientId, clientSecret };
}

function buildRedirectUri(service: string): string {
  return `${appUrl}/api/auth/mcp?service=${service}`;
}

function buildAuthorizeUrl(
  service: string,
  config: OAuthServiceConfig,
  state: string
): string {
  const { clientId } = getClientCredentials(config);
  const redirectUri = buildRedirectUri(service);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });

  if (config.scopes) {
    // Gmail uses space-separated scopes, Slack uses comma-separated
    // The scope param name is "scope" for all services
    params.set("scope", config.scopes);
  }

  // Notion uses "owner" param instead of standard "scope"
  if (service === "notion") {
    params.set("owner", "user");
  }

  // Gmail needs access_type=offline for refresh tokens
  if (service === "gmail") {
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }

  return `${config.authUrl}?${params}`;
}

async function exchangeCodeForToken(
  service: string,
  config: OAuthServiceConfig,
  code: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const { clientId, clientSecret } = getClientCredentials(config);
  const redirectUri = buildRedirectUri(service);

  const body = new URLSearchParams({
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (config.tokenAuthMethod === "basic") {
    // Notion uses Basic auth header instead of body params
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  } else {
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`${config.displayName} token exchange failed:`, errorText);
    throw new Error(`${config.displayName} token exchange failed (${res.status})`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`${config.displayName} OAuth error: ${data.error}`);
  }

  // Slack nests the token differently
  if (service === "slack") {
    return {
      accessToken: data.access_token ?? data.authed_user?.access_token,
      refreshToken: data.refresh_token,
    };
  }

  // Notion returns access_token at top level
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

// --- Route Handler ---

// GET /api/auth/mcp?service=vercel|linear|notion|slack|sentry|gmail
// Handles both OAuth start (no code) and callback (code present)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");

  // Parse service from query params or from state (callback phase)
  let service = searchParams.get("service");
  const stateParam = searchParams.get("state");

  // On callback, the service param may be lost (some providers strip extra query params).
  // Recover it from the state payload.
  let statePayload: {
    nonce?: string;
    service?: string;
    redirectTo?: string;
    sessionToken?: string;
  } = {};

  if (stateParam) {
    try {
      statePayload = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      if (!service && statePayload.service) {
        service = statePayload.service;
      }
    } catch {
      // state parse failed
    }
  }

  if (!service || !VALID_SERVICES.has(service)) {
    return new Response(
      JSON.stringify({ error: "Invalid or missing service parameter", valid: Array.from(VALID_SERVICES) }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const config = getServiceConfig(service)!;

  // --- Authenticate the user ---
  let session = await getSession();
  if (!session) {
    // Try session_token from query (OAuth start) or state (callback)
    let sessionToken = searchParams.get("session_token");
    if (!sessionToken && statePayload.sessionToken) {
      sessionToken = statePayload.sessionToken;
    }
    if (sessionToken) {
      session = await verifySessionToken(sessionToken);
    }
  }
  if (!session) {
    return Response.redirect(`${appUrl}/login`);
  }

  // --- OAuth start: redirect to provider ---
  if (!code) {
    const redirectTo = searchParams.get("redirect_to") ?? "/project/workspace";
    const sessionToken = searchParams.get("session_token") ?? "";

    const state = Buffer.from(
      JSON.stringify({
        nonce: crypto.randomUUID(),
        service,
        redirectTo,
        sessionToken,
      })
    ).toString("base64url");

    const authorizeUrl = buildAuthorizeUrl(service, config, state);

    const headers = new Headers({ Location: authorizeUrl });
    // Store redirect_to as cookie fallback
    headers.append(
      "Set-Cookie",
      `mcp_redirect_to=${encodeURIComponent(redirectTo)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300`
    );

    return new Response(null, { status: 302, headers });
  }

  // --- OAuth callback: exchange code for token ---
  try {
    const { accessToken, refreshToken } = await exchangeCodeForToken(service, config, code);

    // Save token(s) to Supabase users table
    const supabase = createAdminClient();
    const updateData: Record<string, string | null> = {
      [config.dbColumn]: accessToken,
    };
    if (config.dbRefreshColumn && refreshToken) {
      updateData[config.dbRefreshColumn] = refreshToken;
    }

    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", session.userId);

    if (error) {
      throw new Error(`Failed to save ${config.displayName} token: ${error.message}`);
    }

    // Determine redirect destination
    let redirectTo = statePayload.redirectTo ?? "/project/workspace";

    // Cookie fallback
    if (redirectTo === "/project/workspace") {
      const cookies = req.headers.get("cookie") ?? "";
      const redirectMatch = cookies.match(/mcp_redirect_to=([^;]+)/);
      if (redirectMatch) redirectTo = decodeURIComponent(redirectMatch[1]);
    }

    // Electron desktop app -- show success page
    if (redirectTo.startsWith("electron:")) {
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${config.displayName} Connected</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #FAFAF9; }
          .card { text-align: center; padding: 48px; border-radius: 20px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h1 { font-size: 20px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px; }
          p { font-size: 14px; color: #787774; margin: 0; }
        </style></head><body>
        <div class="card">
          <div class="icon">&#10003;</div>
          <h1>${config.displayName} Connected</h1>
          <p>This tab will close automatically.</p>
        </div>
        <script>setTimeout(()=>{window.close()},1500)</script>
        </body></html>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Set-Cookie": "mcp_redirect_to=; Path=/; Max-Age=0",
          },
        }
      );
    }

    // Append mcp_connected param for workspace toast notification
    if (redirectTo.includes("/project/workspace")) {
      const sep = redirectTo.includes("?") ? "&" : "?";
      redirectTo += `${sep}mcp_connected=${service}`;
    }

    const headers = new Headers({ Location: `${appUrl}${redirectTo}` });
    headers.append("Set-Cookie", "mcp_redirect_to=; Path=/; Max-Age=0");
    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error(`${config.displayName} OAuth error:`, err);
    return Response.redirect(
      `${appUrl}/project/workspace?error=${service}_auth_failed`
    );
  }
}
