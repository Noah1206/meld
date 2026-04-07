"use client";

import { useChatStore, type ChatMessage } from "@/lib/store/chat-store";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  MessageSquare, Clock, ChevronDown, ChevronRight, FileText,
  Check, Copy, Sparkles, Loader2, Zap, Brain, Code, Pencil,
} from "lucide-react";

export function ChatMessages() {
  const { messages, isProcessing, processingStartTime } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const inputPosition = useChatStore((s) => s.inputPosition);

  useEffect(() => {
    if (inputPosition === "top") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isProcessing, inputPosition]);

  if (messages.length === 0 && !isProcessing) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3 px-4 py-4">
      <div ref={topRef} />
      {messages.map((msg, i) => (
        <MessageBubble key={msg.id} message={msg} isLatest={i === messages.length - 1} />
      ))}
      {isProcessing && <ThinkingIndicator startTime={processingStartTime} />}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F7F7F5] to-[#EEEEEC]">
          <Sparkles className="h-5 w-5 text-[#787774]" />
        </div>
        <p className="mt-4 text-[14px] font-semibold text-[#1A1A1A]">Meld AI</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#B4B4B0]">
          Select a file or element<br />
          and describe your changes
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {["Change color", "Edit text", "Adjust layout", "Add component"].map((hint) => (
            <span key={hint} className="rounded-full bg-[#F7F7F5] px-3 py-1.5 text-[11px] text-[#787774]">
              {hint}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ────────────────────────────────────────
function MessageBubble({ message, isLatest }: { message: ChatMessage; isLatest: boolean }) {
  const isUser = message.role === "user";
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const timeAgo = useMemo(() => formatTimeAgo(message.timestamp), [message.timestamp]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="animate-fade-in-up flex justify-end">
        <div className="group relative max-w-[85%]">
          <div className="rounded-2xl rounded-tr-md bg-[#1A1A1A] px-4 py-2.5 text-[13px] leading-relaxed text-white">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="mt-1 flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-[10px] text-[#B4B4B0]">{timeAgo}</span>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  const hasCodeEdit = message.codeEdit && message.codeEdit.filePath;
  const isError = message.content.startsWith("Error:");

  return (
    <div className="animate-fade-in-up flex justify-start">
      <div className="group relative max-w-[90%]">
        {/* Avatar + header */}
        <div className="mb-1.5 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#F7F7F5] to-[#EEEEEC]">
            <Sparkles className="h-2.5 w-2.5 text-[#787774]" />
          </div>
          <span className="text-[11px] font-semibold text-[#787774]">Meld AI</span>
          {message.duration != null && (
            <span className="flex items-center gap-1 text-[10px] text-[#B4B4B0]">
              <Zap className="h-2.5 w-2.5" />
              {formatDuration(message.duration)}
            </span>
          )}
        </div>

        {/* Message body */}
        <div className={`rounded-2xl rounded-tl-md px-4 py-3 text-[13px] leading-relaxed ${
          isError
            ? "bg-red-50 text-red-700 ring-1 ring-red-100"
            : "bg-[#F7F7F5] text-[#1A1A1A]"
        }`}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Code change details */}
        {hasCodeEdit && (
          <div className="mt-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-3 py-1.5 text-[11px] font-medium text-[#787774] transition-all hover:bg-[#EEEEEC]"
            >
              {showDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <FileText className="h-3 w-3" />
              {message.codeEdit!.filePath.split("/").pop()}
              {message.codeEdit!.modified && (
                <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                  MODIFIED
                </span>
              )}
            </button>

            {showDetails && (
              <div className="mt-2 animate-fade-in overflow-hidden rounded-xl bg-[#1E1E1E] ring-1 ring-[#333]">
                {/* File path header */}
                <div className="flex items-center justify-between border-b border-[#333] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Code className="h-3 w-3 text-[#666]" />
                    <span className="font-mono text-[10px] text-[#9A9A95]">{message.codeEdit!.filePath}</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="rounded-md p-1 text-[#555] hover:text-[#9A9A95] hover:bg-[#333] transition-colors"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>

                {/* Diff preview */}
                {message.codeEdit!.original && message.codeEdit!.modified ? (
                  <div className="max-h-[200px] overflow-auto p-3">
                    <DiffPreview original={message.codeEdit!.original} modified={message.codeEdit!.modified} />
                  </div>
                ) : message.codeEdit!.modified ? (
                  <div className="max-h-[200px] overflow-auto p-3">
                    <pre className="font-mono text-[11px] leading-relaxed text-[#9A9A95] whitespace-pre-wrap">
                      {message.codeEdit!.modified.slice(0, 500)}
                      {message.codeEdit!.modified.length > 500 && "\n..."}
                    </pre>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-[10px] text-[#B4B4B0]">{timeAgo}</span>
          <button onClick={handleCopy} className="ml-2 rounded-md p-1 text-[#B4B4B0] hover:text-[#787774] hover:bg-[#F7F7F5] transition-colors">
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Simple Diff Preview ────────────────────────────────
function DiffPreview({ original, modified }: { original: string; modified: string }) {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");

  // Simple line-by-line diff (show up to 20 lines)
  const diffs: { type: "same" | "add" | "remove"; line: string }[] = [];
  const maxLines = Math.max(origLines.length, modLines.length);

  for (let i = 0; i < Math.min(maxLines, 30); i++) {
    const orig = origLines[i];
    const mod = modLines[i];
    if (orig === mod) {
      if (orig !== undefined) diffs.push({ type: "same", line: orig });
    } else {
      if (orig !== undefined) diffs.push({ type: "remove", line: orig });
      if (mod !== undefined) diffs.push({ type: "add", line: mod });
    }
  }

  if (maxLines > 30) {
    diffs.push({ type: "same", line: `... ${maxLines - 30} more lines` });
  }

  return (
    <div className="font-mono text-[11px] leading-[1.6]">
      {diffs.map((d, i) => (
        <div
          key={i}
          className={`whitespace-pre-wrap break-all px-2 ${
            d.type === "add" ? "bg-emerald-500/10 text-emerald-400" :
            d.type === "remove" ? "bg-red-500/10 text-red-400 line-through opacity-60" :
            "text-[#666]"
          }`}
        >
          <span className="mr-2 inline-block w-3 text-right text-[9px] opacity-50">
            {d.type === "add" ? "+" : d.type === "remove" ? "-" : " "}
          </span>
          {d.line}
        </div>
      ))}
    </div>
  );
}

// ─── Thinking Indicator (Cursor/Manus style) ──────────
function ThinkingIndicator({ startTime }: { startTime: number | null }) {
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      const e = Date.now() - startTime;
      setElapsed(e);
      // Phase transition: 0-3s analyzing, 3-8s generating, 8s+ applying
      if (e < 3000) setPhase(0);
      else if (e < 8000) setPhase(1);
      else setPhase(2);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime]);

  const phases = [
    { icon: <Brain className="h-3.5 w-3.5" />, label: "Analyzing code...", color: "text-blue-400" },
    { icon: <Pencil className="h-3.5 w-3.5" />, label: "Generating code...", color: "text-violet-400" },
    { icon: <Zap className="h-3.5 w-3.5" />, label: "Applying changes...", color: "text-amber-400" },
  ];

  const current = phases[phase];

  return (
    <div className="animate-fade-in flex justify-start">
      <div className="max-w-[90%]">
        {/* Avatar */}
        <div className="mb-1.5 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#F7F7F5] to-[#EEEEEC]">
            <Sparkles className="h-2.5 w-2.5 text-[#787774]" />
          </div>
          <span className="text-[11px] font-semibold text-[#787774]">Meld AI</span>
        </div>

        {/* Thinking card */}
        <div className="overflow-hidden rounded-2xl rounded-tl-md bg-[#F7F7F5] ring-1 ring-[#E0E0DC]">
          {/* Status display */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className={`animate-pulse ${current.color}`}>{current.icon}</div>
            <div className="flex-1">
              <p className={`text-[12px] font-medium ${current.color}`}>{current.label}</p>
              <p className="mt-0.5 text-[10px] text-[#B4B4B0]">
                {formatDuration(elapsed)} elapsed
              </p>
            </div>
            <Loader2 className="h-4 w-4 animate-spin text-[#B4B4B0]" />
          </div>

          {/* Progress bar */}
          <div className="h-[2px] bg-[#E0E0DC]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 via-violet-400 to-amber-400 transition-all duration-500 ease-out"
              style={{ width: `${Math.min(elapsed / 150, 90)}%` }}
            />
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-6 px-4 py-2">
            {phases.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                  i < phase ? "bg-emerald-400" : i === phase ? `animate-pulse bg-current ${p.color}` : "bg-[#D4D4D0]"
                }`} />
                <span className={`text-[10px] transition-colors duration-300 ${
                  i <= phase ? "text-[#787774]" : "text-[#D4D4D0]"
                }`}>
                  {i === 0 ? "Analyze" : i === 1 ? "Generate" : "Apply"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Utils ──────────────────────────────────────────────
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.floor(s % 60)}s`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString("en-US");
}
