"use client";

// Inline drawer for running an existing agent via chat.
//
// Mirrors NewAgentDrawer's shell so the /agents page can swap between
// "create" and "run" modes without changing layout. The user types a
// prompt, we POST /api/harness/run, then poll
// /api/harness/run/events for the live event stream and render a
// minimal timeline inside the chat.

import { useEffect, useRef, useState } from "react";
import { X, Send, Loader2, Sparkles, Check, AlertCircle } from "lucide-react";

export interface RunChatDrawerProps {
  open: boolean;
  onClose: () => void;
  agent: {
    id: string;
    name: string;
    description: string;
    pipeline: "single-loop" | "three-agent";
    /** Builtin tools the agent has — used to suggest starter prompts. */
    builtinToolIds?: string[];
    /** MCP server ids — same purpose. */
    mcpServerIds?: string[];
  } | null;
  /** When true, auto-pilot a guided demo for this agent (generation flow). */
  tutorial?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface HarnessEvent {
  type: string;
  timestamp: number;
  [key: string]: unknown;
}

const POLL_INTERVAL_MS = 700;
const TUTORIAL_SEEN_KEY = (agentId: string) => `meld-agent-tutorial-seen:${agentId}`;
const TUTORIAL_STEP_DELAY_MS = 1400;

export function RunChatDrawer({ open, onClose, agent, tutorial }: RunChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<HarnessEvent[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Tutorial auto-pilot: sequence of narration+prompt steps we run without user input.
  const [tutorialSteps, setTutorialSteps] = useState<TutorialStep[] | null>(null);
  const [tutorialIndex, setTutorialIndex] = useState(0);
  // Flipped to true if the user starts typing/editing mid-tutorial so we stop auto-sending.
  const tutorialCancelledRef = useRef(false);
  const cursorRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset chat whenever the agent changes (or drawer closes/reopens).
  // If `tutorial` is set AND this agent hasn't been walked through yet,
  // build a step script so the effect chain below can auto-drive it.
  useEffect(() => {
    if (!agent) {
      setMessages([]);
      setInput("");
      setSessionId(null);
      setEvents([]);
      setStatus("idle");
      setErrorMsg(null);
      setTutorialSteps(null);
      setTutorialIndex(0);
      tutorialCancelledRef.current = false;
      cursorRef.current = 0;
      return;
    }

    const seen =
      typeof window !== "undefined" &&
      window.localStorage.getItem(TUTORIAL_SEEN_KEY(agent.id)) === "1";
    const shouldRunTutorial = Boolean(tutorial) && !seen;

    if (shouldRunTutorial) {
      const steps = buildTutorialScript(agent);
      setTutorialSteps(steps);
      setTutorialIndex(0);
      tutorialCancelledRef.current = false;
      setMessages([
        {
          role: "assistant",
          content: `${agent.name} 준비 완료. 제가 알아서 몇 가지 작업을 시연해볼게요 — 그냥 보고 계시면 돼요. 중간에 끼어들고 싶으면 아래 입력창에 직접 쳐도 됩니다.`,
        },
      ]);
    } else {
      setTutorialSteps(null);
      setTutorialIndex(0);
      tutorialCancelledRef.current = false;
      setMessages([
        {
          role: "assistant",
          content: `${agent.name} 에이전트 준비 완료. 무엇을 시킬까요?`,
        },
      ]);
    }

    setInput("");
    setSessionId(null);
    setEvents([]);
    setStatus("idle");
    setErrorMsg(null);
    cursorRef.current = 0;
  }, [agent, tutorial]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Autofocus on open
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [open]);

  // Auto-scroll on new messages or events
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, events.length, status]);

  // Poll events while running
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
            // Pull the final assistant message into chat history
            const finalMessage = [...data.events]
              .reverse()
              .find(e => e.type === "message");
            if (finalMessage && typeof finalMessage.content === "string") {
              setMessages(prev => [
                ...prev,
                { role: "assistant", content: finalMessage.content as string },
              ]);
            }
          }
        } catch {
          // ignore
        }
      })();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sessionId, status]);

  async function sendPrompt(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || !agent || status === "running") return;
    setErrorMsg(null);
    if (overrideText === undefined) setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setEvents([]);
    cursorRef.current = 0;
    setStatus("running");
    try {
      const res = await fetch("/api/harness/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, prompt: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "run failed");
      setSessionId(data.sessionId);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "unknown");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendPrompt();
    }
  }

  // Tutorial auto-pilot driver.
  //
  // Runs steps in order: show narration bubble → wait a beat → auto-send
  // that step's prompt → wait for run to complete → advance. Stops if the
  // user types anything into the input (tutorialCancelledRef) or on error.
  // When the last step finishes we flip the localStorage "seen" flag so it
  // won't re-trigger on this agent.
  useEffect(() => {
    if (!agent) return;
    if (!tutorialSteps || tutorialSteps.length === 0) return;
    if (tutorialCancelledRef.current) return;
    if (status === "running") return;
    if (status === "error") return;

    // First step fires right after mount. Subsequent steps fire only after
    // the previous run reached "completed". Guard with tutorialIndex === 0
    // for the initial fire so we don't require a prior "completed".
    const isFirst = tutorialIndex === 0;
    if (!isFirst && status !== "completed") return;

    if (tutorialIndex >= tutorialSteps.length) {
      // All done. Mark seen + wrap-up bubble.
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TUTORIAL_SEEN_KEY(agent.id), "1");
      }
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "튜토리얼은 여기까지예요. 이제 원하는 작업을 아래 입력창에 적어주세요.",
        },
      ]);
      setTutorialSteps(null);
      return;
    }

    const step = tutorialSteps[tutorialIndex];
    let cancelled = false;

    // Narration bubble appears first, then after a short delay we auto-send
    // the step's prompt. The delay gives the user a chance to read the
    // narration and feel like the agent is "thinking" before acting.
    setMessages(prev => [...prev, { role: "assistant", content: step.narration }]);

    const timer = setTimeout(() => {
      if (cancelled) return;
      if (tutorialCancelledRef.current) return;
      void sendPrompt(step.prompt);
      setTutorialIndex(i => i + 1);
    }, TUTORIAL_STEP_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, tutorialSteps, tutorialIndex, status]);

  if (!agent) return null;

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl rounded-r-none border border-r-0 border-white/[0.1] bg-[#1C1C1C]"
      aria-label="Run agent chat"
      data-run-drawer="v1"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5">
        <h2 className="min-w-0 truncate text-[16px] font-semibold tracking-[-0.01em] text-white">
          {agent.name}
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-[#888] transition-colors hover:bg-white/[0.06] hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Messages + event stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
        {messages.length === 0 && status === "idle" ? (
          <AgentWelcome
            agent={agent}
            onPick={(prompt) => {
              setInput(prompt);
              // focus + place caret at end
              setTimeout(() => {
                const ta = textareaRef.current;
                if (ta) {
                  ta.focus();
                  ta.setSelectionRange(prompt.length, prompt.length);
                }
              }, 0);
            }}
          />
        ) : (
          <div className="space-y-5">
            {messages.map((msg, i) => (
              <MessageBubble key={`m-${i}`} msg={msg} />
            ))}

            {status === "running" && events.length > 0 && (
              <div className="rounded-xl border border-white/[0.12] p-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#666]">
                  Live activity
                </p>
                <div className="space-y-1">
                  {events.slice(-12).map((e, i) => (
                    <EventLine key={`e-${i}`} event={e} />
                  ))}
                </div>
              </div>
            )}

            {status === "running" && (
              <div className="flex items-center gap-2 pl-2 text-[12px] text-[#666]">
                <Loader2 className="h-3 w-3 animate-spin" />
                Running…
              </div>
            )}

            {status === "completed" && (
              <div className="flex items-center gap-2 pl-2 text-[12px] text-emerald-400">
                <Check className="h-3 w-3" />
                Completed
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="mx-6 mb-3 flex items-start gap-2 rounded-xl border border-red-500/30 px-4 py-3">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
          <p className="text-[12px] text-red-300">{errorMsg}</p>
        </div>
      )}

      {/* Input */}
      <div className="p-4">
        <div className="relative rounded-2xl border border-white/[0.12] p-3 transition-all focus-within:border-white/[0.25]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              // Any user typing mid-tutorial cancels the remaining auto-steps.
              if (tutorialSteps && e.target.value.length > 0) {
                tutorialCancelledRef.current = true;
                setTutorialSteps(null);
                if (agent && typeof window !== "undefined") {
                  window.localStorage.setItem(TUTORIAL_SEEN_KEY(agent.id), "1");
                }
              }
            }}
            onKeyDown={onKeyDown}
            placeholder="에이전트에게 시킬 작업을 입력해 주세요…"
            rows={2}
            disabled={status === "running"}
            className="w-full resize-none bg-transparent px-3 py-2 text-[14px] leading-relaxed text-white outline-none placeholder:text-[#555] disabled:opacity-60"
          />
          <div className="flex items-center justify-between px-1 pt-2">
            <span className="font-mono text-[10px] text-[#555]">
              {status === "running"
                ? "RUNNING"
                : status === "completed"
                  ? "DONE"
                  : status === "error"
                    ? "ERROR"
                    : "READY"}
            </span>
            <button
              onClick={() => void sendPrompt()}
              disabled={!input.trim() || status === "running"}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#0A0A0A] transition-all hover:bg-[#E8E8E5] active:scale-[0.95] disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>
        <p className="mt-2 px-3 text-[10px] text-[#555]">
          Enter 로 전송 · Shift+Enter 로 줄바꿈 · ESC 로 닫기
        </p>
      </div>
    </aside>
  );
}

// ─── Subcomponents ───────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "assistant") {
    return (
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-white/[0.06] ring-1 ring-white/[0.08]">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
        <div className="min-w-0 flex-1 whitespace-pre-wrap text-[14px] leading-relaxed text-[#E8E8E5]">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl border border-white/[0.12] px-4 py-2.5 text-[14px] leading-relaxed text-white">
        {msg.content}
      </div>
    </div>
  );
}

function EventLine({ event }: { event: HarnessEvent }) {
  const label = labelFor(event);
  if (!label) return null;
  return (
    <div className="font-mono text-[10px] text-[#888]">
      <span className="text-[#555]">→ </span>
      {label}
    </div>
  );
}

// ─── Agent welcome / starter prompts ─────────────────
// Shown in the empty state when a user opens an agent run drawer for
// the first time. Walks the user from "I have no idea what to type" to
// "click → ready to go" by surfacing the agent's purpose + 3-4 concrete
// example prompts derived from the agent's tools and connected MCPs.
function AgentWelcome({
  agent,
  onPick,
}: {
  agent: NonNullable<RunChatDrawerProps["agent"]>;
  onPick: (prompt: string) => void;
}) {
  const starters = useStarterPrompts(agent);
  return (
    <div className="mx-auto flex h-full max-w-[520px] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.08]">
        <Sparkles className="h-5 w-5 text-white" />
      </div>
      <h3 className="text-[20px] font-bold tracking-[-0.02em] text-white">
        {agent.name}
      </h3>
      {agent.description && (
        <p className="mt-2 max-w-[440px] text-[13px] leading-relaxed text-[#999]">
          {agent.description}
        </p>
      )}

      {/* Starter prompts */}
      {starters.length > 0 && (
        <div className="mt-7 w-full">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
            Try one of these
          </p>
          <div className="space-y-2">
            {starters.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => onPick(s.prompt)}
                className="group flex w-full items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left transition-all hover:border-white/[0.18] hover:bg-white/[0.05]"
              >
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[#888] group-hover:bg-white/[0.1] group-hover:text-[#ccc]">
                  <Sparkles className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[#E0E0E0]">{s.label}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[#666]">{s.prompt}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-[11px] text-[#555]">
        직접 입력하셔도 돼요. 위 예시는 빠르게 시작하기 위한 가이드입니다.
      </p>
    </div>
  );
}

interface StarterPrompt {
  label: string;
  prompt: string;
}

function useStarterPrompts(
  agent: NonNullable<RunChatDrawerProps["agent"]>
): StarterPrompt[] {
  const mcps = agent.mcpServerIds ?? [];
  const tools = agent.builtinToolIds ?? [];
  const list: StarterPrompt[] = [];

  // MCP-aware starters first (these are the most contextual)
  if (mcps.includes("notion")) {
    list.push(
      {
        label: "Notion 문서 검색",
        prompt: "환불 정책에 대한 Notion 페이지를 찾아서 핵심 내용을 요약해 줘.",
      },
      {
        label: "최근 변경 요약",
        prompt: "최근 7일 안에 편집된 Notion 페이지들을 찾아서 어떤 변화가 있었는지 알려줘.",
      },
    );
  }
  if (mcps.includes("github")) {
    list.push(
      {
        label: "최근 PR 요약",
        prompt: "이번 주에 머지된 PR 5개를 나열하고 각각 한 줄로 요약해 줘.",
      },
      {
        label: "이슈 분류",
        prompt: "현재 열려 있는 이슈들을 라벨별로 묶어서 우선순위가 높은 3개를 알려줘.",
      },
    );
  }
  if (mcps.includes("linear")) {
    list.push({
      label: "스프린트 진행 상황",
      prompt: "이번 사이클의 진행 중 / 완료 / 블록 상태 이슈를 정리해서 알려줘.",
    });
  }
  if (mcps.includes("supabase")) {
    list.push({
      label: "스키마 살펴보기",
      prompt: "데이터베이스의 모든 테이블과 핵심 컬럼을 정리해서 보여줘.",
    });
  }
  if (mcps.includes("slack")) {
    list.push({
      label: "오늘 멘션 요약",
      prompt: "오늘 내가 멘션된 Slack 메시지들을 모아서 요약해 줘.",
    });
  }
  if (mcps.includes("figma")) {
    list.push({
      label: "디자인 검토",
      prompt: "최근에 편집된 Figma 프레임들을 나열하고 주요 변경점을 알려줘.",
    });
  }

  // Builtin-tool aware fallback (when no MCPs configured)
  if (list.length === 0) {
    if (tools.includes("web_search") || tools.includes("browse_url")) {
      list.push(
        {
          label: "웹 리서치",
          prompt: "최근 1주일 안에 발표된 AI 코딩 도구 관련 뉴스를 5개만 찾아서 요약해 줘.",
        },
        {
          label: "특정 사이트 분석",
          prompt: "https://docs.anthropic.com 을 열어서 핵심 섹션 구조를 정리해 줘.",
        },
      );
    }
    if (tools.includes("read_file") || tools.includes("write_file")) {
      list.push({
        label: "코드 리뷰",
        prompt: "프로젝트 구조를 살펴보고 개선할 만한 부분 3개를 짚어 줘.",
      });
    }
  }

  // Always cap at 4
  return list.slice(0, 4);
}

// ─── Tutorial script generator ───────────────────────
// Given an agent's tools/MCPs, pick a short sequence of demo steps the
// agent will auto-run so the user sees what it can do without typing
// anything. Each step has a `narration` (what the assistant "says" before
// doing it) and a `prompt` (what we actually send to /api/harness/run).
interface TutorialStep {
  narration: string;
  prompt: string;
}

function buildTutorialScript(agent: {
  name: string;
  builtinToolIds?: string[];
  mcpServerIds?: string[];
}): TutorialStep[] {
  const mcps = agent.mcpServerIds ?? [];
  const tools = agent.builtinToolIds ?? [];
  const steps: TutorialStep[] = [];

  if (mcps.includes("notion")) {
    steps.push(
      {
        narration: "먼저 Notion 워크스페이스에 연결해서 최근 페이지 몇 개를 가져와볼게요.",
        prompt:
          "내 Notion 워크스페이스에서 최근에 수정된 페이지 5개를 찾아 각각 제목과 한 줄 요약을 알려줘.",
      },
      {
        narration: "이제 그 중 하나를 골라 본문을 요약하는 흐름을 보여드릴게요.",
        prompt:
          "위에서 찾은 첫 번째 페이지의 본문을 읽고 핵심 내용을 3개 불릿으로 정리해줘.",
      },
    );
  }
  if (mcps.includes("github")) {
    steps.push(
      {
        narration: "GitHub에 연결해서 최근 활동을 살펴볼게요.",
        prompt: "이번 주에 머지된 PR 5개를 나열하고 각각 한 줄로 요약해줘.",
      },
      {
        narration: "이어서 열려 있는 이슈 중 우선순위가 높아 보이는 것들을 골라볼게요.",
        prompt: "현재 열려 있는 이슈들을 라벨별로 묶고 가장 시급해 보이는 3개를 골라 이유와 함께 알려줘.",
      },
    );
  }
  if (mcps.includes("linear")) {
    steps.push({
      narration: "Linear 사이클 상태를 확인해볼게요.",
      prompt: "이번 사이클의 진행 중 / 완료 / 블록 이슈를 정리해서 표로 보여줘.",
    });
  }
  if (mcps.includes("supabase")) {
    steps.push({
      narration: "Supabase 스키마를 한번 둘러볼게요.",
      prompt: "데이터베이스의 모든 테이블과 핵심 컬럼을 정리해서 보여줘.",
    });
  }
  if (mcps.includes("slack")) {
    steps.push({
      narration: "Slack에서 오늘 나를 멘션한 메시지를 훑어볼게요.",
      prompt: "오늘 내가 멘션된 Slack 메시지들을 모아서 요약해줘.",
    });
  }
  if (mcps.includes("figma")) {
    steps.push({
      narration: "Figma에서 최근 편집된 프레임을 살펴볼게요.",
      prompt: "최근에 편집된 Figma 프레임 5개를 나열하고 주요 변경점을 알려줘.",
    });
  }

  // Builtin-tool fallback when no MCPs matched above.
  if (steps.length === 0) {
    if (tools.includes("web_search") || tools.includes("browse_url")) {
      steps.push(
        {
          narration: "먼저 웹 검색 도구가 어떻게 동작하는지 보여드릴게요.",
          prompt: "최근 1주일 안에 발표된 AI 코딩 도구 관련 뉴스 3개를 찾아 요약해줘.",
        },
        {
          narration: "이어서 특정 문서를 직접 열어 분석하는 흐름을 보여드릴게요.",
          prompt: "https://docs.anthropic.com 을 열어서 핵심 섹션 구조를 정리해줘.",
        },
      );
    } else if (tools.includes("read_file") || tools.includes("list_files")) {
      steps.push({
        narration: "프로젝트 구조를 살펴보는 것부터 시작할게요.",
        prompt: "현재 프로젝트의 폴더 구조를 트리로 보여주고 주요 파일 3개의 역할을 설명해줘.",
      });
    } else {
      steps.push({
        narration: "간단한 자기소개로 시작해볼게요.",
        prompt: `당신이 어떤 에이전트인지, 어떤 작업을 잘하는지, 사용자가 처음 시도해볼 만한 작업 3가지를 알려줘.`,
      });
    }
  }

  // Cap at 3 steps so the tutorial stays short and snappy.
  return steps.slice(0, 3);
}

function labelFor(event: HarnessEvent): string | null {
  switch (event.type) {
    case "stage_started":
      return `${event.stage as string} started`;
    case "stage_completed":
      return `${event.stage as string} done`;
    case "thinking":
      return String(event.content ?? "").slice(0, 80);
    case "tool_call":
      return `${event.toolName as string}(...)`;
    case "file_write":
      return `write ${event.filePath as string}`;
    case "file_read":
      return `read ${event.filePath as string}`;
    case "dev_server_detected":
      return `dev server: ${event.url as string}`;
    case "sandbox_acquired":
      return `sandbox acquired`;
    case "sandbox_released":
      return `sandbox released`;
    case "error":
      return `error: ${event.message as string}`;
    default:
      return null;
  }
}
