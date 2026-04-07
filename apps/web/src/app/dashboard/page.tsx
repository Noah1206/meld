"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Figma,
  Github,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Blend,
  LogOut,
  Plus,
  FolderOpen,
  Sparkles,
  Zap,
  Palette,
  MousePointerClick,
  GitBranch,
  Terminal,
  Rocket,
  ArrowUpRight,
  Eye,
  ChevronDown,
  Search,
  Loader2,
  Globe,
  Monitor,
  HardDrive,
  CreditCard,
  ChevronRight,
  LayoutDashboard,
  Folder,
  Settings,
  Link as LinkIcon,
  Lock,
  X,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useLangStore } from "@/lib/store/lang-store";
import { usePlatform } from "@/lib/hooks/usePlatform";
import { trpc } from "@/lib/trpc/client";
import { FigmaClient } from "@/lib/figma/client";
import { DesignSystemDashboard } from "@/components/design-system/DesignSystemDashboard";

const translations = {
  en: {
    copied: "Copied!",
    greetingLateNight: "Burning the midnight oil",
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    mainTitle: "What shall we build?",
    githubConnected: "GitHub connected",
    figmaConnected: "Figma connected",
    figmaNeeded: "Figma connection needed",
    connectNow: "Connect now",
    localAgent: "Local agent",
    connectFigma: "Connect Figma",
    newProject: "New Project",
    localConnect: "Local Connect",
    designSystem: "Design System",
    figmaCardTitle: "Edit Figma Design",
    figmaCardDesc1: "Paste a Figma URL and click — that's it.",
    figmaCardDesc2: "AI modifies code and pushes to GitHub.",
    figmaFlowSelect: "Select",
    figmaSupported: "Supported:",
    figmaNewProject: "Create New Project",
    figmaConnectFirst: "Connect Figma first",
    figmaBannerNeeded: "Figma connection required —",
    figmaBannerConnect: "Connect",
    githubCardTitle: "Edit GitHub Project",
    githubCardDesc1: "Edit GitHub repos right in the browser.",
    githubCardDesc2: "AI code editing + live preview, no install.",
    githubFlowRepo: "Repo",
    githubFlowBrowser: "Browser",
    githubFlowPreview: "Preview",
    githubSelectRepo: "Select repository...",
    githubSearchRepo: "Search repos...",
    githubNoRepo: "No repos found",
    githubLivePreview: "Live Preview",
    githubOpenProject: "Open Project",
    githubLocalConnect: "Connect locally via terminal agent",
    desktopCardTitle: "Edit Local Project",
    desktopCardDesc1: "Open and edit local folders directly.",
    desktopCardDesc2: "Native file access, no agent install.",
    desktopFlowFolder: "Folder",
    desktopFlowDesktop: "Desktop",
    desktopFlowSave: "Save",
    desktopLocalFile: "Local Files",
    desktopOpenFolder: "Open Project Folder",
    myProjects: "My Projects",
    projectCount: "0 projects",
    noProjectsYet: "No projects yet",
    noProjectsDesc: "Create a new project to get started",
    startFirstProject: "Start your first project",
    // Sidebar
    sidebarHome: "Home",
    sidebarProjects: "Projects",
    sidebarSettings: "Settings",
    // New project panel
    npTitle: "New Project",
    npSubtitle: "Connect a Figma file and GitHub repo",
    npProjectName: "Project Name",
    npProjectNamePlaceholder: "e.g. Landing Page Redesign",
    npFigmaConnect: "Figma File",
    npFigmaHint: "Paste a Figma share link",
    npFigmaPlaceholder: "https://www.figma.com/file/...",
    npFigmaValidating: "Checking...",
    npFigmaValidate: "Check",
    npFigmaInvalid: "Invalid Figma URL",
    npFigmaFailed: "Validation failed",
    npGithubRepo: "GitHub Repository",
    npGithubDeselect: "Deselect",
    npGithubSearch: "Search repos...",
    npGithubLoading: "Loading...",
    npGithubNoResults: "No results",
    npCreate: "Create Project",
    npCreating: "Creating...",
    npBack: "Back",
  },
  ko: {
    copied: "Copied!",
    greetingLateNight: "Burning the midnight oil",
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    mainTitle: "What shall we build?",
    githubConnected: "GitHub connected",
    figmaConnected: "Figma connected",
    figmaNeeded: "Figma connection needed",
    connectNow: "Connect now",
    localAgent: "Local agent",
    connectFigma: "Connect Figma",
    newProject: "New Project",
    localConnect: "Local Connect",
    designSystem: "Design System",
    figmaCardTitle: "Edit Figma Design",
    figmaCardDesc1: "Paste a Figma URL and click — that's it.",
    figmaCardDesc2: "AI modifies code and pushes to GitHub.",
    figmaFlowSelect: "Select",
    figmaSupported: "Supported:",
    figmaNewProject: "Create New Project",
    figmaConnectFirst: "Connect Figma first",
    figmaBannerNeeded: "Figma connection required —",
    figmaBannerConnect: "Connect",
    githubCardTitle: "Edit GitHub Project",
    githubCardDesc1: "Edit GitHub repos right in the browser.",
    githubCardDesc2: "AI code editing + live preview, no install.",
    githubFlowRepo: "Repo",
    githubFlowBrowser: "Browser",
    githubFlowPreview: "Preview",
    githubSelectRepo: "Select repository...",
    githubSearchRepo: "Search repos...",
    githubNoRepo: "No repos found",
    githubLivePreview: "Live Preview",
    githubOpenProject: "Open Project",
    githubLocalConnect: "Connect locally via terminal agent",
    desktopCardTitle: "Edit Local Project",
    desktopCardDesc1: "Open and edit local folders directly.",
    desktopCardDesc2: "Native file access, no agent install.",
    desktopFlowFolder: "Folder",
    desktopFlowDesktop: "Desktop",
    desktopFlowSave: "Save",
    desktopLocalFile: "Local Files",
    desktopOpenFolder: "Open Project Folder",
    myProjects: "My Projects",
    projectCount: "0 projects",
    noProjectsYet: "No projects yet",
    noProjectsDesc: "Create a new project to get started",
    startFirstProject: "Start your first project",
    sidebarHome: "Home",
    sidebarProjects: "Projects",
    sidebarSettings: "Settings",
    npTitle: "New Project",
    npSubtitle: "Connect a Figma file and GitHub repo",
    npProjectName: "Project Name",
    npProjectNamePlaceholder: "e.g. Landing Page Redesign",
    npFigmaConnect: "Figma File",
    npFigmaHint: "Paste a Figma share link",
    npFigmaPlaceholder: "https://www.figma.com/file/...",
    npFigmaValidating: "Checking...",
    npFigmaValidate: "Check",
    npFigmaInvalid: "Invalid Figma URL",
    npFigmaFailed: "Validation failed",
    npGithubRepo: "GitHub Repository",
    npGithubDeselect: "Deselect",
    npGithubSearch: "Search repos...",
    npGithubLoading: "Loading...",
    npGithubNoResults: "No results",
    npCreate: "Create Project",
    npCreating: "Creating...",
    npBack: "Back",
  },
} as const;

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#2C2C2C]">
      <div className="w-[240px] flex-shrink-0 border-r border-[#3A3A3A] bg-[#232323] p-5">
        <div className="flex items-center gap-2 mb-6">
          <div className="animate-shimmer h-7 w-7 rounded-lg" />
          <div className="animate-shimmer h-4 w-16 rounded" />
        </div>
        <div className="animate-shimmer mb-4 h-10 w-full rounded-xl" />
        <div className="space-y-2">
          <div className="animate-shimmer h-9 w-full rounded-xl" />
          <div className="animate-shimmer h-9 w-full rounded-xl animation-delay-75" />
          <div className="animate-shimmer h-9 w-full rounded-xl animation-delay-150" />
        </div>
      </div>
      <div className="flex-1 p-8">
        <div className="animate-shimmer mb-3 h-5 w-32 rounded" />
        <div className="animate-shimmer mb-8 h-8 w-64 rounded animation-delay-75" />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="animate-shimmer h-72 rounded-2xl animation-delay-150" />
          <div className="animate-shimmer h-72 rounded-2xl animation-delay-225" />
        </div>
      </div>
    </div>
  );
}

function CopyCommand({ command, copiedLabel }: { command: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="group flex w-full items-center gap-2.5 rounded-xl bg-[#1A1A1A] px-4 py-3 text-left font-mono text-[12px] transition-all hover:bg-[#252525] active:scale-[0.99]"
    >
      <Terminal className="h-3.5 w-3.5 text-[#555] transition-colors group-hover:text-[#999]" />
      <span className="flex-1 text-[#999]">{command}</span>
      {copied ? (
        <span className="flex items-center gap-1 text-[10px] text-[#999]">
          <Check className="h-3 w-3" />
          {copiedLabel}
        </span>
      ) : (
        <Copy className="h-3.5 w-3.5 text-[#555] transition-colors group-hover:text-[#999]" />
      )}
    </button>
  );
}

function useGreeting() {
  const { lang } = useLangStore();
  const t = translations[lang];
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return { text: t.greetingLateNight, emoji: "🌙" };
    if (hour < 12) return { text: t.greetingMorning, emoji: "☀️" };
    if (hour < 18) return { text: t.greetingAfternoon, emoji: "🔥" };
    return { text: t.greetingEvening, emoji: "🌆" };
  };
  const [greeting, setGreeting] = useState(getGreeting);
  useEffect(() => {
    setGreeting(getGreeting());
    const interval = setInterval(() => setGreeting(getGreeting()), 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);
  return greeting;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Starter",
  pro: "Pro",
  unlimited: "Unlimited",
};

// ─── Sidebar ───────────────────────────────────────────
function Sidebar({
  user,
  activePage,
  onNavigate,
  onNewProject,
  onOpenLocal,
  logout,
}: {
  user: { githubUsername: string; avatarUrl: string | null; plan: string };
  activePage: string;
  onNavigate: (page: string) => void;
  onNewProject: () => void;
  onOpenLocal: () => void;
  logout: () => void;
}) {
  const { lang } = useLangStore();
  const t = translations[lang];
  const platform = usePlatform();

  const NAV_ITEMS = [
    { id: "home", label: t.sidebarHome, icon: LayoutDashboard },
    { id: "projects", label: t.sidebarProjects, icon: Folder },
    { id: "design", label: t.designSystem, icon: Palette },
  ];

  return (
    <div className="sticky top-0 flex h-screen w-[240px] flex-shrink-0 flex-col border-r border-[#3A3A3A] bg-[#232323]">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#9A9A95]">
          <Blend className="h-3 w-3 text-[#232323]" />
        </div>
        <span className="text-[16px] font-semibold text-[#E8E8E5]">Meld</span>
      </div>

      {/* New Project button */}
      <div className="px-3 pb-4">
        <Link
          href="/project/workspace?name=New+Project&new=true"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3A3A3A] px-4 py-2.5 text-[12px] font-semibold text-[#E8E8E5] shadow-sm transition-all duration-200 hover:bg-[#444] hover:shadow-md active:scale-[0.97]"
        >
          <Plus className="h-3.5 w-3.5" />
          {t.newProject}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200 ${
                activePage === item.id
                  ? "bg-[#3A3A3A] font-semibold text-[#E8E8E5]"
                  : "text-[#666] hover:bg-[#2E2E2E] hover:text-[#E8E8E5]"
              }`}
            >
              <item.icon className={`h-4 w-4 transition-colors ${activePage === item.id ? "text-[#E8E8E5]" : ""}`} />
              {item.label}
              {activePage === item.id && (
                <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[#9A9A95]" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Bottom: user profile */}
      <div className="border-t border-[#3A3A3A] p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3A3A3A] text-[11px] font-bold text-[#9A9A95]">
              {user.githubUsername[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-white">{user.githubUsername}</p>
            <p className="text-[10px] text-[#666]">{PLAN_LABELS[user.plan] ?? "Starter"}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-1.5 text-[#666] transition-colors hover:bg-[#3A3A3A] hover:text-[#9A9A95]"
            title="Log out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Home Content ──────────────────────────────────────
// MCP server list (for dashboard)
const DASHBOARD_MCP_SERVERS = [
  { id: "github", name: "GitHub", logo: "/mcp-icons/github.svg", connected: true, desc: "Search code, browse files, detect frameworks, and create PRs" },
  { id: "figma", name: "Figma", logo: "/mcp-icons/figma.svg", connectedKey: "hasFigmaToken" as const, desc: "Extract design tokens, browse node trees, and render frame images", authUrl: "/api/auth/figma" },
  { id: "vercel", name: "Vercel", logo: "/mcp-icons/vercel.svg", desc: "Check deploy previews, manage env variables, and read build logs" },
  { id: "supabase", name: "Supabase", logo: "/mcp-icons/supabase.svg", desc: "Read DB schemas and table structures to generate accurate queries" },
  { id: "sentry", name: "Sentry", logo: "/mcp-icons/sentry.svg", desc: "Analyze errors and stack traces to automatically identify bug causes" },
  { id: "linear", name: "Linear", logo: "/mcp-icons/linear.svg", desc: "Pass issue and project context to AI for task-based code edits" },
  { id: "notion", name: "Notion", logo: "/mcp-icons/notion.svg", desc: "Read specs and docs so AI generates code matching requirements" },
  { id: "slack", name: "Slack", logo: "/mcp-icons/slack.svg", desc: "Search channel messages to bring team discussion context into code" },
  { id: "gmail", name: "Gmail", logo: "/mcp-icons/gmail.svg", desc: "Draft replies, summarize threads, and search your inbox" },
  { id: "filesystem", name: "Filesystem", logo: "/mcp-icons/filesystem.svg", desc: "Let AI read and write files directly on your local filesystem" },
  { id: "windows-mcp", name: "Windows MCP", logo: "/mcp-icons/windows.svg", desc: "Interact with Windows OS — manage files, processes, and system settings" },
  { id: "pdf-viewer", name: "PDF Viewer", logo: "/mcp-icons/pdf.svg", desc: "Read, annotate, search, and extract text from PDF documents" },
  { id: "canva", name: "Canva", logo: "/mcp-icons/canva.svg", desc: "Search, create, autofill, and export Canva designs" },
];

function MCPToolsSection({ user }: { user: { hasFigmaToken?: boolean } }) {
  const [expanded, setExpanded] = useState(false);
  const connectedServers = DASHBOARD_MCP_SERVERS.filter(
    (s) => s.connected || (s.connectedKey && user?.[s.connectedKey])
  );

  return (
    <div className="relative mt-2">
      {/* Collapsed state — screenshot-style bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2.5 rounded-md bg-[#232323] px-4 py-2 text-left transition-colors hover:bg-[#292929]"
      >
        <span className="text-[11px] font-medium text-[#B0B0AC]">Connect tools to AI</span>
        <div className="flex flex-1 items-center justify-end gap-0.5">
          {connectedServers.map((s) => (
            <div key={s.id} className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1E1E1E]">
              <img src={s.logo} alt={s.name} className="h-3 w-3" />
            </div>
          ))}
          {DASHBOARD_MCP_SERVERS.filter(s => !s.connected && !(s.connectedKey && user?.[s.connectedKey])).slice(0, 4).map((s) => (
            <div key={s.id} className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1E1E1E]">
              <img src={s.logo} alt={s.name} className="h-3 w-3 opacity-25" />
            </div>
          ))}
        </div>
        <ChevronRight className={`h-3.5 w-3.5 text-[#555] transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {/* Expanded state — connector panel */}
      {expanded && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setExpanded(false)} />
          <div className="fixed inset-x-0 top-0 bottom-0 z-50 flex items-center justify-center p-8" onClick={() => setExpanded(false)}>
            <div className="w-full max-w-2xl animate-scale-in rounded-2xl bg-[#1E1E1E] shadow-2xl ring-1 ring-white/[0.08]" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="border-b border-[#333] px-6 py-4">
                <h2 className="text-[16px] font-bold text-[#E8E8E5]">Connectors</h2>
                <p className="mt-1 text-[12px] text-[#777]">Connect external services to AI. Connected tools let AI directly query and use their data.</p>
              </div>

              {/* Search */}
              <div className="border-b border-[#333] px-6 py-3">
                <div className="flex items-center gap-2 rounded-lg bg-[#2A2A2A] px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-[#555]" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="flex-1 bg-transparent text-[12px] text-[#E8E8E5] placeholder:text-[#555] focus:outline-none"
                  />
                </div>
              </div>

              {/* Server grid */}
              <div className="max-h-[60vh] overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-2">
                  {DASHBOARD_MCP_SERVERS.map((s) => {
                    const isConnected = s.connected || (s.connectedKey && user?.[s.connectedKey]);
                    return (
                      <div
                        key={s.id}
                        className="group flex items-start gap-3 rounded-xl px-4 py-3.5 transition-colors hover:bg-[#333]"
                      >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#2A2A2A] group-hover:bg-[#333]">
                          <img src={s.logo} alt={s.name} className={`h-4 w-4 ${isConnected ? "" : "opacity-50"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold text-[#E8E8E5]">{s.name}</p>
                            {isConnected && <span className="text-[9px] font-medium text-[#16A34A]">Connected</span>}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#777]">{s.desc}</p>
                        </div>
                        {!isConnected && (
                          <button
                            onClick={() => { if (s.authUrl) window.location.href = s.authUrl; }}
                            className="mt-0.5 flex-shrink-0 rounded-md bg-[#333] px-2 py-1 text-[10px] font-medium text-[#E8E8E5] transition-colors hover:bg-[#444]"
                          >
                            +
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function HomeContent({ user, onNewProject, onOpenLocal }: { user: { hasFigmaToken?: boolean }; onNewProject: () => void; onOpenLocal: () => void }) {
  const { lang } = useLangStore();
  const t = translations[lang];
  const greeting = useGreeting();
  const platform = usePlatform();
  const router = useRouter();

  return (
    <div className="flex h-full flex-col">
      {/* Center — Greeting */}
      <div className="flex flex-1 flex-col items-center justify-center animate-fade-in">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3A3A3A]">
            <Blend className="h-5 w-5 text-[#E8E8E5]" />
          </div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#E8E8E5]">{greeting.text}</h1>
          <p className="mt-1 text-[14px] text-[#9A9A95]">{t.mainTitle}</p>
        </div>

        {/* Action buttons — full width */}
        <div className="w-full max-w-2xl px-6">
          {/* New Project */}
          <button
            onClick={() => router.push("/project/workspace?name=New+Project&new=true")}
            className="group flex w-full items-center gap-4 rounded-2xl bg-[#383838] px-6 py-4 text-left transition-all hover:bg-[#404040] active:scale-[0.99]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Plus className="h-5 w-5 text-[#E8E8E5]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-[#E8E8E5]">New Project</p>
              <p className="text-[12px] text-[#9A9A95]">Figma, local files, or GitHub</p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#666] transition-transform group-hover:translate-x-1 group-hover:text-[#9A9A95]" />
          </button>

          {/* Open Folder */}
          <button
            onClick={() => router.push("/project/workspace?name=Local+Project")}
            className="group mt-2 flex w-full items-center gap-4 rounded-2xl px-6 py-3.5 text-left transition-all hover:bg-[#353535] active:scale-[0.97]"
          >
            <FolderOpen className="h-5 w-5 text-[#9A9A95]" />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#E8E8E5]">Open Local Folder</p>
            </div>
            <kbd className="rounded-md bg-[#3A3A3A] px-1.5 py-0.5 text-[10px] font-mono text-[#666]">⌘O</kbd>
          </button>

          {/* MCP Tools bar */}
          <MCPToolsSection user={user} />
        </div>
      </div>

      {/* Bottom — Recent Projects */}
      <div className="border-t border-[#3A3A3A] animate-fade-in animation-delay-150">
        <RecentProjects />
      </div>
    </div>
  );
}

// ─── Recent Projects (Card Grid) ──────────────────────

// Framework → brand gradient
function getFrameworkGradient(path?: string, sources?: string[]): string {
  const p = (path || "").toLowerCase();
  if (p.includes("next")) return "from-[#000000]/15 to-[#333333]/5"; // Next.js — black
  if (p.includes("react") || p.includes("vite")) return "from-[#61DAFB]/20 to-[#087EA4]/5"; // React — cyan
  if (p.includes("vue")) return "from-[#42B883]/20 to-[#35495E]/5"; // Vue — green
  if (p.includes("svelte")) return "from-[#FF3E00]/15 to-[#FF6D00]/5"; // Svelte — orange
  if (p.includes("angular")) return "from-[#DD0031]/15 to-[#C3002F]/5"; // Angular — red
  if (p.includes("python") || p.includes("django") || p.includes("flask")) return "from-[#3776AB]/15 to-[#FFD43B]/5"; // Python — blue+yellow
  if (p.includes("rust") || p.includes("cargo")) return "from-[#CE412B]/15 to-[#000]/5"; // Rust — rust orange
  if (p.includes("go") || p.includes("golang")) return "from-[#00ADD8]/15 to-[#00A29C]/5"; // Go — cyan
  if (p.includes("swift") || p.includes("xcode")) return "from-[#F05138]/15 to-[#FA7343]/5"; // Swift — orange-red
  if (p.includes("flutter") || p.includes("dart")) return "from-[#02569B]/15 to-[#0175C2]/5"; // Flutter — blue
  if (sources?.includes("Figma")) return "from-[#A259FF]/15 to-[#F24E1E]/5"; // Figma — purple+red
  if (sources?.includes("GitHub")) return "from-[#333]/15 to-[#666]/5"; // GitHub — dark
  return "from-[#3A3A3A] to-[#2C2C2C]"; // Default — neutral
}

function RecentProjects() {
  const router = useRouter();
  const [projects, setProjects] = useState<Array<{ id: string; name: string; lastOpened: string; sources: string[]; projectPath?: string }>>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("meld-recent-projects");
      if (stored) setProjects(JSON.parse(stored));
    } catch {}
  }, []);

  const removeProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    localStorage.setItem("meld-recent-projects", JSON.stringify(updated));
  };

  const clearAll = () => {
    setProjects([]);
    localStorage.removeItem("meld-recent-projects");
  };

  if (projects.length === 0) {
    return (
      <div className="px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666]">Recent</p>
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#444] py-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#353535]">
            <FolderOpen className="h-5 w-5 text-[#555]" />
          </div>
          <p className="text-[13px] font-medium text-[#666]">No recent projects</p>
          <p className="text-[11px] text-[#555]">Create a new project to get started</p>
        </div>
      </div>
    );
  }

  // Detect framework badge
  const detectBadge = (path?: string, sources?: string[]) => {
    const p = (path || "").toLowerCase();
    if (p.includes("next")) return { label: "Next.js", color: "bg-[#000] text-white" };
    if (p.includes("react") || p.includes("vite")) return { label: "React", color: "bg-[#61DAFB]/15 text-[#087EA4]" };
    if (p.includes("vue")) return { label: "Vue", color: "bg-[#42B883]/15 text-[#42B883]" };
    if (p.includes("svelte")) return { label: "Svelte", color: "bg-[#FF3E00]/15 text-[#FF3E00]" };
    if (p.includes("angular")) return { label: "Angular", color: "bg-[#DD0031]/15 text-[#DD0031]" };
    if (p.includes("python") || p.includes("django")) return { label: "Python", color: "bg-[#3776AB]/15 text-[#3776AB]" };
    if (p.includes("flutter")) return { label: "Flutter", color: "bg-[#02569B]/15 text-[#02569B]" };
    if (p.includes("swift")) return { label: "Swift", color: "bg-[#F05138]/15 text-[#F05138]" };
    if (sources?.includes("Figma")) return { label: "Figma", color: "bg-[#A259FF]/15 text-[#A259FF]" };
    return null;
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666]">Recent projects</p>
        <button onClick={clearAll} className="text-[10px] text-[#555] transition-colors hover:text-[#DC2626]">
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {projects.map((project, i) => {
          const gradient = getFrameworkGradient(project.projectPath, project.sources);
          const badge = detectBadge(project.projectPath, project.sources);

          return (
            <div
              key={project.id}
              onClick={() => router.push(`/project/workspace?id=${project.id}`)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl ring-1 ring-white/[0.06] transition-colors hover:ring-white/[0.12]"
            >
              {/* Gradient header */}
              <div className={`h-16 bg-gradient-to-br ${gradient} relative`}>
                <button
                  onClick={(e) => removeProject(project.id, e)}
                  className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-white/20 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-white/40"
                >
                  <X className="h-3 w-3" />
                </button>
                {badge && (
                  <div className="absolute bottom-2 left-3">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="bg-[#353535] px-4 pb-4 pt-3">
                <p className="truncate text-[14px] font-semibold text-white">{project.name}</p>
                {project.projectPath && (
                  <p className="mt-0.5 truncate text-[10px] font-mono text-[#666]">
                    {project.projectPath.replace(/^\/Users\/[^/]+\//, "~/")}
                  </p>
                )}

                {/* Sources */}
                {project.sources?.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    {project.sources.map((s) => (
                      <span key={s} className="rounded-full bg-[#444] px-2 py-0.5 text-[9px] font-medium text-[#9A9A95]">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Meld AI Status (Dashboard) ──────────────────────
function MeldAiStatusCard() {
  return (
    <div className="mt-10 animate-fade-in-up animation-delay-300">
      <div className="flex items-center gap-4 rounded-2xl bg-[#353535] p-5 ring-1 ring-white/[0.06]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2A2A2A]">
          <svg className="h-5 w-5 text-[#E8E8E5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-[#E8E8E5]">Meld AI</h3>
            <span className="rounded-full bg-[#16A34A]/15 px-2 py-0.5 text-[10px] font-medium text-[#16A34A]">Active</span>
          </div>
          <p className="mt-0.5 text-[12px] text-[#9A9A95]">AI-powered code editing. No API keys needed.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Projects Content ──────────────────────────────────
function ProjectsContent() {
  const router = useRouter();
  const { lang } = useLangStore();
  const t = translations[lang];
  const [projects, setProjects] = useState<Array<{ id: string; name: string; lastOpened: string; sources: string[] }>>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("meld-recent-projects");
      if (stored) setProjects(JSON.parse(stored));
    } catch {}
  }, []);

  const removeProject = (id: string) => {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    localStorage.setItem("meld-recent-projects", JSON.stringify(updated));
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-bold text-[#E8E8E5]">{t.myProjects}</h2>
        <button
          onClick={() => router.push("/project/workspace?name=New+Project&new=true")}
          className="flex items-center gap-1.5 rounded-lg bg-[#3A3A3A] px-3 py-2 text-[12px] font-medium text-[#E8E8E5] transition-all hover:bg-[#444] active:scale-[0.98]"
        >
          <Plus className="h-3.5 w-3.5" />
          {t.newProject}
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-[#353535] p-14 text-center ring-1 ring-white/[0.06]">
          <FolderOpen className="h-8 w-8 text-[#555]" />
          <p className="mt-4 text-[14px] font-medium text-[#9A9A95]">{t.noProjectsYet}</p>
          <p className="mt-1 text-[12px] text-[#666]">{t.noProjectsDesc}</p>
          <button
            onClick={() => router.push("/project/workspace?name=New+Project&new=true")}
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#E8E8E5] px-4 py-2 text-[12px] font-medium text-[#1A1A1A] transition-all hover:bg-[#D4D4D0] active:scale-[0.98]"
          >
            {t.startFirstProject}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-1">
          {projects.map((project) => (
            <div key={project.id} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-all hover:bg-[#353535]">
              <button
                onClick={() => router.push(`/project/workspace?id=${project.id}`)}
                className="flex flex-1 items-center gap-3 min-w-0 text-left"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#353535] group-hover:bg-[#3A3A3A]">
                  <FolderOpen className="h-4 w-4 text-[#9A9A95]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-[#E8E8E5]">{project.name}</p>
                  <p className="text-[11px] text-[#666]">{project.lastOpened}</p>
                </div>
              </button>
              <button
                onClick={() => removeProject(project.id)}
                className="flex-shrink-0 rounded-lg p-1.5 text-[#555] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#3A2020] hover:text-[#DC2626]"
                title="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── New Project Panel (Unified) ──────────────────────
function NewProjectPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { lang } = useLangStore();
  const t = translations[lang];
  const [name, setName] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    router.push(`/project/workspace?name=${encodeURIComponent(name.trim())}`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#3A3A3A] px-5 py-4">
        <button onClick={onClose} className="rounded-lg p-1.5 text-[#666] hover:bg-[#3A3A3A] hover:text-[#9A9A95]">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-[16px] font-bold text-[#E8E8E5]">{t.npTitle}</h2>
          <p className="text-[11px] text-[#666]">Name your project, connect sources inside</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 py-6">
        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-[#E8E8E5]">{t.npProjectName}</label>
          <input
            type="text"
            placeholder={t.npProjectNamePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            className="w-full rounded-xl bg-[#353535] px-4 py-3 text-[14px] text-[#E8E8E5] ring-1 ring-white/[0.06] placeholder:text-[#666] focus:ring-white/[0.12] focus:outline-none"
            autoFocus
          />
        </div>

        <p className="mt-5 text-[11px] text-[#666]">
          You can connect Figma, local folders, and GitHub repos from inside the workspace.
        </p>
      </div>

      {/* Create */}
      <div className="border-t border-[#3A3A3A] px-5 py-4">
        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E8E8E5] px-4 py-3 text-[13px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#D4D4D0] active:scale-[0.98] disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" />
          {t.npCreate}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading, fetchUser, logout } = useAuthStore();
  const router = useRouter();
  const [activePage, setActivePage] = useState("home");
  const [showPanel, setShowPanel] = useState(false);
  const openPanel = () => setShowPanel(true);
  const closePanel = () => setShowPanel(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex min-h-screen bg-[#2C2C2C]">
      {/* Sidebar */}
      <Sidebar
        user={user}
        activePage={activePage}
        onNavigate={(page) => { setActivePage(page); closePanel(); }}
        onNewProject={openPanel}
        onOpenLocal={openPanel}
        logout={logout}
      />

      {/* Expandable panel next to sidebar */}
      <div
        className={`h-screen flex-shrink-0 overflow-hidden border-r border-[#3A3A3A] bg-[#232323] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          showPanel ? "w-[360px]" : "w-0"
        }`}
      >
        <div className={`h-full w-[360px] transition-opacity duration-200 ${showPanel ? "opacity-100 delay-100" : "opacity-0"}`}>
          {showPanel && (
            <NewProjectPanel onClose={closePanel} />
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div key={activePage} className="animate-fade-in px-8 py-8">
          {activePage === "home" && <HomeContent user={user} onNewProject={openPanel} onOpenLocal={openPanel} />}
          {activePage === "projects" && <ProjectsContent />}
          {activePage === "design" && <DesignSystemDashboard />}
        </div>
      </main>
    </div>
  );
}
