# CLAUDE.md

## Project: Meld
AI-powered coding agent web app. User types prompt → E2B cloud sandbox runs autonomous agent → real-time preview.
Web-first MVP (Next.js). Desktop app (Electron) is secondary.

## Quick Start
```bash
pnpm dev          # port 9090
pnpm build        # production build
pnpm lint         # ESLint
```

## Architecture
- **Web app**: Next.js 16 (App Router) + TypeScript + Tailwind + Zustand
- **AI Agent**: Claude Sonnet 4 via tool-use loop, 50 rounds max, 16K tokens
- **Sandbox**: E2B cloud (custom template `meld-agent` — Node.js 22 + pnpm + Playwright)
- **DB/Auth**: Supabase (Postgres + GitHub OAuth)
- **Payment**: Polar (Free / Pro $20 / Unlimited $49)
- **Search**: Serper (Google) + Firecrawl (scraping + Vision AI)

## Core Flow
```
User prompt → POST /api/ai/agent-run
  → Sandbox.create("meld-agent") (E2B cloud)
  → Claude agent loop (9 tools, 50 rounds)
  → Browser polls /api/ai/agent-run/events every 500ms
  → AgentActivityFeed shows step cards in real-time
  → Dev server auto-detected → sandbox.getHost(port) → preview URL
```

## Agent Tools (9)
read_file, write_file, delete_file, rename_file, list_files, search_files, run_command, web_search, browse_url

## Key Files
```
apps/web/src/app/project/workspace/page.tsx  — Main workspace (6000+ lines)
apps/web/src/app/api/ai/agent-run/route.ts   — Agent loop + E2B (core)
apps/web/src/app/api/ai/agent-run/events/    — Event polling endpoint
apps/web/src/app/api/search/route.ts         — Web search (Serper/Firecrawl)
apps/web/src/app/api/browse/route.ts         — URL scraping + Vision AI
apps/web/src/app/api/compute/provision/      — E2B sandbox provisioning
apps/web/src/app/projects/page.tsx           — Project list + sidebar
apps/web/src/app/pricing/                    — Pricing page + Polar checkout
apps/web/src/components/agent/AgentActivityFeed.tsx — Manus-style activity feed
apps/web/src/lib/store/
  agent-session-store.ts     — Session events, pending edits
  agent-store.ts             — File tree, dev server, inspector
  mcp-store.ts               — MCP server connections
infra/e2b-template/          — E2B custom template (v2 build, no Docker needed)
packages/agent/              — Local agent CLI (WebSocket, for future local terminal mode)
```

## Agent Config
- maxRounds: 50
- max_tokens: 16,384
- Sandbox timeout: 30 min
- Command timeout: 5 min
- Dev server: background execution, 8 detection patterns
- Fully autonomous: no approval flow, no Haiku classifier

## UI Design
- Manus-style: monochrome + single blue dot accent
- Step cards: spinner (running) / check (done), expandable tool list
- Tool-specific cards: web_search (blue), browse_url (indigo), devServer (green gradient, "보기" button)
- Bottom progress bar: blue dot + step label + elapsed time + counter
- Input bar: + popup menu (서비스 연결, 스킬 사용, 파일 추가) + MCP icons + Monitor button
- Typewriter effect on assistant messages

## MCP Servers (14 presets)
figma, github, vercel, supabase, sentry, linear, notion, slack, gmail, canva, filesystem, windows-mcp, pdf-viewer, agent-bridge

## Current Status
See PROJECT_STATUS.md for detailed progress, remaining tasks, and decisions.

## Code Style
- Korean comments allowed
- Functional components + hooks
- Error handling: try-catch
- Types: strict mode, no any
- Dark theme colors via CSS variables in globals.css
