"use client";

import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Figma, FolderOpen, Github, X, Check, Plus, ArrowLeft, Blend,
  Link as LinkIcon, Terminal, Eye, Zap, Command, Sparkles,
  PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, ArrowRight, Play, Square, Clock,
  Sun, Moon, RefreshCw, ExternalLink, MessageSquare, CheckSquare, Package, Settings, Search, Palette, FileCode, ChevronUp,
  Globe, Code, Layout, Blocks, Send, MousePointerClick,
} from "lucide-react";

// ─── Theme System ─────────────────────────────────────
type Theme = "dark" | "light";
function useTheme() {
  // Start with "dark" for both SSR and first render (prevents hydration mismatch)
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("meld-theme") as Theme | null;
    if (saved === "light") setTheme("light");
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("meld-theme", next);
      return next;
    });
  }, []);
  return { theme, toggle, isDark: theme === "dark", mounted };
}

// Theme color tokens
const T = {
  dark: {
    bg: "bg-[#181818]",
    bgSoft: "bg-[#1A1A1A]",
    bgCard: "bg-[#353535]",
    bgCardHover: "hover:bg-[#3E3E3E]",
    bgInput: "bg-[#353535]",
    bgHeader: "bg-[#181818]/90",
    bgSection: "bg-[#252525]",
    bgLogo: "bg-[#3A3A3A]",
    border: "border-[#3A3A3A]",
    ring: "ring-white/[0.06]",
    text: "text-[#E8E8E5]",
    textSub: "text-[#9A9A95]",
    textMuted: "text-[#666]",
    textHeading: "text-[#E8E8E5]",
    divider: "bg-[#3A3A3A]",
    btnPrimary: "bg-[#E8E8E5] text-[#1A1A1A] hover:bg-[#D4D4D0]",
    btnSecondary: "bg-[#3A3A3A] text-[#E8E8E5] hover:bg-[#444]",
  },
  light: {
    bg: "bg-white",
    bgSoft: "bg-[#FAFAF9]",
    bgCard: "bg-white/80",
    bgCardHover: "hover:bg-white",
    bgInput: "bg-[#F7F7F5]",
    bgHeader: "bg-white/80",
    bgSection: "bg-[#EBEBEA]",
    bgLogo: "bg-[#EEEEEC]",
    border: "border-[#F0F0EE]",
    ring: "ring-black/[0.04]",
    text: "text-[#1A1A1A]",
    textSub: "text-[#9A9A95]",
    textMuted: "text-[#B4B4B0]",
    textHeading: "text-[#1A1A1A]",
    divider: "bg-[#F0F0EE]",
    btnPrimary: "bg-[#1A1A1A] text-white hover:bg-[#333]",
    btnSecondary: "bg-[#F7F7F5] text-[#787774] hover:bg-[#EEEEEC]",
  },
} as const;
import { useProjectStore } from "@/lib/store/project-store";
import { useAgentStore } from "@/lib/store/agent-store";
import { useMCPStore } from "@/lib/store/mcp-store";
import { useDesignSystemStore } from "@/lib/store/design-system-store";
// super-context removed - AI always receives full context
import { useAuthStore } from "@/lib/store/auth-store";
import { useElectronAgent } from "@/lib/hooks/useElectronAgent";
import { useMappingEngine } from "@/lib/hooks/useMappingEngine";
// ChatPanel removed — using FloatingChatBar instead
import { PreviewFrame } from "@/components/workspace/PreviewFrame";
import { FileTreeBrowser } from "@/components/workspace/FileTreeBrowser";
import { DesignSystemDashboard } from "@/components/design-system/DesignSystemDashboard";
import { FigmaClient } from "@/lib/figma/client";
import { trpc } from "@/lib/trpc/client";
import { useAgentSessionStore } from "@/lib/store/agent-session-store";
import { AgentActivityFeed } from "@/components/agent/AgentActivityFeed";

// ─── MCP Hub Modal (Manus style — white theme) ──────
function MCPHubModal({ mcpServers, onSelect, onAddCustom, onClose }: {
  mcpServers: Array<{ adapterId: string; name: string; connected: boolean; connecting: boolean; toolCount: number; error: string | null }>;
  onSelect: (adapterId: string) => void;
  onAddCustom: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-2xl animate-scale-in rounded-2xl bg-white shadow-2xl ring-1 ring-black/[0.06]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F0F0EE] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Zap className="h-4 w-4 text-[#787774]" />
            <h2 className="text-[16px] font-bold text-[#1A1A1A]">MCP Servers</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#B4B4B0] hover:bg-[#F5F5F4] hover:text-[#787774] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 2-column card list */}
        <div className="grid grid-cols-2 gap-2 p-4 max-h-[60vh] overflow-y-auto">
          {mcpServers.map((srv) => {
            const logo = MCP_LOGO_MAP[srv.adapterId];
            const hint = MCP_HINT_MAP[srv.adapterId] ?? "";
            const brandColor = MCP_COLOR_MAP[srv.adapterId];
            return (
              <button
                key={srv.adapterId}
                onClick={() => { onClose(); onSelect(srv.adapterId); }}
                className="group flex items-center gap-3 rounded-2xl bg-[#F7F7F5] px-4 py-3.5 text-left transition-all duration-150 hover:bg-[#F0F0EE] active:scale-[0.98]"
              >
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                  srv.error ? "bg-red-100/60" : brandColor ? `${brandColor.light.bg} ${brandColor.light.hover}` : "bg-[#EEEEEC]"
                }`}>
                  {srv.connecting ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[#9A9A95]" />
                  ) : logo ? (
                    <img src={logo} alt={srv.name} className="h-5 w-5" />
                  ) : (
                    <Zap className="h-5 w-5 text-[#787774]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#1A1A1A]">{srv.name}</p>
                  <p className={`mt-0.5 text-[11px] leading-snug line-clamp-2 ${srv.error ? "text-red-500" : "text-[#9A9A95]"}`}>
                    {srv.error ?? (srv.connected ? `Connected · ${srv.toolCount} tools` : hint)}
                  </p>
                </div>
                {srv.connected && <Check className="h-4 w-4 flex-shrink-0 text-emerald-500/70" />}
              </button>
            );
          })}

          {/* + Custom */}
          <button
            onClick={() => { onClose(); onAddCustom(); }}
            className="group flex items-center gap-3 rounded-2xl border border-dashed border-[#D8D8D4] px-4 py-3.5 text-left transition-all duration-150 hover:bg-[#F5F5F3] active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#F0F0EE]">
              <Plus className="h-5 w-5 text-[#B4B4B0] transition-transform group-hover:rotate-90" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#787774]">Custom MCP</p>
              <p className="mt-0.5 text-[11px] text-[#B4B4B0]">Connect any MCP endpoint</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MCP Server Detail Modal ─────────────────────────
// Manus style: logo + description + permissions list + login/connect button
function MCPDetailModal({ adapterId, connected, connecting, toolCount, userServices, onConnect, onDisconnect, onClose, onOAuthLogin }: {
  adapterId: string; connected: boolean; connecting: boolean; toolCount: number;
  userServices: Record<string, boolean>;
  onConnect: () => void; onDisconnect: () => void; onClose: () => void;
  onOAuthLogin?: (service: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const preset = MCP_PRESETS.find((p) => p.id === adapterId);
  const logo = MCP_LOGO_MAP[adapterId];
  if (!preset) return null;

  // Check if the user already has a login (token) for this service
  const hasAuth = userServices[adapterId] ?? false;
  // OAuth services show login button, token services show API key input
  const isOAuth = preset.auth === "oauth";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-sm animate-scale-in rounded-2xl bg-[#1E1E1E] shadow-2xl ring-1 ring-white/[0.08]" onClick={(e) => e.stopPropagation()}>
        {/* X */}
        <div className="flex justify-end px-4 pt-4">
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#555] hover:bg-[#333] hover:text-[#9A9A95] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Logo + name + description */}
        <div className="flex flex-col items-center px-8 pb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2A2A2A] ring-1 ring-white/[0.06]">
            {logo ? <img src={logo} alt={preset.name} className="h-8 w-8" /> : <Zap className="h-8 w-8 text-[#777]" />}
          </div>
          <h3 className="mt-4 text-[18px] font-bold text-[#E8E8E5]">{preset.name}</h3>
          <p className="mt-1.5 text-center text-[13px] leading-relaxed text-[#777]">
            {preset.hint}
          </p>

          {/* Button per connection state */}
          {connected ? (
            <div className="mt-5 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-[#333] px-3 py-1.5 text-[12px] font-semibold text-[#E8E8E5]">
                <Check className="h-3 w-3 text-emerald-500/70" />
                Connected · {toolCount} tools
              </span>
              <button onClick={onDisconnect}
                className="rounded-full px-3 py-1.5 text-[12px] font-medium text-[#666] hover:text-[#9A9A95] hover:bg-[#333] transition-colors">
                Disconnect
              </button>
            </div>
          ) : hasAuth && !preset.requiresLogin ? (
            <button onClick={onConnect} disabled={connecting}
              className="mt-5 flex items-center gap-2 rounded-full bg-[#E8E8E5] px-5 py-2.5 text-[13px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#D4D4D0] active:scale-[0.97] disabled:opacity-50">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Connect
            </button>
          ) : isOAuth && preset.authUrl ? (
            <button
              onClick={() => {
                const currentPath = window.location.pathname + window.location.search;
                const prefix = window.electronAgent ? "electron:" : "";
                const authUrl = `${preset.authUrl}?redirect_to=${encodeURIComponent(prefix + currentPath)}`;
                if (window.electronAgent?.openExternalAuth) {
                  window.electronAgent.openExternalAuth(`${window.location.origin}${authUrl}`);
                  onOAuthLogin?.(adapterId);
                  onClose();
                } else {
                  window.location.href = authUrl;
                }
              }}
              className="mt-5 flex items-center gap-2 rounded-full bg-[#E8E8E5] px-5 py-2.5 text-[13px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#D4D4D0] active:scale-[0.97]">
              {logo && <img src={logo} alt="" className="h-4 w-4" />}
              Login with {preset.name}
            </button>
          ) : (
            <button onClick={onConnect} disabled={connecting}
              className="mt-5 flex items-center gap-2 rounded-full bg-[#E8E8E5] px-5 py-2.5 text-[13px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#D4D4D0] active:scale-[0.97] disabled:opacity-50">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Connect
            </button>
          )}
        </div>

        {/* Permissions list */}
        {!connected && preset.permissions.length > 0 && (
          <div className="border-t border-[#333] px-6 py-4 space-y-2">
            <p className="text-[11px] text-[#666] mb-2">
              Meld AI will be able to:
            </p>
            {preset.permissions.map((p) => (
              <div key={p} className="flex items-start gap-2 text-[12px] text-[#9A9A95]">
                <Check className="h-3 w-3 mt-0.5 text-emerald-500/70 flex-shrink-0" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Details (collapsible) */}
        <div className="border-t border-[#333]">
          <button onClick={() => setShowDetails(!showDetails)}
            className="flex w-full items-center justify-center gap-1.5 py-3 text-[12px] font-medium text-[#666] transition-colors hover:text-[#9A9A95]">
            {showDetails ? "Close details" : "View details"}
            <ChevronDown className={`h-3 w-3 transition-transform ${showDetails ? "rotate-180" : ""}`} />
          </button>
          {showDetails && (
            <div className="animate-fade-in border-t border-[#333] px-6 py-4 space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666] mb-2">Available Tools</p>
                {preset.permissions.map((p) => (
                  <div key={p} className="flex items-center gap-2 py-0.5 text-[12px] text-[#9A9A95]">
                    <Check className="h-3 w-3 text-[#555] flex-shrink-0" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666] mb-1">Auth</p>
                <p className="text-[12px] text-[#9A9A95]">
                  {isOAuth ? `OAuth login via ${preset.name}` : "API token required"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── GitHub Connect Modal ─────────────────────────────
function GitHubModal({ onConnect, onClose }: {
  onConnect: (owner: string, repo: string, branch: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseGitHubUrl = (input: string): { owner: string; repo: string } | null => {
    // https://github.com/owner/repo format
    const match = input.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
    if (match) return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
    // owner/repo format
    const short = input.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (short) return { owner: short[1], repo: short[2] };
    return null;
  };

  const handle = async () => {
    const parsed = parseGitHubUrl(url.trim());
    if (!parsed) { setError("Invalid GitHub URL or owner/repo"); return; }
    setLoading(true); setError(null);
    try {
      onConnect(parsed.owner, parsed.repo, "main");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg animate-scale-in rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/[0.06]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F7F7F5]">
              <Github className="h-4 w-4 text-[#787774]" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A]">Connect GitHub</h3>
              <p className="text-[11px] text-[#B4B4B0]">Paste a repo URL or type owner/repo</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#B4B4B0] hover:bg-[#F5F5F4] hover:text-[#787774] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text" value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === "Enter" && handle()}
            placeholder="https://github.com/owner/repo or owner/repo"
            className="flex-1 rounded-xl bg-[#F7F7F5] px-4 py-3 text-[13px] ring-1 ring-black/[0.04] placeholder:text-[#B4B4B0] focus:outline-none focus:ring-black/[0.08] transition-all"
            disabled={loading} autoFocus
          />
          <button onClick={handle} disabled={!url.trim() || loading}
            className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-3 text-[12px] font-bold text-white transition-all hover:bg-[#333] active:scale-[0.97] disabled:opacity-40">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
            Connect
          </button>
        </div>
        {error && <p className="mt-2 animate-fade-in text-[11px] text-red-500">{error}</p>}

        {/* MCP connection status hint */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#F7F7F5] px-3 py-2">
          <Zap className="h-3 w-3 text-[#B4B4B0]" />
          <p className="text-[11px] text-[#B4B4B0]">
            Connects via MCP protocol — AI can search code, detect frameworks, and edit files
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Add Custom MCP Server Modal ─────────────────────
function AddMCPModal({ onAdd, onClose }: {
  onAdd: (config: { id: string; name: string; endpoint: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handle = () => {
    if (!name.trim() || !endpoint.trim()) { setError("Please enter a name and endpoint"); return; }
    try { new URL(endpoint); } catch { setError("Please enter a valid URL"); return; }
    onAdd({ id: `custom-${name.toLowerCase().replace(/\s+/g, "-")}`, name: name.trim(), endpoint: endpoint.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg animate-scale-in rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/[0.06]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F7F7F5]">
              <Plus className="h-4 w-4 text-[#787774]" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A]">Add MCP Server</h3>
              <p className="text-[11px] text-[#B4B4B0]">Connect any MCP-compatible server</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#B4B4B0] hover:bg-[#F5F5F4] hover:text-[#787774] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            type="text" value={name} onChange={(e) => { setName(e.target.value); setError(null); }}
            placeholder="Server name (e.g., Vercel, Supabase)"
            className="w-full rounded-xl bg-[#F7F7F5] px-4 py-3 text-[13px] ring-1 ring-black/[0.04] placeholder:text-[#B4B4B0] focus:outline-none focus:ring-black/[0.08]"
            autoFocus
          />
          <input
            type="text" value={endpoint} onChange={(e) => { setEndpoint(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === "Enter" && handle()}
            placeholder="https://your-mcp-server.com/mcp"
            className="w-full rounded-xl bg-[#F7F7F5] px-4 py-3 text-[13px] ring-1 ring-black/[0.04] placeholder:text-[#B4B4B0] focus:outline-none focus:ring-black/[0.08]"
          />
          <button onClick={handle} disabled={!name.trim() || !endpoint.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-3 text-[12px] font-bold text-white transition-all hover:bg-[#333] active:scale-[0.97] disabled:opacity-40">
            <Zap className="h-4 w-4" />
            Connect via MCP
          </button>
        </div>
        {error && <p className="mt-2 animate-fade-in text-[11px] text-red-500">{error}</p>}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#F7F7F5] px-3 py-2">
          <Terminal className="h-3 w-3 text-[#B4B4B0]" />
          <p className="text-[11px] text-[#B4B4B0]">
            Server must implement MCP protocol (tools/list, tools/call endpoints)
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Generic MCP Connect Modal (token input) ───────────
function MCPTokenModal({ serverName, authHint, onConnect, onClose }: {
  serverName: string; authHint: string;
  onConnect: (token: string) => void; onClose: () => void;
}) {
  const [token, setToken] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg animate-scale-in rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/[0.06]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F7F7F5]">
              <Zap className="h-4 w-4 text-[#787774]" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A]">Connect {serverName}</h3>
              <p className="text-[11px] text-[#B4B4B0]">{authHint}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#B4B4B0] hover:bg-[#F5F5F4] hover:text-[#787774] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="password" value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && token.trim() && onConnect(token.trim())}
            placeholder="Paste your token here..."
            className="flex-1 rounded-xl bg-[#F7F7F5] px-4 py-3 text-[13px] font-mono ring-1 ring-black/[0.04] placeholder:text-[#B4B4B0] focus:outline-none focus:ring-black/[0.08] transition-all"
            autoFocus
          />
          <button onClick={() => onConnect(token.trim())} disabled={!token.trim()}
            className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-3 text-[12px] font-bold text-white transition-all hover:bg-[#333] active:scale-[0.97] disabled:opacity-40">
            <Zap className="h-4 w-4" />
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Figma Connect Modal ──────────────────────────────
function FigmaModal({ onConnect, onClose }: { onConnect: (key: string, name: string) => void; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadFile = trpc.figma.loadFile.useMutation();

  const handle = async () => {
    const parsed = FigmaClient.extractFileKey(url);
    if (!parsed) { setError("Invalid Figma URL"); return; }
    setValidating(true); setError(null);
    try {
      const r = await loadFile.mutateAsync({ figmaUrl: url });
      onConnect(r.fileKey, r.fileName);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setValidating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg animate-scale-in rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/[0.06]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F7F7F5]">
              <Figma className="h-4 w-4 text-[#787774]" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A]">Connect Figma</h3>
              <p className="text-[11px] text-[#B4B4B0]">Paste a share link from your Figma file</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#B4B4B0] hover:bg-[#F5F5F4] hover:text-[#787774] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text" value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === "Enter" && handle()}
            placeholder="https://www.figma.com/file/..."
            className="flex-1 rounded-xl bg-[#F7F7F5] px-4 py-3 text-[13px] ring-1 ring-black/[0.04] placeholder:text-[#B4B4B0] focus:outline-none focus:ring-black/[0.08] transition-all"
            disabled={validating} autoFocus
          />
          <button onClick={handle} disabled={!url.trim() || validating}
            className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-3 text-[12px] font-bold text-white transition-all hover:bg-[#333] active:scale-[0.97] disabled:opacity-40">
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
            Connect
          </button>
        </div>
        {error && <p className="mt-2 animate-fade-in text-[11px] text-red-500">{error}</p>}

        {/* MCP connection status hint */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#F7F7F5] px-3 py-2">
          <Zap className="h-3 w-3 text-[#B4B4B0]" />
          <p className="text-[11px] text-[#B4B4B0]">
            Connects via MCP protocol — AI can read styles, extract design tokens, and map nodes to code
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── MCP Connecting Modal (connecting state) ─────────────
function MCPConnectingModal({ serverName, logo, onCancel }: {
  serverName: string; logo?: string; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div className="w-full max-w-xs animate-scale-in rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-black/[0.06] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F7F5] ring-1 ring-black/[0.04]">
          {logo ? <img src={logo} alt={serverName} className="h-8 w-8" /> : <Zap className="h-8 w-8 text-[#787774]" />}
        </div>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#787774]" />
          <p className="text-[14px] font-semibold text-[#1A1A1A]">Connecting {serverName}...</p>
        </div>
        <p className="mt-2 text-[12px] text-[#B4B4B0]">Verifying credentials and loading tools</p>
        <button onClick={onCancel}
          className="mt-5 text-[12px] font-medium text-[#B4B4B0] hover:text-[#787774] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── MCP Connected Modal (connection success) ────────────────
function MCPConnectedModal({ serverName, logo, toolCount, onClose }: {
  serverName: string; logo?: string; toolCount: number; onClose: () => void;
}) {
  // Auto-close after 2 seconds
  useEffect(() => {
    const t = setTimeout(onClose, 2000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-xs animate-scale-in rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-black/[0.06] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F7F5] ring-1 ring-black/[0.04]">
          {logo ? <img src={logo} alt={serverName} className="h-8 w-8" /> : <Zap className="h-8 w-8 text-[#787774]" />}
        </div>
        <div className="mt-5 flex items-center justify-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-[#1A1A1A]" />
          <p className="text-[14px] font-semibold text-[#1A1A1A]">{serverName} Connected</p>
        </div>
        <p className="mt-2 text-[12px] text-[#787774]">{toolCount} tools available</p>
      </div>
    </div>
  );
}

// ─── MCP Presets (synced with registry) ───────────────
interface MCPPreset {
  id: string; name: string; icon: string; logo: string; category: string; hint: string;
  auth: "oauth" | "token";            // Authentication method
  authUrl?: string;                   // OAuth redirect URL (auth === "oauth")
  permissions: string[];              // Permission descriptions shown to the user
  requiresLogin: boolean;             // Whether separate login is required (GitHub is already logged in)
}

const MCP_PRESETS: MCPPreset[] = [
  {
    id: "figma", name: "Figma", icon: "figma", logo: "/mcp-icons/figma.svg", category: "design",
    hint: "Design files, node trees, styles, image rendering",
    auth: "oauth", authUrl: "/api/auth/figma", requiresLogin: true,
    permissions: ["Read design files and components", "Render frames as images", "Extract design tokens and styles"],
  },
  {
    id: "github", name: "GitHub", icon: "github", logo: "/mcp-icons/github.svg", category: "code",
    hint: "Repos, file browsing, code search, framework detection",
    auth: "oauth", requiresLogin: false,  // Permissions already granted at GitHub login
    permissions: ["Browse repositories and files", "Search code across repos", "Detect frameworks and dependencies", "Read and write file contents"],
  },
  {
    id: "vercel", name: "Vercel", icon: "triangle", logo: "/mcp-icons/vercel.svg", category: "deploy",
    hint: "Deployments, preview URLs, environment variables",
    auth: "oauth", authUrl: "/api/auth/mcp?service=vercel", requiresLogin: true,
    permissions: ["List and manage deployments", "Get preview URLs", "Read environment variables", "Check build logs"],
  },
  {
    id: "supabase", name: "Supabase", icon: "database", logo: "/mcp-icons/supabase.svg", category: "data",
    hint: "Database schema, tables, auth users, storage",
    auth: "token", requiresLogin: true,
    permissions: ["Read database schema and tables", "Query table data", "Manage auth users", "Access storage buckets"],
  },
  {
    id: "sentry", name: "Sentry", icon: "bug", logo: "/mcp-icons/sentry.svg", category: "monitoring",
    hint: "Error tracking, stack traces, performance issues",
    auth: "oauth", authUrl: "/api/auth/mcp?service=sentry", requiresLogin: true,
    permissions: ["List recent errors and exceptions", "Read stack traces", "View performance data"],
  },
  {
    id: "linear", name: "Linear", icon: "list-checks", logo: "/mcp-icons/linear.svg", category: "project",
    hint: "Issues, projects, cycles, team workflows",
    auth: "oauth", authUrl: "/api/auth/mcp?service=linear", requiresLogin: true,
    permissions: ["List issues and their status", "Get project details", "Search team workflows"],
  },
  {
    id: "notion", name: "Notion", icon: "book-open", logo: "/mcp-icons/notion.svg", category: "docs",
    hint: "Pages, databases, docs, knowledge base",
    auth: "oauth", authUrl: "/api/auth/mcp?service=notion", requiresLogin: true,
    permissions: ["Search pages and databases", "Read page content", "Access workspace structure"],
  },
  {
    id: "slack", name: "Slack", icon: "message-square", logo: "/mcp-icons/slack.svg", category: "communication",
    hint: "Channels, messages, notifications",
    auth: "oauth", authUrl: "/api/auth/mcp?service=slack", requiresLogin: true,
    permissions: ["List channels and conversations", "Read message history", "Search messages"],
  },
  {
    id: "gmail", name: "Gmail", icon: "mail", logo: "/mcp-icons/gmail.svg", category: "communication",
    hint: "Read, draft, and send emails",
    auth: "oauth", authUrl: "/api/auth/mcp?service=gmail", requiresLogin: true,
    permissions: ["Read email threads", "Draft and send emails", "Search inbox"],
  },
  {
    id: "canva", name: "Canva", icon: "palette", logo: "/mcp-icons/canva.svg", category: "design",
    hint: "Create, edit, and export designs",
    auth: "oauth", authUrl: "/api/auth/mcp?service=canva", requiresLogin: true,
    permissions: ["Search designs", "Create and edit designs", "Export as images"],
  },
];

const MCP_LOGO_MAP = Object.fromEntries(MCP_PRESETS.map((p) => [p.id, p.logo]));

// Per-service brand colors (for logo background — light/dark)
const MCP_COLOR_MAP: Record<string, { light: { bg: string; hover: string }; dark: { bg: string; hover: string } }> = {
  figma:    { light: { bg: "bg-[#F3E8FF]", hover: "group-hover:bg-[#E9D5FF]" }, dark: { bg: "bg-[#2D1B4E]", hover: "group-hover:bg-[#3D2560]" } },
  github:   { light: { bg: "bg-[#E5E7EB]", hover: "group-hover:bg-[#D1D5DB]" }, dark: { bg: "bg-[#2A2D32]", hover: "group-hover:bg-[#363A40]" } },
  vercel:   { light: { bg: "bg-[#F3F4F6]", hover: "group-hover:bg-[#E5E7EB]" }, dark: { bg: "bg-[#2A2A2A]", hover: "group-hover:bg-[#363636]" } },
  supabase: { light: { bg: "bg-[#D1FAE5]", hover: "group-hover:bg-[#A7F3D0]" }, dark: { bg: "bg-[#1A3A2A]", hover: "group-hover:bg-[#224D36]" } },
  sentry:   { light: { bg: "bg-[#FDE8E8]", hover: "group-hover:bg-[#FECACA]" }, dark: { bg: "bg-[#3D1F1F]", hover: "group-hover:bg-[#4D2828]" } },
  linear:   { light: { bg: "bg-[#DBEAFE]", hover: "group-hover:bg-[#BFDBFE]" }, dark: { bg: "bg-[#1E2A4A]", hover: "group-hover:bg-[#283660]" } },
  notion:   { light: { bg: "bg-[#F3F4F6]", hover: "group-hover:bg-[#E5E7EB]" }, dark: { bg: "bg-[#2A2A2A]", hover: "group-hover:bg-[#363636]" } },
  slack:    { light: { bg: "bg-[#FEF3C7]", hover: "group-hover:bg-[#FDE68A]" }, dark: { bg: "bg-[#3D3520]", hover: "group-hover:bg-[#4D4228]" } },
};
const MCP_HINT_MAP = Object.fromEntries(MCP_PRESETS.map((p) => [p.id, p.hint]));

// ─── Workspace Tools Bar + Connectors Modal ─────────
const WORKSPACE_MCP_SERVERS = [
  { id: "github", name: "GitHub", logo: "/mcp-icons/github.svg", desc: "Search code, browse files, detect frameworks, and create PRs" },
  { id: "figma", name: "Figma", logo: "/mcp-icons/figma.svg", desc: "Extract design tokens, browse node trees, and render frame images" },
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
  { id: "agent-bridge", name: "Agent Bridge", logo: "/mcp-icons/meld.svg", desc: "Let external AI agents (Cursor, Copilot) control Meld" },
];

function WorkspaceToolsBar({ mcpServers, onMCPConnect, onAddMCP, isDark }: {
  mcpServers: Array<{ adapterId: string; name: string; connected: boolean; connecting: boolean; toolCount: number; error: string | null }>;
  onMCPConnect: (adapterId: string) => void;
  onAddMCP: () => void;
  isDark?: boolean;
}) {
  const [showConnectors, setShowConnectors] = useState(false);
  const connectedIds = new Set(mcpServers.filter((s) => s.connected).map((s) => s.adapterId));

  return (
    <>
      {/* Collapsed bar */}
      <button
        onClick={() => setShowConnectors(true)}
        className={`mt-4 flex w-full items-center gap-2.5 rounded-md ${isDark ? "bg-[#151515] hover:bg-[#292929]" : "bg-[#F0F0EE] hover:bg-[#E8E8E5]"} px-4 py-2 text-left transition-colors`}
      >
        <span className={`text-[11px] font-medium ${isDark ? "text-[#B0B0AC]" : "text-[#787774]"}`}>Connect tools to AI</span>
        <div className="flex flex-1 items-center justify-end gap-0.5">
          {WORKSPACE_MCP_SERVERS.filter((s) => connectedIds.has(s.id)).map((s) => (
            <div key={s.id} className={`flex h-6 w-6 items-center justify-center rounded-md ${isDark ? "bg-[#181818]" : "bg-[#E0E0DC]"}`}>
              <img src={s.logo} alt={s.name} className="h-3 w-3" />
            </div>
          ))}
          {WORKSPACE_MCP_SERVERS.filter((s) => !connectedIds.has(s.id)).slice(0, 4).map((s) => (
            <div key={s.id} className={`flex h-6 w-6 items-center justify-center rounded-md ${isDark ? "bg-[#181818]" : "bg-[#E0E0DC]"}`}>
              <img src={s.logo} alt={s.name} className="h-3 w-3 opacity-25" />
            </div>
          ))}
        </div>
        <ChevronRight className={`h-3.5 w-3.5 ${isDark ? "text-[#555]" : "text-[#B4B4B0]"}`} />
      </button>

      {/* Connectors modal */}
      {showConnectors && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowConnectors(false)} />
          <div className="fixed inset-x-0 top-0 bottom-0 z-50 flex items-center justify-center p-8" onClick={() => setShowConnectors(false)}>
            <div className="w-full max-w-2xl animate-scale-in rounded-2xl bg-[#1E1E1E] shadow-2xl ring-1 ring-white/[0.08]" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-[#333] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[16px] font-bold text-[#E8E8E5]">Connectors</h2>
                  <button onClick={() => setShowConnectors(false)} className="rounded-md p-1.5 text-[#555] hover:text-[#9A9A95] hover:bg-[#333] transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-[12px] text-[#777]">Connect external services to AI. Connected tools let AI directly query and use their data.</p>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-2">
                  {WORKSPACE_MCP_SERVERS.map((s) => {
                    const srv = mcpServers.find((m) => m.adapterId === s.id);
                    const isConnected = srv?.connected ?? false;
                    const isConnecting = srv?.connecting ?? false;
                    return (
                      <div
                        key={s.id}
                        className="group flex items-start gap-3 rounded-xl px-4 py-3.5 transition-colors hover:bg-[#333] cursor-pointer"
                        onClick={() => { if (!isConnecting) onMCPConnect(s.id); }}
                      >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#2A2A2A] group-hover:bg-[#3A3A3A]">
                          <img src={s.logo} alt={s.name} className={`h-4 w-4 ${isConnected ? "" : "opacity-50"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold text-[#E8E8E5]">{s.name}</p>
                            {isConnected && <span className="text-[9px] font-medium text-[#16A34A]">Connected</span>}
                            {isConnecting && <span className="text-[9px] font-medium text-[#9A9A95]">Connecting...</span>}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#777]">{s.desc}</p>
                        </div>
                        {isConnecting ? (
                          <Loader2 className="mt-1 h-4 w-4 flex-shrink-0 animate-spin text-[#9A9A95]" />
                        ) : !isConnected && (
                          <span className="mt-0.5 flex-shrink-0 rounded-md bg-[#333] px-2 py-1 text-[10px] font-medium text-[#E8E8E5] group-hover:bg-[#444]">+</span>
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
    </>
  );
}

// ─── Empty Workspace ─────────────────────────────────

function EmptyWorkspace({ onLocal, onNewProject, onMCPConnect, onAddMCP, mcpServers, isDark }: {
  onLocal: () => void;
  onNewProject: () => void;
  onMCPConnect: (adapterId: string) => void;
  onAddMCP: () => void;
  mcpServers: Array<{ adapterId: string; name: string; icon: string; connected: boolean; connecting: boolean; toolCount: number; error: string | null }>;
  isDark?: boolean;
}) {
  const router = useRouter();
  const [recentProjects, setRecentProjects] = useState<Array<{ id: string; name: string; lastOpened: string; projectPath?: string }>>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("meld-recent-projects");
      if (stored) setRecentProjects(JSON.parse(stored));
    } catch {}
    // Show onboarding for first-time users
    try {
      if (!localStorage.getItem("meld-onboarded")) {
        setShowOnboarding(true);
      }
    } catch {}
  }, []);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    try { localStorage.setItem("meld-onboarded", "1"); } catch {}
  };

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return "Burning the midnight oil";
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <motion.div
      className="flex h-full items-center justify-center px-6 py-8 overflow-y-auto"
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
        delay: 0.1
      }}
    >
      {/* Onboarding overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`w-full max-w-md rounded-2xl p-8 shadow-2xl ${isDark ? "bg-[#181818] ring-1 ring-white/[0.08]" : "bg-white ring-1 ring-black/[0.06]"}`}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="text-center mb-6">
                <motion.div
                  className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? "bg-[#3A3A3A]" : "bg-[#F0F0EE]"}`}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.2 }}
                >
                  <Blend className={`h-5 w-5 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`} />
                </motion.div>
                <h2 className={`text-[20px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>Welcome to Meld</h2>
                <p className={`mt-1 text-[13px] ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>Build and modify projects with AI</p>
              </div>
              <div className="space-y-4 mb-8">
                {[
                  { step: "1", text: "Open a project folder or create new" },
                  { step: "2", text: "Ask AI to build or modify your code" },
                  { step: "3", text: "See changes live in the preview" },
                ].map((item, idx) => (
                  <motion.div
                    key={item.step}
                    className={`flex items-start gap-3 rounded-xl px-4 py-3 ${isDark ? "bg-[#353535]" : "bg-[#F7F7F5]"}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                  >
                    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${isDark ? "bg-[#E8E8E5] text-[#1A1A1A]" : "bg-[#1A1A1A] text-white"}`}>{item.step}</span>
                    <span className={`text-[14px] pt-0.5 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{item.text}</span>
                  </motion.div>
                ))}
              </div>
              <motion.button
                onClick={dismissOnboarding}
                className={`w-full rounded-xl py-3 text-[14px] font-semibold transition-colors ${isDark ? "bg-[#E8E8E5] text-[#1A1A1A] hover:bg-[#D4D4D0]" : "bg-[#1A1A1A] text-white hover:bg-[#333]"}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="w-full max-w-xl">
        {/* Greeting */}
        <div className="text-center mb-8">
          <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? "bg-[#333]" : "bg-[#F0F0EE]"}`}>
            <Blend className={`h-5 w-5 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`} />
          </div>
          <h1 className={`text-[22px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{greeting}</h1>
          <p className={`mt-1 text-[13px] ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>What shall we build?</p>
        </div>

        {/* Action buttons */}
        <div className="space-y-2 mb-6">
          <button
            onClick={onNewProject}
            className={`group w-full flex items-center gap-4 rounded-2xl p-5 text-left transition-all active:scale-[0.99] ${isDark ? "bg-[#2A2A2A] hover:bg-[#333]" : "bg-[#1A1A1A] hover:bg-[#333]"}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Plus className="h-5 w-5 text-white/70" />
            </div>
            <div className="flex-1">
              <p className={`text-[15px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-white"}`}>New Project</p>
              <p className={`text-[12px] ${isDark ? "text-[#9A9A95]" : "text-white/50"}`}>Start from scratch with AI</p>
            </div>
            <ArrowRight className={`h-4 w-4 ${isDark ? "text-[#666]" : "text-white/30"} transition-transform group-hover:translate-x-1`} />
          </button>

          <button
            onClick={onLocal}
            className={`group w-full flex items-center gap-4 rounded-2xl p-5 text-left transition-all active:scale-[0.99] ${isDark ? "bg-[#151515] hover:bg-[#2A2A2A]" : "bg-[#F0F0EE] hover:bg-[#E8E8E4]"}`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? "bg-[#3A3A3A]" : "bg-[#D4D4D0]"}`}>
              <FolderOpen className={`h-5 w-5 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`} />
            </div>
            <div className="flex-1">
              <p className={`text-[15px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>Open Folder</p>
              <p className={`text-[12px] ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>Open an existing project</p>
            </div>
            <ArrowRight className={`h-4 w-4 ${isDark ? "text-[#555]" : "text-[#B4B4B0]"} transition-transform group-hover:translate-x-1`} />
          </button>
        </div>

        {/* Recent projects */}
        {recentProjects.length > 0 && (
          <div className="mb-6">
            <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${isDark ? "text-[#666]" : "text-[#B4B4B0]"}`}>Recent</p>
            <div className="space-y-0.5">
              {recentProjects.slice(0, 5).map((project) => (
                <button
                  key={project.id}
                  onClick={() => router.push(`/project/workspace?id=${project.id}`)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${isDark ? "hover:bg-[#2A2A2A]" : "hover:bg-[#F0F0EE]"}`}
                >
                  <FolderOpen className={`h-4 w-4 flex-shrink-0 ${isDark ? "text-[#666]" : "text-[#B4B4B0]"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium truncate ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{project.name}</p>
                    {project.projectPath && (
                      <p className={`text-[10px] font-mono truncate ${isDark ? "text-[#555]" : "text-[#B4B4B0]"}`}>
                        {project.projectPath.replace(/^\/Users\/[^/]+\//, "~/")}
                      </p>
                    )}
                  </div>
                  <ArrowRight className={`h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? "text-[#666]" : "text-[#B4B4B0]"}`} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Project Template Selector ────────────────────────

type ProjectTemplate = {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  command: string;
  category: "website" | "app" | "service" | "tool" | "custom";
  tags?: string[];
};

type FrameworkOption = {
  id: string;
  name: string;
  desc: string;
};

const PROJECT_CATEGORIES = [
  {
    id: "website" as const,
    label: "Website",
    desc: "Landing pages, blogs, portfolios",
    icon: <Globe className="h-6 w-6" />,
    defaultFramework: "nextjs",
    frameworks: [
      { id: "nextjs", name: "Next.js", desc: "Fast, SEO-friendly (recommended)" },
      { id: "react", name: "React", desc: "Simple and flexible" },
      { id: "vue", name: "Vue", desc: "Progressive and approachable" },
      { id: "vanilla", name: "No framework", desc: "Just HTML, CSS, JavaScript" },
    ] as FrameworkOption[],
    buildCommand: (fw: string) => {
      switch (fw) {
        case "nextjs": return "Create a new Next.js project with App Router, TypeScript, and Tailwind CSS. Use `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias \"@/*\" --use-pnpm` to scaffold it. After scaffolding, briefly describe the project structure.";
        case "react": return "Create a new React project with Vite, TypeScript, and Tailwind CSS. Run `npm create vite@latest . -- --template react-ts` then install and configure Tailwind CSS v4. Set up the basic src/ structure with App.tsx.";
        case "vue": return "Create a new Vue 3 project with TypeScript using Vite. Run `npm create vite@latest . -- --template vue-ts` and set up the basic src/ structure with App.vue and components folder.";
        case "vanilla": return "Create a minimal vanilla web project. Create index.html with a basic HTML5 boilerplate, style.css with a modern CSS reset and basic styles, and main.js. Link them together. Add a simple dev server setup.";
        default: return "";
      }
    },
  },
  {
    id: "app" as const,
    label: "App",
    desc: "Interactive apps with login, dashboard, real-time",
    icon: <Layout className="h-6 w-6" />,
    defaultFramework: "nextjs-fullstack",
    frameworks: [
      { id: "nextjs-fullstack", name: "Next.js Full-Stack", desc: "Login, database, dashboard included" },
      { id: "react-spa", name: "React SPA", desc: "Single-page app with routing" },
      { id: "react-realtime", name: "React + WebSocket", desc: "Real-time features (chat, live updates)" },
    ] as FrameworkOption[],
    buildCommand: (fw: string) => {
      switch (fw) {
        case "nextjs-fullstack": return "Create a full-stack Next.js app with App Router, TypeScript, Tailwind CSS, and Prisma ORM. Use `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias \"@/*\" --use-pnpm`. Then install Prisma (`npx prisma init --datasource-provider sqlite`) and set up a basic auth layout with login page, dashboard, and a sample data model.";
        case "react-spa": return "Create a React dashboard app with Vite, TypeScript, Tailwind CSS, Zustand for state, and React Router. Set up a sidebar layout with navigation, a dashboard page with placeholder stats cards, and a settings page.";
        case "react-realtime": return "Create a real-time chat application with React, Vite, TypeScript, and Tailwind CSS. Set up a chat UI with message list, input field, room list sidebar, and WebSocket connection for real-time messaging. Include a simple Express server for the WebSocket backend.";
        default: return "";
      }
    },
  },
  {
    id: "service" as const,
    label: "API / Backend",
    desc: "REST APIs, servers, databases",
    icon: <Terminal className="h-6 w-6" />,
    defaultFramework: "express",
    frameworks: [
      { id: "express", name: "Express", desc: "Classic Node.js server" },
      { id: "nextjs-api", name: "Next.js API", desc: "Serverless API routes" },
    ] as FrameworkOption[],
    buildCommand: (fw: string) => {
      switch (fw) {
        case "express": return "Create a REST API with Express and TypeScript. Set up a proper project structure with routes/, controllers/, middleware/, and models/ directories. Include CORS, JSON parsing, error handling middleware, and a sample CRUD resource. Add a dev script with nodemon.";
        case "nextjs-api": return "Create a Next.js API-only project with App Router and TypeScript. Set up app/api/ with sample route handlers for a CRUD resource. Include proper error handling, type-safe request/response, and a Prisma setup for database access.";
        default: return "";
      }
    },
  },
  {
    id: "tool" as const,
    label: "Script / Tool",
    desc: "CLI tools, automation, utilities",
    icon: <Code className="h-6 w-6" />,
    defaultFramework: "cli",
    frameworks: [
      { id: "cli", name: "CLI Tool", desc: "Command-line tool with options" },
      { id: "script", name: "Script", desc: "Quick automation script" },
    ] as FrameworkOption[],
    buildCommand: (fw: string) => {
      switch (fw) {
        case "cli": return "Create a Node.js CLI tool with TypeScript and Commander.js. Set up a proper CLI structure with commands, options, help text, and colored output. Include a sample command that does something useful. Configure it as an npm bin executable.";
        case "script": return "Create a Node.js automation script project with TypeScript. Set up a src/index.ts entry point, tsconfig.json, and package.json with build and start scripts. Include a sample script that reads files and processes data.";
        default: return "";
      }
    },
  },
];

// For backward compat — construct ProjectTemplate from category + framework
function buildTemplate(categoryId: string, frameworkId: string, command: string): ProjectTemplate {
  return {
    id: `${categoryId}-${frameworkId}`,
    name: frameworkId,
    desc: "",
    icon: <Sparkles className="h-5 w-5" />,
    command,
    category: categoryId as ProjectTemplate["category"],
  };
}

// Keep custom template
const CUSTOM_TEMPLATE: ProjectTemplate = {
  id: "custom",
  name: "Custom",
  desc: "Describe what you want to build",
  icon: <Sparkles className="h-5 w-5" />,
  category: "custom",
  command: "",
};

// ─── Skills Marketplace ─────────────────────────────────────
interface SkillEntry {
  name: string;
  desc: string;
  icon: string;
  category: string;
  author: string;
  stars: string;
  github: string;
  installed: boolean;
}

const SKILLS_REGISTRY: SkillEntry[] = [
  // Meld Built-in (pinned)
  { name: "Meld Agent Bridge", desc: "Let external AI agents control Meld's file system, preview, and tools.", icon: "🌉", category: "Built-in", author: "Meld Team", stars: "", github: "", installed: true },
  { name: "Meld Design System", desc: "Extract, manage, and sync design tokens to Tailwind/CSS/JSON.", icon: "🎨", category: "Built-in", author: "Meld Team", stars: "", github: "", installed: true },
  { name: "Meld Visual Editor", desc: "Drag, resize, align, and edit elements directly in the live preview.", icon: "🖱️", category: "Built-in", author: "Meld Team", stars: "", github: "", installed: true },
  // Skill Directories
  { name: "awesome-claude-code", desc: "Curated list of skills, hooks, slash-commands, and agent orchestrators.", icon: "📦", category: "Directory", author: "hesreallyhim", stars: "", github: "https://github.com/hesreallyhim/awesome-claude-code", installed: false },
  { name: "awesome-agent-skills", desc: "1000+ agent skills from official dev teams and the community.", icon: "🗂️", category: "Directory", author: "VoltAgent", stars: "", github: "https://github.com/VoltAgent/awesome-agent-skills", installed: false },
  { name: "awesome-claude-skills", desc: "Curated directory of Claude Skills, resources, and tools.", icon: "📋", category: "Directory", author: "travisvn", stars: "", github: "https://github.com/travisvn/awesome-claude-skills", installed: false },
  { name: "claude-skills", desc: "192+ skills & agent plugins — engineering, marketing, product, compliance.", icon: "🧩", category: "Directory", author: "alirezarezvani", stars: "", github: "https://github.com/alirezarezvani/claude-skills", installed: false },
  // Popular Individual Skills
  { name: "planning-with-files", desc: "Manus-style persistent markdown planning workflow.", icon: "📝", category: "Skill", author: "OthmanAdi", stars: "", github: "https://github.com/OthmanAdi/planning-with-files", installed: false },
  { name: "claude-scientific-skills", desc: "Ready-to-use skills for research, science, engineering, and analysis.", icon: "🔬", category: "Skill", author: "K-Dense-AI", stars: "", github: "https://github.com/K-Dense-AI/claude-scientific-skills", installed: false },
  { name: "Impeccable", desc: "Design language that makes your AI harness better at design.", icon: "🎨", category: "Skill", author: "pbakaus", stars: "", github: "https://github.com/pbakaus/impeccable", installed: false },
  { name: "Humanizer", desc: "Removes signs of AI-generated writing from text.", icon: "✍️", category: "Skill", author: "blader", stars: "", github: "https://github.com/blader/humanizer", installed: false },
  { name: "Skill Seekers", desc: "Convert docs, GitHub repos, and PDFs into Claude AI skills.", icon: "🔄", category: "Skill", author: "yusufkaraaslan", stars: "", github: "https://github.com/yusufkaraaslan/Skill_Seekers", installed: false },
  { name: "Understand-Anything", desc: "Turns any codebase into an interactive knowledge graph.", icon: "🧠", category: "Skill", author: "Lum1104", stars: "", github: "https://github.com/Lum1104/Understand-Anything", installed: false },
  { name: "AI Research Skills", desc: "Open-source library of AI research and engineering skills.", icon: "🧪", category: "Skill", author: "Orchestra-Research", stars: "", github: "https://github.com/Orchestra-Research/AI-Research-SKILLs", installed: false },
  { name: "Trail of Bits Skills", desc: "Security research, vulnerability detection, and audit workflows.", icon: "🛡️", category: "Skill", author: "trailofbits", stars: "", github: "https://github.com/trailofbits/skills", installed: false },
  { name: "Prompt Master", desc: "Writes accurate prompts for any AI tool with full context retention.", icon: "💬", category: "Skill", author: "nidhinjs", stars: "", github: "https://github.com/nidhinjs/prompt-master", installed: false },
  { name: "codebase-to-course", desc: "Turns any codebase into a beautiful interactive HTML course.", icon: "🎓", category: "Skill", author: "zarazhangrui", stars: "", github: "https://github.com/zarazhangrui/codebase-to-course", installed: false },
  { name: "Playwright Skill", desc: "Browser automation — Claude autonomously writes and executes tests.", icon: "🎭", category: "Skill", author: "lackeyjb", stars: "", github: "https://github.com/lackeyjb/playwright-skill", installed: false },
  { name: "Godogen", desc: "Builds complete Godot 4 game projects from a description.", icon: "🎮", category: "Skill", author: "htdt", stars: "", github: "https://github.com/htdt/godogen", installed: false },
  { name: "Claude Ads", desc: "Paid advertising audit & optimization — 186 checks across platforms.", icon: "📢", category: "Skill", author: "AgriciDaniel", stars: "", github: "https://github.com/AgriciDaniel/claude-ads", installed: false },
  { name: "Videocut Skills", desc: "Video editing agent for Claude Code.", icon: "🎬", category: "Skill", author: "Ceeon", stars: "", github: "https://github.com/Ceeon/videocut-skills", installed: false },
  { name: "Axiom", desc: "Battle-tested skills for iOS/iPadOS/watchOS/tvOS development.", icon: "🍎", category: "Skill", author: "CharlesWiltgen", stars: "", github: "https://github.com/CharlesWiltgen/Axiom", installed: false },
  { name: "context-engineering-kit", desc: "Hand-crafted skills focused on improving agent results quality.", icon: "⚡", category: "Skill", author: "NeoLabHQ", stars: "", github: "https://github.com/NeoLabHQ/context-engineering-kit", installed: false },
  { name: "translate-book", desc: "Translates entire books (PDF/DOCX/EPUB) using parallel subagents.", icon: "📚", category: "Skill", author: "deusyu", stars: "", github: "https://github.com/deusyu/translate-book", installed: false },
  { name: "claude-health", desc: "Audit your Claude Code config health across all layers.", icon: "🩺", category: "Tool", author: "tw93", stars: "", github: "https://github.com/tw93/claude-health", installed: false },
  { name: "dotnet-skills", desc: "Skills and sub-agents for .NET developers.", icon: "🟣", category: "Skill", author: "Aaronontheweb", stars: "", github: "https://github.com/Aaronontheweb/dotnet-skills", installed: false },
  { name: "learning-opportunities", desc: "Deliberate skill development during AI-assisted coding.", icon: "📖", category: "Skill", author: "DrCatHicks", stars: "", github: "https://github.com/DrCatHicks/learning-opportunities", installed: false },
  { name: "Skill Factory", desc: "Toolkit for building and deploying Claude Code skills.", icon: "🏭", category: "Tool", author: "alirezarezvani", stars: "", github: "https://github.com/alirezarezvani/claude-code-skill-factory", installed: false },
  { name: "Raptor", desc: "Turns Claude Code into an offensive/defensive security tool.", icon: "🦅", category: "Skill", author: "gadievron", stars: "", github: "https://github.com/gadievron/raptor", installed: false },
  { name: "BMAD Skills", desc: "BMAD Method skills with auto-detection and memory integration.", icon: "⚙️", category: "Skill", author: "aj-geddes", stars: "", github: "https://github.com/aj-geddes/claude-code-bmad-skills", installed: false },
  // Universal Rules & Cross-Platform
  { name: "awesome-cursorrules", desc: "Massive curated .cursorrules collection — adaptable as CLAUDE.md rules.", icon: "📐", category: "Directory", author: "PatrickJS", stars: "", github: "https://github.com/PatrickJS/awesome-cursorrules", installed: false },
  { name: "everything-claude-code", desc: "Agent harness with skills, instincts, memory, and research-first patterns.", icon: "🧬", category: "Skill", author: "affaan-m", stars: "", github: "https://github.com/affaan-m/everything-claude-code", installed: false },
  { name: "UI/UX Pro Max", desc: "Design intelligence for building professional UI/UX across platforms.", icon: "✨", category: "Skill", author: "nextlevelbuilder", stars: "", github: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill", installed: false },
  { name: "Get Shit Done", desc: "Meta-prompting, context engineering, and spec-driven development.", icon: "🚀", category: "Skill", author: "gsd-build", stars: "", github: "https://github.com/gsd-build/get-shit-done", installed: false },
  { name: "OpenSpec", desc: "Spec-driven development — write specs, let AI implement.", icon: "📄", category: "Skill", author: "Fission-AI", stars: "", github: "https://github.com/Fission-AI/OpenSpec", installed: false },
  { name: "Taste Skill", desc: "High-agency frontend skill — stops generic UI, adds good design taste.", icon: "👁️", category: "Skill", author: "Leonxlnx", stars: "", github: "https://github.com/Leonxlnx/taste-skill", installed: false },
  { name: "claude-mem", desc: "Persistent memory across sessions. Auto-captures and compresses context.", icon: "💾", category: "Skill", author: "thedotmack", stars: "", github: "https://github.com/thedotmack/claude-mem", installed: false },
  { name: "devin.cursorrules", desc: "Turns AI agents into 90% of Devin with plan-driven agentic coding.", icon: "🤖", category: "Skill", author: "grapeot", stars: "", github: "https://github.com/grapeot/devin.cursorrules", installed: false },
  { name: "OpenSkills", desc: "Universal skills loader for ALL AI coding agents — npm install.", icon: "📥", category: "Tool", author: "numman-ali", stars: "", github: "https://github.com/numman-ali/openskills", installed: false },
  { name: "Cybersecurity Skills", desc: "753+ structured cybersecurity skills, MITRE ATT&CK mapped.", icon: "🔐", category: "Skill", author: "mukul975", stars: "", github: "https://github.com/mukul975/Anthropic-Cybersecurity-Skills", installed: false },
  // Design & Frontend
  { name: "GSAP Skills", desc: "Official GSAP animation skills — ScrollTrigger, React/Vue/Svelte.", icon: "🎞️", category: "Skill", author: "greensock", stars: "", github: "https://github.com/greensock/gsap-skills", installed: false },
  // Security Rules
  { name: "Wiz Secure Rules", desc: "Baseline security rules from Wiz for AI-generated code.", icon: "🔒", category: "Skill", author: "wiz-sec-public", stars: "", github: "https://github.com/wiz-sec-public/secure-rules-files", installed: false },
  { name: "Ghost Security Skills", desc: "AppSec skills for AI coding agents — application security testing.", icon: "👻", category: "Skill", author: "ghostsecurity", stars: "", github: "https://github.com/ghostsecurity/skills", installed: false },
  // Agent & Orchestration
  { name: "Ruler", desc: "Apply the same rules to ALL coding agents — universal rule format.", icon: "📏", category: "Tool", author: "intellectronica", stars: "", github: "https://github.com/intellectronica/ruler", installed: false },
  { name: "SkillKit", desc: "Install and share portable skills across Claude, Cursor, Codex, Copilot.", icon: "🧰", category: "Tool", author: "rohitg00", stars: "", github: "https://github.com/rohitg00/skillkit", installed: false },
  { name: "Cipher", desc: "Open-source memory layer for coding agents via MCP.", icon: "🔗", category: "Skill", author: "campfirein", stars: "", github: "https://github.com/campfirein/cipher", installed: false },
  { name: "10x Tool Calls", desc: "Maximize AI tool call efficiency — get 10x more work per request.", icon: "⚡", category: "Skill", author: "perrypixel", stars: "", github: "https://github.com/perrypixel/10x-Tool-Calls", installed: false },
  { name: "Claude Code Showcase", desc: "Comprehensive config example — hooks, skills, agents, commands, CI.", icon: "🏗️", category: "Skill", author: "ChrisWiles", stars: "", github: "https://github.com/ChrisWiles/claude-code-showcase", installed: false },
  { name: "Claude Forge", desc: "11 agents, 36 commands, 15 skills — plugin framework for Claude Code.", icon: "🔨", category: "Skill", author: "sangrokjung", stars: "", github: "https://github.com/sangrokjung/claude-forge", installed: false },
  { name: "Mindrally Skills", desc: "240+ skills converted from Cursor rules — every major framework.", icon: "🧠", category: "Directory", author: "Mindrally", stars: "", github: "https://github.com/Mindrally/skills", installed: false },
  // Framework-Specific
  { name: ".NET Skills (Official)", desc: "Official .NET/C# skills for AI coding agents from Microsoft.", icon: "🟦", category: "Skill", author: "dotnet", stars: "", github: "https://github.com/dotnet/skills", installed: false },
  { name: "AWS Agent Plugins", desc: "Official AWS plugins — architect, deploy, and operate on AWS.", icon: "☁️", category: "Skill", author: "awslabs", stars: "", github: "https://github.com/awslabs/agent-plugins", installed: false },
  { name: "awesome-claude-code-toolkit", desc: "135 agents, 35 skills, 42 commands, 150+ plugins in one toolkit.", icon: "🧳", category: "Directory", author: "rohitg00", stars: "", github: "https://github.com/rohitg00/awesome-claude-code-toolkit", installed: false },
];

// Format star count: 1234 → "1.2k"
function formatStars(count: number): string {
  if (count < 0) return "";
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(count);
}

// Fetch real star counts from GitHub API
function useGithubStars(skills: SkillEntry[]) {
  const [stars, setStars] = useState<Record<string, string>>({});

  useEffect(() => {
    const repos = skills.filter((s) => s.github).map((s) => s.github);
    if (repos.length === 0) return;

    // Check sessionStorage cache first
    const cacheKey = "meld-github-stars";
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 60 * 60 * 1000) {
          setStars(parsed.data);
          return;
        }
      }
    } catch {}

    fetch("/api/github-stars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repos }),
    })
      .then((res) => res.json())
      .then((data: Record<string, number>) => {
        const formatted: Record<string, string> = {};
        for (const [url, count] of Object.entries(data)) {
          formatted[url] = formatStars(count);
        }
        setStars(formatted);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ data: formatted, ts: Date.now() }));
        } catch {}
      })
      .catch(() => {});
  }, [skills]);

  return stars;
}

function SkillsMarketplace({ isDark, t }: { isDark: boolean; t: Record<string, string> }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [installedSkills, setInstalledSkills] = useState<Set<string>>(
    () => new Set(SKILLS_REGISTRY.filter(s => s.installed).map(s => s.name))
  );
  const [customUrl, setCustomUrl] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const githubStars = useGithubStars(SKILLS_REGISTRY);

  const categories = ["All", "Skill", "Directory", "Tool", "Built-in"];

  const filtered = SKILLS_REGISTRY.filter(s => {
    if (activeCategory !== "All" && s.category !== activeCategory) return false;
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.desc.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const [installing, setInstalling] = useState<string | null>(null);
  const [skillFiles, setSkillFiles] = useState<Record<string, Record<string, string>>>({});

  const handleInstall = async (name: string) => {
    const skill = SKILLS_REGISTRY.find(s => s.name === name);
    if (!skill) return;

    // Toggle off
    if (installedSkills.has(name)) {
      setInstalledSkills(prev => { const next = new Set(prev); next.delete(name); return next; });
      // Remove from localStorage
      const stored = JSON.parse(localStorage.getItem("meld-installed-skills") || "[]");
      localStorage.setItem("meld-installed-skills", JSON.stringify(stored.filter((s: string) => s !== name)));
      // Remove all cached data
      try {
        for (const key of ["meld-skill-contents", "meld-skill-commands", "meld-skill-references"]) {
          const cached = JSON.parse(localStorage.getItem(key) || "{}");
          delete cached[name];
          localStorage.setItem(key, JSON.stringify(cached));
        }
      } catch {}
      return;
    }

    // Built-in — just toggle
    if (!skill.github) {
      setInstalledSkills(prev => new Set(prev).add(name));
      return;
    }

    // Fetch skill files from GitHub
    setInstalling(name);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl: skill.github, action: "fetch" }),
      });
      if (res.ok) {
        const data = await res.json();
        setSkillFiles(prev => ({ ...prev, [name]: data.files }));
        setInstalledSkills(prev => new Set(prev).add(name));
        // Persist skill name
        const stored = JSON.parse(localStorage.getItem("meld-installed-skills") || "[]");
        if (!stored.includes(name)) {
          localStorage.setItem("meld-installed-skills", JSON.stringify([...stored, name]));
        }
        // Cache skill content (rules) for AI injection
        if (data.rules) {
          const cached = JSON.parse(localStorage.getItem("meld-skill-contents") || "{}");
          cached[name] = data.rules.slice(0, 4000);
          localStorage.setItem("meld-skill-contents", JSON.stringify(cached));
        }
        // Cache skill commands for / autocomplete
        if (data.commands?.length > 0) {
          const cmds = JSON.parse(localStorage.getItem("meld-skill-commands") || "{}");
          cmds[name] = data.commands;
          localStorage.setItem("meld-skill-commands", JSON.stringify(cmds));
        }
        // Cache skill references
        if (data.references?.length > 0) {
          const refs = JSON.parse(localStorage.getItem("meld-skill-references") || "{}");
          refs[name] = data.references;
          localStorage.setItem("meld-skill-references", JSON.stringify(refs));
        }
      }
    } catch {}
    setInstalling(null);
  };

  // Restore installed skills from localStorage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("meld-installed-skills") || "[]");
      if (stored.length > 0) {
        setInstalledSkills(prev => {
          const next = new Set(prev);
          stored.forEach((s: string) => next.add(s));
          return next;
        });
      }
    } catch {}
  }, []);

  // Skill detail modal
  const [detailSkill, setDetailSkill] = useState<SkillEntry | null>(null);
  const [detailReadme, setDetailReadme] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openSkillDetail = async (skill: SkillEntry) => {
    setDetailSkill(skill);
    setDetailReadme(null);
    if (!skill.github) return;
    setDetailLoading(true);
    try {
      const repo = skill.github.replace("https://github.com/", "");
      const res = await fetch(`https://raw.githubusercontent.com/${repo}/main/README.md`);
      if (res.ok) {
        const text = await res.text();
        setDetailReadme(text.slice(0, 3000)); // First 3000 chars
      } else {
        // Try master branch
        const res2 = await fetch(`https://raw.githubusercontent.com/${repo}/master/README.md`);
        if (res2.ok) setDetailReadme((await res2.text()).slice(0, 3000));
      }
    } catch {}
    setDetailLoading(false);
  };

  const handleCustomInstall = () => {
    if (!customUrl.trim()) return;
    setCustomUrl("");
    setShowCustom(false);
  };

  return (
    <>
    {/* Skill Detail Modal */}
    {detailSkill && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setDetailSkill(null)}>
        <div className={`w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in rounded-2xl shadow-2xl ${isDark ? "bg-[#181818] ring-1 ring-white/[0.08]" : "bg-white ring-1 ring-black/[0.06]"}`} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={`flex items-start justify-between p-6 border-b ${isDark ? "border-[#333]" : "border-[#F0F0EE]"}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className={`text-[20px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{detailSkill.name}</h2>
                {installedSkills.has(detailSkill.name) && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Active</span>
                )}
              </div>
              <p className={`text-[13px] ${isDark ? "text-[#9A9A95]" : "text-[#787774]"}`}>{detailSkill.desc}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${isDark ? "bg-[#333] text-[#9A9A95]" : "bg-[#F0F0EE] text-[#787774]"}`}>{detailSkill.category}</span>
                <span className={`text-[12px] ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>by {detailSkill.author}</span>
                {(githubStars[detailSkill.github] || detailSkill.stars) && (
                  <span className={`text-[12px] ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>⭐ {githubStars[detailSkill.github] || detailSkill.stars}</span>
                )}
              </div>
            </div>
            <button onClick={() => setDetailSkill(null)} className={`rounded-lg p-1.5 ${isDark ? "text-[#666] hover:bg-[#333]" : "text-[#B4B4B0] hover:bg-[#F0F0EE]"} transition-colors`}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Quick info cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className={`rounded-xl p-3 ${isDark ? "bg-[#252525]" : "bg-[#F7F7F5]"}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-[#666]" : "text-[#B4B4B0]"}`}>Author</p>
                <p className={`text-[13px] font-medium ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{detailSkill.author}</p>
              </div>
              <div className={`rounded-xl p-3 ${isDark ? "bg-[#252525]" : "bg-[#F7F7F5]"}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-[#666]" : "text-[#B4B4B0]"}`}>Category</p>
                <p className={`text-[13px] font-medium ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{detailSkill.category}</p>
              </div>
              <div className={`rounded-xl p-3 ${isDark ? "bg-[#252525]" : "bg-[#F7F7F5]"}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-[#666]" : "text-[#B4B4B0]"}`}>Source</p>
                {detailSkill.github ? (
                  <a href={detailSkill.github} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-blue-400 hover:underline truncate block">
                    GitHub ↗
                  </a>
                ) : (
                  <p className={`text-[13px] font-medium ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>Built-in</p>
                )}
              </div>
            </div>

            {/* How to use */}
            <div className="mb-6">
              <h3 className={`text-[14px] font-bold mb-3 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>How to use</h3>
              <div className={`rounded-xl p-4 space-y-3 ${isDark ? "bg-[#252525]" : "bg-[#F7F7F5]"}`}>
                <div className="flex items-start gap-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold flex-shrink-0 ${isDark ? "bg-[#333] text-[#E8E8E5]" : "bg-[#E0E0DC] text-[#1A1A1A]"}`}>1</span>
                  <p className={`text-[12px] leading-relaxed ${isDark ? "text-[#9A9A95]" : "text-[#787774]"}`}>
                    Click <strong className={isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}>Connect</strong> to install the skill into your workspace.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold flex-shrink-0 ${isDark ? "bg-[#333] text-[#E8E8E5]" : "bg-[#E0E0DC] text-[#1A1A1A]"}`}>2</span>
                  <p className={`text-[12px] leading-relaxed ${isDark ? "text-[#9A9A95]" : "text-[#787774]"}`}>
                    The skill's rules and instructions are loaded into Meld AI's context automatically.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold flex-shrink-0 ${isDark ? "bg-[#333] text-[#E8E8E5]" : "bg-[#E0E0DC] text-[#1A1A1A]"}`}>3</span>
                  <p className={`text-[12px] leading-relaxed ${isDark ? "text-[#9A9A95]" : "text-[#787774]"}`}>
                    Use the chat to ask AI for help — the skill's expertise is automatically applied.
                  </p>
                </div>
              </div>
            </div>

            {/* README */}
            <div>
              <h3 className={`text-[14px] font-bold mb-3 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>About</h3>
              {detailLoading ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 className={`h-4 w-4 animate-spin ${isDark ? "text-[#666]" : "text-[#B4B4B0]"}`} />
                  <span className={`text-[12px] ${isDark ? "text-[#666]" : "text-[#B4B4B0]"}`}>Loading README...</span>
                </div>
              ) : detailReadme ? (
                <div className={`rounded-xl p-4 ${isDark ? "bg-[#252525]" : "bg-[#F7F7F5]"}`}>
                  <pre className={`text-[12px] leading-relaxed whitespace-pre-wrap font-sans ${isDark ? "text-[#9A9A95]" : "text-[#787774]"}`}>
                    {detailReadme}
                  </pre>
                </div>
              ) : (
                <p className={`text-[12px] ${isDark ? "text-[#666]" : "text-[#B4B4B0]"}`}>
                  {detailSkill.desc}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between p-6 border-t ${isDark ? "border-[#333]" : "border-[#F0F0EE]"}`}>
            {detailSkill.github && (
              <a href={detailSkill.github} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 text-[12px] font-medium ${isDark ? "text-[#9A9A95] hover:text-[#E8E8E5]" : "text-[#787774] hover:text-[#1A1A1A]"} transition-colors`}>
                <Github className="h-3.5 w-3.5" />
                View on GitHub
              </a>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => setDetailSkill(null)} className={`rounded-xl px-4 py-2 text-[13px] font-medium transition-colors ${isDark ? "text-[#9A9A95] hover:bg-[#333]" : "text-[#787774] hover:bg-[#F0F0EE]"}`}>
                Close
              </button>
              {installedSkills.has(detailSkill.name) ? (
                <button
                  onClick={() => { handleInstall(detailSkill.name); }}
                  className="rounded-xl px-4 py-2 text-[13px] font-medium text-red-400 ring-1 ring-red-400/20 hover:bg-red-500/10 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => { handleInstall(detailSkill.name); setDetailSkill(null); }}
                  className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors ${isDark ? "bg-[#E8E8E5] text-[#1A1A1A] hover:bg-white" : "bg-[#1A1A1A] text-white hover:bg-[#333]"}`}
                >
                  {installing === detailSkill.name ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    <div className={`${isDark ? "bg-[#181818]" : "bg-white"} h-full flex flex-col`}>
      <div className="max-w-6xl mx-auto px-8 pt-10 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-[18px] font-bold ${t.textHeading}`}>Skills & Plugins</h1>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${isDark ? "text-[#9A9A95] ring-1 ring-white/[0.06] hover:bg-[#333]" : "text-[#787774] ring-1 ring-black/[0.06] hover:bg-[#F7F7F5]"}`}
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        {/* GitHub URL input */}
        {showCustom && (
          <div className={`mb-6 animate-fade-in rounded-xl p-4 ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06]" : "bg-[#F7F7F5]"}`}>
            <p className={`text-[13px] font-medium ${t.text} mb-2`}>Install from GitHub URL</p>
            <p className={`text-[12px] ${t.textMuted} mb-3`}>Paste a GitHub repository URL containing an MCP server, Claude Code skill, or plugin.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className={`flex-1 rounded-lg px-3 py-2 text-[13px] outline-none ${isDark ? "bg-[#1A1A1A] text-[#E8E8E5] ring-1 ring-white/[0.06] placeholder:text-[#555]" : "bg-white text-[#1A1A1A] ring-1 ring-black/[0.06]"}`}
                onKeyDown={(e) => { if (e.key === "Enter") handleCustomInstall(); }}
              />
              <button
                onClick={handleCustomInstall}
                disabled={!customUrl.trim()}
                className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-30 ${isDark ? "bg-[#E8E8E5] text-[#1A1A1A]" : "bg-[#1A1A1A] text-white"}`}
              >
                Install
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-6 ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06]" : "bg-[#F7F7F5] ring-1 ring-black/[0.04]"}`}>
          <Search className={`h-4 w-4 ${t.textMuted}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills, tools, plugins..."
            className={`flex-1 bg-transparent text-[14px] ${t.text} placeholder:text-[#555] outline-none`}
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                activeCategory === cat
                  ? isDark ? "bg-[#E8E8E5] text-[#1A1A1A]" : "bg-[#1A1A1A] text-white"
                  : isDark ? "bg-[#151515] text-[#9A9A95] hover:bg-[#333]" : "bg-[#F7F7F5] text-[#787774] hover:bg-[#EEEEEC]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills grid — scrollable area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 pb-8">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className={`text-[14px] ${t.textMuted}`}>No results found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {filtered.map((skill, i) => {
              const isInstalled = installedSkills.has(skill.name);
              const starCount = githubStars[skill.github] || skill.stars;
              const repoPath = skill.github ? skill.github.replace("https://github.com/", "") : "";
              return (
                <div
                  key={skill.name}
                  onClick={() => openSkillDetail(skill)}
                  className={`animate-card-stagger flex flex-col rounded-xl p-4 transition-all cursor-pointer active:scale-[0.97] ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06] hover:ring-white/[0.12]" : "bg-[#F7F7F5] ring-1 ring-black/[0.04] hover:ring-black/[0.08]"}`}
                  style={{ animationDelay: `${Math.min(i * 30, 600)}ms` }}
                >
                  {/* Header: name + repo */}
                  <div className="mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className={`text-[14px] font-bold truncate ${t.text}`}>{skill.name}</h3>
                      {isInstalled && (
                        <span className="flex-shrink-0 text-emerald-400 text-[12px]">●</span>
                      )}
                    </div>
                    {repoPath && (
                      <p className={`text-[11px] truncate ${t.textMuted}`}>{repoPath}</p>
                    )}
                    {skill.category === "Built-in" && (
                      <p className={`text-[11px] ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>Meld Team</p>
                    )}
                  </div>

                  {/* Description */}
                  <p className={`text-[12px] leading-relaxed line-clamp-2 flex-1 ${t.textMuted}`}>{skill.desc}</p>

                  {/* Footer: stars + actions */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isDark ? "bg-[#2A2A2A] text-[#9A9A95]" : "bg-[#EEEEEC] text-[#787774]"}`}>
                        {skill.category}
                      </span>
                      {starCount && (
                        <span className={`text-[11px] ${t.textMuted}`}>⭐ {starCount}</span>
                      )}
                    </div>
                    {isInstalled ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleInstall(skill.name); }}
                        className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 transition-colors hover:bg-red-500/15 hover:text-red-400"
                      >
                        Active
                      </button>
                    ) : installing === skill.name ? (
                      <div className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white/10">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9A9A95]" />
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleInstall(skill.name); }}
                        className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white text-[#1A1A1A] transition-colors hover:bg-[#E8E8E5] active:scale-[0.95]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Syntax-highlighted Code Editor ──────────────────────
function getLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "tsx"].includes(ext)) return "typescript";
  if (["js", "jsx", "mjs", "cjs"].includes(ext)) return "javascript";
  if (ext === "css" || ext === "scss") return "css";
  if (ext === "html") return "html";
  if (ext === "json") return "json";
  if (ext === "md") return "markdown";
  if (ext === "yml" || ext === "yaml") return "yaml";
  return "text";
}

// Token-based syntax highlighter (no nested regex issues)
type Token = { text: string; color?: string };

function tokenizeLine(line: string, lang: string): Token[] {
  if (lang === "text" || lang === "markdown") return [{ text: line }];

  const tokens: Token[] = [];
  let i = 0;

  // Cursor-style color palette
  const C = {
    keyword: "#C586C0",     // purple — import, export, const, return, if, etc.
    storage: "#569CD6",     // blue — function, class, interface, type, let, var, const
    string: "#CE9178",      // orange — strings
    number: "#B5CEA8",      // green — numbers
    comment: "#6A9955",     // green — comments
    fn: "#DCDCAA",          // yellow — function calls
    type: "#4EC9B0",        // teal — types, components
    param: "#9CDCFE",       // light blue — parameters, properties, JSX attributes
    tag: "#569CD6",         // blue — JSX/HTML tags
    bracket: "#FFD700",     // gold — brackets {} [] ()
    operator: "#D4D4D4",    // light gray — operators
    punctuation: "#808080", // gray — semicolons, commas
    constant: "#4FC1FF",    // cyan — true, false, null, undefined
    cssSelector: "#D7BA7D", // gold — CSS selectors
    cssValue: "#CE9178",    // orange — CSS values
    decorator: "#DCDCAA",   // yellow — decorators
  };

  const CONTROL_KEYWORDS = new Set(["if","else","for","while","do","switch","case","break","continue","return","throw","try","catch","finally","yield","await","async","in","of","instanceof","typeof","void","delete","new"]);
  const STORAGE_KEYWORDS = new Set(["const","let","var","function","class","extends","implements","interface","type","enum","abstract","readonly","private","protected","public","static","declare","namespace","module","export","import","from","default","super","as","is","keyof","infer","require"]);
  const CONSTANTS = new Set(["true","false","null","undefined","NaN","Infinity","this"]);
  const TS_TYPES = new Set(["string","number","boolean","any","void","never","unknown","object","bigint","symbol","Record","Array","Map","Set","Promise","React","JSX","Element","ReactNode","HTMLElement","Event","MouseEvent","KeyboardEvent","ChangeEvent","FormEvent","CSSProperties","FC","ReactElement","ComponentProps","PropsWithChildren","Ref","MutableRefObject","Dispatch","SetStateAction"]);

  const isJS = lang === "typescript" || lang === "javascript";
  const isCSS = lang === "css";
  const isJSON = lang === "json";
  const isHTML = lang === "html";
  const isYAML = lang === "yaml";

  const push = (text: string, color?: string) => { if (text) tokens.push({ text, color }); };
  const peek = (offset = 0) => line[i + offset] ?? "";
  const isWordChar = (c: string) => /[a-zA-Z0-9_$]/.test(c);

  // Track if we're inside a JSX tag for attribute coloring
  let inJSXTag = false;

  while (i < line.length) {
    const ch = line[i];

    // Comments
    if ((isJS || isCSS) && ch === "/" && peek(1) === "/") {
      push(line.slice(i), C.comment); break;
    }
    if ((isJS || isCSS) && ch === "/" && peek(1) === "*") {
      const end = line.indexOf("*/", i + 2);
      if (end >= 0) { push(line.slice(i, end + 2), C.comment); i = end + 2; continue; }
      push(line.slice(i), C.comment); break;
    }
    if (isYAML && ch === "#") { push(line.slice(i), C.comment); break; }

    // Strings
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) { if (line[j] === "\\") j++; j++; }
      if (j < line.length) j++;
      push(line.slice(i, j), C.string); i = j; continue;
    }

    // Numbers
    if (/[0-9]/.test(ch) && (i === 0 || !isWordChar(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[0-9.xXa-fA-F_n]/.test(line[j])) j++;
      if (isCSS) while (j < line.length && /[a-z%]/.test(line[j])) j++;
      push(line.slice(i, j), C.number); i = j; continue;
    }

    // Words
    if (isWordChar(ch)) {
      let j = i;
      while (j < line.length && isWordChar(line[j])) j++;
      const word = line.slice(i, j);
      const nextNonSpace = line.slice(j).match(/^\s*(.)/)?.[1];
      const prevChar = i > 0 ? line[i - 1] : "";

      if (isJS) {
        if (CONSTANTS.has(word)) {
          push(word, C.constant);
        } else if (CONTROL_KEYWORDS.has(word)) {
          push(word, C.keyword);
        } else if (STORAGE_KEYWORDS.has(word)) {
          push(word, C.storage);
        } else if (TS_TYPES.has(word)) {
          push(word, C.type);
        } else if (word[0] === word[0].toUpperCase() && /[a-z]/.test(word.slice(1))) {
          // PascalCase → component/class/type name
          push(word, C.type);
        } else if (nextNonSpace === "(") {
          push(word, C.fn);
        } else if (inJSXTag || prevChar === "." || nextNonSpace === "=") {
          // JSX attributes, object properties, assignments
          push(word, C.param);
        } else {
          push(word, "#D4D4D4"); // default identifiers — light gray
        }
      } else if (isJSON) {
        if (CONSTANTS.has(word)) push(word, C.constant);
        else push(word);
      } else if (isCSS) {
        const CSS_VALUES = new Set(["flex","grid","block","inline","none","absolute","relative","fixed","sticky","hidden","auto","inherit","initial","unset","center","start","end","space-between","space-around","column","row","wrap","nowrap","bold","normal","italic","underline","pointer","solid","dashed","dotted","transparent","scroll","visible"]);
        if (nextNonSpace === ":") push(word, C.param);
        else if (CSS_VALUES.has(word)) push(word, C.constant);
        else if (word.startsWith("#") || /^(rgb|hsl|rgba|hsla)\b/.test(word)) push(word, C.string);
        else push(word, "#D4D4D4");
      } else if (isHTML) {
        push(word, C.tag);
      } else {
        push(word);
      }
      i = j; continue;
    }

    // JSX/HTML tags: < and >
    if ((isJS || isHTML) && ch === "<") {
      // Check if it's a tag (not comparison operator)
      const after = line.slice(i + 1).match(/^\/?\s*([a-zA-Z])/);
      if (after) {
        inJSXTag = true;
        push(ch, C.punctuation);
        // Handle </
        if (peek(1) === "/") { push("/", C.punctuation); i += 2; }
        else { i++; }
        // Read tag name
        let j = i;
        while (j < line.length && isWordChar(line[j])) j++;
        if (j > i) {
          const tagName = line.slice(i, j);
          push(tagName, tagName[0] === tagName[0].toUpperCase() ? C.type : C.tag);
          i = j;
        }
        continue;
      }
      push(ch, C.operator); i++; continue;
    }
    if ((isJS || isHTML) && ch === ">") {
      inJSXTag = false;
      push(ch, C.punctuation); i++; continue;
    }
    if ((isJS || isHTML) && ch === "/" && peek(1) === ">") {
      inJSXTag = false;
      push("/>", C.punctuation); i += 2; continue;
    }

    // CSS hex colors (#f5f5f5)
    if (isCSS && ch === "#" && /[0-9a-fA-F]/.test(peek(1))) {
      let j = i + 1;
      while (j < line.length && /[0-9a-fA-F]/.test(line[j])) j++;
      push(line.slice(i, j), C.string); i = j; continue;
    }
    // CSS selectors (.class, #id)
    if (isCSS && (ch === "." || ch === "#") && /[a-zA-Z_]/.test(peek(1))) {
      let j = i + 1;
      while (j < line.length && (isWordChar(line[j]) || line[j] === "-")) j++;
      push(line.slice(i, j), C.cssSelector); i = j; continue;
    }

    // Arrow =>
    if (isJS && ch === "=" && peek(1) === ">") {
      push("=>", C.storage); i += 2; continue;
    }

    // Brackets — colored
    if ("{}".includes(ch)) { push(ch, C.bracket); i++; continue; }
    if ("[]()".includes(ch)) { push(ch, C.operator); i++; continue; }

    // Punctuation
    if (";,".includes(ch)) { push(ch, C.punctuation); i++; continue; }

    // Operators
    if ("=+*&|!?:%~^".includes(ch)) { push(ch, C.operator); i++; continue; }
    if (ch === "-" && !isWordChar(peek(1))) { push(ch, C.operator); i++; continue; }

    // Decorators
    if (isJS && ch === "@" && isWordChar(peek(1))) {
      let j = i + 1;
      while (j < line.length && isWordChar(line[j])) j++;
      push(line.slice(i, j), "#DCDCAA"); i = j; continue;
    }

    // Operators and punctuation
    push(ch); i++;
  }

  return tokens;
}

function highlightCode(code: string, lang: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const isJS = lang === "typescript" || lang === "javascript";
  const lines = code.split("\n");
  let inTemplateLiteral = false; // Track backtick template strings (styled-components CSS)
  let inBlockComment = false;

  return lines.map(line => {
    // Handle block comments spanning multiple lines
    if (inBlockComment) {
      const endIdx = line.indexOf("*/");
      if (endIdx >= 0) {
        inBlockComment = false;
        const commentPart = line.slice(0, endIdx + 2);
        const rest = line.slice(endIdx + 2);
        const commentHtml = `<span style="color:#6A9955">${esc(commentPart)}</span>`;
        const restTokens = tokenizeLine(rest, inTemplateLiteral ? "css" : lang);
        const restHtml = restTokens.map(t => t.color ? `<span style="color:${t.color}">${esc(t.text)}</span>` : esc(t.text)).join("");
        return commentHtml + restHtml;
      }
      return `<span style="color:#6A9955">${esc(line)}</span>`;
    }

    // Check for block comment start
    if ((isJS || lang === "css") && line.includes("/*") && !line.includes("*/")) {
      const idx = line.indexOf("/*");
      const before = line.slice(0, idx);
      const comment = line.slice(idx);
      inBlockComment = true;
      const beforeTokens = tokenizeLine(before, inTemplateLiteral ? "css" : lang);
      const beforeHtml = beforeTokens.map(t => t.color ? `<span style="color:${t.color}">${esc(t.text)}</span>` : esc(t.text)).join("");
      return beforeHtml + `<span style="color:#6A9955">${esc(comment)}</span>`;
    }

    // Detect template literal boundaries for styled-components / css``
    if (isJS && !inTemplateLiteral) {
      // Check if line has styled.xxx` or css` pattern opening a template
      const styledMatch = line.match(/(?:styled\.\w+|styled\(\w+\)|css|keyframes|createGlobalStyle)`/);
      if (styledMatch) {
        // Split: JS part before backtick, CSS part after
        const backtickIdx = line.indexOf("`", line.indexOf(styledMatch[0]));
        const jsPart = line.slice(0, backtickIdx + 1);
        const cssPart = line.slice(backtickIdx + 1);
        const jsTokens = tokenizeLine(jsPart, lang);
        const jsHtml = jsTokens.map(t => t.color ? `<span style="color:${t.color}">${esc(t.text)}</span>` : esc(t.text)).join("");

        // Check if template closes on same line
        const closeIdx = cssPart.indexOf("`");
        if (closeIdx >= 0) {
          const cssContent = cssPart.slice(0, closeIdx);
          const afterClose = cssPart.slice(closeIdx);
          const cssTokens = tokenizeLine(cssContent, "css");
          const cssHtml = cssTokens.map(t => t.color ? `<span style="color:${t.color}">${esc(t.text)}</span>` : esc(t.text)).join("");
          const afterTokens = tokenizeLine(afterClose, lang);
          const afterHtml = afterTokens.map(t => t.color ? `<span style="color:${t.color}">${esc(t.text)}</span>` : esc(t.text)).join("");
          return jsHtml + cssHtml + afterHtml;
        }
        inTemplateLiteral = true;
        const cssTokens = tokenizeLine(cssPart, "css");
        const cssHtml = cssTokens.map(t => t.color ? `<span style="color:${t.color}">${esc(t.text)}</span>` : esc(t.text)).join("");
        return jsHtml + cssHtml;
      }
    }

    if (isJS && inTemplateLiteral) {
      // Check if this line closes the template
      const closeIdx = line.indexOf("`;");
      const closeIdx2 = line.indexOf("`");
      const actualClose = closeIdx >= 0 ? closeIdx : closeIdx2;
      if (actualClose >= 0 && (line[actualClose] === "`")) {
        inTemplateLiteral = false;
        const cssPart = line.slice(0, actualClose);
        const jsPart = line.slice(actualClose);
        const cssTokens = tokenizeLine(cssPart, "css");
        const cssHtml = cssTokens.map(t => t.color ? `<span style="color:${t.color}">${esc(t.text)}</span>` : esc(t.text)).join("");
        const jsTokens = tokenizeLine(jsPart, lang);
        const jsHtml = jsTokens.map(t => t.color ? `<span style="color:${t.color}">${esc(t.text)}</span>` : esc(t.text)).join("");
        return cssHtml + jsHtml;
      }
      // Entire line is CSS inside template
      const tokens = tokenizeLine(line, "css");
      return tokens.map(t => t.color ? `<span style="color:${t.color}">${esc(t.text)}</span>` : esc(t.text)).join("");
    }

    const tokens = tokenizeLine(line, lang);
    return tokens.map(t => {
      const escaped = esc(t.text);
      return t.color ? `<span style="color:${t.color}">${escaped}</span>` : escaped;
    }).join("");
  }).join("\n");
}

function SyntaxEditor({ filePath, value, onChange, onSave, isDark }: {
  filePath: string;
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
  isDark: boolean;
}) {
  const lang = getLanguage(filePath);
  const highlighted = useMemo(() => highlightCode(value, lang), [value, lang]);
  const lines = value.split("\n");
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncScroll = () => {
    if (containerRef.current && textareaRef.current) {
      containerRef.current.scrollTop = textareaRef.current.scrollTop;
      containerRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Line numbers */}
      <div className={`flex-shrink-0 select-none overflow-hidden border-r ${isDark ? "bg-[#181818] border-[#333]" : "bg-[#F8F8F8] border-[#E0E0DC]"}`}>
        <div className="py-4 pr-3 pl-3 font-mono text-[13px] leading-relaxed text-right">
          {lines.map((_, i) => (
            <div key={i} className={isDark ? "text-[#858585]" : "text-[#B4B4B0]"}>{i + 1}</div>
          ))}
        </div>
      </div>

      {/* Editor area */}
      <div className={`relative flex-1 overflow-hidden ${isDark ? "bg-[#181818]" : "bg-white"}`}>
        {/* Highlighted code (background layer) */}
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-auto pointer-events-none z-[1]"
        >
          <pre
            className={`p-4 font-mono text-[13px] leading-relaxed whitespace-pre ${isDark ? "text-[#D4D4D4]" : "text-[#1A1A1A]"}`}
            dangerouslySetInnerHTML={{ __html: highlighted + "\n" }}
            style={{ margin: 0, background: "transparent" }}
          />
        </div>

        {/* Textarea (foreground, transparent text) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
              e.preventDefault();
              onSave();
            }
            if (e.key === "Tab") {
              e.preventDefault();
              const target = e.target as HTMLTextAreaElement;
              const start = target.selectionStart;
              const end = target.selectionEnd;
              const newVal = value.substring(0, start) + "  " + value.substring(end);
              onChange(newVal);
              requestAnimationFrame(() => {
                target.selectionStart = target.selectionEnd = start + 2;
              });
            }
          }}
          spellCheck={false}
          className="absolute inset-0 z-[2] w-full h-full resize-none p-4 font-mono text-[13px] leading-relaxed outline-none bg-transparent"
          style={{ color: "transparent", caretColor: isDark ? "#D4D4D4" : "#1A1A1A" }}
        />
      </div>
    </div>
  );
}

// ─── Properties Panel (Figma-style) ──────────────────────────
function PropertiesPanel({ isDark, element, onApplyStyle }: {
  isDark: boolean;
  element: import("@/lib/store/agent-store").InspectedElement | null;
  onApplyStyle: (property: string, value: string) => void;
}) {
  void isDark;
  const [ls, setLs] = useState<Record<string, string>>({});
  useEffect(() => {
    if (element?.computedStyle) {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(element.computedStyle))
        clean[k] = v.replace(/(\d+\.\d+)(px|rem|em|%|vw|vh)/g, (_, n, u) => `${Math.round(parseFloat(n))}${u}`);
      setLs(clean);
    } else setLs({});
  }, [element]);
  const up = (p: string, v: string) => setLs((prev) => ({ ...prev, [p]: v }));
  const ap = useCallback((p: string, v: string) => { onApplyStyle(p, v); }, [onApplyStyle]);
  const sa = (p: string, v: string) => { up(p, v); ap(p, v); };
  const ob = (p: string) => { if (ls[p] !== undefined) ap(p, ls[p]); };
  const ok = (p: string, e: React.KeyboardEvent) => { if (e.key === "Enter") { ob(p); (e.target as HTMLInputElement).blur(); } };

  // ── Figma-style tokens ──
  const bg = "#181818";
  const bgInput = "#383838";
  const border = "#444";
  const textP = "#E8E8E5"; // primary text
  const textS = "#AEAEAE"; // secondary
  const textM = "#767676"; // muted
  const accent = "#0D9668"; // brand green (darker mint for contrast)

  const inp = `h-8 min-w-0 rounded-md bg-[${bgInput}] px-3 text-[12px] text-[${textP}] font-mono outline-none border border-[${border}] focus:border-[${accent}] transition-colors placeholder:text-[#555]`;

  // Section header — Figma style
  const SH = ({ title, right }: { title: string; right?: React.ReactNode }) => (
    <div className="flex items-center justify-between px-4 pt-4 pb-2.5">
      <span className={`text-[13px] font-semibold text-[${textP}]`}>{title}</span>
      {right && <div className="flex items-center gap-1.5">{right}</div>}
    </div>
  );

  // Property row with inline icon inside input
  const PR = ({ icon, prop, placeholder, suffix }: { icon?: React.ReactNode; prop: string; placeholder?: string; suffix?: string }) => (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className={`relative flex-1 min-w-0`}>
        {icon && <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[${textM}] pointer-events-none`}>{icon}</span>}
        <input value={ls[prop] ?? ""} placeholder={placeholder ?? "–"} onChange={(e) => up(prop, e.target.value)} onBlur={() => ob(prop)} onKeyDown={(e) => ok(prop, e)} className={`w-full ${inp} ${icon ? "pl-7" : ""}`} />
      </div>
      {suffix && <span className={`text-[10px] text-[${textM}] flex-shrink-0`}>{suffix}</span>}
    </div>
  );

  // Color row — swatch + hex + opacity (Figma style)
  const CR = ({ label, prop }: { label: string; prop: string }) => {
    const raw = ls[prop] || "";
    // Try to extract hex
    let display = raw;
    if (raw.startsWith("#")) display = raw.slice(1).toUpperCase();
    else if (raw.startsWith("rgb")) {
      const m = raw.match(/(\d+)/g);
      if (m && m.length >= 3) display = m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, "0")).join("").toUpperCase();
    }
    return (
      <div>
        {label && <span className={`text-[11px] text-[${textM}] block mb-1 px-4`}>{label}</span>}
        <div className="flex items-center gap-2 px-4">
          <button
            className={`h-6 w-6 rounded flex-shrink-0 ring-1 ring-[${border}] hover:ring-[${accent}] cursor-pointer transition-all`}
            style={{ backgroundColor: raw || "transparent", backgroundImage: !raw || raw === "transparent" ? `linear-gradient(45deg,${bgInput} 25%,transparent 25%,transparent 75%,${bgInput} 75%),linear-gradient(45deg,${bgInput} 25%,transparent 25%,transparent 75%,${bgInput} 75%)` : undefined, backgroundSize: "6px 6px", backgroundPosition: "0 0,3px 3px" }}
            onClick={() => { const i = document.createElement("input"); i.type = "color"; i.value = raw.startsWith("#") ? raw : "#000000"; i.onchange = (e) => sa(prop, (e.target as HTMLInputElement).value); i.click(); }}
          />
          <input value={display} placeholder="–" onChange={(e) => { const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`; up(prop, v); }} onBlur={() => ob(prop)} onKeyDown={(e) => ok(prop, e)} className={`flex-1 min-w-0 ${inp}`} />
          <span className={`text-[10px] text-[${textM}]`}>100 %</span>
        </div>
      </div>
    );
  };

  // Dimension dropdown
  const PRESETS = ["auto","100%","50%","fit-content","max-content","min-content","16px","24px","32px","48px","64px","80px","100px","120px","160px","200px","240px","320px","480px","640px","100vw","100vh"];
  const DD = ({ label, prop }: { label: string; prop: string }) => {
    const [open, setOpen] = useState(false);
    const cRef = useRef<HTMLDivElement>(null);
    return (
      <div ref={cRef} className="relative min-w-0">
        <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[${textM}] pointer-events-none`}>{label}</span>
        <input value={ls[prop] ?? ""} placeholder="auto" onChange={(e) => up(prop, e.target.value)} onBlur={(e) => { if (cRef.current?.contains(e.relatedTarget as Node)) return; ob(prop); }} onKeyDown={(e) => ok(prop, e)} className={`w-full pl-7 pr-6 ${inp}`} />
        <button onClick={() => setOpen((v) => !v)} className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center h-6 w-6 rounded text-[${textM}] hover:text-white transition-colors`}>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className={`absolute top-full left-4 right-0 mt-1 z-50 max-h-[240px] overflow-y-auto rounded-lg bg-[${bgInput}] border border-[${border}] shadow-2xl shadow-black/60 py-1`} onMouseDown={(e) => e.preventDefault()}>
              {PRESETS.map((s) => (
                <button key={s} onClick={() => { sa(prop, s); setOpen(false); }} className={`w-full px-3 py-2 text-left text-[12px] font-mono transition-colors ${(ls[prop] ?? "") === s ? `bg-[${accent}] text-white` : `text-[${textS}] hover:bg-[#444]`}`}>{s}</button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  if (!element) {
    return (
      <div className={`flex h-full flex-col bg-[${bg}]`}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <div className={`h-12 w-12 rounded-xl bg-[${bgInput}] flex items-center justify-center`}><MousePointerClick className={`h-5 w-5 text-[${textM}]`} /></div>
          <p className={`text-[12px] text-[${textM}] text-center leading-relaxed`}>Click an element in the<br />preview to inspect</p>
        </div>
      </div>
    );
  }

  const r = element.rect;
  return (
    <div className={`flex h-full flex-col bg-[${bg}] text-[${textP}] min-w-0 overflow-hidden`}>

      {/* ── Header ── */}
      <div className={`px-4 py-3.5 border-b border-[${bgInput}]`}>
        <div className="flex items-center justify-between min-w-0 gap-2">
          <p className="text-[14px] font-semibold truncate min-w-0 flex-1">{element.componentName || element.tagName}</p>
          <span className={`text-[11px] font-mono text-[${textM}] flex-shrink-0`}>{Math.round(r.width)} &times; {Math.round(r.height)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 scrollbar-hidden">

        {/* ── Appearance ── */}
        <SH title="Appearance" />
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <div>
              <span className={`text-[11px] text-[${textM}] block mb-1.5`}>Opacity</span>
              <PR icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1"/></svg>} prop="opacity" placeholder="1" />
            </div>
            <div>
              <span className={`text-[11px] text-[${textM}] block mb-1.5`}>Corner radius</span>
              <PR icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 10V5a4 4 0 014-4h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/></svg>} prop="border-radius" placeholder="0" />
            </div>
          </div>
        </div>

        <div className={`h-px bg-[${bgInput}]`} />

        {/* ── Dimensions ── */}
        <SH title="Dimensions" />
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <DD label="W" prop="width" />
            <DD label="H" prop="height" />
          </div>
        </div>

        <div className={`h-px bg-[${bgInput}]`} />

        {/* ── Alignment ── */}
        <SH title="Alignment" />
        <div className="px-4 pb-4">
          <div className="flex gap-1.5">
            {(["left","center","right"] as const).map((v) => (
              <button key={v} onClick={() => sa("text-align", v)}
                className={`flex-1 h-8 rounded-md text-[11px] font-medium transition-all ${ls["text-align"] === v ? `bg-[${accent}] text-white` : `bg-[${bgInput}] text-[${textM}] hover:text-white hover:bg-[#444]`}`}
              >{v.charAt(0).toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
        </div>

        <div className={`h-px bg-[${bgInput}]`} />

        {/* ── Fill ── */}
        <SH title="Fill" right={<button className={`text-[${textM}] hover:text-white transition-colors`}><Plus className="h-3.5 w-3.5" /></button>} />
        <div className="pb-2"><CR label="" prop="background-color" /></div>

        <div className={`h-px bg-[${bgInput}]`} />

        {/* ── Stroke ── */}
        <SH title="Stroke" right={<button className={`text-[${textM}] hover:text-white transition-colors`}><Plus className="h-3.5 w-3.5" /></button>} />
        <div className="pb-2 space-y-1.5">
          <CR label="" prop="border-color" />
          <div className="px-4 grid grid-cols-2 gap-2">
            <div>
              <span className={`text-[11px] text-[${textM}] block mb-1.5`}>Weight</span>
              <PR icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>} prop="border-width" placeholder="0" />
            </div>
            <div>
              <span className={`text-[11px] text-[${textM}] block mb-1.5`}>Style</span>
              <PR icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6h2M5 6h2M9 6h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>} prop="border-style" placeholder="solid" />
            </div>
          </div>
        </div>

        <div className={`h-px bg-[${bgInput}]`} />

        {/* ── Spacing ── */}
        <SH title="Spacing" />
        <div className="px-4 pb-3 space-y-3">
          <div>
            <span className={`text-[11px] text-[${textM}] block mb-2`}>Padding</span>
            <div className="grid grid-cols-4 gap-1.5">
              {(["padding-top","padding-right","padding-bottom","padding-left"] as const).map((p, i) => {
                const arrows = [
                  <svg key="t" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M5 2L3 4M5 2l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
                  <svg key="r" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M8 5H2M8 5L6 3M8 5l-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
                  <svg key="b" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8V2M5 8L3 6M5 8l2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
                  <svg key="l" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M2 5l2-2M2 5l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
                ];
                return (
                  <div key={p} className="relative">
                    <span className={`absolute left-1.5 top-1/2 -translate-y-1/2 text-[${textM}] pointer-events-none`}>{arrows[i]}</span>
                    <input value={ls[p] ?? ""} placeholder="0" onChange={(e) => up(p, e.target.value)} onBlur={() => ob(p)} onKeyDown={(e) => ok(p, e)} className={`w-full text-center pl-6 ${inp}`} />
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <span className={`text-[11px] text-[${textM}] block mb-2`}>Margin</span>
            <div className="grid grid-cols-4 gap-1.5">
              {(["margin-top","margin-right","margin-bottom","margin-left"] as const).map((p, i) => {
                const arrows = [
                  <svg key="t" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M5 2L3 4M5 2l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
                  <svg key="r" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M8 5H2M8 5L6 3M8 5l-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
                  <svg key="b" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8V2M5 8L3 6M5 8l2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
                  <svg key="l" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M2 5l2-2M2 5l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
                ];
                return (
                  <div key={p} className="relative">
                    <span className={`absolute left-1.5 top-1/2 -translate-y-1/2 text-[${textM}] pointer-events-none`}>{arrows[i]}</span>
                    <input value={ls[p] ?? ""} placeholder="0" onChange={(e) => up(p, e.target.value)} onBlur={() => ob(p)} onKeyDown={(e) => ok(p, e)} className={`w-full text-center pl-6 ${inp}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={`h-px bg-[${bgInput}]`} />

        {/* ── Typography ── */}
        <SH title="Typography" />
        <div className="px-4 pb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className={`text-[11px] text-[${textM}] block mb-1.5`}>Size</span>
              <PR icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><text x="1" y="10" fontSize="11" fontWeight="bold" fill="currentColor">A</text></svg>} prop="font-size" placeholder="16px" />
            </div>
            <div>
              <span className={`text-[11px] text-[${textM}] block mb-1.5`}>Weight</span>
              <PR icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><text x="1" y="10" fontSize="10" fontWeight="900" fill="currentColor">B</text></svg>} prop="font-weight" placeholder="400" />
            </div>
          </div>
          <div>
            <span className={`text-[11px] text-[${textM}] block mb-1.5`}>Font</span>
            <PR icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><text x="0" y="10" fontSize="9" fill="currentColor">Aa</text></svg>} prop="font-family" placeholder="inherit" />
          </div>
          <CR label="Color" prop="color" />
        </div>

      </div>
    </div>
  );
}

// ─── Floating Properties Panel (draggable, no-lag) ──────────────
function FloatingPropertiesPanel({ isDark, element, onApplyStyle, onClose }: {
  isDark: boolean;
  element: import("@/lib/store/agent-store").InspectedElement | null;
  onApplyStyle: (property: string, value: string) => void;
  onClose: () => void;
}) {
  const [docked, setDocked] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -1, y: -1 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const initialized = useRef(false);

  // Initialize position once on mount
  useEffect(() => {
    if (!initialized.current && panelRef.current && !docked) {
      const parent = panelRef.current.parentElement;
      if (parent) {
        posRef.current = { x: parent.clientWidth - 300 - 12, y: 12 };
        panelRef.current.style.right = "auto";
        panelRef.current.style.left = `${posRef.current.x}px`;
        panelRef.current.style.top = `${posRef.current.y}px`;
        initialized.current = true;
      }
    }
  }, [docked]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    const el = panelRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    e.preventDefault();

    // Block iframe from stealing mouse events during drag
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;cursor:grabbing;";
    document.body.appendChild(overlay);

    if (docked) {
      // Undock
      setDocked(false);
      const pr = parent.getBoundingClientRect();
      posRef.current = { x: e.clientX - pr.left - 150, y: e.clientY - pr.top - 14 };
      offsetRef.current = { x: 150, y: 14 };
      // Apply immediately after undock render
      requestAnimationFrame(() => {
        if (panelRef.current) {
          panelRef.current.style.left = `${posRef.current.x}px`;
          panelRef.current.style.top = `${posRef.current.y}px`;
          panelRef.current.style.right = "auto";
        }
      });
    } else {
      const er = el.getBoundingClientRect();
      offsetRef.current = { x: e.clientX - er.left, y: e.clientY - er.top };
    }

    const onMove = (ev: MouseEvent) => {
      const p = panelRef.current?.parentElement;
      if (!p || !panelRef.current) return;
      const pr = p.getBoundingClientRect();
      let nx = ev.clientX - pr.left - offsetRef.current.x;
      let ny = ev.clientY - pr.top - offsetRef.current.y;
      nx = Math.max(0, Math.min(nx, pr.width - 300));
      ny = Math.max(0, Math.min(ny, pr.height - 100));
      posRef.current = { x: nx, y: ny };
      // Direct DOM — no React rerender
      panelRef.current.style.left = `${nx}px`;
      panelRef.current.style.top = `${ny}px`;
      panelRef.current.style.right = "auto";

      // Dock hint: mouse within bottom 80px of parent
      const distFromBottom = pr.height - (ev.clientY - pr.top);
      document.body.style.cursor = distFromBottom < 80 ? "s-resize" : "";
    };
    const onUp = (ev: MouseEvent) => {
      document.body.style.cursor = "";
      overlay.remove();
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      // Dock if mouse released within bottom 80px
      const p = panelRef.current?.parentElement;
      if (p) {
        const pr = p.getBoundingClientRect();
        const distFromBottom = pr.height - (ev.clientY - pr.top);
        if (distFromBottom < 80) {
          setDocked(true);
          initialized.current = false;
        }
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [docked]);

  // ── Docked mode ──
  if (docked) {
    return (
      <div ref={panelRef} className="absolute z-30 left-0 right-0 bottom-0 flex flex-col rounded-t-xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/[0.08]" style={{ height: 240 }}>
        <div onMouseDown={onDragStart} className="flex items-center justify-center h-7 bg-[#333] cursor-grab active:cursor-grabbing flex-shrink-0 select-none group relative">
          <div className="w-8 h-1 rounded-full bg-[#555] group-hover:bg-[#888] transition-colors" />
          <button onClick={onClose} className="absolute right-2 top-1.5 flex items-center justify-center h-4 w-4 rounded text-[#666] hover:text-white transition-colors"><X className="h-3 w-3" /></button>
        </div>
        <div className="flex-1 overflow-hidden"><PropertiesPanel isDark={isDark} element={element} onApplyStyle={onApplyStyle} /></div>
      </div>
    );
  }

  // ── Floating mode ──
  return (
    <div ref={panelRef} className="absolute z-30 flex flex-col rounded-xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/[0.08]" style={{ width: 300, minWidth: 300, maxWidth: 300, height: "calc(100% - 24px)", maxHeight: 700, right: initialized.current ? "auto" : 12, top: 12 }}>
      <div onMouseDown={onDragStart} className="flex items-center justify-center h-7 bg-[#333] cursor-grab active:cursor-grabbing flex-shrink-0 select-none group relative">
        <div className="w-8 h-1 rounded-full bg-[#555] group-hover:bg-[#888] transition-colors" />
        <button onClick={onClose} className="absolute right-2 top-1.5 flex items-center justify-center h-4 w-4 rounded text-[#666] hover:text-white transition-colors"><X className="h-3 w-3" /></button>
      </div>
      <div className="flex-1 overflow-hidden"><PropertiesPanel isDark={isDark} element={element} onApplyStyle={onApplyStyle} /></div>
    </div>
  );
}

// SuperContextSettings removed - context always fully enabled

// ─── Settings Page (Claude-style) ──────────────────────
function SettingsPage({ isDark, t, workspace, agentStore, electronAgent, onDisconnectFigma, onConnectFigma, onDisconnectLocal, onConnectLocal, onDisconnectGitHub, onHome, mcpStore, onMCPConnect, onMCPDisconnect }: {
  isDark: boolean;
  t: Record<string, string>;
  workspace: { figma?: { connected?: boolean; fileName?: string } | null; local?: { connected?: boolean } | null; github?: { connected?: boolean; owner?: string; repo?: string } | null };
  agentStore: { projectName: string | null; devServerUrl: string | null };
  electronAgent: { devServerUrl: string | null };
  onDisconnectFigma: () => void;
  onConnectFigma: () => void;
  onDisconnectLocal: () => void;
  onConnectLocal: () => void;
  onDisconnectGitHub: () => void;
  onHome: () => void;
  mcpStore: { servers: Array<{ adapterId: string; name: string; connected: boolean; connecting: boolean; toolCount: number; error: string | null }>; isConnected: (id: string) => boolean };
  onMCPConnect: (id: string) => void;
  onMCPDisconnect: (id: string) => void;
}) {
  const [settingsTab, setSettingsTab] = useState<"general" | "integrations" | "mcp" | "ai">("general");

  const NAV = [
    { id: "general" as const, label: "General", icon: <Settings className="h-4 w-4" /> },
    { id: "integrations" as const, label: "Integrations", icon: <LinkIcon className="h-4 w-4" /> },
    { id: "mcp" as const, label: "MCP Servers", icon: <Zap className="h-4 w-4" /> },
    { id: "ai" as const, label: "AI", icon: <Sparkles className="h-4 w-4" /> },
  ];

  const SettingRow = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div className={`flex items-center justify-between py-4 ${isDark ? "border-b border-[#2A2A2A]" : "border-b border-[#F0F0EE]"}`}>
      <div>
        <p className={`text-[14px] font-medium ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{label}</p>
        {desc && <p className={`text-[12px] mt-0.5 ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>{desc}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
    </div>
  );

  const StatusBadge = ({ connected, label }: { connected: boolean; label?: string }) => (
    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
      connected
        ? "bg-emerald-500/10 text-emerald-400"
        : isDark ? "bg-[#333] text-[#666]" : "bg-[#F0F0EE] text-[#B4B4B0]"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : isDark ? "bg-[#555]" : "bg-[#D4D4D0]"}`} />
      {label ?? (connected ? "Connected" : "Not connected")}
    </span>
  );

  return (
    <div className={`flex h-full ${isDark ? "bg-[#181818]" : "bg-white"}`}>
      {/* Side navigation */}
      <div className={`w-[220px] flex-shrink-0 border-r py-8 px-4 ${isDark ? "border-[#333] bg-[#252525]" : "border-[#F0F0EE] bg-[#FAFAFA]"}`}>
        <h2 className={`text-[16px] font-bold mb-6 px-3 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>Settings</h2>
        <nav className="space-y-0.5">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setSettingsTab(item.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                settingsTab === item.id
                  ? isDark ? "bg-[#333] text-[#E8E8E5] font-semibold" : "bg-white text-[#1A1A1A] font-semibold shadow-sm"
                  : isDark ? "text-[#777] hover:text-[#E8E8E5] hover:bg-[#2E2E2E]" : "text-[#787774] hover:text-[#1A1A1A] hover:bg-white"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className={`mt-8 pt-4 border-t ${isDark ? "border-[#333]" : "border-[#F0F0EE]"}`}>
          <button
            onClick={onHome}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${isDark ? "text-[#777] hover:text-[#E8E8E5] hover:bg-[#2E2E2E]" : "text-[#787774] hover:text-[#1A1A1A] hover:bg-white"}`}
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl px-10 py-8">
          {settingsTab === "general" && (
            <div className="animate-fade-in">
              <h3 className={`text-[20px] font-bold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>General</h3>
              <p className={`text-[13px] mb-6 ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>Project settings and preferences</p>

              <SettingRow label="Project Name" desc={agentStore.projectName ?? "No project open"}>
                <span className={`text-[13px] ${isDark ? "text-[#9A9A95]" : "text-[#787774]"}`}>{agentStore.projectName ?? "—"}</span>
              </SettingRow>

              <SettingRow label="Dev Server" desc="Local development server URL">
                {(agentStore.devServerUrl || electronAgent.devServerUrl) ? (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-400">
                    {(agentStore.devServerUrl || electronAgent.devServerUrl)!.replace("http://", "")}
                  </span>
                ) : (
                  <span className={`text-[12px] ${isDark ? "text-[#666]" : "text-[#B4B4B0]"}`}>Not running</span>
                )}
              </SettingRow>

              <SettingRow label="Theme" desc="Switch between dark and light mode">
                <span className={`text-[13px] ${isDark ? "text-[#9A9A95]" : "text-[#787774]"}`}>{isDark ? "Dark" : "Light"}</span>
              </SettingRow>
            </div>
          )}


          {settingsTab === "integrations" && (
            <div className="animate-fade-in">
              <h3 className={`text-[20px] font-bold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>Integrations</h3>
              <p className={`text-[13px] mb-6 ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>Connect external services to your project</p>

              <SettingRow label="Figma" desc={workspace.figma?.connected ? workspace.figma.fileName : "Design file connection"}>
                <StatusBadge connected={!!workspace.figma?.connected} />
                {workspace.figma?.connected ? (
                  <button onClick={onDisconnectFigma} className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${isDark ? "text-red-400 hover:bg-red-500/10" : "text-[#DC2626] hover:bg-[#FEF2F2]"}`}>Disconnect</button>
                ) : (
                  <button onClick={onConnectFigma} className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${isDark ? "bg-[#E8E8E5] text-[#1A1A1A] hover:bg-white" : "bg-[#1A1A1A] text-white hover:bg-[#333]"}`}>Connect</button>
                )}
              </SettingRow>

              <SettingRow label="Local Folder" desc={workspace.local?.connected ? (agentStore.projectName ?? "Connected") : "Open a project folder"}>
                <StatusBadge connected={!!workspace.local?.connected} />
                {workspace.local?.connected ? (
                  <>
                    <button onClick={onDisconnectLocal} className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${isDark ? "text-red-400 hover:bg-red-500/10" : "text-[#DC2626] hover:bg-[#FEF2F2]"}`}>Disconnect</button>
                    <button onClick={onConnectLocal} className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${isDark ? "text-[#9A9A95] hover:bg-[#333]" : "text-[#787774] hover:bg-[#F7F7F5]"}`}>Change</button>
                  </>
                ) : (
                  <button onClick={onConnectLocal} className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${isDark ? "bg-[#E8E8E5] text-[#1A1A1A] hover:bg-white" : "bg-[#1A1A1A] text-white hover:bg-[#333]"}`}>Connect</button>
                )}
              </SettingRow>

              <SettingRow label="GitHub" desc={workspace.github?.connected ? `${workspace.github.owner}/${workspace.github.repo}` : "Repository connection"}>
                <StatusBadge connected={!!workspace.github?.connected} />
                {workspace.github?.connected ? (
                  <button onClick={onDisconnectGitHub} className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${isDark ? "text-red-400 hover:bg-red-500/10" : "text-[#DC2626] hover:bg-[#FEF2F2]"}`}>Disconnect</button>
                ) : (
                  <span className={`text-[12px] ${isDark ? "text-[#555]" : "text-[#B4B4B0]"}`}>Coming soon</span>
                )}
              </SettingRow>
            </div>
          )}

          {settingsTab === "mcp" && (
            <div className="animate-fade-in">
              <h3 className={`text-[20px] font-bold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>MCP Servers</h3>
              <p className={`text-[13px] mb-6 ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>Model Context Protocol servers connected to your AI agent</p>

              <div className="space-y-1">
                {WORKSPACE_MCP_SERVERS.map((ws) => {
                  const srv = mcpStore.servers.find(s => s.adapterId === ws.id);
                  const isConnected = srv?.connected ?? false;
                  const isConnecting = srv?.connecting ?? false;
                  const toolCount = srv?.toolCount ?? 0;

                  return (
                    <div key={ws.id} className={`flex items-center gap-3.5 rounded-xl py-3 px-1 transition-colors ${isDark ? "hover:bg-[#2A2A2A]" : "hover:bg-[#FAFAF9]"}`}>
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isDark ? "bg-[#333]" : "bg-[#F0F0EE]"}`}>
                        {isConnecting ? <Loader2 className="h-4 w-4 animate-spin text-[#9A9A95]" /> : <img src={ws.logo} alt={ws.name} className={`h-4 w-4 ${!isConnected ? "opacity-50" : ""}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[13px] font-medium ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{ws.name}</p>
                          {isConnected && <span className="text-[10px] text-emerald-400">{toolCount} tools</span>}
                        </div>
                        <p className={`text-[11px] truncate ${isDark ? "text-[#666]" : "text-[#B4B4B0]"}`}>{ws.desc}</p>
                      </div>
                      {isConnected ? (
                        <button
                          onClick={() => onMCPDisconnect(ws.id)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${isDark ? "text-red-400 hover:bg-red-500/10" : "text-[#DC2626] hover:bg-[#FEF2F2]"}`}
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => onMCPConnect(ws.id)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${isDark ? "text-[#9A9A95] ring-1 ring-white/[0.06] hover:bg-[#333]" : "text-[#787774] ring-1 ring-black/[0.06] hover:bg-[#F7F7F5]"}`}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {settingsTab === "ai" && (
            <div className="animate-fade-in">
              <h3 className={`text-[20px] font-bold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>AI</h3>
              <p className={`text-[13px] mb-6 ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>AI model and usage settings</p>

              <div className={`rounded-xl p-5 mb-6 ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06]" : "ring-1 ring-black/[0.04]"}`}>
                <MeldAiStatus />
              </div>

              <SettingRow label="Model" desc="Default AI model for code editing">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-mono font-medium ${isDark ? "bg-[#333] text-[#9A9A95]" : "bg-[#F0F0EE] text-[#787774]"}`}>claude-sonnet-4</span>
              </SettingRow>

              <SettingRow label="Auto-approve" desc="Automatically apply AI code changes">
                <span className={`text-[12px] ${isDark ? "text-[#666]" : "text-[#B4B4B0]"}`}>Off (review required)</span>
              </SettingRow>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateSelector({ onSelect, onBack, isDark }: {
  onSelect: (template: ProjectTemplate) => void;
  onBack: () => void;
  isDark?: boolean;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [showFrameworks, setShowFrameworks] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const category = PROJECT_CATEGORIES.find((c) => c.id === selectedCategory);
  const activeFramework = selectedFramework ?? category?.defaultFramework ?? null;
  const activeFrameworkObj = category?.frameworks.find((f) => f.id === activeFramework);

  const handleStart = () => {
    if (!category || !activeFramework) return;
    const command = category.buildCommand(activeFramework);
    onSelect(buildTemplate(category.id, activeFramework, command));
  };

  return (
    <div className="flex h-full items-center justify-center animate-fade-in px-6 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#444] to-[#2A2A2A] shadow-lg">
            <Sparkles className="h-6 w-6 text-[#E8E8E5]" />
          </div>
          <h2 className={`text-[22px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
            {selectedCategory ? `Build a ${category?.label}` : "What do you want to build?"}
          </h2>
          <p className={`mt-1.5 text-[13px] ${isDark ? "text-[#9A9A95]" : "text-[#787774]"}`}>
            {selectedCategory ? "AI will set everything up. Change the framework below if you want." : "Select a category. No coding knowledge needed."}
          </p>
        </div>

        {!selectedCategory ? (
          <>
            {/* Step 1: Category selection */}
            <div className="grid grid-cols-2 gap-3">
              {PROJECT_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setSelectedFramework(null); setShowFrameworks(false); }}
                  className={`animate-card-stagger group relative flex flex-col items-center gap-3 rounded-2xl p-6 text-center transition-all duration-200 active:scale-[0.97] ${
                    isDark
                      ? "bg-[#2E2E2E] hover:bg-[#383838] ring-1 ring-white/[0.04] hover:ring-white/[0.1]"
                      : "bg-[#F7F7F5] hover:bg-[#EEEEEC] ring-1 ring-black/[0.04] hover:ring-black/[0.08]"
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
                    isDark
                      ? "bg-[#3A3A3A] group-hover:bg-[#444] text-[#9A9A95] group-hover:text-[#E8E8E5]"
                      : "bg-[#E0E0DC] group-hover:bg-[#D4D4D0] text-[#787774] group-hover:text-[#1A1A1A]"
                  }`}>
                    {cat.icon}
                  </div>
                  <div>
                    <p className={`text-[16px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{cat.label}</p>
                    <p className={`mt-1 text-[12px] ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>{cat.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom section removed */}
          </>
        ) : (
          <div className="animate-tab-fade-in">
            {/* Confirmation card */}
            <div className={`rounded-2xl p-6 ${isDark ? "bg-[#2E2E2E] ring-1 ring-white/[0.06]" : "bg-[#F7F7F5] ring-1 ring-black/[0.04]"}`}>
              {/* Category icon + info */}
              <div className="flex items-center gap-4 mb-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDark ? "bg-[#3A3A3A] text-[#E8E8E5]" : "bg-[#E0E0DC] text-[#1A1A1A]"}`}>
                  {category?.icon}
                </div>
                <div>
                  <p className={`text-[18px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{category?.label}</p>
                  <p className={`text-[12px] ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>{category?.desc}</p>
                </div>
              </div>

              {/* Framework selector — collapsible */}
              <div className={`rounded-xl p-3 mb-5 ${isDark ? "bg-[#252525]" : "bg-[#EEEEEC]"}`}>
                <button
                  onClick={() => setShowFrameworks(!showFrameworks)}
                  className="flex w-full items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Settings className={`h-3.5 w-3.5 ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`} />
                    <span className={`text-[12px] font-medium ${isDark ? "text-[#9A9A95]" : "text-[#787774]"}`}>Framework</span>
                    <span className={`text-[12px] font-semibold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{activeFrameworkObj?.name}</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFrameworks ? "rotate-180" : ""} ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`} />
                </button>

                {showFrameworks && (
                  <div className="mt-3 space-y-1 animate-fade-in">
                    {category?.frameworks.map((fw) => (
                      <button
                        key={fw.id}
                        onClick={() => { setSelectedFramework(fw.id); setShowFrameworks(false); }}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                          activeFramework === fw.id
                            ? isDark ? "bg-[#3A3A3A] ring-1 ring-white/[0.08]" : "bg-white ring-1 ring-black/[0.06]"
                            : isDark ? "hover:bg-[#333]" : "hover:bg-white/60"
                        }`}
                      >
                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${activeFramework === fw.id ? "bg-emerald-400" : isDark ? "bg-[#555]" : "bg-[#D4D4D0]"}`} />
                        <div>
                          <p className={`text-[13px] font-semibold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{fw.name}</p>
                          <p className={`text-[11px] ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>{fw.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Start button */}
              <button
                onClick={handleStart}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[14px] font-semibold transition-all active:scale-[0.98] ${
                  isDark ? "bg-[#E8E8E5] text-[#1A1A1A] hover:bg-white" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                Start Building
              </button>
            </div>

            {/* Back */}
            <button
              onClick={() => { setSelectedCategory(null); setSelectedFramework(null); setShowFrameworks(false); }}
              className={`mt-5 flex items-center gap-2 text-[13px] transition-colors ${isDark ? "text-[#777] hover:text-[#B4B4B0]" : "text-[#9A9A95] hover:text-[#787774]"}`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </div>
        )}

        {/* Open existing */}
        <button
          onClick={onBack}
          className={`mt-4 flex items-center gap-2 text-[13px] transition-colors ${isDark ? "text-[#555] hover:text-[#9A9A95]" : "text-[#B4B4B0] hover:text-[#787774]"}`}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Open existing project instead
        </button>
      </div>
    </div>
  );
}

// ─── Sidebar Guide (dismissable sections) ─────────────
function SidebarGuide({ onSetInput }: { onSetInput: (v: string) => void }) {
  const [hidden, setHidden] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("meld-guide-hidden") || "{}"); } catch { return {}; }
  });

  const dismiss = (key: string) => {
    const next = { ...hidden, [key]: true };
    setHidden(next);
    localStorage.setItem("meld-guide-hidden", JSON.stringify(next));
  };

  const allHidden = hidden.howItWorks && hidden.tryThese && hidden.shortcuts;

  if (allHidden) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <Sparkles className="h-5 w-5 text-[#D4D4D0] mb-2" />
        <p className="text-[12px] text-[#B4B4B0]">Type a message above to start</p>
        <button
          onClick={() => { setHidden({}); localStorage.removeItem("meld-guide-hidden"); }}
          className="mt-3 text-[11px] text-[#B4B4B0] hover:text-[#787774] underline underline-offset-2 transition-colors"
        >
          Show guide again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {!hidden.howItWorks && (
        <div className="group relative rounded-xl bg-[#2E2E2E] p-3">
          <button onClick={() => dismiss("howItWorks")} className="absolute top-2 right-2 rounded-md p-1 text-[#555] opacity-0 group-hover:opacity-100 hover:text-[#9A9A95] hover:bg-[#353535] transition-all">
            <X className="h-3 w-3" />
          </button>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#666]">How it works</p>
          <div className="space-y-2">
            {[
              { step: "1", text: "Click an element in the preview to select it" },
              { step: "2", text: "Or pick a file from the file tree" },
              { step: "3", text: "Describe what to change — Meld AI edits your code" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-2.5 px-1 py-0.5">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-[#353535] text-[9px] font-bold text-[#666] ring-1 ring-white/[0.06]">{item.step}</div>
                <p className="text-[12px] leading-relaxed text-[#9A9A95]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hidden.tryThese && (
        <div className="group relative">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#555]">Try these</p>
            <button onClick={() => dismiss("tryThese")} className="rounded-md p-1 text-[#555] opacity-0 group-hover:opacity-100 hover:text-[#9A9A95] hover:bg-[#2E2E2E] transition-all">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1">
            {[
              "Change the primary button color to blue",
              "Make this section responsive for mobile",
              "Add a loading spinner to the submit button",
              "Refactor this into smaller components",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSetInput(suggestion)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] text-[#9A9A95] transition-colors hover:bg-[#2E2E2E] hover:text-[#E8E8E5]"
              >
                <Sparkles className="h-3 w-3 flex-shrink-0 text-[#555]" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Welcome Chat (first screen) ──────────────────────
function WelcomeChat({ onSetInput, onOpenFolder, hasProject, devServerReady, onSwitchToPreview }: {
  onSetInput: (v: string) => void;
  onOpenFolder: () => void;
  hasProject: boolean;
  devServerReady: boolean;
  onSwitchToPreview: () => void;
}) {
  const agentStore = useAgentStore();
  const projectName = agentStore.projectName;
  const framework = agentStore.devServerFramework;

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 animate-fade-in">
      <div className="w-full max-w-lg">

        {hasProject ? (
          <>
            {/* Connected state — minimal, Cascade-style */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-1">
                {devServerReady && (
                  <button onClick={onSwitchToPreview} className="rounded-lg bg-[#16A34A]/10 px-2.5 py-1 text-[11px] font-medium text-[#16A34A] transition-colors hover:bg-[#16A34A]/20">
                    Open Preview
                  </button>
                )}
                {!devServerReady && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-2.5 py-1">
                    <Loader2 className="h-3 w-3 animate-spin text-[#B4B4B0]" />
                    <span className="text-[11px] text-[#B4B4B0]">Building preview...</span>
                  </div>
                )}
              </div>
              <h2 className="text-[28px] font-bold tracking-tight text-[#1A1A1A]">{projectName || "Your project"}</h2>
              <p className="mt-1 text-[14px] text-[#787774]">
                {framework ? `${framework} project` : "Ready for editing"}
              </p>
            </div>

            {/* Contextual actions — 2-col grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Eye, label: "Review & improve", desc: "Analyze code quality", prompt: "Review this project and suggest improvements" },
                { icon: Zap, label: "Add a feature", desc: "Describe what you need", prompt: "I want to add " },
                { icon: Terminal, label: "Fix issues", desc: "Debug and resolve", prompt: "Find and fix any bugs or issues" },
                { icon: Sparkles, label: "Redesign UI", desc: "Visual changes", prompt: "Redesign the main page with a modern look" },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => onSetInput(action.prompt)}
                  className="flex flex-col items-start gap-1.5 rounded-2xl p-4 text-left ring-1 ring-black/[0.04] transition-colors hover:bg-[#F7F7F5]"
                >
                  <action.icon className="h-4 w-4 text-[#787774]" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1A1A]">{action.label}</p>
                    <p className="text-[11px] text-[#B4B4B0]">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* No project — onboarding */}
            <h2 className="text-[28px] font-bold tracking-tight text-[#1A1A1A]">Start building</h2>
            <p className="mt-1 text-[14px] text-[#787774]">Open a folder or describe what you want to create</p>

            <button
              onClick={onOpenFolder}
              className="group mt-6 flex w-full items-center gap-4 rounded-2xl bg-[#1A1A1A] p-5 text-left transition-all hover:bg-[#2A2A2A]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <FolderOpen className="h-5 w-5 text-white/70" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-white">Open project folder</p>
                <p className="text-[12px] text-white/40">Local files with live preview</p>
              </div>
              <ArrowRight className="h-4 w-4 text-white/20" />
            </button>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: "Landing page", prompt: "Help me build a modern landing page" },
                { label: "Dashboard", prompt: "Create a data dashboard with charts" },
                { label: "Auth flow", prompt: "Set up login and signup pages" },
                { label: "API + DB", prompt: "Set up a REST API with database" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => onSetInput(item.prompt)}
                  className="rounded-xl px-4 py-3 text-left text-[13px] font-medium text-[#787774] ring-1 ring-black/[0.04] transition-colors hover:bg-[#F7F7F5] hover:text-[#1A1A1A]"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Bottom Chat Input (chat tab) ─────────────────────
function ChatInput({ messages, setMessages, devServerReady, onSwitchToPreview }: {
  messages: Array<{ role: "user" | "assistant"; content: string; id: string }>;
  setMessages: React.Dispatch<React.SetStateAction<Array<{ role: "user" | "assistant"; content: string; id: string }>>>;
  devServerReady: boolean;
  onSwitchToPreview: () => void;
}) {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { selectedFilePath, readFileFn, writeFileFn, setLastWrite, devServerFramework, dependencies, elementHistory } = useAgentStore();
  const designSystem = useDesignSystemStore();

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    const command = input.trim();
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    setMessages((prev) => [...prev, { role: "user", content: command, id: crypto.randomUUID() }]);
    setIsProcessing(true);

    try {
      const targetFile = selectedFilePath ?? "";
      const currentCode = targetFile && readFileFn ? await readFileFn(targetFile) : "";

      let result: { filePath: string; original: string; modified: string; explanation: string };

      if (window.electronAgent?.ai) {
        result = await window.electronAgent.ai.editCode({
          filePath: targetFile, command, currentCode,
          modelId: "claude-sonnet-4",
          framework: devServerFramework ?? undefined,
          dependencies: dependencies.length > 0 ? dependencies : undefined,
        });
      } else {
        const res = await fetch("/api/ai/edit-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: targetFile, command, currentCode,
            modelId: "claude-sonnet-4",
            framework: devServerFramework ?? undefined,
            dependencies: dependencies.length > 0 ? dependencies : undefined,
            designSystemMd: designSystem.getDesignMd() || undefined,
            elementHistory: elementHistory.length > 0 ? elementHistory : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "AI request failed");
        if (data.type === "chat") {
          result = { filePath: targetFile, original: "", modified: "", explanation: data.text };
        } else {
          result = { filePath: data.filePath, original: data.original, modified: data.modified, explanation: data.explanation };
        }
      }

      if (result.modified && targetFile && writeFileFn) {
        await writeFileFn(targetFile, result.modified);
        setLastWrite();
      }

      setMessages((prev) => [...prev, { role: "assistant", content: result.explanation, id: crypto.randomUUID() }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: formatAiError(err), id: crypto.randomUUID() }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 overflow-hidden rounded-xl ring-1 ring-black/[0.06] focus-within:ring-black/[0.12] transition-all">
        {/* Context chip */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#F0F0EE]">
          {selectedFilePath ? (
            <>
              <FolderOpen className="h-3 w-3 text-[#B4B4B0]" />
              <span className="text-[10px] font-medium text-[#787774]">@{selectedFilePath.split("/").pop()}</span>
            </>
          ) : (
            <span className="text-[10px] text-[#D4D4D0]">Select a file or type a general question</span>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 rounded-md bg-[#F7F7F5] px-2 py-0.5">
            <Blend className="h-3 w-3 text-[#787774]" />
            <span className="text-[10px] font-semibold text-[#787774]">Meld</span>
            <div className="h-1 w-1 rounded-full bg-[#16A34A]" />
          </div>
        </div>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Describe what to build or change..."
          className="w-full resize-none bg-transparent px-3 py-2.5 text-[13px] text-[#1A1A1A] placeholder:text-[#B4B4B0] focus:outline-none"
          style={{ maxHeight: 120 }}
          disabled={isProcessing}
        />
      </div>
      <button
        onClick={handleSend}
        disabled={!input.trim() || isProcessing}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#1A1A1A] text-white transition-all hover:bg-[#333] active:scale-[0.95] disabled:opacity-20"
      >
        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─── Preview Hint Overlay ─────────────────────────────
function PreviewHint() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="absolute inset-x-0 bottom-16 z-10 flex justify-center pointer-events-none animate-fade-in">
      <div
        className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#1A1A1A]/90 px-5 py-3 shadow-xl backdrop-blur-sm cursor-pointer transition-all hover:bg-[#1A1A1A]"
        onClick={() => setDismissed(true)}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
          <Eye className="h-4 w-4 text-white/70" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white">Click any element to select it</p>
          <p className="text-[11px] text-white/50">Then use the chat to describe your changes</p>
        </div>
        <X className="h-3.5 w-3.5 text-white/30 hover:text-white/60 transition-colors ml-2" />
      </div>
    </div>
  );
}

// ─── Local Folder Card (with port settings) ──────────
function LocalFolderCard({ connected, projectName, devServerUrl, onDisconnect, onChange, onConnect }: {
  connected: boolean; projectName: string | null; devServerUrl: string | null;
  onDisconnect: () => void; onChange: () => void; onConnect: () => void;
}) {
  const [showPortSettings, setShowPortSettings] = useState(false);
  const [portInput, setPortInput] = useState("");
  const [savedPort, setSavedPort] = useState<number | null>(null);

  useEffect(() => {
    if (window.electronAgent?.getDevPort) {
      window.electronAgent.getDevPort().then((p: number | null) => {
        setSavedPort(p);
        if (p) setPortInput(String(p));
      });
    }
  }, []);

  const handleSavePort = async () => {
    const port = portInput.trim() ? parseInt(portInput.trim(), 10) : null;
    if (port && (port < 1024 || port > 65535)) return;
    if (window.electronAgent?.setDevPort) {
      await window.electronAgent.setDevPort(port);
      setSavedPort(port);
      setShowPortSettings(false);
    }
  };

  return (
    <div className="rounded-2xl ring-1 ring-black/[0.04] overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7F7F5]">
          <FolderOpen className="h-5 w-5 text-[#787774]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#1A1A1A]">Local Folder</p>
          {connected ? (
            <div className="flex items-center gap-2">
              <p className="truncate text-[12px] text-[#787774]">{projectName ?? "Connected"}</p>
              {devServerUrl && (
                <span className="flex-shrink-0 rounded bg-[#F0FDF4] px-1.5 py-0.5 text-[10px] font-medium text-[#16A34A]">{devServerUrl.replace("http://", "")}</span>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-[#B4B4B0]">Not connected</p>
          )}
        </div>
        {connected ? (
          <div className="flex gap-2">
            <button onClick={() => setShowPortSettings(!showPortSettings)} className="rounded-xl px-3 py-2 text-[12px] font-semibold text-[#787774] ring-1 ring-black/[0.06] hover:bg-[#F7F7F5] transition-colors" title="Port settings">
              Port{savedPort ? `: ${savedPort}` : ""}
            </button>
            <button onClick={onDisconnect} className="rounded-xl px-4 py-2 text-[12px] font-semibold text-[#DC2626] ring-1 ring-[#FEE2E2] hover:bg-[#FEF2F2] transition-colors">
              Disconnect
            </button>
            <button onClick={onChange} className="rounded-xl px-4 py-2 text-[12px] font-semibold text-[#787774] ring-1 ring-black/[0.06] hover:bg-[#F7F7F5] transition-colors">
              Change
            </button>
          </div>
        ) : (
          <button onClick={onConnect} className="rounded-xl bg-[#1A1A1A] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#333] transition-colors">
            Connect
          </button>
        )}
      </div>
      {/* Port settings */}
      {showPortSettings && (
        <div className="border-t border-[#F0F0EE] bg-[#FAFAF9] px-4 py-3 animate-fade-in">
          <p className="mb-2 text-[11px] text-[#787774]">Dev server port. Leave empty for auto-detect.</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={portInput}
              onChange={(e) => setPortInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSavePort(); }}
              placeholder="Auto (e.g. 3000)"
              min={1024} max={65535}
              className="flex-1 rounded-lg bg-white px-3 py-2 text-[12px] text-[#1A1A1A] ring-1 ring-black/[0.06] placeholder:text-[#D4D4D0] focus:outline-none focus:ring-black/[0.12]"
            />
            <button onClick={handleSavePort} className="rounded-lg bg-[#1A1A1A] px-4 py-2 text-[11px] font-semibold text-white hover:bg-[#333]">Save</button>
            {savedPort && (
              <button onClick={() => { setPortInput(""); window.electronAgent?.setDevPort?.(null); setSavedPort(null); }} className="rounded-lg px-3 py-2 text-[11px] text-[#B4B4B0] hover:text-[#787774] ring-1 ring-black/[0.04] hover:bg-[#F7F7F5]">Reset</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Error formatter ──────────────────────────────────
function formatAiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Daily limit
  if (raw.includes("DAILY_LIMIT") || raw.includes("DAILY_LIMIT_EXCEEDED")) {
    return "Daily limit reached. Upgrade to Pro for more requests.";
  }
  if (raw.includes("limit") && !raw.includes("timeout")) {
    return "Usage limit reached. Please try again later or upgrade your plan.";
  }
  // Auth
  if (raw.includes("401") || raw.includes("403") || raw.includes("Unauthorized") || raw.includes("Forbidden")) {
    return "Please sign in again.";
  }
  // Rate limit
  if (raw.includes("429") || raw.includes("overloaded") || raw.includes("rate_limit")) {
    return "AI is busy right now. Please wait a moment and try again.";
  }
  // Network / connection
  if (raw.includes("fetch") || raw.includes("ECONNREFUSED") || raw.includes("network") || raw.includes("ERR_CONNECTION") || raw.includes("Failed to fetch")) {
    return "Connection lost. Please check your internet and try again.";
  }
  // Timeout
  if (raw.includes("timeout") || raw.includes("ETIMEDOUT") || raw.includes("ECONNRESET") || raw.includes("socket hang up")) {
    return "Connection lost. Please try again.";
  }
  // API key / billing
  if (raw.includes("invalid_api_key") || raw.includes("API key")) {
    return "API configuration error. Please contact support.";
  }
  if (raw.includes("insufficient_quota") || raw.includes("billing")) {
    return "Service temporarily unavailable. Please try again later.";
  }
  // Model / content errors
  if (raw.includes("context_length") || raw.includes("too long") || raw.includes("max_tokens")) {
    return "The request was too large. Try selecting a smaller file or simpler task.";
  }
  // Generic — clean up raw error text for display
  const clean = raw.replace(/Error invoking remote method '[^']+': /, "").replace(/\{[\s\S]*\}/, "").trim();
  return clean.length > 120 ? clean.slice(0, 120) + "..." : clean || "Something went wrong. Please try again.";
}

function formatMCPError(err: unknown, adapterId: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  const serviceName = adapterId.charAt(0).toUpperCase() + adapterId.slice(1);
  if (raw === "TOKEN_REQUIRED" || raw.includes("TOKEN_REQUIRED")) {
    return `API key required for ${serviceName}. Click to configure.`;
  }
  if (raw.startsWith("LOGIN_REQUIRED:")) {
    const service = raw.split(":")[1] || serviceName;
    return `Sign in to ${service} first.`;
  }
  if (raw.includes("ECONNREFUSED") || raw.includes("fetch") || raw.includes("network") || raw.includes("Failed to fetch")) {
    return `Could not reach ${serviceName}. Check your connection.`;
  }
  if (raw.includes("401") || raw.includes("403") || raw.includes("Unauthorized")) {
    return `${serviceName} credentials expired. Please reconnect.`;
  }
  if (raw.includes("timeout") || raw.includes("ETIMEDOUT")) {
    return `${serviceName} is not responding. Try again later.`;
  }
  if (raw.includes("404") || raw.includes("Not Found")) {
    return `${serviceName} service not found. Check your configuration.`;
  }
  const clean = raw.replace(/Error invoking remote method '[^']+': /, "").trim();
  return clean.length > 100 ? clean.slice(0, 100) + "..." : clean || `Could not connect to ${serviceName}.`;
}

// ─── Floating Chat Bar ────────────────────────────────
// ─── Skills Submenu (search + toggle + recommendations) ──────
function SkillsSubmenu({ onSelect, onManage }: { onSelect: (name: string) => void; onManage: () => void }) {
  const [q, setQ] = useState("");
  const [enabled, setEnabled] = useState<Set<string>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("meld-installed-skills") || "[]");
      return new Set(stored);
    } catch { return new Set(); }
  });

  const installed = SKILLS_REGISTRY.filter(s => s.installed || enabled.has(s.name));
  const recommended = SKILLS_REGISTRY.filter(s => !s.installed && !enabled.has(s.name)).slice(0, 4);
  const filtered = q.trim()
    ? SKILLS_REGISTRY.filter(s => s.name.toLowerCase().includes(q.toLowerCase()))
    : null;

  const toggle = (name: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      localStorage.setItem("meld-installed-skills", JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <div className="ml-0.5 w-56 rounded-lg bg-[#1E1E1E] shadow-lg ring-1 ring-white/[0.06] max-h-[320px] flex flex-col overflow-hidden">
      {/* Search */}
      <div className="flex items-center gap-1.5 border-b border-[#333] px-2.5 py-1.5">
        <Search className="h-3 w-3 text-[#555] flex-shrink-0" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="flex-1 bg-transparent text-[11px] text-[#E8E8E5] placeholder:text-[#555] outline-none"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered ? (
          /* Search results */
          <div className="p-1">
            {filtered.length === 0 && <p className="py-3 text-center text-[10px] text-[#555]">No results</p>}
            {filtered.map(s => (
              <button key={s.name} onClick={() => onSelect(s.name)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[#2A2A2A] transition-colors">
                <Sparkles className="h-3 w-3 text-[#555] flex-shrink-0" />
                <span className="flex-1 text-[11px] text-[#E8E8E5] truncate">{s.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* Connected — with toggles */}
            {installed.length > 0 && (
              <div className="p-1">
                {installed.map(s => (
                  <div key={s.name} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[#2A2A2A] transition-colors">
                    <Sparkles className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                    <span className="flex-1 text-[11px] text-[#E8E8E5] truncate">{s.name}</span>
                    <div
                      onClick={() => !s.installed && toggle(s.name)}
                      className={`relative h-4 w-7 rounded-full transition-colors cursor-pointer flex-shrink-0 ${(s.installed || enabled.has(s.name)) ? "bg-emerald-500" : "bg-[#444]"}`}
                    >
                      <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${(s.installed || enabled.has(s.name)) ? "translate-x-3" : "translate-x-0.5"}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommended */}
            {recommended.length > 0 && (
              <div className="border-t border-[#333] p-1">
                {recommended.map(s => (
                  <button key={s.name} onClick={() => onSelect(s.name)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[#2A2A2A] transition-colors">
                    <Sparkles className="h-3 w-3 text-[#555] flex-shrink-0" />
                    <span className="flex-1 text-[11px] text-[#9A9A95] truncate">{s.name}</span>
                    <span className="text-[9px] text-[#555]">connect</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#333]">
        <button
          onClick={onManage}
          className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-[10px] text-[#666] hover:text-[#9A9A95] hover:bg-[#2A2A2A] transition-colors"
        >
          <Settings className="h-3 w-3" />
          Manage skills
        </button>
      </div>
    </div>
  );
}

// SuperContextSubmenu removed - context always fully enabled

function FloatingChatBar({ projectId, mode, githubOwner, githubRepo, messages, setMessages, onOpenAdd }: {
  projectId: string; mode: "local" | "cloud"; githubOwner: string; githubRepo: string;
  messages: Array<{ role: "user" | "assistant"; content: string; id: string }>;
  setMessages: React.Dispatch<React.SetStateAction<Array<{ role: "user" | "assistant"; content: string; id: string }>>>;
  onOpenAdd?: () => void;
}) {
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFloatingAdd, setShowFloatingAdd] = useState(false);
  const [floatingAddPos, setFloatingAddPos] = useState({ bottom: 0, left: 0 });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agentSession = useAgentSessionStore();

  const { selectedFilePath, readFileFn, writeFileFn, setLastWrite, devServerFramework, dependencies, inspectedElement, elementHistory, inspectorEnabled, setInspectorEnabled, setInspectedElement } = useAgentStore();

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const toggleInspector = useCallback(() => {
    const next = !inspectorEnabled;
    setInspectorEnabled(next);
    if (!next) setInspectedElement(null);
    const iframe = document.querySelector<HTMLIFrameElement>("iframe[title='Dev Server Preview']");
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "meld:toggle-inspector", enabled: next }, "*");
    }
  }, [inspectorEnabled, setInspectorEnabled, setInspectedElement]);

  // 단축키: Cmd+Shift+I (macOS) / Ctrl+Shift+I (Windows/Linux)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "i") {
        e.preventDefault();
        toggleInspector();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleInspector]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    const command = input.trim();
    setInput("");
    setExpanded(true);
    if (inputRef.current) inputRef.current.style.height = "auto";

    const userMsg = { role: "user" as const, content: command, id: crypto.randomUUID() };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const targetFile = selectedFilePath ?? "";
      const currentCode = targetFile && readFileFn ? await readFileFn(targetFile) : "";

      // Build element context
      let elementContext: string | undefined;
      if (elementHistory?.length) {
        elementContext = elementHistory.map((entry, i) => {
          const el = entry.element;
          const parts = [`[${i + 1}] <${el.tagName}>`];
          if (el.componentName) parts.push(el.componentName);
          if (entry.filePath) parts.push(entry.filePath);
          return parts.join(" | ");
        }).join("\n");
      }

      let result: { filePath: string; original: string; modified: string; explanation: string };

      if (window.electronAgent?.ai) {
        // Desktop mode: IPC
        result = await window.electronAgent.ai.editCode({
          filePath: targetFile, command, currentCode,
          framework: devServerFramework ?? undefined,
          dependencies: dependencies.length > 0 ? dependencies : undefined,
          elementContext,
        });
      } else {
        // Web mode: backend proxy API
        const res = await fetch("/api/ai/edit-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: targetFile, command, currentCode,
            framework: devServerFramework ?? undefined,
            dependencies: dependencies.length > 0 ? dependencies : undefined,
            elementHistory: elementHistory?.map((e) => e.element) ?? [],
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "AI request failed");
        if (data.type === "chat") {
          result = { filePath: targetFile, original: "", modified: "", explanation: data.text };
        } else {
          result = { filePath: data.filePath, original: data.original, modified: data.modified, explanation: data.explanation };
        }
      }

      if (result.modified && targetFile && writeFileFn) {
        await writeFileFn(targetFile, result.modified);
        setLastWrite();
      }

      setMessages((prev) => [...prev, {
        role: "assistant", content: result.explanation, id: crypto.randomUUID(),
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant", content: formatAiError(err), id: crypto.randomUUID(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-4 px-6 pointer-events-none">
      {/* Message history (expandable) */}
      {expanded && messages.length > 0 && (
        <div className="pointer-events-auto mb-3 w-full max-w-2xl animate-slide-up">
          <div className="max-h-[300px] overflow-y-auto rounded-2xl bg-[#1E1E1E]/95 p-4 shadow-2xl shadow-black/40 ring-1 ring-white/[0.08] backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[#666]">{messages.length} messages</span>
              <button onClick={() => setExpanded(false)} className="rounded-lg p-1 text-[#666] hover:text-[#9A9A95] transition-colors">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className={`rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                  msg.role === "user"
                    ? "ml-auto max-w-[80%] bg-[#E8E8E5] text-[#1A1A1A]"
                    : "mr-auto max-w-[80%] bg-[#2A2A2A] text-[#E8E8E5]"
                }`}>
                  {msg.content}
                </div>
              ))}
              {isProcessing && (
                <div className="mr-auto flex items-center gap-1 rounded-xl bg-[#2A2A2A] px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#666] animate-typing-dot" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#666] animate-typing-dot animation-delay-150" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#666] animate-typing-dot animation-delay-300" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Input bar — dark, compact */}
      <div className="pointer-events-auto w-full max-w-2xl">
        <div className="overflow-hidden rounded-2xl bg-[#1E1E1E] shadow-2xl shadow-black/40 ring-1 ring-white/[0.04] transition-all focus-within:ring-white/[0.1]">
          {/* Input + toolbar */}
          <div className="px-4 pt-3 pb-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask Meld to edit your code..."
              className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-[#E8E8E5] placeholder:text-[#555] focus:outline-none"
              style={{ maxHeight: 100 }}
              disabled={isProcessing}
            />
          </div>
          <div className="flex items-center gap-2 px-3 pb-2">
            {/* + Add */}
            <div className="relative">
              <button
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setFloatingAddPos({ bottom: window.innerHeight - rect.top + 8, left: rect.left });
                  setShowFloatingAdd(!showFloatingAdd);
                }}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors ${showFloatingAdd ? "text-[#E8E8E5] bg-[#333]" : "text-[#666] hover:text-[#9A9A95] hover:bg-[#333]"}`}
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
            {/* Inspector toggle */}
            <button
              onClick={toggleInspector}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors ${
                inspectorEnabled
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-[#666] hover:text-[#9A9A95] hover:bg-[#333]"
              }`}
              title={`${inspectorEnabled ? "인스펙터 끄기" : "엘리먼트 선택"} (⌘⇧I)`}
            >
              <MousePointerClick className="h-3 w-3" />
            </button>
            <div className="flex-1" />
            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="flex-shrink-0 rounded-full bg-[#555] p-1.5 text-[#1A1A1A] transition-all hover:bg-[#9A9A95] active:scale-[0.95] disabled:opacity-20"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </button>
            {messages.length > 0 && !expanded && (
              <button onClick={() => setExpanded(true)} className="flex items-center gap-1 text-[10px] font-medium text-[#B4B4B0] hover:text-[#787774] transition-colors">
                <Terminal className="h-3 w-3" />
                {messages.length} messages
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Floating Add menu */}
      {showFloatingAdd && (
        <>
          <div className="fixed inset-0 z-[99] pointer-events-auto" onClick={() => setShowFloatingAdd(false)} />
          <div className="fixed animate-fade-in z-[100] pointer-events-auto" style={{ bottom: floatingAddPos.bottom, left: floatingAddPos.left }}>
            <div className="w-48 rounded-lg bg-[#1E1E1E] p-1 shadow-2xl ring-1 ring-white/[0.06]">
              <label className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-[#2A2A2A]">
                <LinkIcon className="h-4 w-4 text-[#9A9A95]" />
                <span className="text-[13px] text-[#E8E8E5]">Add from local file</span>
                <input type="file" className="hidden" multiple onChange={(e) => {
                  setShowFloatingAdd(false);
                  const files = e.target.files;
                  if (!files) return;
                  for (const file of Array.from(files)) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setInput((prev) => prev + `\n[File: ${file.name}]\n${(reader.result as string).slice(0, 2000)}`);
                    };
                    reader.readAsText(file);
                  }
                  e.target.value = "";
                }} />
              </label>
              <button
                onClick={() => { setShowFloatingAdd(false); onOpenAdd?.(); }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-[#2A2A2A]"
              >
                <Sparkles className="h-4 w-4 text-[#9A9A95]" />
                <span className="text-[13px] text-[#E8E8E5]">Use skill</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#555]" />
              </button>
              <button
                onClick={() => { setShowFloatingAdd(false); onOpenAdd?.(); }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-[#2A2A2A]"
              >
                <Zap className="h-4 w-4 text-violet-400" />
                <span className="text-[13px] text-[#E8E8E5]">Super-Context</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#555]" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Chat History Panel (Sidebar) ─────────────────────
function ChatHistoryPanel({ messages, setMessages, onOpenSettings, onOpenSkills }: {
  messages: Array<{ role: "user" | "assistant"; content: string; id: string; duration?: number; timestamp?: number }>;
  setMessages: React.Dispatch<React.SetStateAction<Array<{ role: "user" | "assistant"; content: string; id: string; duration?: number; timestamp?: number }>>>;
  onOpenSettings: () => void;
  onOpenSkills: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStart, setProcessingStart] = useState<number | null>(null);
  const processingStartRef = useRef<number | null>(null);
  const processingMinEndRef = useRef<number>(0);

  // Keep isProcessing true for at least 1 second
  const safeSetProcessingFalse = useCallback(() => {
    const now = Date.now();
    const minEnd = processingMinEndRef.current;
    if (now >= minEnd) {
      setIsProcessing(false);
      setProcessingStart(null);
    } else {
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingStart(null);
      }, minEnd - now);
    }
  }, []);
  const [inputPosition, setInputPosition] = useState<"top" | "bottom">("top");
  const { selectedFilePath, setSelectedFilePath: setAgentSelectedFile, readFileFn, writeFileFn, setLastWrite, devServerFramework, dependencies, elementHistory, setDevServerUrl, inspectorEnabled, setInspectorEnabled, setInspectedElement } = useAgentStore();
  const agentSession = useAgentSessionStore();
  const designSystem = useDesignSystemStore();
  const mcpStore = useMCPStore();

  // Build skills content — ONLY connected skills
  const buildSkillsContent = () => {
    try {
      const installed = JSON.parse(localStorage.getItem("meld-installed-skills") || "[]") as string[];
      if (installed.length === 0) return undefined;

      const parts: string[] = [];

      // GitHub skills — from cached content
      const cached = JSON.parse(localStorage.getItem("meld-skill-contents") || "{}") as Record<string, string>;
      for (const name of installed) {
        if (cached[name]) {
          parts.push(`# Skill: ${name}\n${cached[name]}`);
        }
      }

      // Include available commands so Claude knows what's available
      const cmds = JSON.parse(localStorage.getItem("meld-skill-commands") || "{}") as Record<string, Array<{ name: string; description: string }>>;
      const availableCmds: string[] = [];
      for (const name of installed) {
        if (cmds[name]) {
          for (const cmd of cmds[name]) {
            availableCmds.push(`${cmd.name} (${name}): ${cmd.description}`);
          }
        }
      }
      if (availableCmds.length > 0) {
        parts.push(`\n## Available Skill Commands\nWhen the user types one of these commands, execute the corresponding action:\n${availableCmds.join("\n")}`);
      }

      return parts.length > 0 ? parts.join("\n\n") : undefined;
    } catch { return undefined; }
  };

  // Get all available skill commands for autocomplete
  const getSkillCommands = (): Array<{ name: string; description: string; skill: string }> => {
    try {
      const installed = JSON.parse(localStorage.getItem("meld-installed-skills") || "[]") as string[];
      const cmds = JSON.parse(localStorage.getItem("meld-skill-commands") || "{}") as Record<string, Array<{ name: string; description: string }>>;
      const result: Array<{ name: string; description: string; skill: string }> = [];
      for (const skillName of installed) {
        if (cmds[skillName]) {
          for (const cmd of cmds[skillName]) {
            result.push({ ...cmd, skill: skillName });
          }
        }
      }
      return result;
    } catch { return []; }
  };

  // Build connected MCP services summary
  const buildConnectedServices = () => {
    const connected = mcpStore.servers.filter(s => s.connected);
    if (connected.length === 0) return undefined;
    return connected.map(s => `- ${s.name}: connected (${s.toolCount} tools)`).join("\n");
  };

  // Get recent terminal logs
  const getRecentTerminalLogs = () => {
    if (terminalLogs.length === 0) return undefined;
    return terminalLogs.slice(-30).join("").replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").slice(-2000);
  };

  // Build installed skills content (cached from GitHub fetch)
  const buildInstalledSkillsContent = () => {
    try {
      const cached = JSON.parse(localStorage.getItem("meld-skill-contents") || "{}") as Record<string, string>;
      const installed = JSON.parse(localStorage.getItem("meld-installed-skills") || "[]") as string[];
      const parts: string[] = [];
      for (const name of installed) {
        if (cached[name]) {
          parts.push(`\n# Skill: ${name}\n${cached[name]}`);
        }
      }
      return parts.join("\n");
    } catch { return ""; }
  };

  // Sync ref
  useEffect(() => { processingStartRef.current = processingStart; }, [processingStart]);

  // Agent Loop event listener (Electron) — register once
  useEffect(() => {
    if (!window.electronAgent?.agentLoop) return;
    const cleanup = window.electronAgent.agentLoop.onEvent((event) => {
      // Ignore "cancelled" — prevent previous session cancel from affecting new session
      if (event.type === "cancelled") return;
      if (event.type === "done" || event.type === "error") {
        const start = processingStartRef.current;
        const duration = start ? Date.now() - start : undefined;

        if (event.type === "done") {
          setMessages((prev) => [...prev, { role: "assistant", content: (event.summary as string) || "Task completed.", id: crypto.randomUUID(), duration, timestamp: Date.now() }]);
        } else if (event.type === "error") {
          const friendlyMsg = formatAiError(event.message ?? "Unknown error");
          setMessages((prev) => [...prev, { role: "assistant", content: friendlyMsg, id: crypto.randomUUID(), timestamp: Date.now() }]);
        }
        agentSession.addEvent(event as import("@/lib/store/agent-session-store").AgentEvent);
        safeSetProcessingFalse();
      } else {
        agentSession.addEvent(event as import("@/lib/store/agent-session-store").AgentEvent);
        // Auto-detect dev server URL from command output
        if (event.type === "command_output" && typeof event.data === "string") {
          const urlMatch = (event.data as string).match(/https?:\/\/localhost:(\d+)/);
          if (urlMatch) {
            setDevServerUrl(urlMatch[0]);
          }
        }
      }
    });
    return cleanup;
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, agentSession.events.length]);

  // Auto-trigger AI when external code adds a user message (e.g. "Fix with AI")
  const prevMsgCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current && !isProcessing) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "user") {
        // Trigger AI with the message content
        const command = lastMsg.content;
        setIsProcessing(true);
        setProcessingStart(Date.now());
        processingMinEndRef.current = Date.now() + 1000;

        if (window.electronAgent?.agentLoop) {
          agentSession.startSession();
          window.electronAgent.agentLoop.start({
            command,
            modelId: "claude-sonnet-4-20250514",
            context: {
              framework: devServerFramework ?? undefined,
              dependencies: dependencies?.length ? dependencies : undefined,
            },
          }).catch((err: unknown) => {
            safeSetProcessingFalse();
            agentSession.addEvent({ type: "error", message: formatAiError(err) });
          });
        }
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length]);

  const toggleInspector = useCallback(() => {
    const next = !inspectorEnabled;
    setInspectorEnabled(next);
    if (!next) setInspectedElement(null);
    const iframe = document.querySelector<HTMLIFrameElement>("iframe[title='Dev Server Preview']");
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "meld:toggle-inspector", enabled: next }, "*");
    }
  }, [inspectorEnabled, setInspectorEnabled, setInspectedElement]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    const command = input.trim();
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    const sendTime = Date.now();
    setMessages((prev) => [...prev, { role: "user", content: command, id: crypto.randomUUID(), timestamp: sendTime }]);
    setIsProcessing(true);
    setProcessingStart(sendTime);
    processingMinEndRef.current = sendTime + 1000; // Show for at least 1 second

    // Desktop + Agent Loop support
    if (window.electronAgent?.agentLoop) {
      agentSession.startSession();
      const targetFile = selectedFilePath ?? undefined;
      const getCode = async () => targetFile && readFileFn ? await readFileFn(targetFile) : undefined;

      // fire-and-forget — event listener handles completion/error
      getCode().then(async (currentCode) => {
        window.electronAgent?.agentLoop?.start({
          command,
          modelId: "claude-sonnet-4-20250514",
          context: {
            selectedFile: targetFile,
            currentCode: currentCode,
            framework: devServerFramework ?? undefined,
            dependencies: dependencies.length > 0 ? dependencies : undefined,
            designSystemMd: designSystem.getDesignMd() || undefined,
            elementHistory: elementHistory.length > 0 ? elementHistory : undefined,
            skillsContent: buildSkillsContent() || buildInstalledSkillsContent() || undefined,
            terminalLogs: getRecentTerminalLogs(),
            connectedServices: buildConnectedServices(),
          },
        }).catch((err: unknown) => {
          safeSetProcessingFalse();
          agentSession.addEvent({ type: "error", message: formatAiError(err) });
        });
      });
      return;
    }

    // Web mode fallback
    try {
      const targetFile = selectedFilePath ?? "";
      const currentCode = targetFile && readFileFn ? await readFileFn(targetFile) : "";

      let result: { filePath: string; original: string; modified: string; explanation: string };

      const res = await fetch("/api/ai/edit-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: targetFile, command, currentCode,
            modelId: "claude-sonnet-4",
            framework: devServerFramework ?? undefined,
            dependencies: dependencies.length > 0 ? dependencies : undefined,
            designSystemMd: designSystem.getDesignMd() || undefined,
            elementHistory: elementHistory.length > 0 ? elementHistory : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "AI request failed");
        if (data.type === "chat") {
          result = { filePath: targetFile, original: "", modified: "", explanation: data.text };
        } else {
          result = { filePath: data.filePath, original: data.original, modified: data.modified, explanation: data.explanation };
        }

      if (result.modified && targetFile && writeFileFn) {
        await writeFileFn(targetFile, result.modified);
        setLastWrite();
      }

      const duration = Date.now() - sendTime;
      setMessages((prev) => [...prev, { role: "assistant", content: result.explanation, id: crypto.randomUUID(), duration, timestamp: Date.now() }]);
    } catch (err) {
      const friendlyMsg = formatAiError(err);
      setMessages((prev) => [...prev, { role: "assistant", content: friendlyMsg, id: crypto.randomUUID(), timestamp: Date.now() }]);
    } finally {
      safeSetProcessingFalse();
    }
  };

  // Chat sessions
  const [chatSessions, setChatSessions] = useState<Array<{ id: string; title: string; time: string; messageCount: number }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);

  // Auto-approve pending edits when enabled
  useEffect(() => {
    if (!autoApprove) return;
    const pending = agentSession.pendingEdits.filter(e => e.status === "pending");
    for (const edit of pending) {
      agentSession.approveEdit(edit.toolCallId);
      window.electronAgent?.agentLoop?.approveEdit(edit.toolCallId, true);
    }
  }, [autoApprove, agentSession.pendingEdits]);
  const currentSessionId = useRef(crypto.randomUUID());

  const handleNewChat = () => {
    if (messages.length > 0) {
      setChatSessions((prev) => [{
        id: currentSessionId.current,
        title: messages[0]?.content.slice(0, 40) || "Untitled",
        time: "Just now",
        messageCount: messages.length,
      }, ...prev].slice(0, 20));
      setMessages([]);
      currentSessionId.current = crypto.randomUUID();
    }
    agentSession.reset();
    setShowHistory(false);
  };

  // Terminal panel state
  const termSetDevUrl = useAgentStore((s) => s.setDevServerUrl);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const agent = window.electronAgent;
    if (!agent) return;
    if (agent.getTerminalBuffer) {
      agent.getTerminalBuffer().then((buf: string[]) => {
        if (buf.length) {
          setTerminalLogs(buf.slice(-100));
          for (const line of buf) {
            const m = line.match(/https?:\/\/localhost:(\d+)/);
            if (m) { termSetDevUrl(m[0]); break; }
          }
        }
      });
    }
    const cleanup = agent.onTerminalOutput((data: string) => {
      setTerminalLogs((prev) => [...prev, data].slice(-100));
      const urlMatch = data.match(/https?:\/\/localhost:(\d+)/);
      if (urlMatch) termSetDevUrl(urlMatch[0]);
    });
    return cleanup;
  }, []);

  useEffect(() => {
    terminalScrollRef.current?.scrollTo({ top: terminalScrollRef.current.scrollHeight });
  }, [terminalLogs.length, terminalOpen]);

  const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const s = ms / 1000;
    return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
  };

  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  // ─── Input Area (Cursor style) ──────
  const [showSkills, setShowSkills] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuPos, setAddMenuPos] = useState({ top: 0, left: 0 });
  const [slashCmds, setSlashCmds] = useState<Array<{ name: string; description: string; skill: string }>>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  const submenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSubmenu = (which: "skills" | "power") => {
    if (submenuTimerRef.current) { clearTimeout(submenuTimerRef.current); submenuTimerRef.current = null; }
    setShowSkills(which === "skills");
    setShowPowerMenu(which === "power");
  };
  const scheduleCloseSubmenu = () => {
    if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
    submenuTimerRef.current = setTimeout(() => { setShowSkills(false); setShowPowerMenu(false); }, 800);
  };
  const cancelCloseSubmenu = () => {
    if (submenuTimerRef.current) { clearTimeout(submenuTimerRef.current); submenuTimerRef.current = null; }
  };
  const [powerFiles, setPowerFiles] = useState<string[]>([]);
  const inputArea = (
    <div className="p-3">
      <div className="rounded-2xl bg-[#2A2A2A] ring-1 ring-white/[0.06] focus-within:ring-white/[0.12] transition-all">
        <textarea
          ref={inputRef}
          rows={2}
          value={input}
          onChange={(e) => {
            const val = e.target.value;
            setInput(val);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
            // Slash command autocomplete
            if (val.startsWith("/")) {
              const query = val.slice(1).toLowerCase();
              const cmds = getSkillCommands();
              const filtered = cmds.filter(c => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query));
              setSlashCmds(filtered.slice(0, 8));
              setShowSlashMenu(filtered.length > 0);
            } else {
              setShowSlashMenu(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setShowSlashMenu(false); handleSend(); }
            if (e.key === "Escape") setShowSlashMenu(false);
          }}
          placeholder="Ask Meld to edit your code..."
          className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[15px] text-[#E8E8E5] placeholder:text-[#555] focus:outline-none"
          style={{ maxHeight: 200 }}
          disabled={isProcessing}
        />

        {/* Slash command autocomplete */}
        {showSlashMenu && slashCmds.length > 0 && (
          <div className="mx-3 mb-2 rounded-lg bg-[#1E1E1E] ring-1 ring-white/[0.06] overflow-hidden max-h-[200px] overflow-y-auto">
            {slashCmds.map((cmd, i) => (
              <button
                key={cmd.name + cmd.skill}
                onClick={() => {
                  setInput(cmd.name + " ");
                  setShowSlashMenu(false);
                  inputRef.current?.focus();
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[#2A2A2A] ${i > 0 ? "border-t border-[#2A2A2A]" : ""}`}
              >
                <span className="text-[13px] font-mono font-semibold text-emerald-400">{cmd.name}</span>
                <span className="flex-1 text-[11px] text-[#888] truncate">{cmd.description}</span>
                <span className="text-[9px] text-[#555]">{cmd.skill}</span>
              </button>
            ))}
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex items-center gap-2 px-3 pb-3">
          {/* Context chips */}
          {selectedFilePath && (
            <button
              onClick={() => setAgentSelectedFile(null)}
              className="flex items-center gap-1.5 rounded-lg bg-[#353535] px-2.5 py-1.5 text-[12px] font-medium text-[#9A9A95] hover:bg-[#3A3A3A] transition-colors"
            >
              <FileCode className="h-3.5 w-3.5" />
              {selectedFilePath.split("/").pop()}
              <X className="h-3 w-3 text-[#666]" />
            </button>
          )}
          {/* Power file chips */}
          {powerFiles.map((f) => (
            <button
              key={f}
              onClick={() => setPowerFiles((p) => p.filter((x) => x !== f))}
              className="flex items-center gap-1.5 rounded-lg bg-violet-500/15 px-2.5 py-1.5 text-[12px] font-medium text-violet-400 hover:bg-violet-500/25 transition-colors"
            >
              <Zap className="h-3 w-3" />
              {f.split("/").pop()}
              <X className="h-3 w-3 text-violet-400/50" />
            </button>
          ))}

          {/* Inspector toggle */}
          <button
            onClick={toggleInspector}
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] transition-colors ${
              inspectorEnabled
                ? "text-blue-400 bg-blue-500/10"
                : "text-[#555] hover:text-[#9A9A95] hover:bg-[#333]"
            }`}
            title={`${inspectorEnabled ? "인스펙터 끄기" : "엘리먼트 선택"} (⌘⇧I)`}
          >
            <MousePointerClick className="h-3.5 w-3.5" />
          </button>

          {/* + Add button */}
          <div className="relative">
            <button
              onClick={(e) => {
                setShowSkills(false);
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setAddMenuPos({ top: rect.bottom, left: rect.left });
                setShowAddMenu(!showAddMenu);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] transition-colors ${
                showAddMenu ? "bg-[#353535] text-[#E8E8E5]" : "text-[#555] hover:text-[#9A9A95] hover:bg-[#333]"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>

            {showAddMenu && (
              <>
              <div className="fixed inset-0 z-[99]" onClick={() => { setShowAddMenu(false); setShowSkills(false); setShowPowerMenu(false); }} />
              <div className="absolute left-0 top-full mt-1 animate-fade-in z-[100]">
                {/* Main menu */}
                <div className="w-52 rounded-lg bg-[#222] p-1.5 shadow-xl ring-1 ring-white/[0.06]">
                  {/* Add from local file */}
                  <label className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#2A2A2A]">
                    <LinkIcon className="h-4 w-4 text-[#9A9A95]" />
                    <span className="text-[13px] text-[#E8E8E5]">Add file</span>
                    <input type="file" className="hidden" multiple onChange={async (e) => {
                      setShowAddMenu(false);
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      for (const file of Array.from(files)) {
                        const text = await file.text();
                        const preview = text.slice(0, 500) + (text.length > 500 ? "\n..." : "");
                        setInput((prev) => prev + (prev ? "\n\n" : "") + `[${file.name}]\n\`\`\`\n${preview}\n\`\`\``);
                      }
                      inputRef.current?.focus();
                      e.target.value = "";
                    }} />
                  </label>

                  {/* Use skill — submenu on hover */}
                  <button
                    onMouseEnter={() => openSubmenu("skills")}
                    onMouseLeave={scheduleCloseSubmenu}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${showSkills ? "bg-[#2A2A2A]" : "hover:bg-[#2A2A2A]"}`}
                  >
                    <Sparkles className="h-4 w-4 text-[#9A9A95]" />
                    <span className="flex-1 text-[13px] text-[#E8E8E5]">Skills</span>
                    <ChevronRight className="h-3.5 w-3.5 text-[#555]" />
                  </button>

                  <button
                    onMouseEnter={() => openSubmenu("power")}
                    onMouseLeave={scheduleCloseSubmenu}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${showPowerMenu ? "bg-[#2A2A2A]" : "hover:bg-[#2A2A2A]"}`}
                  >
                    <Zap className="h-4 w-4 text-violet-400" />
                    <span className="flex-1 text-[13px] text-[#E8E8E5]">Super-Context</span>
                    <ChevronRight className="h-3.5 w-3.5 text-[#555]" />
                  </button>

                  <div className="my-0.5 h-px bg-[#333]" />

                  <button
                    onClick={() => { setShowAddMenu(false); onOpenSettings(); }}
                    onMouseEnter={() => { scheduleCloseSubmenu(); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#2A2A2A]"
                  >
                    <Settings className="h-4 w-4 text-[#9A9A95]" />
                    <span className="flex-1 text-[13px] text-[#E8E8E5]">More</span>
                    <ChevronRight className="h-3.5 w-3.5 text-[#555]" />
                  </button>
                </div>

                {/* Submenu: Skills & Plugins list */}
                {showSkills && (
                  <div onMouseEnter={cancelCloseSubmenu} onMouseLeave={scheduleCloseSubmenu}>
                  <SkillsSubmenu
                    onSelect={(name) => {
                      setInput(`/${name.toLowerCase().replace(/\s+/g, "-")} `);
                      setShowAddMenu(false); setShowSkills(false);
                      inputRef.current?.focus();
                    }}
                    onManage={() => { setShowAddMenu(false); setShowSkills(false); onOpenSkills(); }}
                  />
                  </div>
                )}

              </div>
            </>
            )}
          </div>

          <div className="flex-1" />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8E8E5] text-[#1A1A1A] transition-all hover:bg-white active:scale-[0.95] disabled:opacity-20"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Message Bubble ──────
  const renderMessage = (msg: typeof messages[0], isLast: boolean) => {
    const isUser = msg.role === "user";
    const isError = msg.content.startsWith("Error:");

    if (isUser) {
      return (
        <div key={msg.id} className="animate-fade-in-up group">
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <ArrowRight className="h-3 w-3 text-[#666]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666]">You</span>
            {msg.timestamp && (
              <span className="text-[10px] text-[#555] opacity-0 group-hover:opacity-100 transition-opacity">{formatTimeAgo(msg.timestamp)}</span>
            )}
          </div>
          <div className="rounded-xl rounded-tr-sm bg-[#353535] px-4 py-3 text-[14px] leading-relaxed text-[#E8E8E5]">
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className="animate-fade-in-up group">
        {/* Assistant header */}
        <div className="mb-2 flex items-center gap-2 px-1">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#3A3A3A] to-[#2E2E2E]">
            <Sparkles className="h-2.5 w-2.5 text-[#9A9A95]" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#666]">Meld</span>
          {msg.duration != null && (
            <span className="flex items-center gap-1 text-[10px] text-[#666]">
              <Zap className="h-3 w-3" />
              {formatDuration(msg.duration)}
            </span>
          )}
          {msg.timestamp && (
            <span className="text-[10px] text-[#555] opacity-0 group-hover:opacity-100 transition-opacity">{formatTimeAgo(msg.timestamp)}</span>
          )}
        </div>

        {/* Message body */}
        <div className={`rounded-xl rounded-tl-sm px-4 py-3 text-[14px] leading-relaxed ${
          isError
            ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
            : "text-[#E8E8E5] ring-1 ring-white/[0.06]"
        }`}>
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-[#232323]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3A3A3A] px-4 py-2.5">
        <span className="text-[14px] font-bold text-[#E8E8E5]">{messages.length > 0 ? messages[0].content.slice(0, 25) + (messages[0].content.length > 25 ? "..." : "") : "New Chat"}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setTerminalOpen(!terminalOpen)} className={`rounded-md p-1.5 transition-colors ${terminalOpen ? "bg-[#E8E8E5] text-[#1A1A1A]" : "text-[#666] hover:text-[#9A9A95] hover:bg-[#2E2E2E]"}`} title="Terminal">
            <Terminal className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleNewChat} className="rounded-md p-1.5 text-[#666] hover:text-[#9A9A95] hover:bg-[#2E2E2E] transition-colors" title="New chat">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setShowHistory(!showHistory)} className={`rounded-md p-1.5 transition-colors ${showHistory ? "bg-[#2E2E2E] text-[#9A9A95]" : "text-[#666] hover:text-[#9A9A95] hover:bg-[#2E2E2E]"}`} title="Chat history">
            <Clock className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showHistory ? (
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-[#666]">Past Chats</p>
            {chatSessions.length === 0 ? (
              <p className="px-1 py-4 text-[12px] text-[#666]">No past chats yet</p>
            ) : (
              <div className="space-y-0.5">
                {chatSessions.map((session) => (
                  <button key={session.id} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#2E2E2E]">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[12px] font-medium text-[#E8E8E5]">{session.title}</p>
                      <p className="text-[10px] text-[#666]">{session.messageCount} messages · {session.time}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Input — when at top */}
          {inputPosition === "top" && inputArea}

          {/* Messages + Agent Activity (unified) */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {messages.length === 0 && !isProcessing && agentSession.status === "idle" ? (
              <SidebarGuide onSetInput={setInput} />
            ) : (
              <div className="space-y-4 p-3">
                {messages.map((msg, i) => renderMessage(msg, i === messages.length - 1))}

                {/* Thinking + Agent Activity — show when last message is from user (waiting) */}
                {messages.length > 0 && messages[messages.length - 1].role === "user" && (
                  <>
                    <ThinkingBubble
                      startTime={processingStart}
                      onStop={() => {
                        window.electronAgent?.agentLoop?.cancel();
                        agentSession.cancelSession();
                        setIsProcessing(false);
                        setProcessingStart(null);
                        setMessages((prev) => [...prev, { role: "assistant", content: "Stopped.", id: crypto.randomUUID(), timestamp: Date.now() }]);
                      }}
                    />
                    {/* Auto-approve toggle */}
                    <div className="flex items-center gap-2 px-1 py-1">
                      <button
                        onClick={() => setAutoApprove(!autoApprove)}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          autoApprove
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "text-[#666] hover:text-[#9A9A95] hover:bg-[#333]"
                        }`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full ${autoApprove ? "bg-emerald-400" : "bg-[#555]"}`} />
                        {autoApprove ? "Auto-approve on" : "Auto-approve"}
                      </button>
                      <span className={`text-[10px] ${autoApprove ? "text-[#555]" : "text-[#444]"}`}>
                        {autoApprove ? "AI applies changes without asking" : "Press Enter to approve each change"}
                      </span>
                    </div>

                    <div className="rounded-xl overflow-hidden ring-1 ring-white/[0.06]">
                      <AgentActivityFeedEnhanced
                          agentSession={agentSession}
                          processingStart={processingStart}
                          onApprove={(id) => {
                            agentSession.approveEdit(id);
                            window.electronAgent?.agentLoop?.approveEdit(id, true);
                          }}
                          onReject={(id) => {
                            agentSession.rejectEdit(id);
                            window.electronAgent?.agentLoop?.approveEdit(id, false);
                          }}
                          onApproveAll={() => {
                            agentSession.pendingEdits.filter(e => e.status === "pending").forEach(e => {
                              window.electronAgent?.agentLoop?.approveEdit(e.toolCallId, true);
                            });
                            agentSession.approveAll();
                          }}
                          onRejectAll={() => {
                            agentSession.pendingEdits.filter(e => e.status === "pending").forEach(e => {
                              window.electronAgent?.agentLoop?.approveEdit(e.toolCallId, false);
                            });
                            agentSession.rejectAll();
                          }}
                          onCancel={() => { window.electronAgent?.agentLoop?.cancel(); agentSession.cancelSession(); setIsProcessing(false); setProcessingStart(null); }}
                        />
                      </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Input — when at bottom */}
          {inputPosition === "bottom" && inputArea}
        </>
      )}

    </div>
  );
}

// ─── Thinking Bubble (typewriter + activity log) ──────────────
function ThinkingBubble({ startTime, onStop }: { startTime: number | null; onStop?: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const agentSession = useAgentSessionStore();
  const [typedText, setTypedText] = useState("");
  const [activityLog, setActivityLog] = useState<Array<{ text: string; time: number }>>([]);
  const prevStatusRef = useRef("");
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => setElapsed(Date.now() - startTime), 200);
    return () => clearInterval(interval);
  }, [startTime]);

  // Extract current status from events
  const currentStatus = useMemo(() => {
    const events = agentSession.events as Array<{ type: string; toolName?: string; filePath?: string; input?: Record<string, string> }>;
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.type === "tool_call" && e.toolName === "read_file") return `Reading ${(e.input?.path || "").split("/").pop()}`;
      if (e.type === "tool_call" && e.toolName === "write_file") return `Writing ${(e.input?.path || "").split("/").pop()}`;
      if (e.type === "tool_call" && e.toolName === "search_files") return `Searching "${e.input?.query || ""}"`;
      if (e.type === "tool_call" && e.toolName === "list_files") return "Scanning project files...";
      if (e.type === "tool_call" && e.toolName === "run_command") return `Running $ ${(e.input?.command || "").slice(0, 40)}`;
      if (e.type === "file_edit") return `Modified ${(e.filePath || "").split("/").pop()}`;
      if (e.type === "file_create") return `Created ${(e.filePath || "").split("/").pop()}`;
    }
    return "Thinking...";
  }, [agentSession.events]);

  // Typewriter effect — when status changes, type it character by character
  useEffect(() => {
    if (currentStatus === prevStatusRef.current) return;

    // Push previous status to activity log
    if (prevStatusRef.current && prevStatusRef.current !== "Thinking...") {
      setActivityLog((prev) => [...prev, { text: prevStatusRef.current, time: Date.now() }].slice(-20));
    }
    prevStatusRef.current = currentStatus;

    // Typewriter animation
    setTypedText("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedText(currentStatus.slice(0, i));
      if (i >= currentStatus.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [currentStatus]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activityLog.length]);

  const formatDur = (ms: number) => {
    if (ms < 1000) return "";
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className="animate-fade-in">
      {/* Activity log — previous steps */}
      {activityLog.length > 0 && (
        <div className="max-h-[150px] overflow-y-auto mb-1">
          {activityLog.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 px-1 py-0.5 animate-fade-in">
              <Check className="h-3 w-3 text-emerald-500/60 flex-shrink-0" />
              <span className="text-[12px] text-[#666] flex-1 truncate">{entry.text}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {/* Current status — typewriter */}
      <div className="flex items-center gap-3 px-1 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-[#9A9A95] flex-shrink-0" />
        <span className="text-[13px] text-[#E8E8E5] flex-1 truncate font-mono">
          {typedText}
          <span className="animate-blink text-[#9A9A95]">▎</span>
        </span>
        {elapsed > 1000 && (
          <span className="text-[11px] text-[#555] tabular-nums flex-shrink-0">{formatDur(elapsed)}</span>
        )}
        {onStop && (
          <button
            onClick={(e) => { e.stopPropagation(); onStop(); }}
            className="rounded-lg px-3 py-1 text-[11px] font-medium text-[#9A9A95] transition-colors hover:text-[#E8E8E5] hover:bg-[#333] flex-shrink-0"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Enhanced Agent Activity Feed (with timer) ──────────
function AgentActivityFeedEnhanced({
  agentSession, processingStart,
  onApprove, onReject, onApproveAll, onRejectAll, onCancel,
}: {
  agentSession: { status: string; events: unknown[]; pendingEdits: { toolCallId: string; status: string }[]; currentThinking: string; error: string | null };
  processingStart: number | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onCancel: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(true);

  useEffect(() => {
    if (!processingStart || agentSession.status !== "running") return;
    const interval = setInterval(() => setElapsed(Date.now() - processingStart), 100);
    return () => clearInterval(interval);
  }, [processingStart, agentSession.status]);

  const formatDur = (ms: number) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

  return (
    <AgentActivityFeed
      onApprove={onApprove}
      onReject={onReject}
      onApproveAll={onApproveAll}
      onRejectAll={onRejectAll}
      onCancel={onCancel}
    />
  );
}

// ─── Meld AI Status (inside Source Modal) ──────────────
function MeldAiStatus() {
  const [usage, setUsage] = useState<{ today: { requestCount: number; limit: number | null; remaining: number | null }; plan: string } | null>(null);

  useEffect(() => {
    fetch("/api/ai/usage")
      .then((r) => r.ok ? r.json() : null)
      .then(setUsage)
      .catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-4 rounded-2xl p-4 ring-1 ring-black/[0.04]">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A1A1A]">
        <Sparkles className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-semibold text-[#1A1A1A]">Meld AI</p>
        {usage ? (
          <div className="flex items-center gap-2">
            <p className="text-[12px] text-[#787774]">
              {usage.today.requestCount}{usage.today.limit ? `/${usage.today.limit}` : ""} requests today
            </p>
            <span className="rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-medium text-[#16A34A] capitalize">{usage.plan}</span>
          </div>
        ) : (
          <p className="text-[12px] text-[#B4B4B0]">Sign in to use AI features</p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-[#16A34A]" />
        <span className="text-[11px] font-medium text-[#16A34A]">Active</span>
      </div>
    </div>
  );
}

// ─── Main Workspace ───────────────────────────────────
function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggle: toggleTheme, isDark } = useTheme();
  const t = T[theme];

  // Auth check — redirect to login if not authenticated
  const { user: authUserCheck, loading: authLoading, fetchUser: authFetch } = useAuthStore();
  const isElectronEnv = typeof window !== "undefined" && !!(window as unknown as { electronAgent?: unknown }).electronAgent;
  const [electronAuthChecked, setElectronAuthChecked] = useState(false);
  const [electronUser, setElectronUser] = useState<{ id: string; name: string; avatar: string } | null>(null);

  // Electron: Check saved session on mount
  useEffect(() => {
    if (isElectronEnv) {
      const checkElectronSession = async () => {
        const ea = (window as unknown as { electronAgent?: { getSavedSession?: () => Promise<unknown> } }).electronAgent;
        if (ea?.getSavedSession) {
          const saved = await ea.getSavedSession() as { id: string; githubUsername: string; avatarUrl?: string } | null;
          if (saved) {
            setElectronUser({ id: saved.id, name: saved.githubUsername, avatar: saved.avatarUrl ?? "" });
          }
        }
        setElectronAuthChecked(true);
      };
      checkElectronSession();
    }
  }, [isElectronEnv]);

  // Web: Fetch user from server
  useEffect(() => { if (!isElectronEnv) authFetch(); }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    // Web: redirect if no user
    if (!isElectronEnv && !authLoading && !authUserCheck) {
      router.replace("/login");
    }
    // Electron: redirect if no saved session
    if (isElectronEnv && electronAuthChecked && !electronUser) {
      router.replace("/login");
    }
  }, [authLoading, authUserCheck, isElectronEnv, electronAuthChecked, electronUser]);

  const {
    workspace, createWorkspace, closeWorkspace, loadWorkspace, setWorkspaceName, connectFigma, disconnectFigma,
    connectLocal, setLocalConnected, disconnectLocal,
    connectGitHub, disconnectGitHub,
  } = useProjectStore();

  const agentStore = useAgentStore();
  const { setHandlers, setSelectedFilePath: setStoreFilePath, setConnected, setFileTree, setProjectName, setDevServerUrl, setDevServerFramework } = agentStore;

  // Auto-switch to properties tab when element is inspected
  useEffect(() => {
    if (agentStore.inspectedElement) {
      setActiveIconTab("properties");
      setSidebarCollapsed(false);
    }
  }, [agentStore.inspectedElement]);

  // Figma node -> code file auto-mapping engine
  const { mappingResult, isMapping, mappingError } = useMappingEngine();

  const isElectron = typeof window !== "undefined" && !!window.electronAgent;
  const electronAgent = useElectronAgent();
  const authUser = useAuthStore((s) => s.user);
  const userServices = authUser?.connectedServices ?? {};

  const [showFigmaModal, setShowFigmaModal] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showAddMCPModal, setShowAddMCPModal] = useState(false);
  const [showMCPHub, setShowMCPHub] = useState(false);
  const [mcpDetailServer, setMcpDetailServer] = useState<string | null>(null);
  const [mcpTokenModal, setMcpTokenModal] = useState<{ adapterId: string; name: string; hint: string } | null>(null);
  const [mcpConnecting, setMcpConnecting] = useState<string | null>(null); // adapterId
  const [mcpJustConnected, setMcpJustConnected] = useState<string | null>(null); // adapterId
  const mcpStore = useMCPStore();

  // Initialize MCP preset servers + auto-connect logged-in services
  useEffect(() => {
    if (mcpStore.servers.length === 0) {
      for (const p of MCP_PRESETS) {
        mcpStore.addServer({ adapterId: p.id, name: p.name, icon: p.icon, category: p.category });
      }
    }
  }, []);

  // No auto-connect for MCP — only connect when user clicks the connect button
  // Auto-connect only when returning from OAuth callback (URL has figma_connected etc. params)
  const mcpAutoConnected = useRef(false);
  useEffect(() => {
    if (mcpAutoConnected.current || !authUser || mcpStore.servers.length === 0) return;
    mcpAutoConnected.current = true;

    // Returning from OAuth callback: detect from URL
    const url = new URL(window.location.href);
    const justConnected = url.searchParams.get("mcp_connected");
    if (justConnected && userServices[justConnected]) {
      handleMCPConnect(justConnected);
      // Remove param (clean up history)
      url.searchParams.delete("mcp_connected");
      window.history.replaceState({}, "", url.toString());
    }
  }, [authUser, mcpStore.servers.length]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeIconTab, setActiveIconTab] = useState<"chat" | "files" | "properties" | "terminal" | "mcp" | "tasks" | "marketplace" | "design" | null>("chat");
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"terminal" | "properties">("terminal");
  const [rightTerminalLogs, setRightTerminalLogs] = useState<string[]>([]);
  const rightTerminalRef = useRef<HTMLDivElement>(null);
  type MainTab = { id: string; label: string; type: "preview" | "mcp" | "tasks" | "marketplace" | "design" | "editor" | "settings"; filePath?: string };
  const [mainTabs, setMainTabs] = useState<MainTab[]>([{ id: "preview", label: "Preview", type: "preview" }]);
  const [activeMainTab, setActiveMainTab] = useState("preview");
  const [editorContents, setEditorContents] = useState<Record<string, string>>({});
  const [editorDirty, setEditorDirty] = useState<Set<string>>(new Set());
  const addMainTab = (tab: MainTab) => {
    if (!mainTabs.find(t => t.id === tab.id)) setMainTabs(prev => [...prev, tab]);
    setActiveMainTab(tab.id);
  };
  const openFileInEditor = async (filePath: string) => {
    const tabId = `file:${filePath}`;
    const fileName = filePath.split("/").pop() ?? filePath;
    if (!mainTabs.find(t => t.id === tabId)) {
      setMainTabs(prev => [...prev, { id: tabId, label: fileName, type: "editor", filePath }]);
      // Read file content
      if (agentStore.readFileFn && !editorContents[filePath]) {
        try {
          const content = await agentStore.readFileFn(filePath);
          if (content) {
            setEditorContents(prev => ({ ...prev, [filePath]: content }));
          }
        } catch {}
      }
    }
    setActiveMainTab(tabId);
  };
  const flattenFileTree = (entries: unknown[]): string[] => {
    const paths: string[] = [];
    for (const e of entries as Array<{ path: string; type: string; children?: unknown[] }>) {
      if (e.type === "file") paths.push(e.path);
      if (e.children) paths.push(...flattenFileTree(e.children));
    }
    return paths;
  };
  const closeMainTab = (id: string) => {
    if (id === "preview") return;
    setMainTabs(prev => prev.filter(t => t.id !== id));
    if (activeMainTab === id) setActiveMainTab("preview");
  };
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);
  const [editingName, setEditingName] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "split" | "terminal">("split");
  const [nameInput, setNameInput] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string; id: string }>>([]);
  const devServerReady = !!(agentStore.devServerUrl || electronAgent.devServerUrl);

  // New Project from Scratch — template selector state
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [scaffoldingStarted, setScaffoldingStarted] = useState(false);

  // Save workspace to recent projects
  const saveToRecent = (ws: { id: string; name: string; figma?: unknown; local?: unknown; github?: unknown }, projectPath?: string) => {
    try {
      const stored = JSON.parse(localStorage.getItem("meld-recent-projects") || "[]");
      const sources: string[] = [];
      if (ws.figma) sources.push("Figma");
      if (ws.local) sources.push("Local");
      if (ws.github) sources.push("GitHub");
      // Keep existing projectPath if not provided
      const existing = stored.find((p: { id: string }) => p.id === ws.id);
      const updated = [
        { id: ws.id, name: ws.name, lastOpened: "Now", sources, workspace: ws, projectPath: projectPath || existing?.projectPath },
        ...stored.filter((p: { id: string }) => p.id !== ws.id),
      ].slice(0, 10);
      localStorage.setItem("meld-recent-projects", JSON.stringify(updated));
    } catch {}
  };

  // Auto-save workspace changes to recent — only when a source is actually connected
  useEffect(() => {
    if (!workspace) return;
    const hasSomeSource = workspace.figma || workspace.local || workspace.github;
    if (hasSomeSource) saveToRecent(workspace);
  }, [workspace?.name, workspace?.figma, workspace?.local, workspace?.github]);

  // Go home — close current project and show empty workspace
  const goHome = () => {
    // Stop dev server & agent
    if (window.electronAgent?.stopDevServer) window.electronAgent.stopDevServer();
    // Reset stores
    closeWorkspace();
    setDevServerUrl(null);
    setDevServerFramework(null);
    setConnected(false);
    setFileTree([]);
    setProjectName(null);
    setShowTemplateSelector(false);
    setScaffoldingStarted(false);
    setChatMessages([]);
    setMainTabs([{ id: "preview", label: "Preview", type: "preview" }]);
    setActiveMainTab("preview");
    // Reset init ref so workspace can be re-initialized
    initIdRef.current = null;
    // Create fresh workspace
    createWorkspace("Untitled Project");
    // Clean URL
    window.history.replaceState({}, "", "/project/workspace");
  };

  // Helper: apply openProject result to stores
  const applyProjectResult = (result: { projectPath: string; projectName: string; fileTree: unknown[]; devServerUrl?: string | null }, name?: string) => {
    // Reset previous project state
    setDevServerUrl(null);
    setDevServerFramework(null);

    connectLocal("electron");
    setLocalConnected(true);
    setWorkspaceName(result.projectName || name || "Untitled");
    setConnected(true);
    setFileTree(result.fileTree as never[]);
    setProjectName(result.projectName);
    setHandlers(
      (p: string) => window.electronAgent!.readFile(p),
      (p: string, c: string) => window.electronAgent!.writeFile(p, c),
    );
    if (result.devServerUrl) {
      setDevServerUrl(result.devServerUrl);
    }
    // Save projectPath for restore
    if (workspace) {
      saveToRecent(workspace, result.projectPath);
    }
  };

  // Track which workspace ID we've initialized to handle URL changes
  const initIdRef = useRef<string | null>(null);

  // Create workspace on mount + auto-connect local if Electron
  useEffect(() => {
    const isNew = searchParams.get("new") === "true";
    const restoreId = searchParams.get("id");
    const currentKey = restoreId || (isNew ? "new" : "default");

    // Skip if already initialized with this ID
    if (initIdRef.current === currentKey) return;
    initIdRef.current = currentKey;

    // Restore from recent
    if (restoreId && !isNew) {
      try {
        const stored = JSON.parse(localStorage.getItem("meld-recent-projects") || "[]");
        const found = stored.find((p: { id: string }) => p.id === restoreId);
        if (found?.workspace) {
          loadWorkspace(found.workspace);
          if (found.workspace.local && window.electronAgent) {
            if (found.projectPath && window.electronAgent.reopenProject) {
              window.electronAgent.reopenProject(found.projectPath).then((result) => {
                if (result) applyProjectResult(result);
              });
            } else {
              window.electronAgent.openProject().then((result) => {
                if (result) applyProjectResult(result);
              });
            }
          }
          return;
        }
      } catch {}
    }

    // New workspace — just create it, don't save to recent until a source is connected
    if (isNew) closeWorkspace();
    const name = searchParams.get("name") || "Untitled Project";
    createWorkspace(name);

    // Show template selector for new projects
    if (isNew) {
      setShowTemplateSelector(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Right panel terminal logs
  useEffect(() => {
    const agent = window.electronAgent;
    if (!agent) return;
    if (agent.getTerminalBuffer) {
      agent.getTerminalBuffer().then((buf: string[]) => { if (buf.length) setRightTerminalLogs(buf.slice(-100)); });
    }
    if (!agent.onTerminalOutput) return;
    const cleanup = agent.onTerminalOutput((data: string) => {
      setRightTerminalLogs((prev) => [...prev, data].slice(-100));
    });
    return cleanup;
  }, []);

  useEffect(() => {
    if (rightTerminalRef.current) rightTerminalRef.current.scrollTop = rightTerminalRef.current.scrollHeight;
  }, [rightTerminalLogs.length, rightPanelOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "f") { e.preventDefault(); setShowFigmaModal(true); }
        if (e.key === "o") { e.preventDefault(); handleConnectLocal(); }
        if (e.key === "b") { e.preventDefault(); setSidebarCollapsed((p) => !p); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Sidebar resize drag
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.max(280, Math.min(600, startWidth + (ev.clientX - startX)));
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  // Listen for dev server + file changes from Electron
  useEffect(() => {
    const agent = window.electronAgent;
    if (!agent) return;

    // 1. Event listener for dev server ready (from Meld's startDevServer)
    const cleanupDev = agent.onDevServerReady(({ url, framework }: { url: string; framework: string | null }) => {
      setDevServerUrl(url);
      setDevServerFramework(framework);
    });

    // 2. Unified polling — check ALL sources every 1s until URL is found
    //    This catches: Meld dev server, AI-started servers, timing issues, chunked stdout
    let terminalAccum = ""; // accumulate terminal chunks to catch split URLs
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const tryDetectUrl = (text: string): string | null => {
      const m = text.match(/https?:\/\/localhost:(\d+)/);
      return m ? m[0] : null;
    };

    pollTimer = setInterval(async () => {
      // Already have URL? stop polling
      if (agentStore.devServerUrl) {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        return;
      }

      // Check Meld's dev-server module
      if (agent.getDevServerUrl) {
        const url = await agent.getDevServerUrl();
        if (url) { setDevServerUrl(url); return; }
      }

      // Check terminal buffer (join all lines to handle chunked output)
      if (agent.getTerminalBuffer) {
        const buf = await agent.getTerminalBuffer();
        if (buf.length > 0) {
          const joined = buf.join("");
          const url = tryDetectUrl(joined);
          if (url) { setDevServerUrl(url); return; }
        }
      }
    }, 1500);

    // 3. Real-time terminal output listener (accumulate chunks)
    let cleanupTermUrl: (() => void) | undefined;
    if (agent.onTerminalOutput) {
      cleanupTermUrl = agent.onTerminalOutput((data: string) => {
        terminalAccum += data;
        const url = tryDetectUrl(terminalAccum);
        if (url) {
          setDevServerUrl(url);
          terminalAccum = "";
        }
        // Prevent unbounded growth
        if (terminalAccum.length > 5000) terminalAccum = terminalAccum.slice(-2000);
      });
    }

    // 4. Agent loop event URL detection (for AI run_command)
    let cleanupAgentUrl: (() => void) | undefined;
    if (agent.agentLoop?.onEvent) {
      cleanupAgentUrl = agent.agentLoop.onEvent((event) => {
        if (event.type === "command_output" && typeof event.data === "string") {
          const url = tryDetectUrl(event.data as string);
          if (url) setDevServerUrl(url);
        }
      });
    }

    // 5. Immediate buffer check on mount
    if (agent.getTerminalBuffer) {
      agent.getTerminalBuffer().then((buf: string[]) => {
        const joined = buf.join("");
        const url = tryDetectUrl(joined);
        if (url) setDevServerUrl(url);
      });
    }

    // 3. File change listener
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const cleanupFile = agent.onFileChanged(() => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        agent.refreshTree().then((tree: unknown[]) => setFileTree(tree as never[]));
      }, 500);
    });

    return () => {
      cleanupDev();
      cleanupFile();
      cleanupTermUrl?.();
      cleanupAgentUrl?.();
      if (pollTimer) clearInterval(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync electronAgent hook's devServerUrl to agentStore (fallback)
  useEffect(() => {
    if (electronAgent.devServerUrl && !agentStore.devServerUrl) {
      setDevServerUrl(electronAgent.devServerUrl);
      setDevServerFramework(electronAgent.devServerFramework);
    }
  }, [electronAgent.devServerUrl]);

  useEffect(() => { setStoreFilePath(selectedFilePath); }, [selectedFilePath]);

  const handleConnectLocal = async () => {
    if (isElectron) {
      const result = await window.electronAgent!.openProject();
      if (result) applyProjectResult(result);
    } else {
      connectLocal("agent");
    }
  };

  // New Project from Scratch — create project after template selection + start agent loop
  const handleTemplateSelect = async (template: ProjectTemplate) => {
    setShowTemplateSelector(false);
    setScaffoldingStarted(true);

    // Electron env: select folder via createProject -> create project
    if (isElectron && window.electronAgent?.createProject) {
      const projName = workspace?.name || "New Project";
      const result = await window.electronAgent.createProject(projName);
      if (!result) {
        // User cancelled — go back to template selector
        setScaffoldingStarted(false);
        setShowTemplateSelector(true);
        return;
      }
      applyProjectResult(result);

      // Wait briefly then send scaffold command via agent loop
      await new Promise((r) => setTimeout(r, 300));

      const command = template.command;
      const sendTime = Date.now();
      setChatMessages((prev) => [...prev, { role: "user", content: command, id: crypto.randomUUID() }]);

      if (window.electronAgent?.agentLoop) {
        // Same logic as ChatHistoryPanel's handleSend
        window.electronAgent.agentLoop.start({
          command,
          modelId: "claude-sonnet-4-20250514",
          context: {
            framework: undefined,
            dependencies: undefined,
          },
        }).catch((err: unknown) => {
          setChatMessages((prev) => [...prev, {
            role: "assistant",
            content: formatAiError(err),
            id: crypto.randomUUID(),
          }]);
          setScaffoldingStarted(false);
        });
      }

      // Switch sidebar to chat tab
      setActiveIconTab("chat");
      if (sidebarCollapsed) setSidebarCollapsed(false);
    } else {
      // Web mode: send command to chat without project folder
      // First prompt local connection
      handleConnectLocal();

      // After connection, put scaffold command into chat
      const command = template.command;
      setChatMessages((prev) => [...prev, { role: "user", content: command, id: crypto.randomUUID() }]);
      setActiveIconTab("chat");
      if (sidebarCollapsed) setSidebarCollapsed(false);
      setScaffoldingStarted(false);
    }
  };

  // Electron: auto-connect MCP after OAuth completion (poll -> attempt connect -> repeat until success)
  const pollOAuthCompletion = useCallback((service: string) => {
    const startedAt = Date.now();
    let attempts = 0;
    const maxAttempts = 40; // 40 attempts x 5s = ~3 min
    // Wait at least 10 seconds for OAuth flow to complete
    const minWaitMs = 10000;
    let connecting = false;

    const interval = setInterval(async () => {
      if (connecting) return; // Skip if previous connection attempt is in progress
      attempts++;
      if (attempts > maxAttempts) { clearInterval(interval); return; }
      if (Date.now() - startedAt < minWaitMs) return;

      try {
        connecting = true;
        await useAuthStore.getState().fetchUser();
        const user = useAuthStore.getState().user;
        if (!user?.connectedServices?.[service]) { connecting = false; return; }

        // Attempt connection — don't show errors on failure (retry on next poll)
        await handleMCPConnect(service, undefined, { silent: true });
        if (mcpStore.isConnected(service)) {
          clearInterval(interval);
        } else {
          // Hide error message — OAuth may still be in progress
          mcpStore.setDisconnected(service);
        }
      } catch { /* Retry on next poll */ }
      finally { connecting = false; }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // tRPC mutation hooks
  const mcpConnectMutation = trpc.mcp.connect.useMutation();
  const mcpRegisterMutation = trpc.mcp.registerCustom.useMutation();

  // Generic MCP connection handler
  const handleMCPConnect = async (adapterId: string, token?: string, opts?: { silent?: boolean }) => {
    if (!adapterId || typeof adapterId !== "string") return;
    // Add to store if server is not present
    if (!mcpStore.getServer(adapterId)) {
      mcpStore.addServer({ adapterId, name: adapterId, icon: adapterId, category: "custom" });
    }
    mcpStore.setConnecting(adapterId);
    if (!opts?.silent) setMcpConnecting(adapterId);
    try {
      const result = await mcpConnectMutation.mutateAsync({ adapterId, token });
      const toolCount = result?.toolCount ?? 0;
      const meta = result?.meta ?? {};
      mcpStore.setConnected(adapterId, toolCount, meta);
      setMcpConnecting(null);
      if (!opts?.silent) setMcpJustConnected(adapterId);
    } catch (err) {
      setMcpConnecting(null);
      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg.startsWith("LOGIN_REQUIRED:") || errMsg === "TOKEN_REQUIRED") {
        mcpStore.setDisconnected(adapterId);
      } else {
        mcpStore.setError(adapterId, formatMCPError(err, adapterId));
      }
    }
  };

  // MCP: Figma connection (called from modal)
  const handleFigmaMCPConnect = async (key: string, name: string) => {
    connectFigma(key, name);
    await handleMCPConnect("figma");
    setShowFigmaModal(false);
  };

  // MCP: GitHub connection (called from modal)
  const handleGitHubMCPConnect = async (owner: string, repo: string, branch: string) => {
    connectGitHub(owner, repo, branch);
    await handleMCPConnect("github");
    setShowGitHubModal(false);
  };

  if (!workspace) {
    return (
      <div className={`flex h-screen items-center justify-center ${t.bg}`}>
        <Loader2 className={`h-5 w-5 animate-spin ${t.textMuted}`} />
      </div>
    );
  }

  const hasSources = workspace.figma || workspace.local || workspace.github;
  const hasLocalFiles = !!(workspace.local?.connected);

  return (
    <div className={`flex flex-col h-screen ${t.bg}`}>
      {/* Title bar — Cursor style (drag region) */}
      <div
        className={`flex items-center flex-shrink-0 border-b select-none ${isDark ? "bg-[#181818] border-[#333]" : "bg-[#F0F0EE] border-[#E0E0DC]"}`}
        style={{ height: 38, WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        {/* Left: traffic light spacer */}
        <div className="w-[80px] flex-shrink-0" />

        {/* Center: URL bar */}
        <div className="flex-1 flex items-center justify-center px-4" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {hasSources && (() => {
            const currentUrl = agentStore.devServerUrl || electronAgent.devServerUrl;
            return (
              <div className={`flex items-center w-full max-w-md h-[26px] rounded-lg overflow-hidden ${isDark ? "bg-[#181818] ring-1 ring-white/[0.04]" : "bg-[#E8E8E5] ring-1 ring-black/[0.04]"}`}>
                {/* Lock / globe icon */}
                <div className={`flex items-center justify-center w-7 flex-shrink-0 ${isDark ? "text-[#666]" : "text-[#B4B4B0]"}`}>
                  {currentUrl ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 6h10M6 1c-1.5 1.5-2 3-2 5s.5 3.5 2 5M6 1c1.5 1.5 2 3 2 5s-.5 3.5-2 5" stroke="currentColor" strokeWidth="1"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5V3.5a2 2 0 114 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  )}
                </div>
                {/* URL input */}
                <input
                  type="text"
                  defaultValue={currentUrl?.replace("http://", "") ?? ""}
                  key={currentUrl}
                  placeholder={devServerReady ? "localhost" : "No server running"}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        const url = val.startsWith("http") ? val : `http://${val}`;
                        agentStore.setDevServerUrl(url);
                      }
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className={`flex-1 h-full bg-transparent text-[11px] font-mono outline-none pr-2 ${isDark ? "text-[#999] focus:text-[#E8E8E5] placeholder:text-[#444]" : "text-[#787774] focus:text-[#1A1A1A] placeholder:text-[#B4B4B0]"}`}
                />
                {/* Refresh */}
                {currentUrl && (
                  <button
                    onClick={() => {
                      const iframe = document.querySelector<HTMLIFrameElement>("iframe[title='Dev Server Preview']");
                      if (iframe) { iframe.src = iframe.src; }
                    }}
                    className={`flex items-center justify-center w-6 h-full flex-shrink-0 ${isDark ? "text-[#555] hover:text-[#999]" : "text-[#B4B4B0] hover:text-[#787774]"} transition-colors`}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        {/* Right: layout toggle buttons */}
        <div className="flex items-center gap-1 pr-3" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {/* Left sidebar */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            className={`flex h-[26px] w-[30px] items-center justify-center rounded transition-colors ${
              !sidebarCollapsed
                ? isDark ? "text-[#E8E8E5] bg-[#333]" : "text-[#1A1A1A] bg-[#D4D4D0]"
                : isDark ? "text-[#555] hover:text-[#9A9A95] hover:bg-[#333]" : "text-[#B4B4B0] hover:text-[#787774] hover:bg-[#E0E0DC]"
            }`}
          >
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
              <rect x="0.5" y="0.5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1" />
              <line x1="5" y1="0.5" x2="5" y2="13.5" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
          {/* Right panel (terminal/tools) */}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            title="Terminal & Tools"
            className={`flex h-[26px] w-[30px] items-center justify-center rounded transition-colors ${
              rightPanelOpen
                ? isDark ? "text-[#E8E8E5] bg-[#333]" : "text-[#1A1A1A] bg-[#D4D4D0]"
                : isDark ? "text-[#555] hover:text-[#9A9A95] hover:bg-[#333]" : "text-[#B4B4B0] hover:text-[#787774] hover:bg-[#E0E0DC]"
            }`}
          >
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
              <rect x="0.5" y="0.5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1" />
              <line x1="11" y1="0.5" x2="11" y2="13.5" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Icon sidebar — Cursor style (hidden when no project) */}
        <div className={`flex flex-shrink-0 flex-col items-center justify-between border-r ${t.border} ${isDark ? "bg-[#181818]" : "bg-[#EEEEEC]"} py-4 ${!hasSources ? "hidden" : ""}`} style={{ width: 60 }}>
          <div className="flex flex-col items-center gap-1.5">
            {([
              { id: "chat" as const, icon: <MessageSquare className="h-[22px] w-[22px]" />, title: "Chat", badge: chatMessages.length > 0 ? chatMessages.length : null, mainTab: null },
              { id: "files" as const, icon: <FolderOpen className="h-[22px] w-[22px]" />, title: "Files", mainTab: null },
              { id: "properties" as const, icon: <Blocks className="h-[22px] w-[22px]" />, title: "Properties", mainTab: null },
              { id: "mcp" as const, icon: <Zap className="h-[22px] w-[22px]" />, title: "MCP Servers", badge: mcpStore.connectedCount() > 0 ? mcpStore.connectedCount() : null, mainTab: { id: "mcp", label: "MCP Servers", type: "mcp" as const } },
              { id: "tasks" as const, icon: <CheckSquare className="h-[22px] w-[22px]" />, title: "Tasks", mainTab: { id: "tasks", label: "Tasks", type: "tasks" as const } },
              { id: "marketplace" as const, icon: <Package className="h-[22px] w-[22px]" />, title: "Skills", mainTab: { id: "marketplace", label: "Skills & Plugins", type: "marketplace" as const } },
              { id: "design" as const, icon: <Palette className="h-[22px] w-[22px]" />, title: "Design System", mainTab: { id: "design", label: "Design System", type: "design" as const } },
            ]).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.mainTab) {
                    // MCP, Tasks, Marketplace -> open as main tab
                    addMainTab(item.mainTab);
                  } else if (activeIconTab === item.id) {
                    setSidebarCollapsed(!sidebarCollapsed);
                  } else {
                    setActiveIconTab(item.id);
                    setSidebarCollapsed(false);
                  }
                }}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                  activeIconTab === item.id && !sidebarCollapsed
                    ? isDark ? "bg-[#181818] text-[#E8E8E5] ring-1 ring-white/[0.08]" : "bg-white text-[#1A1A1A] shadow-sm"
                    : isDark ? "text-[#555] hover:text-[#E8E8E5] hover:bg-[#181818]" : "text-[#B4B4B0] hover:text-[#787774] hover:bg-white"
                }`}
                title={item.title}
              >
                {item.icon}
                {item.badge && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[8px] font-bold text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Bottom icons */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? "text-[#555] hover:text-[#E8E8E5] hover:bg-[#181818]" : "text-[#B4B4B0] hover:text-[#787774] hover:bg-white"} transition-colors`}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Sun className="h-[22px] w-[22px]" /> : <Moon className="h-[22px] w-[22px]" />}
            </button>
            <button
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? "text-[#555] hover:text-[#E8E8E5] hover:bg-[#181818]" : "text-[#B4B4B0] hover:text-[#787774] hover:bg-white"} transition-colors`}
              title="Settings"
              onClick={() => addMainTab({ id: "settings", label: "Settings", type: "settings" as never })}
            >
              <Settings className="h-[22px] w-[22px]" />
            </button>
          </div>
        </div>

        {/* Source panel (left) — resizable (hidden when no project) */}
        <div
          className={`relative flex-shrink-0 ${isDark ? "bg-[#151515]" : "bg-white"} ${!hasSources || sidebarCollapsed ? "w-0 overflow-hidden" : ""}`}
          style={!hasSources || sidebarCollapsed ? undefined : { width: sidebarWidth, transition: isResizing.current ? "none" : "width 0.3s cubic-bezier(0.16,1,0.3,1)" }}
        >
          <div key={activeIconTab} className="h-full overflow-hidden animate-tab-slide-in" style={{ width: sidebarWidth }}>
            {/* Panel content — based on activeIconTab */}
            {activeIconTab === "chat" && (
              <ChatHistoryPanel messages={chatMessages} setMessages={setChatMessages} onOpenSettings={() => addMainTab({ id: "settings", label: "Settings", type: "settings" as never })} onOpenSkills={() => { addMainTab({ id: "marketplace", label: "Skills & Plugins", type: "marketplace" }); setActiveMainTab("marketplace"); }} />
            )}
            {activeIconTab === "files" && (
              <div className={`flex h-full flex-col ${isDark ? "bg-[#151515]" : "bg-white"}`}>
                <div className={`flex items-center justify-between border-b ${t.border} px-4 py-2.5`}>
                  <span className={`text-[13px] font-bold ${t.textHeading}`}>Files</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {agentStore.fileTree.length > 0 ? (
                    <FileTreeBrowser
                      files={agentStore.fileTree}
                      selectedPath={agentStore.selectedFilePath}
                      onSelectFile={(path: string) => {
                        agentStore.setSelectedFilePath(path);
                        openFileInEditor(path);
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className={`text-[12px] ${t.textMuted}`}>Connect a project to browse files</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeIconTab === "properties" && (
              <PropertiesPanel
                isDark={isDark}
                element={agentStore.inspectedElement}
                onApplyStyle={(prop, val) => {
                  if (!agentStore.inspectedElement) return;
                  const iframe = document.querySelector<HTMLIFrameElement>("iframe[title='Dev Server Preview']");
                  if (iframe?.contentWindow) {
                    iframe.contentWindow.postMessage({
                      type: "meld:apply-style",
                      selector: agentStore.inspectedElement.selector,
                      property: prop,
                      value: val,
                    }, "*");
                  }
                }}
              />
            )}
          </div>
          {/* Drag handle */}
          {!sidebarCollapsed && (
            <div
              onMouseDown={handleResizeStart}
              className={`absolute inset-y-0 -right-px z-20 w-1 cursor-col-resize transition-colors ${isDark ? "hover:bg-white/10 active:bg-white/20" : "hover:bg-[#1A1A1A]/10 active:bg-[#1A1A1A]/20"}`}
            />
          )}
        </div>

        {/* Center: Tabs + Content */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Tab bar — VSCode style (hide when only preview tab) */}
          <div className={`flex items-end ${isDark ? "bg-[#181818]" : "bg-[#F0F0EE]"} ${mainTabs.length <= 1 ? "hidden" : ""}`}>
            {mainTabs.map((tab) => {
              const isActive = activeMainTab === tab.id;
              const isDirty = tab.type === "editor" && editorDirty.has(tab.filePath!);
              // File type icon color for editor tabs
              const getEditorIconColor = () => {
                if (tab.type !== "editor" || !tab.filePath) return "";
                const ext = tab.filePath.split(".").pop()?.toLowerCase();
                if (ext === "ts" || ext === "tsx") return "text-[#3178C6]";
                if (ext === "js" || ext === "jsx") return "text-[#F7DF1E]";
                if (ext === "css" || ext === "scss") return "text-[#1572B6]";
                if (ext === "json") return "text-[#6D9B37]";
                if (ext === "html") return "text-[#E44D26]";
                if (ext === "md") return "text-[#FF6B35]";
                return "text-[#888]";
              };

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id)}
                  className={`group relative flex items-center gap-2 min-w-[140px] px-4 py-3 text-[13px] transition-colors ${
                    isActive
                      ? isDark ? "bg-[#181818] text-[#E8E8E5]" : "bg-white text-[#1A1A1A]"
                      : isDark ? "text-[#858585] hover:text-[#CCCCCC] hover:bg-[#181818]/50" : "text-[#B4B4B0] hover:text-[#787774] hover:bg-white/50"
                  }`}
                >
                  {/* Active tab top border */}
                  {isActive && (
                    <span className={`absolute top-0 left-0 right-0 h-[2px] ${isDark ? "bg-[#E8E8E5]" : "bg-[#1A1A1A]"}`} />
                  )}
                  {/* Icon */}
                  {tab.type === "preview" && <Eye className="h-4 w-4" />}
                  {tab.type === "mcp" && <Zap className="h-4 w-4" />}
                  {tab.type === "tasks" && <CheckSquare className="h-4 w-4" />}
                  {tab.type === "marketplace" && <Package className="h-4 w-4" />}
                  {tab.type === "design" && <Palette className="h-4 w-4" />}
                  {tab.type === "settings" && <Settings className="h-4 w-4" />}
                  {tab.type === "editor" && <FileCode className={`h-4 w-4 ${getEditorIconColor()}`} />}
                  {/* Label */}
                  <span className="max-w-[120px] truncate flex-1">{tab.label}</span>
                  {/* Modified indicator */}
                  {isDirty && (
                    <span className="flex-shrink-0 h-2 w-2 rounded-full bg-white" />
                  )}
                  {/* Close button — pushed to right edge */}
                  {tab.id !== "preview" && (
                    <span
                      onClick={(e) => { e.stopPropagation(); closeMainTab(tab.id); }}
                      className={`flex-shrink-0 ml-auto rounded-md p-1 transition-opacity ${
                        isActive ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-50 hover:!opacity-100"
                      } ${isDark ? "hover:bg-[#555]" : "hover:bg-[#DDDDD9]"}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
            <div className="flex-1" />
          </div>

          {/* Tab content */}
          <div className={`relative flex-1 overflow-hidden ${!hasSources ? (isDark ? "bg-[#181818]" : "bg-white") : ""}`}>
            {/* Preview tab */}
            <div className={activeMainTab === "preview" ? "h-full relative" : "hidden"}>
              {/* Home button removed */}
              {!hasSources ? (
                showTemplateSelector ? (
                  <TemplateSelector
                    onSelect={handleTemplateSelect}
                    onBack={() => setShowTemplateSelector(false)}
                    isDark={isDark}
                  />
                ) : scaffoldingStarted ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 animate-fade-in">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#444] to-[#2A2A2A]">
                      <Loader2 className="h-6 w-6 animate-spin text-[#E8E8E5]" />
                    </div>
                    <div className="text-center">
                      <p className={`text-[16px] font-semibold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>Scaffolding your project...</p>
                      <p className={`mt-1 text-[13px] ${isDark ? "text-[#777]" : "text-[#9A9A95]"}`}>Check the chat panel for progress</p>
                    </div>
                  </div>
                ) : (
                <EmptyWorkspace
                  onLocal={handleConnectLocal}
                  onNewProject={() => setShowTemplateSelector(true)}
                  onMCPConnect={(adapterId) => setMcpDetailServer(adapterId)}
                  onAddMCP={() => setShowAddMCPModal(true)}
                  mcpServers={mcpStore.servers.map((s) => ({
                    adapterId: s.adapterId, name: s.name, icon: s.icon,
                    connected: s.connected, connecting: s.connecting,
                    toolCount: s.toolCount, error: s.error,
                  }))}
                  isDark={isDark}
                />
                )
              ) : (hasLocalFiles || devServerReady) ? (
                <div className="relative h-full">
                  <PreviewFrame
                    url={(agentStore.devServerUrl || electronAgent.devServerUrl) ?? "about:blank"}
                    framework={agentStore.devServerFramework || electronAgent.devServerFramework}
                    onFixWithAI={(errorMsg) => {
                      // Switch to chat tab
                      setActiveIconTab("chat");
                      if (sidebarCollapsed) setSidebarCollapsed(false);
                      // Add error as user message — ChatHistoryPanel will pick it up
                      setChatMessages((prev) => [
                        ...prev,
                        { role: "user", content: `Fix this dev server error:\n\n${errorMsg}`, id: crypto.randomUUID(), timestamp: Date.now() },
                      ]);
                    }}
                  />
                  {!agentStore.inspectedElement && !agentStore.selectedFilePath && chatMessages.length === 0 && devServerReady && (
                    <PreviewHint />
                  )}
                  {/* Properties panel moved to sidebar tab */}
                </div>
              ) : null}
            </div>

            {/* MCP Servers tab — modal design as page */}
            {mainTabs.some(t2 => t2.id === "mcp") && (
              <div key={activeMainTab === "mcp" ? "mcp-active" : "mcp"} className={activeMainTab === "mcp" ? "h-full overflow-y-auto animate-tab-fade-in" : "hidden"}>
                <div className={`${isDark ? "bg-[#181818]" : "bg-white"} h-full`}>
                  {/* Same card grid as modal — enlarged version */}
                  <div className="max-w-3xl mx-auto px-8 py-10">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className={`h-5 w-5 ${t.textSub}`} />
                      <h2 className={`text-[22px] font-bold ${t.textHeading}`}>MCP Servers</h2>
                    </div>
                    <p className={`text-[14px] ${t.textMuted} mb-8`}>Connect external tools and services to supercharge your AI agent.</p>

                    <div className="grid grid-cols-2 gap-2.5">
                      {WORKSPACE_MCP_SERVERS.map((ws) => {
                        const srv = mcpStore.servers.find(s => s.adapterId === ws.id);
                        const isConnected = srv?.connected ?? false;
                        const isConnecting = srv?.connecting ?? false;
                        const toolCount = srv?.toolCount ?? 0;
                        const error = srv?.error ?? null;
                        const brandColor = MCP_COLOR_MAP[ws.id];
                        return (
                          <button
                            key={ws.id}
                            onClick={() => isConnected ? setMcpDetailServer(ws.id) : handleMCPConnect(ws.id)}
                            className={`group flex items-center gap-3.5 rounded-2xl px-4 py-4 text-left transition-all duration-150 active:scale-[0.98] ${
                              isDark ? "bg-[#151515] hover:bg-[#2A2A2A]" : "bg-[#F7F7F5] hover:bg-[#F0F0EE]"
                            }`}
                          >
                            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                              error ? (isDark ? "bg-red-500/10" : "bg-red-100/60") : brandColor ? (isDark ? "bg-[#333]" : `${brandColor.light.bg}`) : (isDark ? "bg-[#333]" : "bg-[#EEEEEC]")
                            }`}>
                              {isConnecting ? <Loader2 className="h-5 w-5 animate-spin text-[#9A9A95]" />
                                : <img src={ws.logo} alt={ws.name} className={`h-6 w-6 ${!isConnected ? "opacity-60" : ""}`} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[14px] font-bold ${t.text}`}>{ws.name}</p>
                              <p className={`mt-0.5 text-[12px] leading-snug ${error ? "text-red-400" : t.textMuted}`}>
                                {error ?? (isConnected ? `Connected · ${toolCount} tools` : ws.desc)}
                              </p>
                            </div>
                            {isConnected ? (
                              <div
                                role="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  mcpStore.setDisconnected(ws.id);
                                  if (ws.id === "figma") disconnectFigma();
                                  else if (ws.id === "github") disconnectGitHub();
                                }}
                                className="flex-shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-red-400 ring-1 ring-red-400/20 transition-colors hover:bg-red-500/10 hover:ring-red-400/40"
                              >
                                Disconnect
                              </div>
                            ) : (
                              <span className={`flex-shrink-0 text-[11px] font-medium ${t.textMuted}`}>Connect</span>
                            )}
                          </button>
                        );
                      })}

                      {/* + Custom */}
                      <button
                        onClick={() => setShowAddMCPModal(true)}
                        className={`group flex items-center gap-3.5 rounded-2xl border-2 border-dashed px-4 py-4 text-left transition-all duration-150 active:scale-[0.98] ${
                          isDark ? "border-[#333] hover:bg-[#232323] hover:border-[#444]" : "border-[#D8D8D4] hover:bg-[#F5F5F3]"
                        }`}
                      >
                        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${isDark ? "bg-[#333]" : "bg-[#F0F0EE]"}`}>
                          <Plus className={`h-5 w-5 ${t.textMuted} transition-transform group-hover:rotate-90`} />
                        </div>
                        <div>
                          <p className={`text-[14px] font-bold ${t.textSub}`}>Custom MCP</p>
                          <p className={`mt-0.5 text-[12px] ${t.textMuted}`}>Connect any MCP endpoint</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks tab — Notion style */}
            {mainTabs.some(t2 => t2.id === "tasks") && (
              <div key={activeMainTab === "tasks" ? "tasks-active" : "tasks"} className={activeMainTab === "tasks" ? "h-full overflow-y-auto animate-tab-fade-in" : "hidden"}>
                <div className={`${isDark ? "bg-[#181818]" : "bg-white"} h-full`}>
                  <div className="max-w-3xl mx-auto px-8 py-10">
                    {/* Notion-style large title */}
                    <h1 className={`text-[32px] font-bold ${t.textHeading} mb-1`}>Tasks</h1>
                    <p className={`text-[15px] ${t.textMuted} mb-8`}>Tasks and to-dos generated from AI sessions</p>

                    {/* Empty state — Notion block style */}
                    <div className={`rounded-lg ${isDark ? "hover:bg-[#2A2A2A]" : "hover:bg-[#F7F7F5]"} transition-colors px-1 py-3 cursor-text`}>
                      <p className={`text-[15px] ${t.textMuted}`}>Type your first task here...</p>
                    </div>

                    <div className={`mt-6 h-px ${isDark ? "bg-[#333]" : "bg-[#F0F0EE]"}`} />

                    {/* Example tasks (empty state guide) */}
                    <div className="mt-6 space-y-1">
                      <p className={`text-[12px] font-medium uppercase tracking-wider ${t.textMuted} mb-3 px-1`}>Recent AI Sessions</p>
                      {chatMessages.filter(m => m.role === "assistant").slice(-3).map((msg, i) => (
                        <div key={i} className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${isDark ? "hover:bg-[#232323]" : "hover:bg-[#F7F7F5]"} transition-colors`}>
                          <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${isDark ? "border-[#444]" : "border-[#D4D4D0]"}`}>
                            <Check className={`h-3 w-3 ${t.textMuted}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[14px] ${t.text} line-clamp-1`}>{msg.content.split("\n")[0].slice(0, 60)}</p>
                            <p className={`text-[12px] ${t.textMuted} mt-0.5`}>
                              {(msg as Record<string, unknown>).timestamp ? new Date((msg as Record<string, unknown>).timestamp as number).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                              {(msg as Record<string, unknown>).duration ? ` · ${(((msg as Record<string, unknown>).duration as number) / 1000).toFixed(1)}s` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                      {chatMessages.filter(m => m.role === "assistant").length === 0 && (
                        <div className={`flex items-center gap-3 rounded-lg px-3 py-8 ${isDark ? "bg-[#151515]" : "bg-[#F7F7F5]"}`}>
                          <div className="flex-1 text-center">
                            <CheckSquare className={`mx-auto h-8 w-8 ${t.textMuted} mb-3`} />
                            <p className={`text-[14px] font-medium ${t.textSub}`}>No tasks yet</p>
                            <p className={`text-[13px] ${t.textMuted} mt-1`}>Tasks will appear here when you make requests to AI in chat</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Marketplace tab — real open-source Skills & Plugins */}
            {mainTabs.some(t2 => t2.id === "marketplace") && (
              <div key={activeMainTab === "marketplace" ? "market-active" : "market"} className={activeMainTab === "marketplace" ? "h-full overflow-y-auto animate-tab-fade-in" : "hidden"}>
                <SkillsMarketplace isDark={isDark} t={t} />
              </div>
            )}

            {/* Design System tab */}
            {mainTabs.some(t2 => t2.id === "design") && (
              <div key={activeMainTab === "design" ? "design-active" : "design"} className={activeMainTab === "design" ? "h-full overflow-y-auto animate-tab-fade-in" : "hidden"}>
                <div className={`${isDark ? "bg-[#181818]" : "bg-white"} h-full`}>
                  <DesignSystemDashboard />
                </div>
              </div>
            )}

            {/* Settings tab — Claude-style layout */}
            {mainTabs.some(t2 => t2.id === "settings") && (
              <div key={activeMainTab === "settings" ? "settings-active" : "settings"} className={activeMainTab === "settings" ? "h-full overflow-y-auto animate-tab-fade-in" : "hidden"}>
                <SettingsPage
                  isDark={isDark}
                  t={t}
                  workspace={workspace}
                  agentStore={agentStore}
                  electronAgent={electronAgent}
                  onDisconnectFigma={() => disconnectFigma()}
                  onConnectFigma={() => setShowFigmaModal(true)}
                  onDisconnectLocal={() => { disconnectLocal(); setConnected(false); setFileTree([]); }}
                  onConnectLocal={() => handleConnectLocal()}
                  onDisconnectGitHub={() => disconnectGitHub()}
                  onHome={() => goHome()}
                  mcpStore={mcpStore}
                  onMCPConnect={(id) => handleMCPConnect(id)}
                  onMCPDisconnect={(id) => { mcpStore.setDisconnected(id); if (id === "figma") disconnectFigma(); else if (id === "github") disconnectGitHub(); }}
                />
              </div>
            )}

            {/* Editor tabs */}
            {mainTabs.filter(t2 => t2.type === "editor").map((tab) => (
              <div key={tab.id} className={activeMainTab === tab.id ? "h-full flex flex-col animate-tab-fade-in" : "hidden"}>
                <div className={`flex-1 overflow-hidden ${isDark ? "bg-[#181818]" : "bg-white"}`}>
                  {editorContents[tab.filePath!] !== undefined ? (
                    <div className="h-full flex flex-col">
                      {/* Editor toolbar */}
                      <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? "border-[#333] bg-[#252525]" : "border-[#E0E0DC] bg-[#F7F7F5]"}`}>
                        <div className="flex items-center gap-2">
                          <FileCode className={`h-3.5 w-3.5 ${isDark ? "text-[#9A9A95]" : "text-[#787774]"}`} />
                          <span className={`text-[12px] font-medium ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>{tab.filePath}</span>
                          {editorDirty.has(tab.filePath!) && (
                            <span className="h-2 w-2 rounded-full bg-amber-400" title="Unsaved changes" />
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            if (tab.filePath && agentStore.writeFileFn && editorContents[tab.filePath]) {
                              await agentStore.writeFileFn(tab.filePath, editorContents[tab.filePath]);
                              agentStore.setLastWrite();
                              setEditorDirty(prev => { const n = new Set(prev); n.delete(tab.filePath!); return n; });
                            }
                          }}
                          disabled={!editorDirty.has(tab.filePath!)}
                          className={`rounded-lg px-3 py-1 text-[11px] font-medium transition-colors disabled:opacity-30 ${
                            isDark ? "bg-[#E8E8E5] text-[#1A1A1A] hover:bg-white" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                          }`}
                        >
                          Save
                        </button>
                      </div>
                      {/* Code editor with syntax highlighting */}
                      <SyntaxEditor
                        filePath={tab.filePath!}
                        value={editorContents[tab.filePath!] ?? ""}
                        onChange={(val) => {
                          setEditorContents(prev => ({ ...prev, [tab.filePath!]: val }));
                          setEditorDirty(prev => new Set(prev).add(tab.filePath!));
                        }}
                        onSave={() => {
                          if (tab.filePath && agentStore.writeFileFn && editorContents[tab.filePath]) {
                            agentStore.writeFileFn(tab.filePath, editorContents[tab.filePath]);
                            agentStore.setLastWrite();
                            setEditorDirty(prev => { const n = new Set(prev); n.delete(tab.filePath!); return n; });
                          }
                        }}
                        isDark={isDark}
                      />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className={`h-5 w-5 animate-spin ${isDark ? "text-[#555]" : "text-[#B4B4B0]"}`} />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Floating chat when sidebar collapsed */}
            {sidebarCollapsed && hasSources && activeMainTab === "preview" && (
              <FloatingChatBar
                projectId={workspace.id}
                mode={workspace.local ? "local" : "cloud"}
                githubOwner={workspace.github?.owner ?? ""}
                githubRepo={workspace.github?.repo ?? ""}
                messages={chatMessages}
                setMessages={setChatMessages}
                onOpenAdd={() => { setSidebarCollapsed(false); setActiveIconTab("chat"); }}
              />
            )}
          </div>
        </div>

        {/* Right panel — Terminal & Tools */}
        {rightPanelOpen && (
          <div className={`flex-shrink-0 flex flex-col border-l ${isDark ? "border-[#333] bg-[#1E1E1E]" : "border-[#E0E0DC] bg-[#F7F7F5]"} animate-tab-slide-in`} style={{ width: 360 }}>
            {/* Panel tabs */}
            <div className={`flex items-center border-b ${isDark ? "border-[#333]" : "border-[#E0E0DC]"}`}>
              <button
                onClick={() => setRightPanelTab("terminal")}
                className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-colors ${
                  rightPanelTab === "terminal"
                    ? isDark ? "text-[#E8E8E5] border-b-2 border-[#E8E8E5]" : "text-[#1A1A1A] border-b-2 border-[#1A1A1A]"
                    : isDark ? "text-[#666] hover:text-[#9A9A95]" : "text-[#B4B4B0] hover:text-[#787774]"
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                Terminal
              </button>
              <button
                onClick={() => setRightPanelTab("properties")}
                className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-colors ${
                  rightPanelTab === "properties"
                    ? isDark ? "text-[#E8E8E5] border-b-2 border-[#E8E8E5]" : "text-[#1A1A1A] border-b-2 border-[#1A1A1A]"
                    : isDark ? "text-[#666] hover:text-[#9A9A95]" : "text-[#B4B4B0] hover:text-[#787774]"
                }`}
              >
                <Blocks className="h-3.5 w-3.5" />
                Properties
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setRightPanelOpen(false)}
                className={`mr-2 rounded p-1 ${isDark ? "text-[#666] hover:text-[#9A9A95] hover:bg-[#333]" : "text-[#B4B4B0] hover:text-[#787774] hover:bg-[#E0E0DC]"} transition-colors`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Terminal content */}
            {rightPanelTab === "terminal" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Server status — compact */}
                <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${isDark ? "border-[#222] bg-[#0D0D0D]" : "border-[#E0E0DC]"}`}>
                  <span className="text-[10px] font-mono text-emerald-500">$</span>
                  <span className="text-[10px] font-mono text-[#888]">
                    {agentStore.devServerUrl ? agentStore.devServerUrl.replace("http://", "") : "~"}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => setRightTerminalLogs([])}
                    className="text-[9px] text-[#444] hover:text-[#888] transition-colors"
                  >
                    clear
                  </button>
                </div>
                {/* Logs — Cursor terminal style */}
                <div ref={rightTerminalRef} className={`flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-[1.7] ${isDark ? "bg-[#0D0D0D]" : "bg-white"}`}>
                  {rightTerminalLogs.length === 0 ? (
                    <span className="text-[#444]">
                      <span className="text-emerald-500">$</span> waiting for output...
                    </span>
                  ) : (
                    rightTerminalLogs.slice(-80).map((log, i) => {
                      const clean = log.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
                      // Color-code log lines
                      let color = "#888";
                      if (/\[info\]/.test(clean)) color = "#569CD6";
                      else if (/\[warn\]/.test(clean)) color = "#D7BA7D";
                      else if (/\[error\]|Error|EADDRINUSE|failed/i.test(clean)) color = "#F44747";
                      else if (/✓|Compiled|Ready|success/i.test(clean)) color = "#6A9955";
                      else if (/^>/.test(clean)) color = "#9CDCFE";
                      else if (/localhost:\d+/.test(clean)) color = "#4EC9B0";
                      return (
                        <div key={i} className="whitespace-pre-wrap break-all" style={{ color }}>{clean}</div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Properties content */}
            {rightPanelTab === "properties" && (
              <PropertiesPanel
                isDark={isDark}
                element={agentStore.inspectedElement}
                onApplyStyle={(prop, val) => {
                  if (!agentStore.inspectedElement) return;
                  const iframe = document.querySelector<HTMLIFrameElement>("iframe[title='Dev Server Preview']");
                  if (iframe?.contentWindow) {
                    iframe.contentWindow.postMessage({
                      type: "meld:apply-style",
                      selector: agentStore.inspectedElement.selector,
                      property: prop,
                      value: val,
                    }, "*");
                  }
                }}
              />
            )}
          </div>
        )}
      </div>


      {/* Source Settings Modal */}
      {showSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowSourceModal(false)}>
          <div className="w-full max-w-lg animate-scale-in rounded-3xl bg-white shadow-2xl ring-1 ring-black/[0.06]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F0F0EE] px-6 py-5">
              <h2 className="text-[18px] font-bold text-[#1A1A1A]">Sources</h2>
              <button onClick={() => setShowSourceModal(false)} className="rounded-lg p-1.5 text-[#B4B4B0] hover:bg-[#F5F5F4] hover:text-[#787774] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sources list */}
            <div className="p-4 space-y-2">
              {/* Figma */}
              <div className="flex items-center gap-4 rounded-2xl p-4 ring-1 ring-black/[0.04]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7F7F5]">
                  <Figma className="h-5 w-5 text-[#787774]" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#1A1A1A]">Figma</p>
                  {workspace.figma?.connected ? (
                    <p className="text-[12px] text-[#787774]">{workspace.figma.fileName}</p>
                  ) : (
                    <p className="text-[12px] text-[#B4B4B0]">Not connected</p>
                  )}
                </div>
                {workspace.figma?.connected ? (
                  <button onClick={() => { disconnectFigma(); }} className="rounded-xl px-4 py-2 text-[12px] font-semibold text-[#DC2626] ring-1 ring-[#FEE2E2] hover:bg-[#FEF2F2] transition-colors">
                    Disconnect
                  </button>
                ) : (
                  <button onClick={() => { setShowSourceModal(false); setShowFigmaModal(true); }} className="rounded-xl bg-[#1A1A1A] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#333] transition-colors">
                    Connect
                  </button>
                )}
              </div>

              {/* Local Folder */}
              <LocalFolderCard
                connected={!!workspace.local?.connected}
                projectName={agentStore.projectName}
                devServerUrl={agentStore.devServerUrl || electronAgent.devServerUrl}
                onDisconnect={() => { disconnectLocal(); setConnected(false); setFileTree([]); }}
                onChange={() => { setShowSourceModal(false); handleConnectLocal(); }}
                onConnect={() => { setShowSourceModal(false); handleConnectLocal(); }}
              />

              {/* GitHub */}
              <div className="flex items-center gap-4 rounded-2xl p-4 ring-1 ring-black/[0.04]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7F7F5]">
                  <Github className="h-5 w-5 text-[#787774]" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#1A1A1A]">GitHub</p>
                  {workspace.github?.connected ? (
                    <p className="text-[12px] text-[#787774]">{workspace.github.owner}/{workspace.github.repo}</p>
                  ) : (
                    <p className="text-[12px] text-[#B4B4B0]">Not connected</p>
                  )}
                </div>
                {workspace.github?.connected ? (
                  <button onClick={() => { disconnectGitHub(); }} className="rounded-xl px-4 py-2 text-[12px] font-semibold text-[#DC2626] ring-1 ring-[#FEE2E2] hover:bg-[#FEF2F2] transition-colors">
                    Disconnect
                  </button>
                ) : (
                  <button className="rounded-xl bg-[#1A1A1A] px-4 py-2 text-[12px] font-semibold text-white opacity-50 cursor-not-allowed">
                    Coming soon
                  </button>
                )}
              </div>
            </div>

            {/* Meld AI */}
            <div className="border-t border-[#F0F0EE] p-4">
              <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-[#B4B4B0]">AI</p>
              <MeldAiStatus />
            </div>

            {/* Dashboard link */}
            <div className="border-t border-[#F0F0EE] p-4">
              <button
                onClick={() => { setShowSourceModal(false); goHome(); }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-[#F7F7F5]"
              >
                <ArrowLeft className="h-4 w-4 text-[#787774]" />
                <span className="text-[13px] font-medium text-[#787774]">Home</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showMCPHub && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowMCPHub(false)} />
          <div className="fixed inset-x-0 top-0 bottom-0 z-50 flex items-center justify-center p-8" onClick={() => setShowMCPHub(false)}>
            <div className="w-full max-w-2xl animate-scale-in rounded-2xl bg-[#1E1E1E] shadow-2xl ring-1 ring-white/[0.08]" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-[#333] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[16px] font-bold text-[#E8E8E5]">Connectors</h2>
                  <button onClick={() => setShowMCPHub(false)} className="rounded-md p-1.5 text-[#555] hover:text-[#9A9A95] hover:bg-[#333] transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-[12px] text-[#777]">Connect external services to AI. Connected tools let AI directly query and use their data.</p>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-2">
                  {WORKSPACE_MCP_SERVERS.map((s) => {
                    const srv = mcpStore.getServer(s.id);
                    const isConnected = srv?.connected ?? false;
                    const isConnecting = srv?.connecting ?? false;
                    return (
                      <div
                        key={s.id}
                        className="group flex items-start gap-3 rounded-xl px-4 py-3.5 transition-colors hover:bg-[#333] cursor-pointer"
                        onClick={() => { if (!isConnecting) { setShowMCPHub(false); setMcpDetailServer(s.id); } }}
                      >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#2A2A2A] group-hover:bg-[#3A3A3A]">
                          <img src={s.logo} alt={s.name} className={`h-4 w-4 ${isConnected ? "" : "opacity-50"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold text-[#E8E8E5]">{s.name}</p>
                            {isConnected && <span className="text-[9px] font-medium text-[#16A34A]">Connected</span>}
                            {isConnecting && <span className="text-[9px] font-medium text-[#9A9A95]">Connecting...</span>}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#777]">{s.desc}</p>
                        </div>
                        {isConnecting ? (
                          <Loader2 className="mt-1 h-4 w-4 flex-shrink-0 animate-spin text-[#9A9A95]" />
                        ) : !isConnected && (
                          <span className="mt-0.5 flex-shrink-0 rounded-md bg-[#333] px-2 py-1 text-[10px] font-medium text-[#E8E8E5] group-hover:bg-[#444]">+</span>
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
      {mcpDetailServer && (
        <MCPDetailModal
          adapterId={mcpDetailServer}
          connected={mcpStore.isConnected(mcpDetailServer)}
          connecting={mcpStore.getServer(mcpDetailServer)?.connecting ?? false}
          toolCount={mcpStore.getServer(mcpDetailServer)?.toolCount ?? 0}
          userServices={userServices}
          onConnect={() => {
            const preset = MCP_PRESETS.find((p) => p.id === mcpDetailServer);
            setMcpDetailServer(null);

            // Already logged-in service -> connect MCP directly
            if (userServices[mcpDetailServer]) {
              handleMCPConnect(mcpDetailServer);
              return;
            }
            // OAuth service -> redirect to login page (pass current page via redirect_to)
            if (preset?.auth === "oauth" && preset.authUrl) {
              const currentPath = window.location.pathname + window.location.search;
              const prefix = window.electronAgent ? "electron:" : "";
              const authUrl = `${preset.authUrl}?redirect_to=${encodeURIComponent(prefix + currentPath)}`;
              if (window.electronAgent?.openExternalAuth) {
                window.electronAgent.openExternalAuth(`${window.location.origin}${authUrl}`);
                pollOAuthCompletion(mcpDetailServer);
              } else {
                window.location.href = authUrl;
              }
              return;
            }
            // Token input required
            setMcpTokenModal({ adapterId: mcpDetailServer, name: preset?.name ?? mcpDetailServer, hint: preset?.hint ?? "" });
          }}
          onDisconnect={() => {
            mcpStore.setDisconnected(mcpDetailServer);
            if (mcpDetailServer === "figma") disconnectFigma();
            else if (mcpDetailServer === "github") disconnectGitHub();
            setMcpDetailServer(null);
          }}
          onClose={() => setMcpDetailServer(null)}
          onOAuthLogin={(service) => pollOAuthCompletion(service)}
        />
      )}
      {showFigmaModal && (
        <FigmaModal
          onConnect={handleFigmaMCPConnect}
          onClose={() => setShowFigmaModal(false)}
        />
      )}
      {showGitHubModal && (
        <GitHubModal
          onConnect={handleGitHubMCPConnect}
          onClose={() => setShowGitHubModal(false)}
        />
      )}
      {showAddMCPModal && (
        <AddMCPModal
          onAdd={async (config) => {
            // 1. Register custom adapter (server-side)
            try {
              await mcpRegisterMutation.mutateAsync({ ...config, description: `Custom MCP: ${config.name}` });
            } catch { /* Ignore registration failure — will retry on connect */ }
            // 2. Add to store + connect
            mcpStore.addServer({ adapterId: config.id, name: config.name, icon: "plug", category: "custom" });
            setShowAddMCPModal(false);
            await handleMCPConnect(config.id);
          }}
          onClose={() => setShowAddMCPModal(false)}
        />
      )}
      {mcpTokenModal && (
        <MCPTokenModal
          serverName={mcpTokenModal.name}
          authHint={mcpTokenModal.hint}
          onConnect={async (token) => {
            setMcpTokenModal(null);
            await handleMCPConnect(mcpTokenModal.adapterId, token);
          }}
          onClose={() => setMcpTokenModal(null)}
        />
      )}
      {/* MCP connecting modal */}
      {mcpConnecting && (() => {
        const preset = MCP_PRESETS.find((p) => p.id === mcpConnecting);
        return (
          <MCPConnectingModal
            serverName={preset?.name ?? mcpConnecting}
            logo={MCP_LOGO_MAP[mcpConnecting]}
            onCancel={() => setMcpConnecting(null)}
          />
        );
      })()}
      {/* MCP connection success modal */}
      {mcpJustConnected && (() => {
        const preset = MCP_PRESETS.find((p) => p.id === mcpJustConnected);
        const srv = mcpStore.getServer(mcpJustConnected);
        return (
          <MCPConnectedModal
            serverName={preset?.name ?? mcpJustConnected}
            logo={MCP_LOGO_MAP[mcpJustConnected]}
            toolCount={srv?.toolCount ?? 0}
            onClose={() => setMcpJustConnected(null)}
          />
        );
      })()}
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1A1A]">
            <Blend className="h-5 w-5 text-white" />
          </div>
          <Loader2 className="h-4 w-4 animate-spin text-[#787774]" />
        </div>
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}
