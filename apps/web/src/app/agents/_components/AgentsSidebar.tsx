"use client";

// AgentsSidebar — 260px left sidebar that mirrors the /projects sidebar
// verbatim so the agents area feels like the same app shell. Only the
// active-state logic and menu items are adapted:
//   - "New Project" navigates to /projects?tab=new
//   - "Agents" is the active item
//   - "+ New agent" button opens the conversational drawer (via onNewAgent)
//
// The visual language (colors, border-radius, rings, typography) is copied
// from apps/web/src/app/projects/page.tsx lines 199-363.

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Plus,
  Bot,
  ChevronDown,
  SlidersHorizontal,
  MonitorSmartphone,
  Check,
  Play,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Blend,
  MoreVertical,
  GripVertical,
  Trash2,
  Pencil,
} from "lucide-react";
import { useThemePref } from "@/lib/hooks/useThemePref";

export interface AgentsSidebarProps {
  /**
   * Called when the user clicks the "+ New agent" button in the sidebar.
   * Typically opens the conversational drawer. If omitted, the sidebar
   * navigates to /agents?new=1 as a fallback (useful on non-/agents pages).
   */
  onNewAgent?: () => void;

  /**
   * Recent agents shown under "Recent agents". If omitted, the sidebar
   * will fetch the list itself via /api/harness/agents. Pass explicitly
   * from the /agents page so the list stays in sync with the main view.
   */
  recentAgents?: Array<{ id: string; name: string; updatedAt: string }>;

  /**
   * Called when the user clicks a recent agent. When set, the sidebar
   * fires this callback instead of navigating to /agents?run={id}, so
   * the parent page can open the inline RunChatDrawer.
   */
  onRunAgent?: (agentId: string) => void;

  /** ID of the currently running agent — highlights the matching row. */
  activeAgentId?: string | null;
}

interface MeInfo {
  githubUsername?: string;
  plan?: string;
}

type RecentAgent = { id: string; name: string; updatedAt: string };
type RecentProject = {
  id: string;
  name: string;
  firstPrompt: string | null;
  lastOpenedAt: string;
};

export function AgentsSidebar({
  onNewAgent,
  recentAgents,
  onRunAgent,
  activeAgentId,
}: AgentsSidebarProps) {
  const { isDark, toggle: toggleTheme, mounted } = useThemePref();
  const pathname = usePathname();
  // Which top-level section does the current URL belong to?
  const onAgentsPage = pathname?.startsWith("/agents") ?? false;
  const onProjectsPage =
    (pathname?.startsWith("/projects") ?? false) ||
    (pathname?.startsWith("/project/") ?? false);
  const onIntegrationsPage = pathname?.startsWith("/integrations") ?? false;
  // Agents menu is "active" when we're on an agents route AND no agent is
  // currently being run (the run drawer takes over highlighting in that case).
  const agentsMenuActive = onAgentsPage && !activeAgentId;
  const [wsDropdown, setWsDropdown] = useState(false);
  const [me, setMe] = useState<MeInfo | null>(null);
  // Collapsible sections. Default open on the matching page so history
  // is immediately visible where it's most relevant.
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [agentsOpen, setAgentsOpen] = useState(true);
  // Whole-sidebar collapse toggle (icon-only rail). Persisted so the
  // state survives navigation between pages.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("meld-sidebar-collapsed");
      if (stored === "1") setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("meld-sidebar-collapsed", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };
  const [fetchedAgents, setFetchedAgents] = useState<RecentAgent[]>([]);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [contextMenu, setContextMenu] = useState<{ id: string; type: "project" | "agent" } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/workspace/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        setRecentProjects((prev) => prev.filter((p) => p.id !== projectId));
      }
    } catch { /* ignore */ }
    setContextMenu(null);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  // Recent projects live on the server now — fetch them on mount, on
  // pathname change (so navigating back from workspace shows the new
  // project), on window focus, and whenever the workspace page dispatches
  // the `workspaceProjectCreated` custom event.
  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/workspace/projects");
      if (!res.ok) return;
      const data = (await res.json()) as {
        projects?: Array<{
          id: string;
          name: string;
          firstPrompt: string | null;
          lastOpenedAt: string;
        }>;
      };
      setRecentProjects(data.projects ?? []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const onFocus = () => void fetchProjects();
    const onCreated = () => void fetchProjects();
    window.addEventListener("focus", onFocus);
    window.addEventListener("workspaceProjectCreated", onCreated);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("workspaceProjectCreated", onCreated);
    };
  }, []);

  // Auto-fetch recent agents when the parent page didn't supply them.
  // The /agents page passes its own list so it stays in sync with the
  // main dashboard; other pages (/projects, etc.) rely on this fetch.
  const shouldFetchAgents = recentAgents === undefined;
  useEffect(() => {
    if (!shouldFetchAgents) return;
    void (async () => {
      try {
        const res = await fetch("/api/harness/agents");
        if (!res.ok) return;
        const data = (await res.json()) as {
          agents?: Array<{ id: string; name: string; updatedAt: string }>;
        };
        setFetchedAgents(data.agents ?? []);
      } catch {
        // ignore
      }
    })();
  }, [shouldFetchAgents]);

  const effectiveRecentAgents: RecentAgent[] = recentAgents ?? fetchedAgents;

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setMe({
            githubUsername: data.user?.githubUsername ?? "",
            plan: data.user?.plan ?? "free",
          });
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  if (!mounted) {
    // Match width + bg so the content area doesn't jump during hydration.
    return <div className="flex flex-shrink-0 flex-col" style={{ width: collapsed ? 64 : 260 }} />;
  }

  const displayName = me?.githubUsername || "User";
  const plan = me?.plan ?? "free";
  const planLabel = plan === "pro" ? "Pro" : plan === "unlimited" ? "Unlimited" : "Free";
  const planBadge = plan === "pro" ? "PRO" : plan === "unlimited" ? "MAX" : "FREE";

  // ─── Collapsed (icon-only rail) ─────────────────────
  // Kept as a separate block but rendered inside the same outer wrapper
  // shape so the width transition feels continuous. Outer wrapper ALWAYS
  // has the same className shape — only the width style and the inner
  // contents change, which lets CSS transition the width smoothly.
  if (collapsed) {
    return (
      <div
        className={`relative flex flex-shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isDark ? "bg-[#181818]" : "bg-white"
        }`}
        style={{ width: 64 }}
      >
        {/* Expand toggle */}
        <div className="flex items-center justify-center pb-3 pt-5">
          <button
            onClick={toggleCollapsed}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              isDark
                ? "text-[#666] hover:bg-white/[0.06] hover:text-white"
                : "text-[#999] hover:bg-black/[0.05] hover:text-[#1A1A1A]"
            }`}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>

        {/* Icon-only nav */}
        <div className="flex flex-col items-center gap-1 px-2">
          <button
            onClick={() => (window.location.href = "/projects")}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              onProjectsPage
                ? isDark
                  ? "bg-white/[0.08] text-[#E8E8E5]"
                  : "bg-black/[0.05] text-[#1A1A1A]"
                : isDark
                  ? "text-[#888] hover:bg-white/[0.06] hover:text-[#ccc]"
                  : "text-[#787774] hover:bg-black/[0.04] hover:text-[#1A1A1A]"
            }`}
            aria-label="Projects"
            title="Projects"
          >
            <FolderOpen className="h-4 w-4" />
          </button>
          <button
            onClick={() => (window.location.href = "/agents")}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              agentsMenuActive
                ? isDark
                  ? "bg-white/[0.08] text-[#E8E8E5]"
                  : "bg-black/[0.05] text-[#1A1A1A]"
                : isDark
                  ? "text-[#888] hover:bg-white/[0.06] hover:text-[#ccc]"
                  : "text-[#787774] hover:bg-black/[0.04] hover:text-[#1A1A1A]"
            }`}
            aria-label="Agents"
            title="Agents"
          >
            <Bot className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              window.location.href = "/agents";
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              isDark
                ? "text-[#888] hover:bg-white/[0.06] hover:text-[#ccc]"
                : "text-[#787774] hover:bg-black/[0.04] hover:text-[#1A1A1A]"
            }`}
            aria-label="New agent"
            title="New agent"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => (window.location.href = "/integrations")}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              onIntegrationsPage
                ? isDark
                  ? "bg-white/[0.08] text-[#E8E8E5]"
                  : "bg-black/[0.05] text-[#1A1A1A]"
                : isDark
                  ? "text-[#888] hover:bg-white/[0.06] hover:text-[#ccc]"
                  : "text-[#787774] hover:bg-black/[0.04] hover:text-[#1A1A1A]"
            }`}
            aria-label="Integrations"
            title="Integrations"
          >
            <Blend className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Bottom icon toolbar (collapsed) */}
        <div className="flex flex-col items-center gap-1 px-2 pb-4 pt-2">
          <button
            onClick={toggleTheme}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              isDark
                ? "text-[#555] hover:bg-white/[0.06] hover:text-[#999]"
                : "text-[#999] hover:bg-black/[0.04] hover:text-[#1A1A1A]"
            }`}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => (window.location.href = "/settings")}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              isDark
                ? "text-[#555] hover:bg-white/[0.06] hover:text-[#999]"
                : "text-[#999] hover:bg-black/[0.04] hover:text-[#1A1A1A]"
            }`}
            aria-label="Settings"
            title="Settings"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Active menu id is always "agents" on this sidebar.

  return (
    <div
      className={`relative flex flex-shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isDark
          ? "bg-[#181818]"
          : "bg-white"
      }`}
      style={{ width: 260 }}
    >
      {/* Wordmark + sidebar collapse — Claude Console style */}
      <div className="flex items-center justify-between px-5 pb-3 pt-2">
        <button
          onClick={() => (window.location.href = "/")}
          className={`font-serif text-[22px] leading-none tracking-[-0.01em] transition-colors ${
            isDark ? "text-white hover:text-white/90" : "text-[#1A1A1A] hover:text-[#333]"
          }`}
          aria-label="Home"
        >
          Meld
        </button>
        <button
          onClick={toggleCollapsed}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            isDark
              ? "text-[#666] hover:bg-white/[0.06] hover:text-white"
              : "text-[#999] hover:bg-black/[0.05] hover:text-[#1A1A1A]"
          }`}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Workspace selector */}
      <div className="relative px-3 py-1.5">
        <button
          onClick={() => setWsDropdown(!wsDropdown)}
          className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 transition-all ${
            isDark
              ? "border-[#3A3A3A] bg-transparent hover:border-[#4A4A4A]"
              : "border-[#E0E0E0] bg-transparent hover:border-[#CCC]"
          }`}
        >
          <span
            className={`flex-1 truncate text-left text-[13px] font-medium ${
              isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"
            }`}
          >
            {displayName}&apos;s Meld
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${
              wsDropdown ? "rotate-180" : ""
            } ${isDark ? "text-[#555]" : "text-[#999]"}`}
          />
        </button>

        {wsDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setWsDropdown(false)}
              aria-hidden
            />
            <div
              className={`absolute left-3 right-3 top-full z-50 mt-1 rounded-xl p-3 shadow-xl ${
                isDark ? "bg-[#222] ring-1 ring-white/[0.08]" : "bg-white ring-1 ring-black/[0.08]"
              }`}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <div>
                  <p
                    className={`text-[13px] font-bold ${
                      isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"
                    }`}
                  >
                    {displayName}&apos;s Meld
                  </p>
                  <p className={`text-[11px] ${isDark ? "text-[#666]" : "text-[#999]"}`}>
                    {planLabel} Plan · 1 member
                  </p>
                </div>
              </div>

              <p
                className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${
                  isDark ? "text-[#555]" : "text-[#999]"
                }`}
              >
                Workspace
              </p>
              <button
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all ${
                  isDark ? "bg-white/[0.06]" : "bg-black/[0.03]"
                }`}
              >
                <span
                  className={`flex-1 truncate text-left text-[12px] font-semibold ${
                    isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"
                  }`}
                >
                  {displayName}&apos;s Meld
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    isDark ? "bg-white/[0.06] text-[#888]" : "bg-black/[0.04] text-[#999]"
                  }`}
                >
                  {planBadge}
                </span>
                <Check
                  className={`h-3 w-3 ${isDark ? "text-[#888]" : "text-[#1A1A1A]"}`}
                />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Project section — workspace projects + their recent history */}
      <div className="mt-7 px-3">
        <p
          className={`mb-2.5 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${
            isDark ? "text-[#555]" : "text-[#999]"
          }`}
        >
          Project
        </p>
        {/* Projects row — click anywhere on the row just toggles the
            collapsible history. Navigation to a real page only happens
            via "New Project" below. */}
        <button
          type="button"
          onClick={() => setProjectsOpen((v) => !v)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition-all duration-300 ease-out ${
            onProjectsPage
              ? isDark
                ? "bg-white/[0.08] text-[#E8E8E5]"
                : "bg-black/[0.05] text-[#1A1A1A]"
              : isDark
                ? "text-[#888] hover:bg-white/[0.04] hover:text-[#ccc]"
                : "text-[#787774] hover:bg-black/[0.03] hover:text-[#1A1A1A]"
          }`}
          aria-expanded={projectsOpen}
        >
          <FolderOpen className="h-4 w-4" />
          <span className="flex-1 text-[13px]">Projects</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              isDark ? "text-[#666]" : "text-[#999]"
            } ${projectsOpen ? "" : "-rotate-90"}`}
          />
        </button>
        {/* Smooth collapse via grid-template-rows 0fr <-> 1fr trick.
            The inner <div> has min-height:0 + overflow:hidden so its
            contents clip cleanly while the row height animates. */}
        <div
          className="grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            gridTemplateRows: projectsOpen ? "1fr" : "0fr",
            opacity: projectsOpen ? 1 : 0,
          }}
          aria-hidden={!projectsOpen}
        >
          <div className="min-h-0 overflow-hidden">
            <button
              onClick={() => (window.location.href = "/projects?tab=new")}
              className={`mt-1.5 flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition-all duration-300 ease-out ${
                isDark
                  ? "text-[#888] hover:bg-white/[0.04] hover:text-[#ccc]"
                  : "text-[#787774] hover:bg-black/[0.03] hover:text-[#1A1A1A]"
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="flex-1 text-[13px]">New Project</span>
            </button>

            {/* Recent projects — workspace history */}
            {recentProjects.length > 0 && (
              <div className="mt-2.5 space-y-0.5">
                {recentProjects.slice(0, 6).map(project => (
                  <div key={project.id} className="group/item relative">
                    <button
                      onClick={() =>
                        (window.location.href = `/project/workspace?projectId=${project.id}`)
                      }
                      className={`flex w-full items-center rounded-lg py-2 pl-2 pr-2 text-left transition-all duration-200 ${
                        isDark
                          ? "text-[#888] hover:bg-white/[0.04] hover:text-[#ccc]"
                          : "text-[#787774] hover:bg-black/[0.03] hover:text-[#1A1A1A]"
                      }`}
                    >
                      <GripVertical className={`mr-1.5 h-3.5 w-3.5 flex-shrink-0 opacity-0 transition-opacity group-hover/item:opacity-50 ${
                        isDark ? "text-[#555]" : "text-[#aaa]"
                      }`} />
                      <span className="flex-1 truncate text-[12px]">
                        {project.name || project.firstPrompt || "Untitled"}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenu(
                          contextMenu?.id === project.id ? null : { id: project.id, type: "project" }
                        );
                      }}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md opacity-0 transition-opacity group-hover/item:opacity-100 ${
                        isDark
                          ? "text-[#555] hover:bg-white/[0.08] hover:text-[#999]"
                          : "text-[#aaa] hover:bg-black/[0.06] hover:text-[#666]"
                      } ${contextMenu?.id === project.id ? "!opacity-100" : ""}`}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>

                    {contextMenu?.id === project.id && (
                      <div
                        ref={contextMenuRef}
                        className={`absolute right-0 top-full z-50 mt-1 w-40 rounded-lg p-1 shadow-xl ${
                          isDark
                            ? "bg-[#222] ring-1 ring-white/[0.08]"
                            : "bg-white ring-1 ring-black/[0.08]"
                        }`}
                      >
                        <button
                          onClick={() => {
                            const newName = prompt("프로젝트 이름 변경", project.name || "");
                            if (newName !== null && newName !== project.name) {
                              void fetch(`/api/workspace/projects/${project.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: newName }),
                              }).then(() => void fetchProjects());
                            }
                            setContextMenu(null);
                          }}
                          className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[12px] transition-colors ${
                            isDark
                              ? "text-[#ccc] hover:bg-white/[0.06]"
                              : "text-[#1A1A1A] hover:bg-black/[0.04]"
                          }`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          이름 변경
                        </button>
                        <button
                          onClick={() => void deleteProject(project.id)}
                          className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[12px] transition-colors ${
                            isDark
                              ? "text-red-400 hover:bg-red-500/10"
                              : "text-red-600 hover:bg-red-50"
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform — Agents (active) */}
      <div className="mt-7 px-3">
        <p
          className={`mb-2.5 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${
            isDark ? "text-[#555]" : "text-[#999]"
          }`}
        >
          Agent
        </p>
        {/* Agents row — click anywhere to toggle the collapsible list.
            Navigation to /agents happens only via the icon-rail (collapsed
            mode) or manually via the URL. */}
        <button
          type="button"
          onClick={() => setAgentsOpen((v) => !v)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition-all duration-300 ease-out ${
            agentsMenuActive
              ? isDark
                ? "bg-white/[0.08] text-[#E8E8E5]"
                : "bg-black/[0.05] text-[#1A1A1A]"
              : isDark
                ? "text-[#888] hover:bg-white/[0.04] hover:text-[#ccc]"
                : "text-[#787774] hover:bg-black/[0.03] hover:text-[#1A1A1A]"
          }`}
          aria-expanded={agentsOpen}
        >
          <Bot className="h-4 w-4" />
          <span className="flex-1 text-[13px]">Agents</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
              isDark ? "bg-violet-500/20 text-violet-400" : "bg-violet-500/10 text-violet-600"
            }`}
          >
            NEW
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              isDark ? "text-[#666]" : "text-[#999]"
            } ${agentsOpen ? "" : "-rotate-90"}`}
          />
        </button>

        {/* Smooth collapse via grid-template-rows 0fr <-> 1fr trick. */}
        <div
          className="grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            gridTemplateRows: agentsOpen ? "1fr" : "0fr",
            opacity: agentsOpen ? 1 : 0,
          }}
          aria-hidden={!agentsOpen}
        >
          <div className="min-h-0 overflow-hidden">
            <button
              onClick={() => {
                // Always go to the /agents dashboard, never auto-open
                // the drawer. The user picks what to do from there.
                window.location.href = "/agents";
              }}
              className={`mt-1.5 flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition-all duration-300 ease-out ${
                isDark
                  ? "text-[#888] hover:bg-white/[0.04] hover:text-[#ccc]"
                  : "text-[#787774] hover:bg-black/[0.03] hover:text-[#1A1A1A]"
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="flex-1 text-[13px]">New agent</span>
            </button>

            {/* Recent agents — visually part of the Agent section */}
            {effectiveRecentAgents.length > 0 && (
              <div className="mt-2.5 space-y-1">
                {effectiveRecentAgents.slice(0, 6).map(agent => {
                  const active = activeAgentId === agent.id;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        if (onRunAgent) {
                          onRunAgent(agent.id);
                        } else {
                          window.location.href = `/agents?run=${agent.id}`;
                        }
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg py-2 pl-2 pr-2 text-left transition-all duration-200 ${
                        active
                          ? isDark
                            ? "bg-white/[0.08] text-white"
                            : "bg-black/[0.05] text-[#1A1A1A]"
                          : isDark
                            ? "text-[#888] hover:bg-white/[0.04] hover:text-[#ccc]"
                            : "text-[#787774] hover:bg-black/[0.03] hover:text-[#1A1A1A]"
                      }`}
                    >
                      <Play
                        className={`h-3 w-3 flex-shrink-0 ${
                          active ? "opacity-100" : "opacity-50"
                        }`}
                      />
                      <span className="flex-1 truncate text-[12px]">{agent.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom toolbar */}
      <div
        className="flex items-center justify-between px-4 pb-4 pt-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => (window.location.href = "/settings")}
            className={`transition-colors ${
              isDark ? "text-[#555] hover:text-[#999]" : "text-[#999] hover:text-[#1A1A1A]"
            }`}
            title="Settings"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button
            onClick={() => (window.location.href = "/integrations")}
            className={`transition-colors ${
              onIntegrationsPage
                ? isDark ? "text-[#ccc]" : "text-[#1A1A1A]"
                : isDark ? "text-[#555] hover:text-[#999]" : "text-[#999] hover:text-[#1A1A1A]"
            }`}
            title="Integrations"
          >
            <Blend className="h-4 w-4" />
          </button>
          <button
            className={`transition-colors ${
              isDark ? "text-[#555] hover:text-[#999]" : "text-[#999] hover:text-[#1A1A1A]"
            }`}
            title="Preview"
          >
            <MonitorSmartphone className="h-4 w-4" />
          </button>
          <button
            onClick={toggleTheme}
            className={`transition-colors ${
              isDark ? "text-[#555] hover:text-[#999]" : "text-[#999] hover:text-[#1A1A1A]"
            }`}
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <span
          className={`text-[11px] font-medium tracking-wide ${
            isDark ? "text-[#444]" : "text-[#C0C0C0]"
          }`}
        >
          from <span className="font-bold">Meld</span>
        </span>
      </div>
    </div>
  );
}
