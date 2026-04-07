// ─── Agent Bridge API Route ──────────────────────────
// Endpoint for external AI agents to call Meld tools via HTTP.
//
// POST /api/agent-bridge
//   Body: { tool: string, args: Record<string, unknown>, apiKey?: string }
//   Auth: API key (Authorization header or body) or session cookie
//
// GET /api/agent-bridge
//   Returns tool list (no auth required — for discovery)

import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgentBridge } from "@/lib/mcp/agent-bridge";
import type { AgentBridgeContext } from "@/lib/mcp/agent-bridge";

// ─── GET: Tool list (discovery) ─────────────────────

export async function GET() {
  const tools = AgentBridge.getToolDefinitions();

  return NextResponse.json({
    name: "Meld Agent Bridge",
    version: "1.0.0",
    description:
      "Connect external AI agents (Claude Code, Cursor, GitHub Copilot) to Meld. " +
      "Use these tools to read/write project files, run commands, capture previews, and more.",
    tools,
    auth: {
      methods: ["api_key", "session_cookie"],
      header: "Authorization: Bearer <api_key>",
      note: "Get your API key from Meld Settings > Agent Bridge.",
    },
  });
}

// ─── POST: Execute tool ────────────────────────────────

interface AgentBridgeRequest {
  tool: string;
  args: Record<string, unknown>;
  apiKey?: string;
}

export async function POST(req: Request) {
  // 1. Parse request
  let body: AgentBridgeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { tool, args, apiKey: bodyApiKey } = body;

  if (!tool || typeof tool !== "string") {
    return NextResponse.json(
      { error: "'tool' field is required and must be a string" },
      { status: 400 },
    );
  }

  if (args !== undefined && (typeof args !== "object" || args === null || Array.isArray(args))) {
    return NextResponse.json(
      { error: "'args' must be a plain object" },
      { status: 400 },
    );
  }

  // 2. Validate tool name
  if (!AgentBridge.isValidTool(tool)) {
    const available = AgentBridge.getMCPTools().map((t) => t.name);
    return NextResponse.json(
      { error: `Unknown tool: '${tool}'`, available_tools: available },
      { status: 400 },
    );
  }

  // 3. Auth: API key (header or body) → session cookie fallback
  let userId: string | null = null;
  let githubAccessToken: string | null = null;

  // 3a. Extract API key from Authorization header
  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.replace(/^Bearer\s+/i, "") ?? bodyApiKey;

  if (apiKey) {
    // Look up user by API key
    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users")
      .select("id, github_access_token")
      .eq("agent_api_key", apiKey)
      .single();

    if (user) {
      userId = user.id;
      githubAccessToken = user.github_access_token;
    }
  }

  // 3b. Session cookie fallback
  if (!userId) {
    const session = await getSessionFromRequest(req);
    if (session) {
      userId = session.userId;
      githubAccessToken = session.githubAccessToken ?? null;
    }
  }

  if (!userId) {
    return NextResponse.json(
      {
        error: "Authentication required",
        hint: "Provide an API key via Authorization header (Bearer <key>) or body (apiKey field), or use session cookies.",
      },
      { status: 401 },
    );
  }

  // 4. Build execution context
  // TODO: Wire up actual WebSocket connection status and GitHub info here
  const context: AgentBridgeContext = {
    userId,
    hasLocalAgent: false, // TODO: Replace with WebSocket connection status check
    github: githubAccessToken
      ? {
          owner: "", // Should be fetched from per-project settings
          repo: "",
          branch: "main",
          accessToken: githubAccessToken,
        }
      : undefined,
  };

  // 5. Execute tool
  const startTime = Date.now();
  const result = await AgentBridge.executeTool(tool, args ?? {}, context);
  const durationMs = Date.now() - startTime;

  // 6. Response
  return NextResponse.json({
    tool,
    result,
    durationMs,
    ...(result.isError ? { status: "error" } : { status: "ok" }),
  });
}
