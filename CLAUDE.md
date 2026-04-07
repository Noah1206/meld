# CLAUDE.md

## Project: Meld
AI-powered design-to-code IDE. Edit existing codebases with AI — not generate new prototypes.
Desktop app (Electron) + Web app (Next.js). No Figma plugin — uses Figma REST API.

## Architecture
- **Desktop app**: Electron + Next.js (loads `localhost:9090` in BrowserWindow)
- **Web app**: Next.js 16 (App Router) + TypeScript + Tailwind
- **AI**: Claude API (Sonnet 4) via agent loop with tool use
- **State**: Zustand stores (agent, auth, project, mcp, chat)

## Core Features
1. **AI Agent Loop** — Autonomous coding agent with 5 tools (read_file, write_file, list_files, search_files, run_command)
2. **Live Preview** — iframe preview with dev server auto-detection + hot reload
3. **Visual Editor** — Click elements in preview to inspect, drag to move/resize, color picker, text edit
4. **Skills & Plugins** — Install Claude Code skills from GitHub
5. **MCP Servers** — 14 connectable MCP servers (GitHub, Figma, Vercel, Supabase, etc.)
6. **Syntax-highlighted Editor** — Token-based code editor with VSCode-style colors
7. **Properties Panel** — CSS property editor (layout, spacing, colors, border-radius)

## Tech Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Electron 33 (desktop) + tsup (build) + node-pty (terminal)
- Zustand (state) + tRPC v11 + React Query
- Supabase (Postgres + Auth), Claude API (Sonnet 4), GitHub API
- Deploy: Vercel (web) + electron-builder (desktop)

## Commands
- `pnpm dev` — Start web dev server (port 9090)
- `pnpm build` — Production build
- `cd apps/desktop && pnpm build && npx electron .` — Desktop app
- `pnpm lint` — ESLint

## Structure
```
apps/
  web/                          — Next.js web app
    src/app/project/workspace/  — Main workspace page (single-page IDE)
    src/components/workspace/   — PreviewFrame, FileTreeBrowser
    src/lib/store/              — Zustand stores
      agent-store.ts            — File tree, dev server, inspector state
      agent-session-store.ts    — AI session events, pending edits
      project-store.ts          — Workspace, integrations (Figma, Local, GitHub)
      mcp-store.ts              — MCP server connections
      auth-store.ts             — User auth state
    src/lib/ai/                 — AI providers (Claude, GPT, Gemini)
  desktop/
    main/
      index.ts                  — Electron main process
      agent-loop.ts             — AI agent with tool use (read/write/search/run)
      dev-server.ts             — Dev server management (port detection, auto-restart)
      code-patterns.ts          — Auto-detect project code style
      ipc-handlers.ts           — IPC handlers (file ops, dev server, agent loop)
      inspector-script.ts       — Visual editor (drag, resize, color pick, text edit)
    preload/index.ts            — Electron preload (exposes electronAgent API)
    renderer/                   — Vite renderer (unused, loads web app instead)
packages/
  agent/                        — Local agent CLI (WebSocket + file watcher)
  shared/                       — Shared types, agent tools, protocols
```

## AI Agent System
- **System prompt**: Framework-specific guidelines, dependency awareness, code pattern analysis
- **Tools**: read_file, write_file, list_files, search_files, run_command
- **Port management**: Random ports 18000-28000, saved per project in `.meld/port`
- **Port conflict**: Auto-detect EADDRINUSE, suggest new port, scan system ports
- **Approval flow**: Pending edits require user approval (or auto-approve toggle)
- **Session recording**: Saved to `.meld/sessions/`, backup/rollback support

## Integrations (Settings > Integrations)
- **Figma**: OAuth connection, extract design tokens, node tree browsing
- **Local Folder**: Native directory dialog, file watcher, dev server auto-start
- **GitHub**: Coming soon (OAuth ready, repo connection planned)

## MCP Servers (Settings > MCP Servers)
14 servers: GitHub, Figma, Vercel, Supabase, Sentry, Linear, Notion, Slack, Gmail, Filesystem, Windows MCP, PDF Viewer, Canva, Agent Bridge

## UI/UX
- Dark theme (primary), light theme support
- VSCode-style: icon sidebar (60px) + collapsible panel + tab bar + main content
- Title bar: hiddenInset (macOS traffic lights) + layout toggle buttons
- Right panel: Terminal (server logs) + Properties (CSS editor)
- Floating chat bar: Appears when sidebar collapsed
- Skills marketplace: 53 real GitHub skills with star counts via API

## Code Style
- Korean comments allowed
- Functional components + hooks
- Error handling: try-catch
- Types: strict mode, no any
- All colors: CSS variables in globals.css (dark theme defaults)
