"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Loader2, FileText, Terminal, Search, Check, X,
  ChevronDown, ChevronUp, Eye,
  Copy, CheckCheck, RefreshCw, ThumbsUp, ThumbsDown,
  Globe, MonitorSmartphone, Pencil, Trash2, ArrowRight,
} from "lucide-react";
import { useAgentSessionStore, type AgentEvent, type PendingEdit } from "@/lib/store/agent-session-store";

// ─── Types ──────────────────────────────────────
interface ToolEntry {
  icon: React.ReactNode;
  text: string;
  type?: string;
  output?: string;
}

interface Step {
  label: string;
  done: boolean;
  tools: ToolEntry[];
}

// ─── Main Export ─────────────────────────────────
export function AgentActivityFeed({
  onApprove, onReject, onApproveAll, onRejectAll, onCancel,
}: {
  onApprove: (toolCallId: string) => void;
  onReject: (toolCallId: string) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onCancel: () => void;
}) {
  const { status, events, pendingEdits, currentThinking, error } = useAgentSessionStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(0);

  // Timer
  useEffect(() => {
    if (status === "running" || status === "awaiting_approval") {
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      const interval = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length, currentThinking]);

  // Build steps from events
  const steps = useMemo(() => {
    const result: Step[] = [];
    let cur: Step | null = null;

    for (const e of events) {
      if (e.type === "thinking") {
        if (cur) { cur.done = true; result.push(cur); }
        cur = { label: e.content as string, done: false, tools: [] };
      }
      if (e.type === "tool_call" && cur) {
        const name = e.toolName as string;
        const input = e.input as Record<string, string> | undefined;
        const { icon, text } = getToolDisplay(name, input);
        cur.tools.push({ icon, text, type: name });
      }
      if (e.type === "command_output" && cur && cur.tools.length > 0) {
        const last = cur.tools[cur.tools.length - 1];
        last.output = (last.output || "") + (e.data as string);
      }
      if (e.type === "tool_result" && cur && cur.tools.length > 0) {
        const last = cur.tools[cur.tools.length - 1];
        if (last.type === "web_search" || last.type === "browse_url") {
          last.output = e.result as string;
        }
      }
      if (e.type === "devServer" && cur) {
        cur.tools.push({
          icon: <MonitorSmartphone className="h-4 w-4 text-[#ccc]" />,
          text: "프리뷰가 준비되었습니다",
          type: "devServer",
          output: e.url as string,
        });
      }
    }
    if (cur) { cur.done = status !== "running"; result.push(cur); }
    return result;
  }, [events, status]);

  const messages = events.filter(e => e.type === "message");
  const isRunning = status === "running";
  const isDone = status === "completed";
  const isError = status === "error";
  const isAwaiting = status === "awaiting_approval";
  const lastMessage = [...events].reverse().find(e => e.type === "message");

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}:${String(s % 60).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`;
  };

  // Reset start time when status transitions to idle — handled in an
  // effect so we don't mutate a ref during render.
  useEffect(() => {
    if (status === "idle") startTimeRef.current = 0;
  }, [status]);

  if (status === "idle") return null;

  // Current active step index
  const activeStepIdx = steps.findIndex(s => !s.done);
  const totalSteps = Math.max(steps.length, 1);
  const currentStepNum = activeStepIdx >= 0 ? activeStepIdx + 1 : totalSteps;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1">

        {/* ─── Steps ─── */}
        {steps.map((step, i) => (
          <StepCard key={i} step={step} isLast={i === steps.length - 1} isRunning={isRunning} />
        ))}

        {/* ─── Thinking (no steps yet) ─── */}
        {isRunning && steps.length === 0 && (
          <div className="flex items-center gap-3 px-2 py-4">
            <Spinner />
            <span className="text-[15px] text-[#999]">생각 중입니다</span>
          </div>
        )}

        {/* ─── Messages ─── */}
        {messages.map((e, i) => (
          <div key={`msg-${i}`} className="mt-5 px-1">
            {i === messages.length - 1 && isRunning ? (
              <TypewriterMessage content={e.content as string} />
            ) : (
              <div className="text-[15px] leading-[1.8] text-[#E0E0E0] whitespace-pre-wrap break-words">
                <MessageRenderer content={e.content as string} />
              </div>
            )}
          </div>
        ))}

        {/* Error */}
        {error && (
          <div className="mt-4 px-1">
            <p className="text-[15px] text-red-400 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Actions */}
        {(isDone || isError) && lastMessage && (
          <div className="mt-4 px-1">
            <MessageActions content={lastMessage.content as string} />
          </div>
        )}

        {/* Pending edits */}
        {isAwaiting && pendingEdits.some(e => e.status === "pending") && (
          <div className="mt-4 px-1">
            <div className="space-y-2">
              {pendingEdits.filter(e => e.status === "pending").map((edit) => (
                <PendingEditCard key={edit.toolCallId} edit={edit} onApprove={() => onApprove(edit.toolCallId)} onReject={() => onReject(edit.toolCallId)} />
              ))}
            </div>
            {pendingEdits.filter(e => e.status === "pending").length > 1 && (
              <div className="flex items-center gap-2 pt-3">
                <button onClick={onApproveAll} className="flex-1 rounded-xl bg-white/10 py-2 text-[13px] font-medium text-[#ccc] transition-colors hover:bg-white/15">Apply All</button>
                <button onClick={onRejectAll} className="flex-1 rounded-xl bg-white/5 py-2 text-[13px] font-medium text-[#888] transition-colors hover:bg-white/10">Reject All</button>
              </div>
            )}
          </div>
        )}

        {/* Stop */}
        {(isRunning || isAwaiting) && (
          <div className="mt-4 pb-2 px-1">
            <button onClick={onCancel} className="text-[13px] text-[#666] hover:text-[#999] transition-colors">
              Stop generating
            </button>
          </div>
        )}
      </div>

      {/* ─── Bottom Progress Bar (Manus-style) ─── */}
      {isRunning && steps.length > 0 && (
        <BottomProgressBar
          stepLabel={steps[steps.length - 1]?.label || "진행 중"}
          currentStep={currentStepNum}
          totalSteps={totalSteps}
          elapsed={formatTime(elapsed)}
        />
      )}
    </div>
  );
}

// ─── Step Card (Manus-style) ────────────────────
function StepCard({ step, isLast, isRunning }: { step: Step; isLast: boolean; isRunning: boolean }) {
  const isCurrent = isLast && isRunning && !step.done;
  // `userToggled` is null until the user clicks; then it overrides the
  // default expanded-while-current behavior.
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const expanded = userToggled ?? isCurrent;
  const setExpanded = (next: boolean) => setUserToggled(next);

  return (
    <div className="mb-1">
      {/* Step header */}
      <button
        onClick={() => step.tools.length > 0 && setExpanded(!expanded)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        {/* Status circle */}
        {isCurrent ? (
          <Spinner />
        ) : (
          <div className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-[#2A2A2A]">
            <Check className="h-3 w-3 text-[#888]" />
          </div>
        )}

        {/* Label */}
        <span className={`flex-1 text-[15px] ${isCurrent ? "text-[#E0E0E0]" : "text-[#999]"}`}>
          {step.label}
        </span>

        {/* Expand arrow */}
        {step.tools.length > 0 && (
          <ChevronUp className={`h-4 w-4 text-[#555] transition-transform duration-200 ${expanded ? "" : "rotate-180"}`} />
        )}
      </button>

      {/* Expanded tools */}
      {expanded && step.tools.length > 0 && (
        <div className="ml-[34px] mb-2 space-y-1.5">
          {step.tools.map((tool, j) => (
            <ToolCard key={j} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tool Card ──────────────────────────────────
function ToolCard({ tool }: { tool: ToolEntry }) {
  const [showOutput, setShowOutput] = useState(false);

  // Dev server ready
  if (tool.type === "devServer") {
    return (
      <div className="rounded-xl bg-[#1E1E1E] border border-[#333] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2A2A2A]">
            {tool.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-[#E0E0E0]">{tool.text}</p>
            {tool.output && (
              <p className="text-[12px] text-[#888] truncate mt-0.5">{tool.output}</p>
            )}
          </div>
          {tool.output && (
            <a
              href={tool.output}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[#333] px-4 py-1.5 text-[13px] text-[#ccc] transition-colors hover:bg-[#3A3A3A]"
            >
              보기
            </a>
          )}
        </div>
      </div>
    );
  }

  // Web search
  if (tool.type === "web_search") {
    return (
      <div>
        <div className="flex items-center gap-2.5 rounded-xl bg-[#1E1E1E] border border-[#333] px-4 py-2.5">
          {tool.icon}
          <span className="text-[13px] text-[#bbb] truncate flex-1">{tool.text}</span>
          {tool.output && (
            <button onClick={() => setShowOutput(!showOutput)} className="text-[11px] text-[#666] hover:text-[#999]">
              {showOutput ? "닫기" : "결과"}
            </button>
          )}
        </div>
        {showOutput && tool.output && (
          <div className="mt-1 rounded-xl bg-[#161616] border border-[#2A2A2A] px-4 py-3 text-[12px] text-[#999] leading-relaxed max-h-[150px] overflow-y-auto whitespace-pre-wrap">
            {tool.output}
          </div>
        )}
      </div>
    );
  }

  // Browse URL
  if (tool.type === "browse_url") {
    return (
      <div>
        <div className="flex items-center gap-2.5 rounded-xl bg-[#1E1E1E] border border-[#333] px-4 py-2.5">
          {tool.icon}
          <span className="text-[13px] text-[#bbb] truncate flex-1">{tool.text}</span>
          {tool.output && (
            <button onClick={() => setShowOutput(!showOutput)} className="text-[11px] text-[#666] hover:text-[#999]">
              {showOutput ? "닫기" : "내용"}
            </button>
          )}
        </div>
        {showOutput && tool.output && (
          <div className="mt-1 rounded-xl bg-[#161616] border border-[#2A2A2A] px-4 py-3 text-[12px] text-[#999] leading-relaxed max-h-[150px] overflow-y-auto whitespace-pre-wrap">
            {tool.output}
          </div>
        )}
      </div>
    );
  }

  // Default tool (read, write, command, etc.)
  return (
    <div>
      <div className="flex items-center gap-2.5 rounded-xl bg-[#1E1E1E] border border-[#333] px-4 py-2.5">
        {tool.icon}
        <span className="text-[13px] text-[#bbb] truncate flex-1">{tool.text}</span>
        {tool.output && (
          <button onClick={() => setShowOutput(!showOutput)} className="text-[11px] text-[#666] hover:text-[#999]">
            {showOutput ? "닫기" : "출력"}
          </button>
        )}
      </div>
      {showOutput && tool.output && (
        <div className="mt-1 rounded-xl bg-[#0D0D0D] border border-[#2A2A2A] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#2A2A2A]">
            <Terminal className="h-3 w-3 text-[#555]" />
            <span className="text-[10px] font-mono text-[#555]">output</span>
          </div>
          <pre className="px-3 py-2 text-[11px] font-mono text-[#888] leading-relaxed overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap break-all">
            {tool.output.slice(-2000)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Bottom Progress Bar (Manus-style sticky bar) ───
function BottomProgressBar({ stepLabel, currentStep, totalSteps, elapsed }: {
  stepLabel: string; currentStep: number; totalSteps: number; elapsed: string;
}) {
  return (
    <div className="border-t border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Blue dot */}
        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />

        {/* Step label + time */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[#ccc] truncate">{stepLabel}</p>
          <p className="text-[11px] text-[#666]">{elapsed}  진행하는 중</p>
        </div>

        {/* Step counter */}
        <span className="text-[13px] text-[#666] flex-shrink-0">{currentStep} / {totalSteps}</span>
      </div>
    </div>
  );
}

// ─── Spinner ────────────────────────────────────
function Spinner() {
  return (
    <div className="relative h-[22px] w-[22px] flex-shrink-0">
      <div className="absolute inset-0 rounded-full border-2 border-[#333]" />
      <div className="absolute inset-0 rounded-full border-2 border-t-[#888] animate-spin" />
    </div>
  );
}

// ─── Tool Display Helpers ───────────────────────
function getToolDisplay(name: string, input?: Record<string, string>): { icon: React.ReactNode; text: string } {
  switch (name) {
    case "read_file":
      return { icon: <FileText className="h-3.5 w-3.5 text-[#888]" />, text: input?.path || "파일 읽기" };
    case "write_file":
      return { icon: <Pencil className="h-3.5 w-3.5 text-[#888]" />, text: input?.path || "파일 쓰기" };
    case "delete_file":
      return { icon: <Trash2 className="h-3.5 w-3.5 text-[#888]" />, text: input?.path || "파일 삭제" };
    case "rename_file":
      return { icon: <ArrowRight className="h-3.5 w-3.5 text-[#888]" />, text: `${input?.from || ""} → ${input?.to || ""}` };
    case "list_files":
      return { icon: <FileText className="h-3.5 w-3.5 text-[#888]" />, text: "파일 목록" };
    case "search_files":
      return { icon: <Search className="h-3.5 w-3.5 text-[#888]" />, text: `검색: ${input?.query || ""}` };
    case "run_command":
      return { icon: <Terminal className="h-3.5 w-3.5 text-[#888]" />, text: input?.command?.slice(0, 60) || "명령어 실행" };
    case "web_search":
      return { icon: <Globe className="h-3.5 w-3.5 text-[#888]" />, text: `웹 검색: ${input?.query || ""}` };
    case "browse_url":
      return { icon: <Eye className="h-3.5 w-3.5 text-[#888]" />, text: `브라우징: ${input?.url?.slice(0, 50) || ""}` };
    default:
      return { icon: <Terminal className="h-3.5 w-3.5 text-[#888]" />, text: name };
  }
}

// ─── Pending Edit Card ──────────────────────────
function PendingEditCard({ edit, onApprove, onReject }: { edit: PendingEdit; onApprove: () => void; onReject: () => void }) {
  const fileName = edit.filePath.split("/").pop() || edit.filePath;
  return (
    <div className="rounded-xl bg-[#1E1E1E] border border-[#333] px-4 py-3">
      <div className="flex items-center gap-3">
        <Pencil className="h-4 w-4 text-[#888]" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#E0E0E0] truncate">{fileName}</p>
          <p className="text-[11px] text-[#888] truncate">{edit.explanation}</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={onApprove} className="rounded-lg bg-white/10 px-3 py-1 text-[12px] text-[#ccc] hover:bg-white/15 transition-colors">적용</button>
          <button onClick={onReject} className="rounded-lg bg-white/5 px-3 py-1 text-[12px] text-[#888] hover:bg-white/10 transition-colors">거부</button>
        </div>
      </div>
    </div>
  );
}

// ─── Message Actions ────────────────────────────
function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btnCls = "rounded-md p-1.5 text-[#555] hover:text-[#999] hover:bg-[#2A2A2A] transition-colors";

  return (
    <div className="flex items-center gap-0.5">
      <button className={btnCls} title="Retry"><RefreshCw className="h-3.5 w-3.5" /></button>
      <button onClick={handleCopy} className={btnCls} title="Copy">
        {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <button onClick={() => setFeedback(f => f === "like" ? null : "like")} className={`${btnCls} ${feedback === "like" ? "!text-[#ccc] !bg-white/10" : ""}`} title="Good"><ThumbsUp className="h-3.5 w-3.5" /></button>
      <button onClick={() => setFeedback(f => f === "dislike" ? null : "dislike")} className={`${btnCls} ${feedback === "dislike" ? "!text-[#ccc] !bg-white/10" : ""}`} title="Bad"><ThumbsDown className="h-3.5 w-3.5" /></button>
    </div>
  );
}

// ─── Typewriter Message ─────────────────────────
function TypewriterMessage({ content }: { content: string }) {
  // Changing the key prop forces a fresh mount when content resets, so we
  // can drop the in-effect reset branch (react-compiler happy).
  const resetKey = content.slice(0, 20);
  return <TypewriterMessageInner key={resetKey} content={content} />;
}

function TypewriterMessageInner({ content }: { content: string }) {
  const [displayed, setDisplayed] = useState("");
  const done = displayed.length >= content.length;

  useEffect(() => {
    if (displayed.length >= content.length) return;
    const remaining = content.length - displayed.length;
    const chunkSize = remaining > 100 ? Math.floor(Math.random() * 8) + 4 : Math.floor(Math.random() * 3) + 1;
    const delay = remaining > 100 ? 15 : 30;
    const timer = setTimeout(() => setDisplayed(content.slice(0, displayed.length + chunkSize)), delay);
    return () => clearTimeout(timer);
  }, [content, displayed]);

  return (
    <div className="text-[15px] leading-[1.8] text-[#E0E0E0]">
      <MessageRenderer content={displayed} />
      {!done && <span className="inline-block w-[2px] h-[15px] bg-[#E0E0E0] ml-0.5 animate-pulse align-middle" />}
    </div>
  );
}

// ─── Markdown Message Renderer ──────────────────
function MessageRenderer({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = "";

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${i}`} className="my-2 overflow-hidden rounded-lg bg-[#161616] border border-[#2A2A2A]">
            {codeLang && <div className="px-3 py-1 text-[10px] font-mono text-[#555] border-b border-[#2A2A2A]">{codeLang}</div>}
            <pre className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-[#999]">{codeLines.join("\n")}</pre>
          </div>
        );
        codeLines = [];
        codeLang = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      return;
    }
    if (inCodeBlock) { codeLines.push(line); return; }

    if (line.startsWith("### ")) elements.push(<h3 key={i} className="mt-4 mb-1.5 text-[14px] font-semibold text-[#E0E0E0]">{line.slice(4)}</h3>);
    else if (line.startsWith("## ")) elements.push(<h2 key={i} className="mt-4 mb-1.5 text-[15px] font-semibold text-[#E0E0E0]">{line.slice(3)}</h2>);
    else if (line.startsWith("# ")) elements.push(<h1 key={i} className="mt-4 mb-2 text-[16px] font-bold text-[#E0E0E0]">{line.slice(2)}</h1>);
    else if (line.match(/^[-*] /)) {
      elements.push(
        <div key={i} className="flex items-start gap-2 py-0.5 text-[14px] leading-relaxed text-[#E0E0E0]">
          <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[#666]" />
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    }
    else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex items-start gap-2 py-0.5 text-[14px] leading-relaxed text-[#E0E0E0]">
          <span className="mt-0.5 text-[13px] text-[#666] w-4 text-right flex-shrink-0">{num}.</span>
          <span>{renderInline(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
    }
    else if (line.match(/^---+$/)) elements.push(<hr key={i} className="my-3 border-[#2A2A2A]" />);
    else if (line.trim() === "") elements.push(<div key={i} className="h-2" />);
    else elements.push(<p key={i} className="text-[14px] leading-relaxed text-[#E0E0E0]">{renderInline(line)}</p>);
  });

  return (
    <div className="group relative">
      <div>{elements}</div>
      <button
        onClick={handleCopy}
        className="absolute top-0 right-0 rounded-md p-1 text-[#444] opacity-0 group-hover:opacity-100 hover:text-[#999] hover:bg-[#2A2A2A] transition-all"
      >
        {copied ? <CheckCheck className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

// Inline markdown
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    const matches = [
      boldMatch ? { index: boldMatch.index!, length: boldMatch[0].length, type: "bold" as const, content: boldMatch[1] } : null,
      codeMatch ? { index: codeMatch.index!, length: codeMatch[0].length, type: "code" as const, content: codeMatch[1] } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) { parts.push(<span key={key++}>{remaining}</span>); break; }

    const first = matches[0]!;
    if (first.index > 0) parts.push(<span key={key++}>{remaining.slice(0, first.index)}</span>);

    if (first.type === "bold") parts.push(<strong key={key++} className="font-semibold text-[#E0E0E0]">{first.content}</strong>);
    else parts.push(<code key={key++} className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[12px] text-[#999]">{first.content}</code>);

    remaining = remaining.slice(first.index + first.length);
  }

  return <>{parts}</>;
}
