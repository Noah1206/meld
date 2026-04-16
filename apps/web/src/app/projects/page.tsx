"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMCPStore } from "@/lib/store/mcp-store";
import { useLangStore } from "@/lib/store/lang-store";
import { DesignSystemDashboard } from "@/components/design-system/DesignSystemDashboard";
import { SkillsMarketplace } from "@/app/project/workspace/page";
import Image from "next/image";

const MCP_SERVERS = [
  {
    id: "github", name: "GitHub", logo: "/mcp-icons/github.svg",
    desc: "Search code, browse files, detect frameworks, and create PRs",
    benefits: ["Browse repos and file trees directly from AI", "Search code across all repositories", "Auto-detect frameworks and dependencies", "Create pull requests and commits"],
    auth: "oauth" as const,
    brandBg: "bg-[#2A2D32]", brandBgHover: "hover:bg-[#363A40]",
  },
  {
    id: "figma", name: "Figma", logo: "/mcp-icons/figma.svg",
    desc: "Extract design tokens, browse node trees, and render frame images",
    benefits: ["Read design files and component structures", "Render frames as high-quality images", "Extract colors, typography, and spacing tokens", "Navigate layer hierarchy and auto-layout"],
    auth: "oauth" as const,
    brandBg: "bg-[#2D1B4E]", brandBgHover: "hover:bg-[#3D2560]",
  },
  {
    id: "vercel", name: "Vercel", logo: "/mcp-icons/vercel.svg",
    desc: "Check deploy previews, manage env variables, and read build logs",
    benefits: ["List all deployments and preview URLs", "Read and update environment variables", "Check build logs and deployment status", "Trigger redeployments from chat"],
    auth: "oauth" as const,
    brandBg: "bg-[#2A2A2A]", brandBgHover: "hover:bg-[#363636]",
  },
  {
    id: "supabase", name: "Supabase", logo: "/mcp-icons/supabase.svg",
    desc: "Read DB schemas and table structures to generate accurate queries",
    benefits: ["Read database schemas and table definitions", "Query table data with SQL", "Manage auth users and sessions", "Access storage buckets and files"],
    auth: "token" as const,
    brandBg: "bg-[#1A3A2A]", brandBgHover: "hover:bg-[#224D36]",
  },
  {
    id: "sentry", name: "Sentry", logo: "/mcp-icons/sentry.svg",
    desc: "Analyze errors and stack traces to automatically identify bug causes",
    benefits: ["List recent errors with full stack traces", "Identify most frequent exceptions", "View performance data and slow transactions", "AI auto-diagnoses root cause from traces"],
    auth: "oauth" as const,
    brandBg: "bg-[#3D1F1F]", brandBgHover: "hover:bg-[#4D2828]",
  },
  {
    id: "linear", name: "Linear", logo: "/mcp-icons/linear.svg",
    desc: "Pass issue and project context to AI for task-based code edits",
    benefits: ["List issues, projects, and cycles", "Read issue descriptions and comments", "Update issue status from chat", "AI generates code based on issue specs"],
    auth: "oauth" as const,
    brandBg: "bg-[#1E2A4A]", brandBgHover: "hover:bg-[#283660]",
  },
  {
    id: "notion", name: "Notion", logo: "/mcp-icons/notion.svg",
    desc: "Read specs and docs so AI generates code matching requirements",
    benefits: ["Search pages and databases", "Read full page content and properties", "Access workspace structure and hierarchy", "AI references docs while generating code"],
    auth: "oauth" as const,
    brandBg: "bg-[#2A2A2A]", brandBgHover: "hover:bg-[#363636]",
  },
  {
    id: "slack", name: "Slack", logo: "/mcp-icons/slack.svg",
    desc: "Search channel messages to bring team discussion context into code",
    benefits: ["List channels and conversations", "Read message history and threads", "Search messages by keyword or user", "Bring team context into AI code generation"],
    auth: "oauth" as const,
    brandBg: "bg-[#3D3520]", brandBgHover: "hover:bg-[#4D4228]",
  },
  {
    id: "gmail", name: "Gmail", logo: "/mcp-icons/gmail.svg",
    desc: "Draft replies, summarize threads, and search your inbox",
    benefits: ["Read email threads and attachments", "Draft and send replies from chat", "Search inbox by sender, subject, or date", "Summarize long email chains instantly"],
    auth: "oauth" as const,
    brandBg: "bg-[#3D2020]", brandBgHover: "hover:bg-[#4D2828]",
  },
  {
    id: "filesystem", name: "Filesystem", logo: "/mcp-icons/filesystem.svg",
    desc: "Let AI read and write files directly on your local filesystem",
    benefits: ["Read files and directory structures", "Write and modify files in place", "Watch for file changes in real time", "Full local project access for AI"],
    auth: "none" as const,
    brandBg: "bg-[#3D3520]", brandBgHover: "hover:bg-[#4D4228]",
  },
  {
    id: "canva", name: "Canva", logo: "/mcp-icons/canva.svg",
    desc: "Search, create, autofill, and export Canva designs",
    benefits: ["Search existing Canva designs", "Create new designs from templates", "Autofill brand content into templates", "Export designs as images or PDFs"],
    auth: "oauth" as const,
    brandBg: "bg-[#1E3A4A]", brandBgHover: "hover:bg-[#284A5A]",
  },
  {
    id: "agent-bridge", name: "Agent Bridge", logo: "/mcp-icons/meld.svg",
    desc: "Let external AI agents (Cursor, Copilot) control Meld",
    benefits: ["Receive commands from Cursor or Copilot", "Execute Meld operations remotely", "Sync file changes across editors", "Bridge multiple AI coding assistants"],
    auth: "token" as const,
    brandBg: "bg-[#1A3A2A]", brandBgHover: "hover:bg-[#224D36]",
  },
  {
    id: "stripe", name: "Stripe", logo: "/mcp-icons/stripe.svg",
    desc: "Add payments, subscriptions, and billing to your app",
    benefits: ["Create checkout sessions and payment links", "Manage subscriptions and recurring billing", "Handle webhooks for payment events", "Support cards, wallets, and 135+ currencies"],
    auth: "token" as const,
    brandBg: "bg-[#1A1A4A]", brandBgHover: "hover:bg-[#24245A]",
  },
  {
    id: "toss-payments", name: "Toss Payments", logo: "/mcp-icons/toss.svg",
    desc: "한국 결제 — 카드, 계좌이체, 간편결제 (토스페이먼츠)",
    benefits: ["카드 결제, 계좌이체, 가상계좌 지원", "토스페이, 카카오페이 등 간편결제", "정기결제(구독) 및 빌링키 관리", "한국 사업자 정산 및 세금계산서"],
    auth: "token" as const,
    brandBg: "bg-[#1A2A4A]", brandBgHover: "hover:bg-[#243660]",
  },
  {
    id: "portone", name: "PortOne", logo: "/mcp-icons/portone.svg",
    desc: "통합 PG — Toss, KG이니시스, NHN KCP 등 한국 결제 연동",
    benefits: ["하나의 SDK로 여러 PG사 연동", "토스, KG이니시스, NHN KCP, 나이스페이 등", "해외 결제 (PayPal, Stripe) 동시 지원", "V2 API로 간편한 결제 연동"],
    auth: "token" as const,
    brandBg: "bg-[#2A1A3A]", brandBgHover: "hover:bg-[#3A2450]",
  },
];
import {
  MessageSquare, FolderOpen, Blocks, Zap, CheckSquare, Package, Palette,
  Settings, Sun, Moon, Blend, Plus, Code, Globe, Layout, ArrowRight,
  Clock, Loader2, Search, Star, User, Users, ChevronDown, Check, X, ExternalLink, Sparkles,
} from "lucide-react";

// ─── Theme — shared implementation ──────────────────────
import { useThemePref as useTheme } from "@/lib/hooks/useThemePref";
import { AgentsSidebar } from "@/app/agents/_components/AgentsSidebar";

// ─── Recent Projects ──────────────────────
interface RecentProject {
  id?: string;
  name: string;
  path?: string;
  projectPath?: string;
  framework?: string | null;
  lastOpened: number | string;
  prompt?: string;
}

function getRecentProjects(): RecentProject[] {
  try {
    // Merge workspace-saved projects + prompt-based history
    const wsProjects = JSON.parse(localStorage.getItem("meld-recent-projects") || "[]");
    const promptHistory = JSON.parse(localStorage.getItem("meld-prompt-history") || "[]");
    // Combine, dedupe by name, sort by recency
    const all = [...promptHistory, ...wsProjects];
    const seen = new Set<string>();
    return all.filter((p: RecentProject) => {
      const key = p.name || p.prompt || "";
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);
  } catch { return []; }
}

function formatDate(ts: number) {
  const diffDays = Math.floor((Date.now() - ts) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(ts).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}


// ─── Content (needs Suspense for useSearchParams) ──────────────────────
// ─── MCP Detail Modal for /projects ──────────────────────
function MCPDetailModalProjects({ server, isDark, onClose, onConnect, onDisconnect }: {
  server: typeof MCP_SERVERS[number];
  isDark: boolean;
  onClose: () => void;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
}) {
  const mcpStore = useMCPStore();
  const srv = mcpStore.servers.find(s => s.adapterId === server.id);
  const isConnected = srv?.connected ?? false;
  const isConnecting = srv?.connecting ?? false;
  const toolCount = srv?.toolCount ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-md rounded-2xl shadow-2xl ring-1 ${isDark ? "bg-[#1A1A1A] ring-white/[0.08]" : "bg-white ring-black/[0.06]"}`} onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <div className="flex justify-end px-5 pt-5">
          <button onClick={onClose} className={`rounded-lg p-1.5 transition-colors ${isDark ? "text-[#555] hover:bg-[#333] hover:text-[#aaa]" : "text-[#999] hover:bg-[#F0F0EE] hover:text-[#666]"}`}>
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Logo + Name + Desc */}
        <div className="flex flex-col items-center px-8 pb-6">
          <div className={`flex h-[72px] w-[72px] items-center justify-center rounded-2xl ring-1 ${isDark ? "bg-[#111] ring-white/[0.06]" : "bg-[#F0F0EE] ring-black/[0.04]"}`}>
            <Image src={server.logo} alt={server.name} width={36} height={36} className="rounded" />
          </div>
          <h3 className={`mt-5 text-[22px] font-bold ${isDark ? "text-white" : "text-[#1A1A1A]"}`}>{server.name}</h3>
          <p className={`mt-2 text-center text-[16px] leading-relaxed ${isDark ? "text-[#999]" : "text-[#666]"}`}>
            {server.desc}
          </p>

          {/* Connect / Disconnect button */}
          {isConnected ? (
            <div className="mt-6 flex items-center gap-3">
              <span className={`flex items-center gap-2 rounded-full px-4 py-2 text-[16px] font-semibold ${isDark ? "bg-[#252525] text-white" : "bg-[#F0F0EE] text-[#1A1A1A]"}`}>
                <Check className="h-4 w-4 text-emerald-500" />
                Connected · {toolCount} tools
              </span>
              <button onClick={() => onDisconnect(server.id)}
                className="rounded-full px-4 py-2 text-[16px] font-medium text-red-400 hover:bg-red-500/10 transition-colors">
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => onConnect(server.id)}
              disabled={isConnecting}
              className={`mt-6 flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold transition-all active:scale-[0.97] disabled:opacity-50 ${isDark ? "bg-white text-[#1A1A1A] hover:bg-[#E8E8E5]" : "bg-[#1A1A1A] text-white hover:bg-[#333]"}`}
            >
              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Connect {server.name}
            </button>
          )}
        </div>

        {/* Benefits list */}
        <div className={`border-t px-8 py-6 ${isDark ? "border-[#2A2A2A]" : "border-[#F0F0EE]"}`}>
          <p className={`text-[16px] font-semibold mb-4 ${isDark ? "text-[#888]" : "text-[#999]"}`}>
            What you get with {server.name}
          </p>
          <div className="space-y-3">
            {server.benefits.map((b) => (
              <div key={b} className="flex items-start gap-3">
                <Check className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                <span className={`text-[16px] leading-snug ${isDark ? "text-[#ccc]" : "text-[#444]"}`}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auth info */}
        <div className={`border-t px-8 py-4 flex items-center justify-between ${isDark ? "border-[#2A2A2A]" : "border-[#F0F0EE]"}`}>
          <span className={`text-[16px] ${isDark ? "text-[#666]" : "text-[#999]"}`}>
            {server.auth === "oauth" ? `OAuth login via ${server.name}` : server.auth === "token" ? "API token required" : "No authentication needed"}
          </span>
          <ExternalLink className={`h-3.5 w-3.5 ${isDark ? "text-[#555]" : "text-[#CCC]"}`} />
        </div>
      </div>
    </div>
  );
}

// ─── MCP Servers Tab — Connectors layout ──────────────────────
// ─── Category Dropdown (Website / App / Service / Tool) ───
function CategoryDropdown({ isDark }: { isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: string; label: string; icon: React.ReactNode }>({
    id: "website", label: "Website", icon: <Globe className="h-3.5 w-3.5" />,
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categories = [
    { id: "website", label: "Website", icon: <Globe className="h-3.5 w-3.5" />, desc: "Landing pages, portfolios, blogs" },
    { id: "app", label: "Web App", icon: <Layout className="h-3.5 w-3.5" />, desc: "Dashboards, SaaS, tools" },
    { id: "service", label: "API Service", icon: <Code className="h-3.5 w-3.5" />, desc: "REST APIs, backends, servers" },
    { id: "tool", label: "CLI Tool", icon: <Settings className="h-3.5 w-3.5" />, desc: "Scripts, automation, dev tools" },
  ];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`no-hover-fill flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[16px] font-medium transition-all duration-200 ${isDark ? "bg-transparent text-[#ccc] hover:bg-white/[0.06]" : "bg-transparent text-[#666] hover:bg-black/[0.04]"}`}
      >
        {selected.icon}
        {selected.label}
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""} ${isDark ? "text-[#666]" : "text-[#999]"}`} />
      </button>

      {open && (
        <div className={`animate-pop-in absolute bottom-full left-0 mb-2 w-[200px] rounded-xl p-1 shadow-2xl z-[100] ${isDark ? "bg-[#1A1A1A] ring-1 ring-white/[0.08]" : "bg-white ring-1 ring-black/[0.08]"}`}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelected(cat); setOpen(false); }}
              className={`no-hover-fill flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-150 ${
                selected.id === cat.id
                  ? isDark ? "bg-white/[0.08] text-white" : "bg-black/[0.05] text-[#1A1A1A]"
                  : isDark ? "text-[#999] hover:bg-white/[0.04] hover:text-white" : "text-[#666] hover:bg-black/[0.02] hover:text-[#1A1A1A]"
              }`}
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-md ${isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"}`}>
                {cat.icon}
              </div>
              <span className="text-[13px] font-medium">{cat.label}</span>
              {selected.id === cat.id && <Check className={`ml-auto h-3.5 w-3.5 ${isDark ? "text-white" : "text-[#1A1A1A]"}`} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MCPContent({ isDark }: { isDark: boolean }) {
  const mcpStore = useMCPStore();
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const sharedServers = MCP_SERVERS.slice(0, 8);
  const personalServers = MCP_SERVERS.slice(8);

  const filteredShared = searchQuery
    ? sharedServers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    : sharedServers;
  const filteredPersonal = searchQuery
    ? personalServers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    : personalServers;

  const handleConnect = (id: string) => {
    if (!mcpStore.getServer(id)) {
      mcpStore.addServer({ adapterId: id, name: id, icon: id, category: "custom" });
    }
    mcpStore.setConnecting(id);
    // Simulate connect (in real app this would call mcpConnectMutation)
    fetch("/api/mcp/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adapterId: id }),
    }).then(r => r.ok ? r.json() : Promise.reject(r)).then(data => {
      mcpStore.setConnected(id, data?.toolCount ?? 0, data?.meta ?? {});
    }).catch(() => {
      mcpStore.setError(id, "Failed to connect. Please try again.");
    });
  };

  const handleDisconnect = (id: string) => {
    mcpStore.setDisconnected(id);
  };

  const selectedMCP = selectedServer ? MCP_SERVERS.find(s => s.id === selectedServer) : null;

  return (
    <motion.div key="mcp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="w-full px-10 py-10 max-w-5xl mx-auto">
      {/* Header: title + search */}
      <div className="flex items-center justify-between mb-7">
        <h1 className={`text-[28px] font-bold tracking-[-0.02em] ${isDark ? "text-white" : "text-[#1A1A1A]"}`}>Connectors</h1>
        <div className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-[16px] ${isDark ? "bg-[#252525] ring-1 ring-white/[0.08] text-[#888] focus-within:ring-white/[0.15]" : "bg-[#F7F7F5] ring-1 ring-black/[0.06] text-[#9A9A95]"} transition-all`}>
          <Search className="h-4 w-4 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`bg-transparent outline-none text-[16px] w-32 ${isDark ? "text-white placeholder:text-[#666]" : "text-[#1A1A1A] placeholder:text-[#999]"}`}
          />
        </div>
      </div>

      <div className={`h-px mb-8 ${isDark ? "bg-[#333]" : "bg-[#E8E8E5]"}`} />

      {/* Shared connectors */}
      <h2 className={`text-[18px] font-bold mb-2 ${isDark ? "text-white" : "text-[#1A1A1A]"}`}>Shared connectors</h2>
      <p className={`text-[16px] mb-6 ${isDark ? "text-[#888]" : "text-[#777]"}`}>Add functionality to your apps. Configured once by admins, available to everyone in your workspace.</p>

      <div className="grid grid-cols-3 gap-4">
        {filteredShared.map((ws) => {
          const srv = mcpStore.servers.find(s => s.adapterId === ws.id);
          const isConnected = srv?.connected ?? false;
          const isConnecting = srv?.connecting ?? false;
          const toolCount = srv?.toolCount ?? 0;
          const hasError = !!srv?.error;
          return (
            <button
              key={ws.id}
              onClick={() => setSelectedServer(ws.id)}
              className={`group flex flex-col rounded-2xl px-6 py-6 text-left transition-all duration-150 active:scale-[0.98] cursor-pointer ${isDark ? "bg-[#1E1E1E] hover:bg-[#282828] ring-1 ring-white/[0.06]" : "bg-[#F7F7F5] hover:bg-[#F0F0EE] ring-1 ring-black/[0.04]"}`}
            >
              {/* Top row: icon + enabled badge */}
              <div className="flex items-start justify-between w-full mb-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDark ? "bg-[#111]" : "bg-[#E8E8E5]"}`}>
                  {isConnecting ? <Loader2 className="h-6 w-6 animate-spin text-[#aaa]" /> : <Image src={ws.logo} alt={ws.name} width={24} height={24} className="rounded" />}
                </div>
                {isConnected && (
                  <span className="text-[16px] font-bold text-emerald-400">Enabled</span>
                )}
              </div>
              {/* Name */}
              <p className={`text-[16px] font-bold ${isDark ? "text-white" : "text-[#1A1A1A]"}`}>{ws.name}</p>
              {/* Description */}
              <p className={`mt-1.5 text-[16px] leading-relaxed line-clamp-2 ${hasError ? "text-red-400" : isDark ? "text-[#999]" : "text-[#777]"}`}>
                {srv?.error ?? (isConnected ? `Connected · ${toolCount} tools` : ws.desc)}
              </p>
            </button>
          );
        })}

      </div>

      {/* Personal connectors */}
      <h2 className={`text-[18px] font-bold mb-2 mt-12 ${isDark ? "text-white" : "text-[#1A1A1A]"}`}>Personal connectors</h2>
      <div className="flex items-center gap-4 mb-6">
        <p className={`text-[16px] ${isDark ? "text-[#888]" : "text-[#777]"}`}>Add connectors that add context while you build.</p>
        <span className={`text-[16px] font-semibold flex items-center gap-1 cursor-pointer underline decoration-1 underline-offset-2 ${isDark ? "text-white hover:text-[#ccc]" : "text-[#1A1A1A] hover:text-[#555]"}`}>
          Read more <span className="text-[16px]">&#8599;</span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filteredPersonal.map((ws) => {
          const srv = mcpStore.servers.find(s => s.adapterId === ws.id);
          const isConnected = srv?.connected ?? false;
          const isConnecting = srv?.connecting ?? false;
          const toolCount = srv?.toolCount ?? 0;
          const hasError = !!srv?.error;
          return (
            <button
              key={ws.id}
              onClick={() => setSelectedServer(ws.id)}
              className={`group flex flex-col rounded-2xl px-6 py-6 text-left transition-all duration-150 active:scale-[0.98] cursor-pointer ${isDark ? "bg-[#1E1E1E] hover:bg-[#282828] ring-1 ring-white/[0.06]" : "bg-[#F7F7F5] hover:bg-[#F0F0EE] ring-1 ring-black/[0.04]"}`}
            >
              <div className="flex items-start w-full mb-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDark ? "bg-[#111]" : "bg-[#E8E8E5]"}`}>
                  {isConnecting ? <Loader2 className="h-6 w-6 animate-spin text-[#aaa]" /> : <Image src={ws.logo} alt={ws.name} width={24} height={24} className="rounded" />}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <p className={`text-[16px] font-bold ${isDark ? "text-white" : "text-[#1A1A1A]"}`}>{ws.name}</p>
                <span className={`rounded px-2 py-0.5 text-[16px] font-bold ${isDark ? "bg-[#333] text-[#bbb]" : "bg-[#E5E7EB] text-[#555]"}`}>MCP</span>
              </div>
              <p className={`mt-1.5 text-[16px] leading-relaxed line-clamp-2 ${hasError ? "text-red-400" : isDark ? "text-[#999]" : "text-[#777]"}`}>
                {srv?.error ?? (isConnected ? `Connected · ${toolCount} tools` : ws.desc)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedMCP && (
        <MCPDetailModalProjects
          server={selectedMCP}
          isDark={isDark}
          onClose={() => setSelectedServer(null)}
          onConnect={(id) => { handleConnect(id); }}
          onDisconnect={(id) => { handleDisconnect(id); setSelectedServer(null); }}
        />
      )}
    </motion.div>
  );
}

// ─── Skills & Plugins Tab — uses existing SkillsMarketplace ──────────────────────
function SkillsContent({ isDark }: { isDark: boolean }) {
  const t = { textSub: isDark ? "text-[#9A9A95]" : "text-[#787774]", textHeading: isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]", textMuted: isDark ? "text-[#666]" : "text-[#B4B4B0]" };
  return (
    <motion.div key="skills" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="w-full h-full overflow-y-auto">
      <SkillsMarketplace isDark={isDark} t={t} />
    </motion.div>
  );
}

// ─── Design System Tab — uses existing DesignSystemDashboard ──────────────────────
function DesignContent() {
  return (
    <motion.div key="design" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="w-full h-full">
      <DesignSystemDashboard />
    </motion.div>
  );
}

// ─── Settings Tab ──────────────────────
function SettingsContent({ isDark, toggleTheme, onOpenTab, plan }: { isDark: boolean; toggleTheme: () => void; onOpenTab: (tab: string) => void; plan: string }) {
  const { lang, setLang } = useLangStore();

  return (
    <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="w-full px-8 py-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <Settings className={`h-4 w-4 ${isDark ? "text-[#888]" : "text-[#787774]"}`} />
        <h1 className={`text-[28px] font-bold tracking-[-0.03em] ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>Settings</h1>
      </div>
      <p className={`text-[16px] mb-8 ${isDark ? "text-[#666]" : "text-[#999]"}`}>Configure your workspace preferences.</p>
      <div className="space-y-6">
        <div className={`rounded-2xl px-6 py-5 ring-1 ${isDark ? "ring-white/[0.06]" : "ring-black/[0.04]"}`}>
          <h2 className={`text-[16px] font-bold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>AI Model</h2>
          <p className={`text-[16px] mb-4 ${isDark ? "text-[#666]" : "text-[#999]"}`}>Default model for code generation.</p>
          <select className={`w-full rounded-xl px-4 py-2.5 text-[16px] outline-none ring-1 ${isDark ? "bg-[#1A1A1A] ring-white/[0.06] text-[#E8E8E5]" : "bg-white ring-black/[0.04] text-[#1A1A1A]"}`}>
            <option>Claude Sonnet 4 (Recommended)</option>
            <option>Claude Opus 4</option>
            <option>GPT-4o</option>
            <option>Gemini 2.5 Pro</option>
          </select>
        </div>
        <div className={`rounded-2xl px-6 py-5 ring-1 ${isDark ? "ring-white/[0.06]" : "ring-black/[0.04]"}`}>
          <h2 className={`text-[16px] font-bold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>Language</h2>
          <p className={`text-[16px] mb-4 ${isDark ? "text-[#666]" : "text-[#999]"}`}>AI response language and UI language.</p>
          <div className="flex gap-3">
            <button onClick={() => setLang("en")} className={`flex-1 rounded-xl px-4 py-2.5 text-[16px] font-bold ring-1 transition-all ${lang === "en" ? (isDark ? "ring-white/[0.12] bg-white/[0.06] text-[#E8E8E5]" : "ring-black/[0.12] bg-black/[0.04] text-[#1A1A1A]") : (isDark ? "ring-white/[0.04] text-[#555]" : "ring-black/[0.04] text-[#999]")}`}>English</button>
            <button onClick={() => setLang("ko")} className={`flex-1 rounded-xl px-4 py-2.5 text-[16px] font-bold ring-1 transition-all ${lang === "ko" ? (isDark ? "ring-white/[0.12] bg-white/[0.06] text-[#E8E8E5]" : "ring-black/[0.12] bg-black/[0.04] text-[#1A1A1A]") : (isDark ? "ring-white/[0.04] text-[#555]" : "ring-black/[0.04] text-[#999]")}`}>한국어</button>
          </div>
        </div>
        <div className={`rounded-2xl px-6 py-5 ring-1 ${isDark ? "ring-white/[0.06]" : "ring-black/[0.04]"}`}>
          <h2 className={`text-[16px] font-bold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>Theme</h2>
          <div className="flex gap-3 mt-3">
            <button onClick={toggleTheme} className={`flex-1 rounded-xl px-4 py-2.5 text-[16px] font-bold ring-1 transition-all ${isDark ? "ring-white/[0.12] bg-white/[0.06] text-[#E8E8E5]" : "ring-black/[0.04] text-[#999]"}`}>Dark</button>
            <button onClick={toggleTheme} className={`flex-1 rounded-xl px-4 py-2.5 text-[16px] font-bold ring-1 transition-all ${!isDark ? "ring-black/[0.12] bg-black/[0.04] text-[#1A1A1A]" : "ring-white/[0.04] text-[#555]"}`}>Light</button>
          </div>
        </div>
        <div className={`rounded-2xl px-6 py-5 ring-1 ${isDark ? "ring-white/[0.06]" : "ring-black/[0.04]"}`}>
          <h2 className={`text-[16px] font-bold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>Account</h2>
          <p className={`text-[13px] mb-4 ${isDark ? "text-[#666]" : "text-[#999]"}`}>
            Current plan: <span className={`font-bold ${plan === "pro" ? "text-violet-400" : plan === "unlimited" ? "text-amber-400" : isDark ? "text-[#999]" : "text-[#555]"}`}>{plan === "pro" ? "Pro" : plan === "unlimited" ? "Unlimited" : "Free"}</span>
          </p>
          <div className="flex gap-3">
            {plan === "free" && (
              <button
                onClick={() => window.location.href = "/pricing"}
                className="rounded-xl px-4 py-2.5 text-[14px] font-bold text-white bg-violet-600 hover:bg-violet-700 transition-all"
              >
                Upgrade to Pro
              </button>
            )}
            <button className={`rounded-xl px-4 py-2.5 text-[14px] font-bold ring-1 transition-all ${isDark ? "ring-white/[0.06] text-[#888] hover:bg-white/[0.04]" : "ring-black/[0.04] text-[#787774]"}`}>Manage Subscription</button>
            <button onClick={() => { fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.href = "/"; }); }} className="rounded-xl px-4 py-2.5 text-[14px] font-bold text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/10 transition-all">Sign Out</button>
          </div>
        </div>

        {/* Tools */}
        <div className={`rounded-2xl px-6 py-5 ring-1 ${isDark ? "ring-white/[0.06]" : "ring-black/[0.04]"}`}>
          <h2 className={`text-[16px] font-bold mb-4 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>Tools</h2>
          <div className="space-y-2">
            <button onClick={() => onOpenTab("mcp")} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${isDark ? "bg-white/[0.04] hover:bg-white/[0.06] text-[#ccc]" : "bg-black/[0.02] hover:bg-black/[0.04] text-[#1A1A1A]"}`}>
              <Zap className={`h-4 w-4 ${isDark ? "text-[#888]" : "text-[#787774]"}`} />
              <div>
                <p className="text-[14px] font-semibold">MCP Servers</p>
                <p className={`text-[12px] ${isDark ? "text-[#666]" : "text-[#999]"}`}>Connect external services</p>
              </div>
            </button>
            <button onClick={() => onOpenTab("marketplace")} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${isDark ? "bg-white/[0.04] hover:bg-white/[0.06] text-[#ccc]" : "bg-black/[0.02] hover:bg-black/[0.04] text-[#1A1A1A]"}`}>
              <Package className={`h-4 w-4 ${isDark ? "text-[#888]" : "text-[#787774]"}`} />
              <div>
                <p className="text-[14px] font-semibold">Skills & Plugins</p>
                <p className={`text-[12px] ${isDark ? "text-[#666]" : "text-[#999]"}`}>Install AI skills from GitHub</p>
              </div>
            </button>
            <button onClick={() => onOpenTab("design")} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${isDark ? "bg-white/[0.04] hover:bg-white/[0.06] text-[#ccc]" : "bg-black/[0.02] hover:bg-black/[0.04] text-[#1A1A1A]"}`}>
              <Palette className={`h-4 w-4 ${isDark ? "text-[#888]" : "text-[#787774]"}`} />
              <div>
                <p className="text-[14px] font-semibold">Design System</p>
                <p className={`text-[12px] ${isDark ? "text-[#666]" : "text-[#999]"}`}>Manage design tokens & styles</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page Content ──────────────────────
function ProjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDark, toggle: toggleTheme, mounted } = useTheme();
  const [mountedAt] = useState(() => Date.now());
  // Lazy initializer reads localStorage once — avoids setState-in-effect.
  const [projects, setProjects] = useState<RecentProject[]>(() =>
    typeof window === "undefined" ? [] : getRecentProjects()
  );
  // Read `?prompt=` from the URL once so the form is seeded without a later
  // setState-in-effect that would violate react-compiler rules.
  const initialPrompt = searchParams.get("prompt") ?? "";
  const [activeTab, setActiveTab] = useState("new");
  const [prompt, setPrompt] = useState(initialPrompt);
  const [autoRedirecting, setAutoRedirecting] = useState(false);
  const [username, setUsername] = useState("");
  const [plan, setPlan] = useState("free");
  const [dailyUsage, setDailyUsage] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(50);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoTriggered = useRef(false);

  // Auto-focus input when switching to new project tab
  useEffect(() => {
    if (activeTab === "new") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeTab]);

  useEffect(() => {
    // Fetch user info
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.user) {
        setUsername(data.user.githubUsername || "");
        setPlan(data.user.plan || "free");
        const limits: Record<string, number> = { free: 50, pro: 500, unlimited: 9999 };
        setDailyLimit(limits[data.user.plan] || 50);
      }
    }).catch(() => {});
    // Fetch daily usage
    fetch("/api/ai/usage").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.count != null) setDailyUsage(data.count);
    }).catch(() => {});
  }, []);

  // URL cleanup + focus for the seeded prompt. No setState here — the prompt
  // is already seeded via the useState initializer above.
  useEffect(() => {
    if (autoTriggered.current) return;
    if (!initialPrompt) return;
    autoTriggered.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("prompt");
    url.searchParams.delete("category");
    window.history.replaceState({}, "", url.toString());
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [initialPrompt]);

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    // Save to prompt history
    try {
      const history = JSON.parse(localStorage.getItem("meld-prompt-history") || "[]");
      const entry = { name: prompt.trim().slice(0, 50), prompt: prompt.trim(), lastOpened: Date.now() };
      localStorage.setItem("meld-prompt-history", JSON.stringify([entry, ...history.filter((h: { prompt: string }) => h.prompt !== prompt.trim())].slice(0, 10)));
      setProjects(getRecentProjects());
    } catch {}
    router.push(`/project/workspace?prompt=${encodeURIComponent(prompt.trim())}&category=website`);
  };

  if (!mounted) return null;

  // Show loading while auto-redirecting from landing
  if (autoRedirecting) {
    return (
      <div className={`flex h-screen items-center justify-center ${isDark ? "bg-[#1A1A1A]" : "bg-white"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1A1A]">
            <Blend className="h-4 w-4 text-white" />
          </div>
          <Loader2 className={`h-4 w-4 animate-spin ${isDark ? "text-[#555]" : "text-[#999]"}`} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex h-screen ${isDark ? "bg-[#1A1A1A]" : "bg-white"}`}
    >
      {/* Sidebar — shared across /agents and /projects */}
      <AgentsSidebar />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className={`flex flex-1 flex-col overflow-hidden m-3 ml-0 rounded-2xl ${isDark ? "bg-[#151515] ring-1 ring-white/[0.04]" : "bg-white ring-1 ring-black/[0.04]"}`}
      >

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
          {activeTab === "new" ? (
          <motion.div key="new-project" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="relative flex h-full flex-col items-center overflow-hidden px-8 pt-[22vh]">

            {/* Black hole background — image blended into bg */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 0.85, scale: 1 }}
                transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2"
                style={{ width: "120%", maxWidth: 1400 }}
              >
                <img
                  src="/blackhole.png"
                  alt=""
                  className="w-full h-auto select-none"
                  draggable={false}
                  style={{ filter: "blur(6px) saturate(0.7) brightness(0.8)", mixBlendMode: "screen" }}
                />
              </motion.div>
              {/* Heavy radial vignette — blends edges seamlessly */}
              <div className="absolute inset-0" style={{
                background: "radial-gradient(ellipse 55% 45% at 50% 58%, transparent 0%, #151515 100%)",
              }} />
              {/* Top/bottom fade */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-[#151515]" style={{ opacity: 0.7 }} />
            </div>

            <div className="relative w-full max-w-3xl">
              {/* Title */}
              <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.2, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-10">
                <h1 className={`text-[38px] font-bold tracking-[-0.03em] ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                  AI builds everything for you
                </h1>
                <p className={`mt-3 text-[16px] ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>
                  Just describe it — Meld AI plans, builds, tests, and delivers working code
                </p>
              </motion.div>

              {/* Input — full width, larger */}
              <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.6, ease: [0.16, 1, 0.3, 1] }}>
                <div className={`relative rounded-2xl border transition-all duration-300 ${isDark ? "bg-[#1A1A1A]/90 backdrop-blur-sm border-[#3A3A3A]" : "bg-white/90 backdrop-blur-sm border-[#D0D0D0]"}`}>
                  <textarea
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                    placeholder="Build a real-time chat app with Supabase auth and message history..."
                    rows={3}
                    className={`w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[16px] leading-relaxed outline-none ${isDark ? "text-[#E8E8E5] placeholder:text-[#555]" : "text-[#1A1A1A] placeholder:text-[#B4B4B0]"}`}
                  />

                  {/* Bottom bar — category + submit only */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <CategoryDropdown isDark={isDark} />
                    <button
                      onClick={handleSubmit}
                      disabled={!prompt.trim()}
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-[0.92] disabled:opacity-20 ${isDark ? "bg-[#E8E8E5] text-[#1A1A1A] hover:bg-white" : "bg-[#1A1A1A] text-white hover:bg-[#333]"}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Open Local Project */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 2.0, ease: [0.16, 1, 0.3, 1] }} className="mt-5">
                <div className="flex items-center justify-center">
                  <button
                    onClick={async () => {
                      if (!window.showDirectoryPicker) {
                        alert("Your browser doesn't support folder access. Please use Chrome or Edge.");
                        return;
                      }
                      try {
                        const handle = await window.showDirectoryPicker({ mode: "readwrite" });
                        // Store handle name and navigate to workspace
                        localStorage.setItem("meld-local-project-name", handle.name);
                        router.push(`/project/workspace?local=${encodeURIComponent(handle.name)}`);
                      } catch {
                        // User cancelled picker
                      }
                    }}
                    className={`no-hover-fill flex items-center gap-2.5 whitespace-nowrap rounded-xl px-5 py-3 text-[15px] font-medium transition-all duration-200 ${isDark ? "text-[#888] hover:text-[#E8E8E5] hover:bg-white/[0.06]" : "text-[#999] hover:text-[#1A1A1A] hover:bg-black/[0.03]"}`}
                  >
                    <FolderOpen className="h-4.5 w-4.5" />
                    or open a local project
                  </button>
                </div>
              </motion.div>

            </div>
          </motion.div>

          ) : (activeTab === "home" || activeTab === "all") ? (
          <motion.div key="projects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="w-full px-8 py-8">
            {/* Title row */}
            <div className="flex items-center gap-3 mb-6">
              <h1 className={`text-[28px] font-bold tracking-[-0.03em] ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>Projects</h1>
            </div>

            {/* Search */}
            <div className="flex items-start gap-4 mb-8">
              <div className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 flex-1 max-w-md ring-1 transition-all ${isDark ? "bg-[#1A1A1A] ring-white/[0.06] focus-within:ring-white/[0.12]" : "bg-[#FAFAFA] ring-black/[0.04] focus-within:ring-black/[0.1]"}`}>
                <Search className={`h-4 w-4 flex-shrink-0 ${isDark ? "text-[#555]" : "text-[#B4B4B0]"}`} />
                <input type="text" placeholder="Search projects..." className={`flex-1 bg-transparent text-[16px] outline-none ${isDark ? "text-[#E8E8E5] placeholder:text-[#555]" : "text-[#1A1A1A] placeholder:text-[#B4B4B0]"}`} />
              </div>
            </div>

            {/* New project input */}
            <div className={`rounded-2xl ring-1 transition-all duration-200 mb-10 ${isDark ? "bg-[#1A1A1A] ring-white/[0.08] focus-within:ring-white/[0.15]" : "bg-white ring-black/[0.08] focus-within:ring-black/[0.15] focus-within:shadow-lg"}`}>
              <textarea ref={inputRef} rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} placeholder="Describe what you want to build — Meld AI will create it for you..." className={`w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[16px] leading-relaxed outline-none ${isDark ? "text-[#E8E8E5] placeholder:text-[#555]" : "text-[#1A1A1A] placeholder:text-[#B4B4B0]"}`} style={{ minHeight: 60 }} />
              <div className="flex items-center justify-between px-4 pb-3">
                <p className={`text-[16px] ${isDark ? "text-[#444]" : "text-[#B4B4B0]"}`}>Press Enter to create a new project</p>
                <button onClick={handleSubmit} disabled={!prompt.trim()} className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 active:scale-[0.95] disabled:opacity-15 ${isDark ? "bg-[#E8E8E5] text-[#1A1A1A] hover:bg-white" : "bg-[#1A1A1A] text-white hover:bg-[#333]"}`}>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Active projects */}
            {projects.length > 0 && (
              <div>
                <p className={`text-[16px] font-medium mb-4 ${isDark ? "text-[#777]" : "text-[#999]"}`}>Active in last 14 days</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                  <button onClick={() => inputRef.current?.focus()} className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 transition-all duration-300 ${isDark ? "border-white/[0.06] hover:border-white/[0.15] text-[#555] hover:text-[#999]" : "border-black/[0.06] hover:border-black/[0.15] text-[#B4B4B0] hover:text-[#787774]"}`}>
                    <Plus className="h-6 w-6 mb-2" />
                    <span className="text-[16px] font-medium">Create new project</span>
                  </button>
                  {projects.map((project, i) => (
                    <button key={project.path || i} onClick={() => router.push(`/project/workspace`)} className={`group flex flex-col rounded-2xl ring-1 overflow-hidden text-left transition-all duration-300 hover:-translate-y-1 ${isDark ? "ring-white/[0.06] hover:ring-white/[0.12] bg-[#141414]" : "ring-black/[0.04] hover:ring-black/[0.08] hover:shadow-lg bg-white"}`}>
                      <div className={`h-36 flex items-center justify-center ${isDark ? "bg-[#1A1A1A]" : "bg-[#FAFAFA]"}`}>
                        <div className={`text-center px-4 ${isDark ? "text-[#444]" : "text-[#CCC]"}`}>
                          <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-[16px]">{project.framework || "Project"}</p>
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        <p className={`text-[16px] font-medium truncate ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{project.name}</p>
                        <p className={`text-[16px] mt-1 ${isDark ? "text-[#555]" : "text-[#999]"}`}>Edited {formatDate(typeof project.lastOpened === "number" ? project.lastOpened : mountedAt)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {projects.length === 0 && (
              <div className={`text-center py-16 ${isDark ? "text-[#555]" : "text-[#999]"}`}>
                <p className="text-[16px] font-medium mb-2">No projects yet</p>
                <p className="text-[16px]">Describe what you want to build above, or open an existing folder to get started.</p>
                <p className={`text-[16px] mt-6 ${isDark ? "text-[#444]" : "text-[#B4B4B0]"}`}>Meld AI can create websites, dashboards, landing pages, and more — just describe your idea.</p>
              </div>
            )}
          </motion.div>

          ) : activeTab === "mcp" ? (
          <MCPContent isDark={isDark} />
          ) : activeTab === "marketplace" ? (
          <SkillsContent isDark={isDark} />
          ) : activeTab === "design" ? (
          <DesignContent />
          ) : activeTab === "settings" ? (
          <SettingsContent isDark={isDark} toggleTheme={toggleTheme} onOpenTab={setActiveTab} plan={plan} />
          ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#1A1A1A]">
        <Loader2 className="h-4 w-4 animate-spin text-[#555]" />
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  );
}
