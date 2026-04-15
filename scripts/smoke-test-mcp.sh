#!/usr/bin/env bash
# Smoke test for the MCP zero-friction flow.
#
# What this checks:
#   1. dev server is up on :9090
#   2. /api/mcp/oauth-availability responds with JSON
#   3. /api/auth/me returns a session (you must be logged in first)
#   4. tsc / eslint / next build all pass
#
# What this does NOT check (you must do manually):
#   - Actual agent run with live tokens
#   - Full /integrations UI flow
#
# Usage:
#   pnpm dev                          # in one terminal
#   scripts/smoke-test-mcp.sh         # in another

set -euo pipefail

APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:9090}"
WEB_DIR="apps/web"

say() { printf "\033[36m[smoke]\033[0m %s\n" "$*"; }
ok()  { printf "\033[32m  ✓\033[0m %s\n" "$*"; }
bad() { printf "\033[31m  ✗\033[0m %s\n" "$*"; exit 1; }

say "Checking dev server at $APP_URL..."
if curl -sf -o /dev/null "$APP_URL/api/auth/me"; then
  ok "dev server responding"
else
  bad "dev server not reachable at $APP_URL — did you run pnpm dev?"
fi

say "Checking /api/mcp/oauth-availability..."
response=$(curl -sf "$APP_URL/api/mcp/oauth-availability" || echo "FAIL")
if [[ "$response" == "FAIL" ]]; then
  bad "oauth-availability endpoint unreachable"
fi
if echo "$response" | grep -q '"availability"'; then
  ok "oauth-availability returned valid JSON"
  echo "    $response" | head -c 200
  echo ""
else
  bad "oauth-availability response malformed: $response"
fi

say "Running tsc..."
(cd "$WEB_DIR" && pnpm exec tsc --noEmit) && ok "tsc passes" || bad "tsc failed"

say "Running eslint on key files..."
(cd "$WEB_DIR" && pnpm exec eslint \
  src/app/api/ai/agent-run/route.ts \
  src/lib/agent/external-memory.ts \
  src/lib/mcp/auto-connect.ts \
  src/components/mcp/MCPHubView.tsx \
  src/lib/harness/harness.ts \
  2>&1 | grep -E "error" && bad "eslint has errors") || ok "eslint clean"

say "Running next build..."
(cd "$WEB_DIR" && pnpm exec next build > /tmp/meld-build.log 2>&1) && ok "next build passes" || {
  tail -30 /tmp/meld-build.log
  bad "next build failed — see /tmp/meld-build.log"
}

say "All static checks passed. Next steps:"
echo "  1. Open $APP_URL/integrations in a browser"
echo "  2. Connect GitHub (or paste a Figma PAT)"
echo "  3. Open $APP_URL/project/workspace"
echo "  4. Send a prompt that would benefit from the connected MCP"
echo "  5. Watch the dev server console for:"
echo "     [mcp-inject]  — MCP tools injected into the session"
echo "     [cache]       — cache read/create per round"
echo "     [mode]        — mode transitions with 'cache preserved'"
echo "     [stash]       — large tool results stashed to .meld/cache/"
echo "     [mcp-overhead]— token overhead summary at session end"
