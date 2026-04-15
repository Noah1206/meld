import { NextResponse } from "next/server";

// GET /api/mcp/oauth-availability
//
// Reports which OAuth2-based MCP adapters can actually complete a
// connection right now (i.e. their OAuth app is registered and the
// client_id/secret env vars are present). The MCPHubView hits this
// on mount so it can flip `oauthOnly` presets to "available" without
// hardcoding env-var names on the client.
//
// The source-of-truth list of env vars mirrors
// apps/web/src/app/api/auth/mcp/route.ts — keep the two in sync.

interface ServiceEnvMap {
  [adapterId: string]: {
    clientIdEnv: string;
    clientSecretEnv: string;
  };
}

const OAUTH_SERVICES: ServiceEnvMap = {
  vercel: { clientIdEnv: "VERCEL_CLIENT_ID", clientSecretEnv: "VERCEL_CLIENT_SECRET" },
  linear: { clientIdEnv: "LINEAR_CLIENT_ID", clientSecretEnv: "LINEAR_CLIENT_SECRET" },
  notion: { clientIdEnv: "NOTION_CLIENT_ID", clientSecretEnv: "NOTION_CLIENT_SECRET" },
  slack: { clientIdEnv: "SLACK_CLIENT_ID", clientSecretEnv: "SLACK_CLIENT_SECRET" },
  sentry: { clientIdEnv: "SENTRY_CLIENT_ID", clientSecretEnv: "SENTRY_CLIENT_SECRET" },
  gmail: { clientIdEnv: "GOOGLE_CLIENT_ID", clientSecretEnv: "GOOGLE_CLIENT_SECRET" },
  canva: { clientIdEnv: "CANVA_CLIENT_ID", clientSecretEnv: "CANVA_CLIENT_SECRET" },
};

export async function GET() {
  const availability: Record<string, boolean> = {};
  for (const [adapterId, { clientIdEnv, clientSecretEnv }] of Object.entries(OAUTH_SERVICES)) {
    availability[adapterId] = Boolean(
      process.env[clientIdEnv] && process.env[clientSecretEnv],
    );
  }
  return NextResponse.json({ availability });
}
