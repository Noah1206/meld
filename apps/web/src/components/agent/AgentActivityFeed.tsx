"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Loader2, FileText, Terminal, Search, FolderOpen, Check, X,
  Sparkles, AlertCircle, ChevronDown, ChevronRight, Zap, Eye, EyeOff,
  Clock, Pencil, Copy, CheckCheck, RefreshCw, ThumbsUp, ThumbsDown,
  Activity, Hash,
} from "lucide-react";
import { useAgentSessionStore, type AgentEvent, type PendingEdit } from "@/lib/store/agent-session-store";

// ─── File Activity Timeline Entry ──────────────────────
interface FileActivity {
  filePath: string;
  action: "read" | "edit" | "create" | "command";
  timestamp: number;
  detail?: string;
}

// ─── Step Progress (Manus-style) ───────────────────────
interface StepInfo {
  current: number;
  total: number;
  label: string;
}

function deriveSteps(events: AgentEvent[], status: string): StepInfo {
  // Derive a logical step count from event stream
  // Phases: analyzing -> reading files -> generating code -> applying changes -> validating
  const hasReads = events.some(e => e.type === "file_read" || (e.type === "tool_call" && e.toolName === "read_file"));
  const hasEdits = events.some(e => e.type === "file_edit" || (e.type === "tool_call" && e.toolName === "write_file"));
  const hasCommands = events.some(e => e.type === "command_start" || (e.type === "tool_call" && e.toolName === "run_command"));
  const hasMessages = events.some(e => e.type === "message");
  const isDone = status === "completed";

  const steps = ["Analyzing", "Reading files", "Generating code", "Applying changes", "Validating"];
  let current = 1;
  let label = steps[0];

  if (hasReads) { current = 2; label = steps[1]; }
  if (hasEdits) { current = 4; label = steps[3]; }
  else if (hasMessages && hasReads) { current = 3; label = steps[2]; }
  if (hasCommands && hasEdits) { current = 5; label = steps[4]; }
  if (isDone) { current = 5; label = "Complete"; }

  return { current, total: 5, label };
}

function deriveFileActivities(events: AgentEvent[]): FileActivity[] {
  const activities: FileActivity[] = [];
  const now = Date.now();
  let idx = 0;

  for (const e of events) {
    // Approximate timestamps by spreading events evenly
    const approxTime = now - (events.length - idx) * 500;
    idx++;

    if (e.type === "file_read" || (e.type === "tool_call" && e.toolName === "read_file")) {
      const path = (e.filePath as string) || (e.input as Record<string, string>)?.path || "unknown";
      activities.push({ filePath: path, action: "read", timestamp: approxTime });
    }
    if (e.type === "file_edit" || (e.type === "tool_call" && e.toolName === "write_file")) {
      const path = (e.filePath as string) || (e.input as Record<string, string>)?.path || "unknown";
      activities.push({ filePath: path, action: "edit", timestamp: approxTime });
    }
    if (e.type === "file_created") {
      const path = (e.filePath as string) || "unknown";
      activities.push({ filePath: path, action: "create", timestamp: approxTime });
    }
    if (e.type === "command_start" || (e.type === "tool_call" && e.toolName === "run_command")) {
      const cmd = (e.command as string) || (e.input as Record<string, string>)?.command || "command";
      activities.push({ filePath: cmd, action: "command", timestamp: approxTime, detail: cmd });
    }
  }

  return activities;
}

// ─── Step Progress Bar Component ───────────────────────
function StepProgressBar({ step }: { step: StepInfo }) {
  const pct = (step.current / step.total) * 100;
  return (
    <div className="flex items-center gap-2.5 border-b border-[#333] bg-[#1E1E1E] px-4 py-2">
      <div className="flex items-center gap-1.5">
        <Hash className="h-3 w-3 text-violet-400" />
        <span className="text-[10px] font-semibold text-[#9A9A95]">
          Step {step.current} of {step.total}
        </span>
      </div>
      <div className="flex-1 h-1.5 rounded-full bg-[#333] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-[#666] min-w-0 truncate max-w-[80px]">{step.label}</span>
    </div>
  );
}

// ─── File Activity Timeline Component ──────────────────
function FileActivityTimeline({ activities }: { activities: FileActivity[] }) {
  // Show last 8 entries
  const recent = activities.slice(-8);
  if (recent.length === 0) return null;

  const actionConfig = {
    read: { icon: FileText, color: "text-blue-400", bg: "bg-blue-400", label: "Read" },
    edit: { icon: Pencil, color: "text-emerald-400", bg: "bg-emerald-400", label: "Edited" },
    create: { icon: Check, color: "text-amber-400", bg: "bg-amber-400", label: "Created" },
    command: { icon: Terminal, color: "text-[#9A9A95]", bg: "bg-[#9A9A95]", label: "Ran" },
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="border-b border-[#333] bg-[#1A1A1A]/60 px-4 py-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Activity className="h-2.5 w-2.5 text-[#555]" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">File Activity</span>
      </div>
      <div className="space-y-0.5">
        {recent.map((a, i) => {
          const cfg = actionConfig[a.action];
          const Icon = cfg.icon;
          const fileName = a.action === "command"
            ? (a.detail || a.filePath).slice(0, 40)
            : a.filePath.split("/").pop() || a.filePath;
          const isLatest = i === recent.length - 1;

          return (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-md px-1.5 py-0.5 transition-all ${
                isLatest ? "animate-fade-in bg-[#232323]" : ""
              }`}
            >
              {/* Timeline dot */}
              <div className="relative flex flex-col items-center">
                <div className={`h-1.5 w-1.5 rounded-full ${cfg.bg} ${isLatest ? "animate-pulse" : "opacity-50"}`} />
                {i < recent.length - 1 && (
                  <div className="absolute top-2 h-3 w-px bg-[#333]" />
                )}
              </div>
              <Icon className={`h-2.5 w-2.5 flex-shrink-0 ${cfg.color} ${isLatest ? "" : "opacity-50"}`} />
              <span className={`flex-1 truncate text-[10px] ${isLatest ? "text-[#9A9A95]" : "text-[#555]"}`}>
                {cfg.label} <span className="font-medium">{fileName}</span>
              </span>
              <span className="text-[8px] text-[#444] tabular-nums flex-shrink-0">{formatTime(a.timestamp)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Completion Summary Card ───────────────────────────
function CompletionSummaryCard({ stats, elapsed, events, formatDur }: {
  stats: { filesRead: number; filesEdited: number; filesCreated: number; commandsRun: number };
  elapsed: number;
  events: AgentEvent[];
  formatDur: (ms: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  // Collect all unique file paths touched
  const allFiles = useMemo(() => {
    const files = new Map<string, "read" | "edit" | "create">();
    for (const e of events) {
      if (e.type === "file_read" || (e.type === "tool_call" && e.toolName === "read_file")) {
        const p = (e.filePath as string) || (e.input as Record<string, string>)?.path;
        if (p && !files.has(p)) files.set(p, "read");
      }
      if (e.type === "file_edit" || (e.type === "tool_call" && e.toolName === "write_file")) {
        const p = (e.filePath as string) || (e.input as Record<string, string>)?.path;
        if (p) files.set(p, "edit"); // upgrade from read to edit
      }
      if (e.type === "file_created") {
        const p = (e.filePath as string);
        if (p) files.set(p, "create");
      }
    }
    return files;
  }, [events]);

  const totalChanged = stats.filesEdited + stats.filesCreated;
  const totalAny = stats.filesRead + stats.filesEdited + stats.filesCreated + stats.commandsRun;
  const visibleStats = [
    { label: "Read", value: stats.filesRead, color: "text-blue-400" },
    { label: "Edited", value: stats.filesEdited, color: "text-emerald-400" },
    { label: "Created", value: stats.filesCreated, color: "text-amber-400" },
    { label: "Commands", value: stats.commandsRun, color: "text-[#9A9A95]" },
  ].filter((s) => s.value > 0);

  return (
    <div className="mx-3 mb-3 animate-fade-in overflow-hidden rounded-xl bg-gradient-to-b from-[#2A2A2A] to-[#252525] ring-1 ring-white/[0.08]">
      {/* Summary header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
          <Check className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-[#E8E8E5]">Task completed</p>
        </div>
      </div>

      {/* Stats grid — only show if there are any */}
      {visibleStats.length > 0 && (
        <div className={`grid gap-px bg-[#333] mx-3 mb-3 rounded-lg overflow-hidden`} style={{ gridTemplateColumns: `repeat(${visibleStats.length}, 1fr)` }}>
          {visibleStats.map((item) => (
            <div key={item.label} className="flex flex-col items-center bg-[#1E1E1E] py-2">
              <span className={`text-[14px] font-bold tabular-nums ${item.color}`}>{item.value}</span>
              <span className="text-[8px] uppercase tracking-wider text-[#555]">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Collapsible file list */}
      {allFiles.size > 0 && (
        <div className="border-t border-[#333]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-[#2E2E2E]"
          >
            {expanded ? <ChevronDown className="h-3 w-3 text-[#555]" /> : <ChevronRight className="h-3 w-3 text-[#555]" />}
            <span className="text-[10px] font-medium text-[#9A9A95]">
              {allFiles.size} file{allFiles.size !== 1 ? "s" : ""} touched
            </span>
          </button>
          {expanded && (
            <div className="max-h-[150px] overflow-y-auto px-3 pb-2 space-y-0.5">
              {Array.from(allFiles.entries()).map(([path, action]) => {
                const fileName = path.split("/").pop() || path;
                const dir = path.split("/").slice(0, -1).join("/");
                const actionColor = action === "edit" ? "text-emerald-400" : action === "create" ? "text-amber-400" : "text-blue-400";
                return (
                  <div key={path} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-[#2A2A2A] transition-colors">
                    <FileText className={`h-2.5 w-2.5 flex-shrink-0 ${actionColor}`} />
                    <span className="text-[10px] text-[#E8E8E5] font-medium truncate">{fileName}</span>
                    <span className="text-[8px] text-[#444] truncate flex-1 text-right">{dir}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [showDetails, setShowDetails] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());

  // Timer — only count while running/awaiting_approval
  useEffect(() => {
    if (status === "running" || status === "awaiting_approval") {
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      const interval = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 100);
      return () => clearInterval(interval);
    }
    // Freeze final time on completion/error/cancel
  }, [status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length, currentThinking]);

  // Statistics
  const stats = useMemo(() => {
    let filesRead = 0, filesEdited = 0, filesCreated = 0, commandsRun = 0;
    for (const e of events) {
      if (e.type === "file_read" || (e.type === "tool_call" && e.toolName === "read_file")) filesRead++;
      if (e.type === "file_edit" || (e.type === "tool_call" && e.toolName === "write_file")) filesEdited++;
      if (e.type === "file_created") filesCreated++;
      if (e.type === "command_start" || (e.type === "tool_call" && e.toolName === "run_command")) commandsRun++;
    }
    return { filesRead, filesEdited, filesCreated, commandsRun };
  }, [events]);

  // Manus-style step progress
  const stepInfo = useMemo(() => deriveSteps(events, status), [events, status]);

  // File activity timeline
  const fileActivities = useMemo(() => deriveFileActivities(events), [events]);

  const formatDur = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const s = ms / 1000;
    return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
  };

  if (status === "idle") {
    startTimeRef.current = 0;
    return null;
  }

  const isRunning = status === "running";
  const isDone = status === "completed";
  const isError = status === "error";
  const isCancelled = status === "cancelled";
  const isAwaiting = status === "awaiting_approval";

  // Find the last message event
  const lastMessage = [...events].reverse().find(e => e.type === "message");

  return (
    <div className="flex h-full flex-col">
      {/* ─── Header ─── */}
      <div className="border-b border-[#333]">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            {isRunning && <Loader2 className="h-3 w-3 animate-spin text-[#666]" />}
            {isDone && <Check className="h-3 w-3 text-[#9A9A95]" />}
            {isError && <AlertCircle className="h-3 w-3 text-red-400" />}
            {isAwaiting && <Sparkles className="h-3 w-3 text-amber-400" />}
            {isCancelled && <X className="h-3 w-3 text-[#666]" />}
            <span className="text-[11px] text-[#9A9A95]">
              {isRunning && (stepInfo.label || "Working...")}
              {isAwaiting && `Review ${pendingEdits.filter(e => e.status === "pending").length} changes`}
              {isDone && "Done"}
              {isError && "Error"}
              {isCancelled && "Cancelled"}
            </span>
            {elapsed > 500 && <span className="text-[10px] text-[#555]">{formatDur(elapsed)}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`text-[10px] transition-colors ${
                showDetails ? "text-[#9A9A95]" : "text-[#555] hover:text-[#9A9A95]"
              }`}
            >
              {showDetails ? "Hide" : "Details"}
            </button>
            {(isRunning || isAwaiting) && (
              <button onClick={onCancel} className="text-[10px] text-[#555] hover:text-red-400 transition-colors">
                Stop
              </button>
            )}
          </div>
        </div>
        {isRunning && (
          <div className="h-px bg-[#333]">
            <div
              className="h-full bg-[#555] transition-all duration-700 ease-out"
              style={{ width: `${(stepInfo.current / stepInfo.total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* ─── Main content ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Details (event stream) — collapsible */}
        {showDetails && events.length > 0 && (
          <div className="border-b border-[#333] bg-[#1A1A1A]">
            <div className="p-2.5 space-y-0.5 max-h-[200px] overflow-y-auto">
              {events.map((event, i) => (
                <EventRow key={i} event={event} />
              ))}
            </div>
          </div>
        )}

        {/* Thinking */}
        {currentThinking && (
          <div className="border-b border-[#333] bg-[#1E1E1E] px-4 py-3">
            <div className="flex items-start gap-2">
              <Loader2 className="h-3 w-3 mt-0.5 flex-shrink-0 animate-spin text-violet-400" />
              <p className="text-[12px] text-[#9A9A95] leading-relaxed whitespace-pre-wrap">{currentThinking.slice(-300)}</p>
            </div>
          </div>
        )}

        {/* ─── File Activity Timeline (Manus-style, shown while running) ─── */}
        {(isRunning || isAwaiting) && fileActivities.length > 0 && (
          <FileActivityTimeline activities={fileActivities} />
        )}


        {/* Message content — markdown-style rendering */}
        {lastMessage && (
          <div className="p-4">
            <MessageRenderer content={lastMessage.content as string} />
          </div>
        )}

        {/* Previous messages (excluding last) */}
        {events.filter(e => e.type === "message" && e !== lastMessage).length > 0 && !showDetails && (
          <div className="px-4 pb-2">
            <button
              onClick={() => setShowDetails(true)}
              className="text-[10px] text-[#555] hover:text-[#9A9A95] transition-colors"
            >
              + {events.filter(e => e.type === "message" && e !== lastMessage).length} earlier messages
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-4 mb-3 rounded-xl bg-red-500/10 px-4 py-3 ring-1 ring-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-3.5 w-3.5 text-red-400" />
              <span className="text-[11px] font-semibold text-red-400">Error</span>
            </div>
            <p className="text-[12px] text-red-300/80 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Message bottom action row (on completion/error) */}
        {(isDone || isError || isCancelled) && (
          <div className="px-4 pb-3">
            <MessageActions content={lastMessage?.content as string ?? ""} />
          </div>
        )}
      </div>

      {/* ─── Pending edits awaiting approval ─── */}
      {isAwaiting && pendingEdits.some(e => e.status === "pending") && (
        <div className="border-t border-[#3A3A3A]">
          <div className="p-3 space-y-2">
            {pendingEdits.filter(e => e.status === "pending").map((edit) => (
              <PendingEditCard
                key={edit.toolCallId}
                edit={edit}
                onApprove={() => onApprove(edit.toolCallId)}
                onReject={() => onReject(edit.toolCallId)}
              />
            ))}
          </div>
          {pendingEdits.filter(e => e.status === "pending").length > 1 && (
            <div className="flex items-center gap-2 border-t border-[#3A3A3A] px-3 py-2">
              <button onClick={onApproveAll} className="flex-1 rounded-lg bg-emerald-500/20 py-1.5 text-[11px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/30">
                Apply All
              </button>
              <button onClick={onRejectAll} className="flex-1 rounded-lg bg-[#333] py-1.5 text-[11px] font-semibold text-[#9A9A95] transition-colors hover:bg-[#3A3A3A]">
                Reject All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Message bottom actions (retry, copy, like, dislike) ────────
function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);
  const [showFeedbackMsg, setShowFeedbackMsg] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: "like" | "dislike") => {
    setFeedback(feedback === type ? null : type);
    setShowFeedbackMsg(true);
    setTimeout(() => setShowFeedbackMsg(false), 3000);
  };

  const btnCls = "rounded-md p-1.5 text-[#555] hover:text-[#9A9A95] hover:bg-[#333] transition-colors";

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <button className={btnCls} title="Retry">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleCopy} className={btnCls} title="Copy">
          {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => handleFeedback("like")}
          className={`${btnCls} ${feedback === "like" ? "!text-emerald-400 !bg-emerald-500/10" : ""}`}
          title="Good response"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => handleFeedback("dislike")}
          className={`${btnCls} ${feedback === "dislike" ? "!text-amber-400 !bg-amber-500/10" : ""}`}
          title="Bad response"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>
      {showFeedbackMsg && feedback && (
        <p className={`animate-fade-in mt-1.5 text-[10px] transition-opacity ${
          feedback === "like" ? "text-emerald-400" : "text-amber-400"
        }`}>
          {feedback === "like" ? "Thanks for the feedback!" : "Sorry about that. We'll improve."}
        </p>
      )}
    </div>
  );
}

// ─── Markdown-style message renderer ────────────────────────
function MessageRenderer({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple markdown parsing
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = "";

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${i}`} className="my-2 overflow-hidden rounded-lg bg-[#1A1A1A] ring-1 ring-white/[0.06]">
            {codeLang && <div className="border-b border-[#333] px-3 py-1 text-[9px] font-mono text-[#555]">{codeLang}</div>}
            <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-[#9A9A95]">
              {codeLines.join("\n")}
            </pre>
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

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    // Heading
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="mt-4 mb-1.5 text-[13px] font-bold text-[#E8E8E5]">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="mt-4 mb-1.5 text-[14px] font-bold text-[#E8E8E5]">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="mt-4 mb-2 text-[15px] font-bold text-[#E8E8E5]">{line.slice(2)}</h1>);
    }
    // List
    else if (line.match(/^[-*] /)) {
      elements.push(
        <div key={i} className="flex items-start gap-2 py-0.5 text-[13px] leading-relaxed text-[#E8E8E5]">
          <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[#666]" />
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    }
    // Numbered list
    else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex items-start gap-2 py-0.5 text-[13px] leading-relaxed text-[#E8E8E5]">
          <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold text-[#666]">{num}.</span>
          <span>{renderInline(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
    }
    // Horizontal rule
    else if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="my-3 border-[#333]" />);
    }
    // Empty line
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    }
    // Plain text
    else {
      elements.push(
        <p key={i} className="text-[13px] leading-relaxed text-[#E8E8E5]">
          {renderInline(line)}
        </p>
      );
    }
  });

  return (
    <div className="group relative">
      <div>{elements}</div>
      <button
        onClick={handleCopy}
        className="absolute top-0 right-0 rounded-md p-1 text-[#444] opacity-0 group-hover:opacity-100 hover:text-[#9A9A95] hover:bg-[#333] transition-all"
      >
        {copied ? <CheckCheck className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

// Inline markdown: **bold**, `code`, *italic*
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code
    const codeMatch = remaining.match(/`([^`]+)`/);

    const matches = [
      boldMatch ? { index: boldMatch.index!, length: boldMatch[0].length, type: "bold", content: boldMatch[1] } : null,
      codeMatch ? { index: codeMatch.index!, length: codeMatch[0].length, type: "code", content: codeMatch[1] } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const first = matches[0]!;
    if (first.index > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, first.index)}</span>);
    }

    if (first.type === "bold") {
      parts.push(<strong key={key++} className="font-semibold text-[#E8E8E5]">{first.content}</strong>);
    } else if (first.type === "code") {
      parts.push(<code key={key++} className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[11px] text-[#9A9A95]">{first.content}</code>);
    }

    remaining = remaining.slice(first.index + first.length);
  }

  return <>{parts}</>;
}

// ─── Event Row (compact) ──────────────────────────────────

function EventRow({ event }: { event: AgentEvent }) {
  switch (event.type) {
    case "tool_call":
      return (
        <div className="flex items-center gap-2 rounded-md px-2 py-1 text-[10px] animate-fade-in">
          <ToolIcon name={event.toolName as string} />
          <span className="text-[#777] truncate">
            {event.toolName === "read_file" && `Read ${(event.input as Record<string, string>)?.path?.split("/").pop()}`}
            {event.toolName === "write_file" && `Edit ${(event.input as Record<string, string>)?.path?.split("/").pop()}`}
            {event.toolName === "list_files" && `List files`}
            {event.toolName === "search_files" && `Search: ${(event.input as Record<string, string>)?.query}`}
            {event.toolName === "run_command" && `$ ${(event.input as Record<string, string>)?.command}`}
          </span>
        </div>
      );

    case "file_read":
      return (
        <div className="flex items-center gap-2 rounded-md px-2 py-1 text-[10px] animate-fade-in">
          <FileText className="h-2.5 w-2.5 text-[#555]" />
          <span className="text-[#666] truncate">Read {(event.filePath as string)?.split("/").pop()}</span>
        </div>
      );

    case "file_created":
      return (
        <div className="flex items-center gap-2 rounded-md px-2 py-1 text-[10px] animate-fade-in">
          <Check className="h-2.5 w-2.5 text-emerald-500" />
          <span className="text-emerald-400/80 truncate">Created {(event.filePath as string)?.split("/").pop()}</span>
        </div>
      );

    case "command_start":
      return (
        <div className="flex items-center gap-2 rounded-md bg-[#222] px-2 py-1 text-[10px] font-mono animate-fade-in">
          <Terminal className="h-2.5 w-2.5 text-[#555]" />
          <span className="text-[#777] truncate">$ {event.command as string}</span>
        </div>
      );

    case "command_output":
      return (
        <div className="px-2 py-0.5 text-[9px] font-mono text-[#555] whitespace-pre-wrap break-all leading-relaxed truncate">
          {(event.data as string)?.slice(0, 200)}
        </div>
      );

    case "command_done": {
      const exitCode = event.exitCode as number;
      return (
        <div className={`flex items-center gap-1 px-2 py-0.5 text-[9px] ${exitCode === 0 ? "text-emerald-500/70" : "text-red-400/70"}`}>
          {exitCode === 0 ? <Check className="h-2 w-2" /> : <X className="h-2 w-2" />}
          exit {exitCode}
        </div>
      );
    }

    case "message":
      return null; // Messages are rendered in the main area

    case "done":
      return null; // Replaced by completion banner

    default:
      return null;
  }
}

// ─── Tool Icon ────────────────────────────────────

function ToolIcon({ name }: { name: string }) {
  const cls = "h-2.5 w-2.5 text-[#555]";
  switch (name) {
    case "read_file": return <FileText className={cls} />;
    case "write_file": return <Pencil className={cls} />;
    case "list_files": return <FolderOpen className={cls} />;
    case "search_files": return <Search className={cls} />;
    case "run_command": return <Terminal className={cls} />;
    default: return <Sparkles className={cls} />;
  }
}

// ─── Pending Edit Card ────────────────────────────

function PendingEditCard({ edit, onApprove, onReject }: {
  edit: PendingEdit;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fileName = edit.filePath.split("/").pop();
  const isNew = !edit.original;

  const origLines = edit.original ? edit.original.split("\n").length : 0;
  const modLines = edit.modified.split("\n").length;
  const added = Math.max(0, modLines - origLines);
  const removed = Math.max(0, origLines - modLines);

  return (
    <div className="animate-fade-in overflow-hidden rounded-xl bg-[#2A2A2A] ring-1 ring-white/[0.06]">
      <div className="flex items-center justify-between px-3 py-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 min-w-0">
          {expanded ? <ChevronDown className="h-3 w-3 text-[#555]" /> : <ChevronRight className="h-3 w-3 text-[#555]" />}
          <FileText className="h-3.5 w-3.5 text-[#666] flex-shrink-0" />
          <span className="text-[12px] font-medium text-[#E8E8E5] truncate">{fileName}</span>
          {isNew && <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">NEW</span>}
          {!isNew && added > 0 && <span className="text-[9px] text-emerald-500">+{added}</span>}
          {!isNew && removed > 0 && <span className="text-[9px] text-red-400">-{removed}</span>}
        </button>
        <div className="flex items-center gap-1.5">
          <button onClick={onReject} className="rounded-md px-2 py-1 text-[10px] font-medium text-[#666] hover:text-[#E8E8E5] hover:bg-[#333] transition-colors">
            Reject
          </button>
          <button onClick={onApprove} className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors">
            Apply
          </button>
        </div>
      </div>

      {/* Explanation */}
      <div className="px-3 pb-2">
        <p className="text-[11px] text-[#9A9A95] leading-relaxed">{edit.explanation}</p>
      </div>

      {/* Expanded: diff preview */}
      {expanded && edit.modified && (
        <div className="border-t border-[#333] bg-[#1A1A1A] max-h-[150px] overflow-auto p-3 font-mono text-[10px] leading-relaxed">
          {edit.modified.split("\n").slice(0, 20).map((line, i) => (
            <div key={i} className="text-[#777] whitespace-pre-wrap">{line}</div>
          ))}
          {edit.modified.split("\n").length > 20 && (
            <div className="text-[#555] mt-1">... {edit.modified.split("\n").length - 20} more lines</div>
          )}
        </div>
      )}

      <div className="px-3 pb-2">
        <p className="text-[9px] font-mono text-[#444]">{edit.filePath}</p>
      </div>
    </div>
  );
}
