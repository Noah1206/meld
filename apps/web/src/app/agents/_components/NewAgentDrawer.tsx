"use client";

// Left-half slide-in drawer for conversational agent creation.
//
// Flow:
//   1. User opens the drawer from the /agents dashboard
//   2. User types what they want; Claude streams a reply + an updated draft
//   3. User refines by chatting more; draft is updated each turn
//   4. When Claude emits ready=true (or user clicks "Create this agent"),
//      we POST the draft to /api/harness/agents and close the drawer.

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Loader2, Sparkles, Settings2, Circle } from "lucide-react";
import type { AgentDefinitionDraft } from "@/lib/harness/agent-definition";
import type { AgentTemplate } from "./agent-templates";

export interface NewAgentDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Called after an agent is successfully created. */
  onCreated: () => void;
  /**
   * When set, the drawer primes its draft with this template and shows
   * a small chip above the input. The chat history itself stays empty.
   */
  initialTemplate?: AgentTemplate | null;
  /** Called when the user dismisses the template chip (×). */
  onClearTemplate?: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function NewAgentDrawer({
  open,
  onClose,
  onCreated,
  initialTemplate,
  onClearTemplate,
}: NewAgentDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<AgentDefinitionDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derive setup tasks from the draft's required MCP servers. Each MCP the
  // agent depends on becomes one "Connect X" task shown above the input.
  const setupTasks = useMemo(() => deriveSetupTasks(draft), [draft]);

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

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, pending]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setMessages([]);
        setInput("");
        setDraft(null);
        setReady(false);
        setPending(false);
        setSaving(false);
        setError(null);
      }, 300);
    }
  }, [open]);

  // Whenever the selected template changes, prime `draft` so the next
  // chat turn already has the template's config to refine — but DON'T
  // touch `messages`. The chat stays in its empty / in-progress state.
  // The selected template is surfaced visually as a chip above the input.
  useEffect(() => {
    if (!initialTemplate) {
      setDraft(null);
      setReady(false);
      return;
    }
    setDraft(initialTemplate.draft);
    setReady(false);
  }, [initialTemplate]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || pending) return;
    setError(null);
    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setPending(true);
    try {
      const res = await fetch("/api/harness/agents/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          currentDraft: draft,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "draft failed");
      }
      setMessages([
        ...nextMessages,
        { role: "assistant", content: data.reply as string },
      ]);
      setDraft(data.draft as AgentDefinitionDraft);
      setReady(Boolean(data.ready));
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setPending(false);
    }
  }


  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl rounded-r-none border border-r-0 border-white/[0.1] bg-[#1C1C1C]"
      aria-label="New agent chat"
    >
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-white">
            New Agents
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#888] transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Messages — empty state shows centered prompt */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
          {messages.length === 0 && !pending ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <h3 className="text-[20px] font-bold tracking-[-0.02em] text-white">
                What do you want to build?
              </h3>
              <p className="mt-2 text-[14px] text-[#888]">
                Describe your agent or start with a template.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {pending && (
                <div className="flex items-center gap-2 pl-2 text-[12px] text-[#666]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-3 rounded-xl bg-red-500/[0.08] px-4 py-3 ring-1 ring-red-500/30">
            <p className="text-[12px] text-red-300">{error}</p>
          </div>
        )}

        {/* Input area */}
        <div className="p-4">
          {/* Setup tasks — things the user must do for the agent to work
              (e.g. "Connect Notion"). Derived from the draft's required MCP
              servers. We intentionally don't show the agent summary card. */}
          {setupTasks.length > 0 && (
            <div className="mb-3">
              <SetupTasksCard tasks={setupTasks} onDismiss={onClearTemplate} />
            </div>
          )}
          <div className="relative rounded-2xl border border-white/[0.12] p-3 transition-all focus-within:border-white/[0.25]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="만들고 싶은 에이전트를 설명해 주세요..."
              rows={2}
              disabled={pending || saving}
              className="w-full resize-none bg-transparent px-3 py-2 text-[14px] leading-relaxed text-white outline-none placeholder:text-[#555] disabled:opacity-60"
            />
            <div className="flex items-center justify-between px-1 pt-2">
              <span className="font-mono text-[10px] text-[#555]">
                {ready ? "READY" : draft?.name ? "DRAFTING" : "TALKING"}
              </span>
              <button
                onClick={() => void sendMessage()}
                disabled={!input.trim() || pending || saving}
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

// ─── Message bubble ──────────────────────────────────
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
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-white/[0.06] px-4 py-2.5 text-[14px] leading-relaxed text-white ring-1 ring-white/[0.08]">
        {msg.content}
      </div>
    </div>
  );
}

// ─── Setup tasks card ────────────────────────────────
// Replaces the old draft-summary card. Lists the prerequisite actions the
// user still needs to do for the agent to actually work — e.g. "Connect
// your Notion workspace" for a Notion RAG template.
interface SetupTask {
  id: string;
  label: string;
  hint?: string;
}

const MCP_LABELS: Record<string, { label: string; hint: string }> = {
  notion: { label: "Notion 워크스페이스 연결", hint: "Notion 페이지를 읽고 검색하려면 워크스페이스를 연결해 주세요." },
  github: { label: "GitHub 저장소 연결", hint: "GitHub 계정을 연결하고 접근할 레포를 선택해 주세요." },
  vercel: { label: "Vercel 프로젝트 연결", hint: "배포 상태를 확인하려면 Vercel 계정을 연결해 주세요." },
  supabase: { label: "Supabase 프로젝트 연결", hint: "데이터베이스에 접근하려면 Supabase 키를 연결해 주세요." },
  linear: { label: "Linear 팀 연결", hint: "이슈를 읽고 만들려면 Linear 워크스페이스를 연결해 주세요." },
  slack: { label: "Slack 워크스페이스 연결", hint: "메시지를 읽고 보내려면 Slack 봇 토큰을 연결해 주세요." },
  canva: { label: "Canva 계정 연결", hint: "디자인을 불러오려면 Canva 계정을 연결해 주세요." },
  figma: { label: "Figma 파일 연결", hint: "프레임을 불러오려면 Figma 계정을 연결해 주세요." },
  sentry: { label: "Sentry 프로젝트 연결", hint: "에러를 조회하려면 Sentry 계정을 연결해 주세요." },
  gmail: { label: "Gmail 계정 연결", hint: "메일을 읽고 보내려면 Google 계정을 연결해 주세요." },
};

function deriveSetupTasks(draft: AgentDefinitionDraft | null): SetupTask[] {
  if (!draft) return [];
  const mcps = draft.mcpServerIds ?? [];
  return mcps.map(id => {
    const meta = MCP_LABELS[id];
    return {
      id,
      label: meta?.label ?? `${id} 연결`,
      hint: meta?.hint,
    };
  });
}

function SetupTasksCard({
  tasks,
  onDismiss,
}: {
  tasks: SetupTask[];
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.12] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Settings2 className="h-3 w-3 text-[#888]" />
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#888]">
            Setup required
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded-md p-0.5 text-[#666] transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Dismiss setup"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {tasks.map(task => (
          <li key={task.id} className="flex items-start gap-2.5">
            <Circle className="mt-[3px] h-3 w-3 flex-shrink-0 text-[#666]" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium leading-snug text-white">
                {task.label}
              </p>
              {task.hint && (
                <p className="mt-0.5 text-[11px] leading-snug text-[#888]">
                  {task.hint}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
