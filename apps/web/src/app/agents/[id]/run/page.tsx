"use client";

// /agents/[id]/run — harness execution page
//
// Dark landing-style design. Prompt input with soft glass panel, event
// timeline rendered with ring-white/[0.06] rows + accent markers for
// stage / verdict / dev_server events.

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Play,
  Loader2,
  Check,
  AlertCircle,
  FileText,
  Pencil,
  Terminal,
  Globe,
  Monitor,
  Eye,
  Sparkles,
} from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useThemePref } from "@/lib/hooks/useThemePref";
import { AgentsSidebar } from "../../_components/AgentsSidebar";

interface AgentFull {
  id: string;
  name: string;
  description: string;
  pipeline: "single-loop" | "three-agent";
  modelId: string;
  builtinToolIds: string[];
  mcpServerIds: string[];
}

interface HarnessEvent {
  type: string;
  timestamp: number;
  [key: string]: unknown;
}

const POLL_INTERVAL_MS = 700;

export default function RunAgentPage() {
  const params = useParams<{ id: string }>();
  const agentId = params.id;
  const { isDark, mounted } = useThemePref();

  const [agent, setAgent] = useState<AgentFull | null>(null);
  const [prompt, setPrompt] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<HarnessEvent[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cursorRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!agentId) return;
    void (async () => {
      try {
        const res = await fetch(`/api/harness/agents/${agentId}`);
        if (!res.ok) throw new Error("load failed");
        const data = await res.json();
        setAgent(data.agent);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "load failed");
      }
    })();
  }, [agentId]);

  useEffect(() => {
    if (!sessionId || status !== "running") return;
    const interval = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/harness/run/events?session=${sessionId}&after=${cursorRef.current}`
          );
          if (!res.ok) return;
          const data = (await res.json()) as {
            events: HarnessEvent[];
            cursor: number;
            status: string;
            completed: boolean;
          };
          if (data.events.length > 0) {
            setEvents(prev => [...prev, ...data.events]);
            cursorRef.current = data.cursor;
          }
          if (data.completed) {
            setStatus(data.status === "completed" ? "completed" : "error");
            if (data.status === "error") {
              const errEvent = data.events.find(e => e.type === "error");
              if (errEvent) setErrorMsg((errEvent.message as string) ?? "error");
            }
          }
        } catch {
          // ignore
        }
      })();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sessionId, status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [events.length]);

  async function handleRun() {
    if (!prompt.trim() || !agent) return;
    setStatus("running");
    setEvents([]);
    setErrorMsg(null);
    cursorRef.current = 0;
    try {
      const res = await fetch("/api/harness/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "run failed");
      setSessionId(data.sessionId);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "unknown");
    }
  }

  if (!mounted) return null;

  const rootBg = isDark ? "bg-[#0A0A0A]" : "bg-white";
  const mainBg = isDark ? "bg-[#151515]" : "bg-white";
  const mainRing = isDark ? "ring-1 ring-white/[0.04]" : "ring-1 ring-black/[0.04]";
  const fg = isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]";

  if (!agent) {
    return (
      <div className={`flex h-screen ${rootBg} ${fg}`}>
        <AgentsSidebar />
        <main
          className={`m-3 ml-0 flex flex-1 items-center justify-center rounded-2xl ${mainBg} ${mainRing}`}
        >
          <div
            className={`font-mono text-[12px] ${
              isDark ? "text-[#666]" : "text-[#999]"
            }`}
          >
            Loading agent...
          </div>
        </main>
      </div>
    );
  }

  const isRunning = status === "running";
  const muted = isDark ? "text-[#888]" : "text-[#787774]";
  const eyebrow = isDark ? "text-[#666]" : "text-[#999]";
  const inputPanelBg = isDark ? "bg-[#1A1A1A]" : "bg-[#FAFAFA]";
  const inputPanelRing = isDark
    ? "ring-1 ring-white/[0.08]"
    : "ring-1 ring-black/[0.08]";

  return (
    <div className={`flex h-screen ${rootBg} ${fg}`}>
      <AgentsSidebar />

      <main
        className={`m-3 ml-0 flex flex-1 flex-col overflow-hidden rounded-2xl ${mainBg} ${mainRing}`}
      >
        <div className="flex-1 overflow-y-auto px-10 py-12 lg:px-16 lg:py-16">
          {/* Back link + status */}
          <div className="mb-6 flex items-start justify-between">
            <Link
              href="/agents"
              className={`inline-flex items-center gap-2 text-[12px] transition-colors ${eyebrow} ${
                isDark ? "hover:text-white" : "hover:text-[#1A1A1A]"
              }`}
            >
              <ArrowLeft className="h-3 w-3" />
              Back to agents
            </Link>
            <StatusPill status={status} isDark={isDark} />
          </div>

          {/* Hero */}
          <div className="mb-10 max-w-3xl">
            <p
              className={`mb-4 font-mono text-[11px] uppercase tracking-[0.15em] ${eyebrow}`}
            >
              Run agent
            </p>
            <h1
              className={`mb-3 text-[32px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[40px] ${
                isDark ? "text-white" : "text-[#1A1A1A]"
              }`}
            >
              {agent.name}
            </h1>
            <p className={`font-mono text-[12px] ${eyebrow}`}>
              {agent.pipeline} · {agent.modelId}
            </p>
          </div>

          {/* Prompt panel */}
          <div className={`mb-8 rounded-2xl p-6 ${inputPanelBg} ${inputPanelRing}`}>
            <p
              className={`mb-3 font-mono text-[11px] uppercase tracking-[0.15em] ${eyebrow}`}
            >
              Prompt
            </p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="예: Next.js 카운터 앱 만들어줘. + / - / reset 버튼 포함."
              rows={4}
              disabled={isRunning}
              className={`w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none disabled:opacity-60 ${
                isDark
                  ? "text-white placeholder:text-[#555]"
                  : "text-[#1A1A1A] placeholder:text-[#AAA]"
              }`}
            />
            <div
              className={`mt-4 flex items-center justify-between border-t pt-4 ${
                isDark ? "border-white/[0.06]" : "border-black/[0.06]"
              }`}
            >
              <p className={`text-[12px] ${muted}`}>
                {agent.pipeline === "three-agent"
                  ? "Planner → Generator → Evaluator 순서로 실행됩니다."
                  : "단일 에이전트 루프로 실행됩니다."}
              </p>
              <button
                onClick={handleRun}
                disabled={isRunning || !prompt.trim()}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 ${
                  isDark
                    ? "bg-white text-[#0A0A0A] hover:bg-[#E8E8E5] hover:shadow-lg hover:shadow-white/10"
                    : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                }`}
              >
                {isRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {isRunning ? "Running..." : "Run"}
              </button>
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <div
              className={`mb-6 flex items-start gap-3 rounded-xl p-4 ring-1 ring-red-500/30 ${
                isDark ? "bg-[#1A1A1A]" : "bg-red-50"
              }`}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
              <span className="text-[13px] text-red-400">{errorMsg}</span>
            </div>
          )}

          {/* Event stream */}
          {events.length > 0 && (
            <div>
              <p
                className={`mb-4 font-mono text-[11px] uppercase tracking-[0.15em] ${eyebrow}`}
              >
                Event stream
              </p>
              <div
                ref={scrollRef}
                className={`max-h-[60vh] space-y-1.5 overflow-y-auto rounded-2xl p-5 ${inputPanelBg} ${
                  isDark ? "ring-1 ring-white/[0.06]" : "ring-1 ring-black/[0.06]"
                }`}
              >
                {events.map((event, i) => (
                  <EventRow key={i} event={event} isDark={isDark} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Event row ────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function EventRow({ event, isDark: _isDark }: { event: HarnessEvent; isDark: boolean }) {
  if (event.type === "stage_started") {
    const stage = event.stage as string;
    const iteration = event.iteration as number | undefined;
    return (
      <div className="my-3 flex items-center gap-3 rounded-lg bg-white/[0.05] px-4 py-3 ring-1 ring-white/[0.1]">
        <Sparkles className="h-3.5 w-3.5 text-white" />
        <span className="font-mono text-[12px] uppercase tracking-wider text-white">
          {stage}
          {iteration && iteration > 1 ? ` · iter ${iteration}` : ""}
        </span>
      </div>
    );
  }

  if (event.type === "stage_completed") {
    return (
      <div className="flex items-center gap-2 px-4 py-1">
        <Check className="h-3 w-3 text-emerald-400" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#666]">
          {event.stage as string} complete
        </span>
      </div>
    );
  }

  if (event.type === "plan_produced") {
    const contract = event.contract as {
      goal: string;
      features: string[];
      criteria: string[];
    };
    return (
      <div className="my-2 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.08]">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#888]">
          Product spec
        </p>
        {contract.goal && (
          <p className="mb-2 text-[13px] leading-relaxed text-white">{contract.goal}</p>
        )}
        {contract.criteria && contract.criteria.length > 0 && (
          <ul className="space-y-1 text-[11px] text-[#888]">
            {contract.criteria.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-[#555]">☐</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (event.type === "evaluation_verdict") {
    const verdict = event.verdict as {
      pass: boolean;
      score: number;
      issues: string[];
      summary: string;
    };
    return (
      <div
        className={`my-2 rounded-xl p-4 ring-1 ${
          verdict.pass
            ? "bg-emerald-500/[0.05] ring-emerald-500/30"
            : "bg-red-500/[0.05] ring-red-500/30"
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span
            className={`font-mono text-[10px] uppercase tracking-wider ${
              verdict.pass ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {verdict.pass ? "✓ Evaluator passed" : "✗ Evaluator failed"}
          </span>
          <span className="font-mono text-[10px] text-[#666]">{verdict.score} / 100</span>
        </div>
        <p className="mb-2 text-[12px] leading-relaxed text-white">{verdict.summary}</p>
        {verdict.issues && verdict.issues.length > 0 && (
          <ul className="space-y-0.5 text-[11px] text-[#888]">
            {verdict.issues.map((issue, i) => (
              <li key={i}>— {issue}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (event.type === "dev_server_detected") {
    const url = event.url as string;
    return (
      <div className="my-2 flex items-center gap-3 rounded-xl bg-emerald-500/[0.05] px-4 py-3 ring-1 ring-emerald-500/30">
        <Monitor className="h-3.5 w-3.5 text-emerald-400" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 truncate font-mono text-[11px] text-emerald-400 hover:underline"
        >
          {url}
        </a>
      </div>
    );
  }

  const icon = iconForType(event.type);
  const label = labelFor(event);
  if (!label) return null;

  return (
    <div className="flex items-start gap-3 px-2 py-1.5">
      <span className="mt-0.5 flex-shrink-0 text-[#555]">{icon}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#888]">
        {label}
      </span>
    </div>
  );
}

function iconForType(type: string) {
  const cls = "h-3 w-3";
  switch (type) {
    case "message":
    case "thinking":
      return <Sparkles className={cls} />;
    case "tool_call":
    case "tool_result":
      return <Terminal className={cls} />;
    case "file_read":
      return <FileText className={cls} />;
    case "file_write":
      return <Pencil className={cls} />;
    case "command_output":
      return <Terminal className={cls} />;
    case "browser_screenshot":
      return <Eye className={cls} />;
    case "sandbox_acquired":
    case "sandbox_released":
      return <Globe className={cls} />;
    default:
      return <Sparkles className={cls} />;
  }
}

function labelFor(event: HarnessEvent): string | null {
  switch (event.type) {
    case "thinking":
      return String(event.content ?? "");
    case "message":
      return String(event.content ?? "").slice(0, 200);
    case "tool_call":
      return `→ ${event.toolName as string}`;
    case "tool_result":
      return `← ${event.toolName as string}`;
    case "file_read":
      return `read ${event.filePath as string}`;
    case "file_write":
      return `write ${event.filePath as string}`;
    case "file_delete":
      return `delete ${event.filePath as string}`;
    case "sandbox_acquired":
      return `sandbox acquired (${String(event.sandboxId ?? "").slice(0, 8)})`;
    case "sandbox_released":
      return "sandbox released";
    case "done":
      return `done · ${event.summary as string}`;
    case "error":
      return `error · ${event.message as string}`;
    default:
      return null;
  }
}

// ─── Status pill ──────────────────────────────────────
function StatusPill({
  status,
  isDark,
}: {
  status: "idle" | "running" | "completed" | "error";
  isDark: boolean;
}) {
  if (status === "idle") return null;
  if (status === "running") {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider ring-1 ${
          isDark
            ? "bg-white/[0.06] text-white ring-white/[0.12]"
            : "bg-black/[0.05] text-[#1A1A1A] ring-black/[0.1]"
        }`}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Running
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/[0.08] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/30">
        <Check className="h-3 w-3" />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-xl bg-red-500/[0.08] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-red-400 ring-1 ring-red-500/30">
      <AlertCircle className="h-3 w-3" />
      Error
    </span>
  );
}
