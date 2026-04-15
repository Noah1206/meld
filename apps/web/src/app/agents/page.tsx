"use client";

// /agents — Harness dashboard
//
// Layout mirrors /projects: 260px left sidebar + rounded-2xl main content
// panel. Same app shell so moving between /projects and /agents feels
// seamless. The conversational "New agent" drawer opens as a z-50 overlay.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Wrench,
  Clock,
  Box,
  GitBranch,
  Plus,
  Play,
  Trash2,
} from "lucide-react";
import { useThemePref } from "@/lib/hooks/useThemePref";
import { AgentsSidebar } from "./_components/AgentsSidebar";
import { NewAgentDrawer } from "./_components/NewAgentDrawer";
import { BrowseTemplates } from "./_components/BrowseTemplates";
import { TemplateDetail } from "./_components/TemplateDetail";
import { RunChatDrawer } from "./_components/RunChatDrawer";
import { AgentRunPanel } from "./_components/AgentRunPanel";
import type { AgentTemplate } from "./_components/agent-templates";

// ─── Harness axes ─────────────────────────────────────
const HARNESS_AXES = [
  {
    id: "tools",
    title: "Tools & MCP",
    description: "에이전트가 호출할 수 있는 도구 + MCP 서버. 내장 9개 + 연결된 MCP.",
    icon: Wrench,
    href: "/agents/tools",
  },
  {
    id: "sandboxes",
    title: "Sandbox",
    description: "E2B 클라우드 샌드박스에서 코드가 격리되어 실행됩니다.",
    icon: Box,
    href: "/agents/sandboxes",
  },
  {
    id: "sessions",
    title: "Session",
    description: "대화 히스토리와 상태를 Supabase에 저장하고 체크포인트로 resume 합니다.",
    icon: Clock,
    href: "/agents/sessions",
  },
  {
    id: "workflows",
    title: "Orchestration",
    description: "Single loop 또는 Planner → Generator → Evaluator 파이프라인.",
    icon: GitBranch,
    href: "/agents/workflows",
  },
];

// ─── Types ─────────────────────────────────────────────
interface AgentSummary {
  id: string;
  name: string;
  description: string;
  pipeline: "single-loop" | "three-agent";
  modelId: string;
  builtinToolIds: string[];
  mcpServerIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Page ──────────────────────────────────────────────
export default function AgentsDashboardPage() {
  const { isDark, mounted } = useThemePref();
  const [agents, setAgents] = useState<AgentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  // When set, the right panel switches into "run" mode for this agent.
  const [runningAgent, setRunningAgent] = useState<AgentSummary | null>(null);
  // When the user lands in "run" mode via a fresh agent generation, this
  // holds that agent's id so the drawer can trigger its auto-pilot tutorial
  // exactly once. Cleared on drawer close.
  const [tutorialAgentId, setTutorialAgentId] = useState<string | null>(null);
  // Agent currently in the delete-confirm modal.
  const [confirmDeleteAgent, setConfirmDeleteAgent] = useState<AgentSummary | null>(null);

  useEffect(() => {
    void fetchAgents();
  }, []);

  // Respond to ?new=1 / ?run={id} URL params so the sidebar on other pages
  // (e.g. /projects) can link back here and auto-open the drawer.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      setDrawerOpen(true);
      setSelectedTemplate(null);
      setRunningAgent(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!agents) return;
    const params = new URLSearchParams(window.location.search);
    const runId = params.get("run");
    if (!runId) return;
    const found = agents.find(a => a.id === runId);
    if (!found) return;
    setRunningAgent(found);
    setSelectedTemplate(null);
    setDrawerOpen(true);
  }, [agents]);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/harness/agents");
      if (res.status === 401) {
        setError("로그인이 필요합니다.");
        setAgents([]);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setAgents(data.agents as AgentSummary[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setAgents([]);
    }
  }

  async function handleDelete(agentId: string) {
    setDeleting(agentId);
    try {
      const res = await fetch(`/api/harness/agents/${agentId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "delete failed");
      }
      setAgents(prev => prev?.filter(a => a.id !== agentId) ?? null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "unknown");
    } finally {
      setDeleting(null);
    }
  }

  if (!mounted) return null;

  const rootBg = isDark ? "bg-[#1C1C1C]" : "bg-white";
  const mainBg = isDark ? "bg-[#1C1C1C]" : "bg-white";
  // ring-inset draws the border on the inside of the box so it isn't clipped
  // by the parent wrapper's overflow-hidden.
  const mainRing = isDark
    ? "ring-1 ring-inset ring-white/[0.1]"
    : "ring-1 ring-inset ring-black/[0.08]";
  const fg = isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]";

  return (
    <div className={`flex h-screen ${rootBg} ${fg}`}>
      <AgentsSidebar
        onNewAgent={() => setDrawerOpen(true)}
        recentAgents={agents?.slice(0, 8).map(a => ({
          id: a.id,
          name: a.name,
          updatedAt: a.updatedAt,
        })) ?? []}
        onRunAgent={agentId => {
          const found = agents?.find(a => a.id === agentId);
          if (!found) return;
          setRunningAgent(found);
          setSelectedTemplate(null);
          setDrawerOpen(true);
        }}
        activeAgentId={drawerOpen ? runningAgent?.id ?? null : null}
      />

      <div className="relative m-3 ml-0 flex flex-1 overflow-hidden">
        {/* ── Dashboard (always mounted, fades out when drawer is open) ── */}
        <main
          className={`flex flex-1 flex-col overflow-hidden rounded-2xl transition-all duration-500 ease-out ${mainBg} ${mainRing} ${
            drawerOpen ? "scale-[0.98] opacity-30" : "scale-100 opacity-100"
          }`}
          aria-hidden={drawerOpen}
        >
        <div className="flex-1 overflow-y-auto px-10 py-12 lg:px-16 lg:py-16">
          {/* ─── Hero ─── */}
          <div className="mb-14 max-w-3xl">
            <p
              className={`mb-4 font-mono text-[11px] uppercase tracking-[0.15em] ${
                isDark ? "text-[#666]" : "text-[#999]"
              }`}
            >
              Harness engineering
            </p>
            <h1
              className={`mb-5 text-[36px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[44px] lg:text-[52px] ${
                isDark ? "text-white" : "text-[#1A1A1A]"
              }`}
            >
              에이전트를
              <br />
              <span className={isDark ? "text-[#555]" : "text-[#AAA]"}>직접 만듭니다.</span>
            </h1>
            <p
              className={`max-w-2xl text-[15px] leading-relaxed ${
                isDark ? "text-[#888]" : "text-[#787774]"
              }`}
            >
              Anthropic 식 하네스 아키텍처 — Tools, Sandbox, Session, Orchestration 네 축을
              조합해 Planner · Generator · Evaluator 파이프라인을 구성합니다.
            </p>
            <button
              onClick={() => setDrawerOpen(true)}
              className={`mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-all active:scale-[0.97] ${
                isDark
                  ? "bg-white text-[#0A0A0A] hover:bg-[#E8E8E5]"
                  : "bg-[#1A1A1A] text-white hover:bg-[#333]"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              New agent
            </button>
          </div>

          {/* ─── Harness axes ─── */}
          <section className="mb-16">
            <div className="mb-6 flex items-baseline justify-between">
              <h2
                className={`font-mono text-[11px] uppercase tracking-[0.15em] ${
                  isDark ? "text-[#666]" : "text-[#999]"
                }`}
              >
                Harness 구성 요소
              </h2>
              <span
                className={`font-mono text-[11px] ${
                  isDark ? "text-[#444]" : "text-[#B4B4B0]"
                }`}
              >
                04 / 04
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {HARNESS_AXES.map(axis => {
                const Icon = axis.icon;
                return (
                  <Link
                    key={axis.id}
                    href={axis.href}
                    className={`group flex flex-col rounded-xl p-6 transition-all hover:-translate-y-0.5 ${
                      isDark
                        ? "bg-[#1A1A1A] ring-1 ring-white/[0.06] hover:ring-white/[0.12]"
                        : "bg-[#FAFAFA] ring-1 ring-black/[0.06] hover:ring-black/[0.12]"
                    }`}
                  >
                    <div
                      className={`mb-5 flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${
                        isDark
                          ? "bg-white/[0.08] ring-white/[0.06]"
                          : "bg-black/[0.04] ring-black/[0.06]"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${isDark ? "text-white" : "text-[#1A1A1A]"}`}
                      />
                    </div>
                    <h3
                      className={`mb-2 text-[16px] font-semibold tracking-[-0.01em] ${
                        isDark ? "text-white" : "text-[#1A1A1A]"
                      }`}
                    >
                      {axis.title}
                    </h3>
                    <p
                      className={`text-[13px] leading-relaxed ${
                        isDark ? "text-[#888]" : "text-[#787774]"
                      }`}
                    >
                      {axis.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ─── User agents ─── */}
          <section>
            <div className="mb-6 flex items-baseline justify-between">
              <h2
                className={`font-mono text-[11px] uppercase tracking-[0.15em] ${
                  isDark ? "text-[#666]" : "text-[#999]"
                }`}
              >
                내 에이전트
              </h2>
              {agents && (
                <span
                  className={`font-mono text-[11px] ${
                    isDark ? "text-[#444]" : "text-[#B4B4B0]"
                  }`}
                >
                  {String(agents.length).padStart(2, "0")} total
                </span>
              )}
            </div>

            {agents === null ? (
              <AgentsLoadingGrid isDark={isDark} />
            ) : error ? (
              <ErrorCard message={error} isDark={isDark} />
            ) : agents.length === 0 ? (
              <EmptyState isDark={isDark} onCreate={() => setDrawerOpen(true)} />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {agents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isDark={isDark}
                    deleting={deleting === agent.id}
                    onDelete={() => setConfirmDeleteAgent(agent)}
                    onRun={() => {
                      setRunningAgent(agent);
                      setSelectedTemplate(null);
                      setDrawerOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
        </main>

        {/* ── Slide-in overlay: drawer (left) + templates (right) ── */}
        {/*
          The overlay sits on top of the dashboard with z-10. It's always
          mounted; the two children slide in/out via translate-x. When the
          drawer is closed, each child is translated fully off-screen so
          they can't capture pointer events.
        */}
        <div
          className={`absolute inset-0 z-10 flex ${
            drawerOpen ? "" : "pointer-events-none"
          }`}
        >
          {/* Chat drawer — slides in from the left */}
          <div
            className={`pointer-events-auto flex w-[380px] flex-shrink-0 transition-transform duration-500 ease-out xl:w-[420px] ${
              drawerOpen ? "translate-x-0" : "-translate-x-[calc(100%+24px)]"
            }`}
          >
            {runningAgent ? (
              <RunChatDrawer
                open={drawerOpen}
                onClose={() => {
                  setDrawerOpen(false);
                  setRunningAgent(null);
                  setTutorialAgentId(null);
                }}
                agent={runningAgent}
                tutorial={runningAgent.id === tutorialAgentId}
              />
            ) : (
              <NewAgentDrawer
                open={drawerOpen}
                onClose={() => {
                  setDrawerOpen(false);
                  setSelectedTemplate(null);
                }}
                onCreated={() => void fetchAgents()}
                initialTemplate={selectedTemplate}
                onClearTemplate={() => setSelectedTemplate(null)}
              />
            )}
          </div>

          {/* Right panel — slides in from the right. Shows either the
              template browser/detail or the running-agent info. */}
          <div
            className={`pointer-events-auto mr-3 flex min-w-0 flex-1 transition-transform duration-500 ease-out ${
              drawerOpen ? "translate-x-0" : "translate-x-[calc(100%+24px)]"
            }`}
          >
            <div
              className={`flex min-w-0 w-full flex-col overflow-hidden rounded-2xl rounded-l-none border border-l-0 ${mainBg} ${
                isDark ? "border-white/[0.1]" : "border-black/[0.08]"
              }`}
            >
              {runningAgent ? (
                <AgentRunPanel agent={runningAgent} isDark={isDark} />
              ) : selectedTemplate ? (
                <TemplateDetail
                  template={selectedTemplate}
                  isDark={isDark}
                  onBack={() => setSelectedTemplate(null)}
                  onGenerate={async template => {
                    try {
                      const res = await fetch("/api/harness/agents", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(template.draft),
                      });
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        alert(
                          `Generate failed: ${data.error ?? res.statusText}`
                        );
                        return;
                      }
                      // Pull the freshly-created agent out of the response
                      // and immediately switch the drawer into "run" mode
                      // so the user sees the welcome guide for THAT agent
                      // without an extra click.
                      const data = (await res.json()) as { agent?: AgentSummary | null };
                      const created = data.agent;
                      setSelectedTemplate(null);
                      void fetchAgents();
                      if (created) {
                        setRunningAgent(created);
                        // Mark this agent for auto-pilot tutorial on first
                        // view. RunChatDrawer also gates on localStorage so
                        // re-generating the same id won't re-trigger it.
                        setTutorialAgentId(created.id);
                        // drawerOpen stays true — drawer just swaps
                        // NewAgentDrawer → RunChatDrawer for `created`.
                      } else {
                        setDrawerOpen(false);
                      }
                    } catch (e) {
                      alert(
                        `Generate failed: ${
                          e instanceof Error ? e.message : "unknown"
                        }`
                      );
                    }
                  }}
                />
              ) : (
                <BrowseTemplates
                  isDark={isDark}
                  onSelect={template => setSelectedTemplate(template)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete confirm modal ── */}
      {confirmDeleteAgent && (
        <DeleteConfirmModal
          agentName={confirmDeleteAgent.name}
          isDark={isDark}
          deleting={deleting === confirmDeleteAgent.id}
          onCancel={() => setConfirmDeleteAgent(null)}
          onConfirm={async () => {
            const id = confirmDeleteAgent.id;
            await handleDelete(id);
            setConfirmDeleteAgent(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Delete confirm modal ────────────────────────────
function DeleteConfirmModal({
  agentName,
  isDark,
  deleting,
  onCancel,
  onConfirm,
}: {
  agentName: string;
  isDark: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-[420px] rounded-2xl p-6 shadow-2xl ${
          isDark
            ? "border border-white/[0.1] bg-[#1C1C1C]"
            : "border border-black/[0.08] bg-white"
        }`}
      >
        <h3
          className={`text-[16px] font-semibold ${
            isDark ? "text-white" : "text-[#1A1A1A]"
          }`}
        >
          Delete agent?
        </h3>
        <p
          className={`mt-2 text-[13px] leading-relaxed ${
            isDark ? "text-[#888]" : "text-[#787774]"
          }`}
        >
          <span className={isDark ? "text-white" : "text-[#1A1A1A]"}>
            {agentName}
          </span>
          {"  "}을(를) 삭제합니다. 되돌릴 수 없습니다.
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-all active:scale-[0.97] disabled:opacity-50 ${
              isDark
                ? "border border-white/[0.12] text-white hover:bg-white/[0.06]"
                : "border border-black/[0.1] text-[#1A1A1A] hover:bg-black/[0.05]"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-red-600 active:scale-[0.97] disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AgentCard ────────────────────────────────────────
function AgentCard({
  agent,
  isDark,
  onDelete,
  onRun,
}: {
  agent: AgentSummary;
  isDark: boolean;
  deleting: boolean;
  onDelete: () => void;
  onRun: () => void;
}) {
  const cardBg = isDark ? "bg-[#1A1A1A]" : "bg-[#FAFAFA]";
  const cardRing = isDark
    ? "ring-1 ring-white/[0.06] hover:ring-white/[0.12]"
    : "ring-1 ring-black/[0.06] hover:ring-black/[0.12]";
  const title = isDark ? "text-white" : "text-[#1A1A1A]";
  const muted = isDark ? "text-[#888]" : "text-[#787774]";

  return (
    <div
      className={`group relative flex flex-col rounded-xl p-6 transition-all hover:-translate-y-0.5 ${cardBg} ${cardRing}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3
          className={`min-w-0 flex-1 truncate text-[16px] font-semibold tracking-[-0.01em] ${title}`}
        >
          {agent.name}
        </h3>
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
            isDark
              ? "text-[#666] hover:bg-white/[0.06] hover:text-white"
              : "text-[#999] hover:bg-black/[0.05] hover:text-[#1A1A1A]"
          }`}
          aria-label="Delete agent"
          title="Delete agent"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className={`mb-5 line-clamp-2 min-h-[36px] text-[13px] leading-relaxed ${muted}`}>
        {agent.description || "—"}
      </p>

      <div className="mt-auto flex items-center justify-between">
        <span
          className={`font-mono text-[10px] ${isDark ? "text-[#555]" : "text-[#B4B4B0]"}`}
        >
          {new Date(agent.updatedAt).toLocaleDateString()}
        </span>
        <button
          onClick={onRun}
          className={`flex h-7 items-center gap-1 rounded-lg px-3 text-[12px] font-semibold transition-all active:scale-[0.97] ${
            isDark
              ? "bg-white text-[#0A0A0A] hover:bg-[#E8E8E5]"
              : "bg-[#1A1A1A] text-white hover:bg-[#333]"
          }`}
        >
          <Play className="h-3 w-3" />
          Run
        </button>
      </div>
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────
function AgentsLoadingGrid({ isDark }: { isDark: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={`h-[180px] animate-pulse rounded-xl ${
            isDark
              ? "bg-[#1A1A1A] ring-1 ring-white/[0.06]"
              : "bg-[#FAFAFA] ring-1 ring-black/[0.06]"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Error card ──────────────────────────────────────
function ErrorCard({ message, isDark }: { message: string; isDark: boolean }) {
  return (
    <div
      className={`rounded-xl px-8 py-10 text-center ${
        isDark ? "bg-[#1A1A1A]" : "bg-[#FAFAFA]"
      } ring-1 ring-red-500/20`}
    >
      <p className="text-[14px] text-red-400">{message}</p>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────
function EmptyState({
  isDark,
  onCreate,
}: {
  isDark: boolean;
  onCreate: () => void;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl px-8 py-20 text-center ${
        isDark
          ? "bg-[#1A1A1A] ring-1 ring-white/[0.06]"
          : "bg-[#FAFAFA] ring-1 ring-black/[0.06]"
      }`}
    >
      <div
        className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${
          isDark
            ? "bg-white/[0.04] ring-white/[0.06]"
            : "bg-black/[0.03] ring-black/[0.06]"
        }`}
      >
        <Bot className={`h-5 w-5 ${isDark ? "text-[#888]" : "text-[#787774]"}`} />
      </div>
      <h3
        className={`mb-2 text-[18px] font-semibold tracking-[-0.01em] ${
          isDark ? "text-white" : "text-[#1A1A1A]"
        }`}
      >
        아직 에이전트가 없습니다
      </h3>
      <p className={`mb-6 text-[13px] ${isDark ? "text-[#888]" : "text-[#787774]"}`}>
        첫 번째 하네스 에이전트를 만들어보세요.
      </p>
      <button
        onClick={onCreate}
        className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-all active:scale-[0.97] ${
          isDark
            ? "bg-white text-[#0A0A0A] hover:bg-[#E8E8E5]"
            : "bg-[#1A1A1A] text-white hover:bg-[#333]"
        }`}
      >
        <Plus className="h-3.5 w-3.5" />
        New agent
      </button>
    </div>
  );
}
