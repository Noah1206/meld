import { useState, useEffect, useRef } from "react";
import {
  Blend,
  LogOut,
  Plus,
  FolderOpen,
  Zap,
  Terminal,
  ArrowRight,
  Eye,
  HardDrive,
  Monitor,
  Github,
  MessageCircle,
  ArrowUpRight,
  Check,
  Figma,
  MousePointerClick,
  GitBranch,
  Sparkles,
  ChevronDown,
  Loader2,
  Server,
} from "lucide-react";

// MCP Server list
const MCP_SERVERS = [
  { id: "figma", name: "Figma", color: "#A259FF", letter: "F" },
  { id: "github", name: "GitHub", color: "#ffffff", letter: "G" },
  { id: "slack", name: "Slack", color: "#E01E5A", letter: "S" },
  { id: "notion", name: "Notion", color: "#ffffff", letter: "N" },
  { id: "linear", name: "Linear", color: "#5E6AD2", letter: "L" },
  { id: "supabase", name: "Supabase", color: "#3ECF8E", letter: "S" },
  { id: "vercel", name: "Vercel", color: "#ffffff", letter: "V" },
  { id: "sentry", name: "Sentry", color: "#362D59", letter: "S" },
];

interface DashboardPageProps {
  user: { name: string; avatar: string };
  onOpenProject: () => Promise<void>;
  onCreateProject: () => void;
  onLogout: () => void;
}

function useGreeting() {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return { text: "Burning the midnight oil", emoji: "\u{1F319}" };
    if (hour < 12) return { text: "Good morning", emoji: "\u2600\uFE0F" };
    if (hour < 18) return { text: "Good afternoon", emoji: "\u{1F525}" };
    return { text: "Good evening", emoji: "\u{1F306}" };
  };

  const [greeting, setGreeting] = useState(getGreeting);

  useEffect(() => {
    setGreeting(getGreeting());
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return greeting;
}

function ProfilePopover({
  user,
  onLogout,
}: {
  user: { name: string; avatar: string };
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={popoverRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#F5F5F4]"
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1A1A] text-[11px] font-semibold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-[13px] font-medium text-[#1A1A1A]">
          {user.name}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-[#B4B4B0] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-[#E8E8E4] bg-white shadow-lg">
          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-[#1A1A1A] transition-colors hover:bg-[#F5F5F4]"
            >
              <LogOut className="h-4 w-4 text-[#787774]" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardPage({
  user,
  onOpenProject,
  onCreateProject,
  onLogout,
}: DashboardPageProps) {
  const greeting = useGreeting();
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenProject = async () => {
    setIsOpening(true);
    try {
      await onOpenProject();
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="animate-fade-in min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
              <Blend className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[16px] font-semibold text-[#1A1A1A]">Meld</span>
          </div>
          <div className="relative flex items-center gap-3">
            <ProfilePopover user={user} onLogout={onLogout} />
          </div>
        </div>
      </header>

      <main className="px-6 pt-10 pb-20">
        {/* Greeting + connection status */}
        <div className="animate-fade-in-up mb-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{greeting.emoji}</span>
            <div>
              <p className="text-[13px] text-[#787774]">{greeting.text}</p>
              <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
                What shall we build?
              </h1>
            </div>
          </div>

          {/* MCP Servers */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-3.5 w-3.5 text-[#787774]" />
              <span className="text-[12px] font-medium text-[#787774]">MCP Servers</span>
              <span className="text-[10px] text-[#B4B4B0]">— Connect external tools via MCP</span>
            </div>
            <div className="flex items-center gap-2">
              {MCP_SERVERS.slice(0, 6).map((server) => (
                <div
                  key={server.id}
                  className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#2C2C2C] transition-all hover:scale-110 hover:bg-[#3A3A3A] cursor-pointer"
                  title={server.name}
                >
                  <span
                    className="text-[14px] font-bold"
                    style={{ color: server.color }}
                  >
                    {server.letter}
                  </span>
                  {/* Show name on hover */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="whitespace-nowrap rounded bg-[#1A1A1A] px-1.5 py-0.5 text-[9px] text-white shadow">
                      {server.name}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-[#D4D4D0] text-[#B4B4B0] transition-colors hover:border-[#787774] hover:text-[#787774] cursor-pointer">
                <Plus className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick action bar */}
        <div className="animate-fade-in-up mb-8 flex items-center gap-2 overflow-x-auto" style={{ animationDelay: "75ms" }}>
          <button
            onClick={onCreateProject}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-3.5 py-2 text-[12px] font-medium text-[#787774] transition-all hover:bg-[#EEEEEC] hover:text-[#1A1A1A] active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            New Project
          </button>
          <button
            onClick={handleOpenProject}
            disabled={isOpening}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-3.5 py-2 text-[12px] font-medium text-[#787774] transition-all hover:bg-[#EEEEEC] hover:text-[#1A1A1A] active:scale-[0.98] disabled:opacity-50"
          >
            {isOpening ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FolderOpen className="h-3.5 w-3.5" />
            )}
            Open Folder
          </button>
        </div>

        {/* Main cards */}
        <div className="animate-fade-in-up grid gap-5 sm:grid-cols-2" style={{ animationDelay: "150ms" }}>
          {/* Card 1: Edit Figma Design (web-only notice) */}
          <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-[#F7F7F5] ring-1 ring-black/[0.04] transition-all duration-300 hover:bg-[#F0F0EE] hover:ring-black/[0.06]">
            <div className="relative flex-1 p-6">
              <h3 className="text-[24px] font-bold tracking-[-0.02em] text-[#1A1A1A]">Edit Figma Design</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#787774]">
                Paste a Figma URL and click — that&apos;s it.
                <br />
                AI modifies code and pushes to GitHub.
              </p>

              {/* Visual flow */}
              <div className="mt-6 flex items-center gap-2 text-[11px]">
                {[
                  { icon: Figma, label: "URL", color: "#787774" },
                  { icon: MousePointerClick, label: "Select", color: "#787774" },
                  { icon: Zap, label: "AI", color: "#787774" },
                  { icon: GitBranch, label: "Push", color: "#787774" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5">
                      <step.icon className="h-3 w-3" style={{ color: step.color }} />
                      <span className="text-[#787774]">{step.label}</span>
                    </div>
                    {i < 3 && <ArrowRight className="h-3 w-3 text-[#D4D4D0]" />}
                  </div>
                ))}
              </div>

              {/* Supported frameworks */}
              <div className="mt-4 flex items-center gap-1.5">
                <span className="text-[10px] text-[#B4B4B0]">Supported:</span>
                {["React", "Vue", "Next.js", "Angular"].map((fw) => (
                  <span key={fw} className="rounded bg-white/60 px-1.5 py-0.5 text-[10px] text-[#787774]">{fw}</span>
                ))}
              </div>
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => {
                  window.open("https://meld.dev/dashboard", "_blank");
                }}
                className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[13px] font-medium text-[#787774] transition-all hover:bg-[#FAFAFA] hover:text-[#1A1A1A] active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4 transition-transform group-hover/btn:rotate-12" />
                Open in Web App
                <ArrowRight className="h-3.5 w-3.5 text-[#D4D4D0] transition-transform group-hover/btn:translate-x-0.5" />
              </button>
              <p className="mt-2 text-center text-[11px] text-[#B4B4B0]">
                Figma mode is available in the web app
              </p>
            </div>
          </div>

          {/* Card 2: Edit Local Project */}
          <div className="group relative flex flex-col rounded-2xl bg-[#F7F7F5] ring-1 ring-black/[0.04] transition-all duration-300 hover:bg-[#F0F0EE] hover:ring-black/[0.06]">
            <div className="relative flex-1 p-6">
              <h3 className="text-[24px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
                Edit Local Project
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#787774]">
                Open and edit local folders directly.
                <br />
                Native file access, no agent install.
              </p>

              {/* Visual flow */}
              <div className="mt-6 flex items-center gap-2 text-[11px]">
                {[
                  { icon: FolderOpen, label: "Folder", color: "#787774" },
                  { icon: Monitor, label: "Desktop", color: "#787774" },
                  { icon: Zap, label: "AI", color: "#787774" },
                  { icon: HardDrive, label: "Save", color: "#787774" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5">
                      <step.icon className="h-3 w-3" style={{ color: step.color }} />
                      <span className="text-[#787774]">{step.label}</span>
                    </div>
                    {i < 3 && <ArrowRight className="h-3 w-3 text-[#D4D4D0]" />}
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-1 text-[10px] text-[#787774]">
                  <Eye className="h-3 w-3 text-[#B4B4B0]" />
                  Live Preview
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#787774]">
                  <Zap className="h-3 w-3 text-[#B4B4B0]" />
                  Hot Reload
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#787774]">
                  <HardDrive className="h-3 w-3 text-[#B4B4B0]" />
                  Local Files
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={handleOpenProject}
                disabled={isOpening}
                className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-3 text-[13px] font-semibold text-white transition-all hover:bg-[#24282E] active:scale-[0.98] disabled:opacity-40"
              >
                {isOpening ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                )}
                Open Project Folder
                <ArrowRight className="h-3.5 w-3.5 text-[#787774] transition-transform group-hover/btn:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* My Projects */}
        <div className="animate-fade-in-up mt-14" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">My Projects</h2>
            <span className="text-[11px] text-[#B4B4B0]">0 projects</span>
          </div>
          <div className="mt-4 rounded-2xl bg-[#F7F7F5] p-14 text-center ring-1 ring-black/[0.04] transition-colors hover:bg-[#F0F0EE]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
              <span className="text-2xl">{"\u{1F4C2}"}</span>
            </div>
            <p className="text-[14px] font-medium text-[#787774]">No projects yet</p>
            <p className="mt-1 text-[12px] text-[#B4B4B0]">Open a local folder above to get started</p>
            <button
              onClick={handleOpenProject}
              className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1A1A1A] underline decoration-[#E0E0DC] underline-offset-2 transition-colors hover:decoration-[#1A1A1A]"
            >
              Start your first project
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Bottom resource links */}
        <div className="animate-fade-in-up mt-14 grid gap-3 sm:grid-cols-2" style={{ animationDelay: "600ms" }}>
          {[
            {
              icon: Github,
              title: "GitHub",
              desc: "Source code & issue tracker",
              href: "https://github.com/meld-dev",
              color: "#787774",
              bg: "#F7F7F5",
            },
            {
              icon: MessageCircle,
              title: "Community",
              desc: "Ask questions on Discord",
              href: "https://discord.gg/meld",
              color: "#787774",
              bg: "#F7F7F5",
            },
          ].map((resource) => (
            <a
              key={resource.href}
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl bg-[#F7F7F5] p-4 ring-1 ring-black/[0.04] transition-all hover:bg-[#F0F0EE] hover:ring-black/[0.06]"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: resource.bg }}
              >
                <resource.icon className="h-4 w-4" style={{ color: resource.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#1A1A1A]">{resource.title}</p>
                <p className="text-[11px] text-[#B4B4B0]">{resource.desc}</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#D4D4D0] transition-colors group-hover:text-[#787774]" />
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
