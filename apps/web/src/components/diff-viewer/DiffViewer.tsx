"use client";

import { useState } from "react";
import { Check, X, Loader2, Code } from "lucide-react";
import { useChatStore } from "@/lib/store/chat-store";
import { useAgentStore } from "@/lib/store/agent-store";

export function DiffViewer() {
  const { messages } = useChatStore();
  const writeFileFn = useAgentStore((s) => s.writeFileFn);
  const setLastWrite = useAgentStore((s) => s.setLastWrite);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<string | null>(null); // filePath of applied edit

  // Find the last code edit result
  const lastEdit = [...messages]
    .reverse()
    .find((m) => m.codeEdit?.filePath)?.codeEdit;

  if (!lastEdit || !lastEdit.filePath) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <Code className="mx-auto h-6 w-6 text-[#D4D4D0]" />
          <p className="mt-3 text-[13px] font-medium text-[#787774]">Code Changes</p>
          <p className="mt-1 text-[11px] text-[#B4B4B0]">Diffs will appear here when AI modifies your code</p>
        </div>
      </div>
    );
  }

  const isApplied = applied === lastEdit.filePath;

  const handleApply = async () => {
    if (!lastEdit.modified || !lastEdit.filePath || !writeFileFn) return;
    setApplying(true);
    try {
      const success = await writeFileFn(lastEdit.filePath, lastEdit.modified);
      if (success) {
        setLastWrite();
        setApplied(lastEdit.filePath);
      }
    } finally {
      setApplying(false);
    }
  };

  const handleReject = () => {
    setApplied(null);
  };

  return (
    <div className="flex h-full flex-col">
      {/* File path header */}
      <div className="flex items-center justify-between border-b border-[#E0E0DC] px-3 py-2">
        <span className="truncate font-mono text-[11px] text-[#787774]">
          {lastEdit.filePath}
        </span>
        {isApplied && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-[#787774]">
            <Check className="h-3 w-3" />
            Applied
          </span>
        )}
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {lastEdit.original && (
          <section>
            <h4 className="mb-1 text-[10px] font-semibold uppercase text-red-500">Before</h4>
            <pre className="overflow-x-auto rounded-lg bg-red-50 p-3 text-[11px] font-mono text-red-800 leading-relaxed ring-1 ring-red-100">
              {lastEdit.original}
            </pre>
          </section>
        )}

        {lastEdit.modified && (
          <section>
            <h4 className="mb-1 text-[10px] font-semibold uppercase text-[#1A1A1A]">After</h4>
            <pre className="overflow-x-auto rounded-lg bg-[#F7F7F5] p-3 text-[11px] font-mono text-[#1A1A1A] leading-relaxed ring-1 ring-black/[0.04]">
              {lastEdit.modified}
            </pre>
          </section>
        )}

        {lastEdit.explanation && (
          <section>
            <h4 className="mb-1 text-[10px] font-semibold uppercase text-[#B4B4B0]">Explanation</h4>
            <p className="text-[12px] leading-relaxed text-[#787774]">{lastEdit.explanation}</p>
          </section>
        )}
      </div>

      {/* Apply / Reject buttons */}
      {lastEdit.modified && !isApplied && (
        <div className="flex gap-2 border-t border-[#E0E0DC] px-3 py-3">
          <button
            onClick={handleApply}
            disabled={applying || !writeFileFn}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] py-2.5 text-[12px] font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98] disabled:opacity-40"
          >
            {applying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {applying ? "Applying..." : "Apply"}
          </button>
          <button
            onClick={handleReject}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#F7F7F5] px-4 py-2.5 text-[12px] font-medium text-[#787774] transition-all hover:bg-[#EEEEEC] active:scale-[0.98]"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
