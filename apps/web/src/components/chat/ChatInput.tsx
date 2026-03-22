"use client";

import { useState, useRef, useCallback } from "react";
import { Loader2, Send } from "lucide-react";
import { useFigmaStore } from "@/lib/store/figma-store";
import { useChatStore } from "@/lib/store/chat-store";
import { useAgentStore } from "@/lib/store/agent-store";
import type { LLMProviderType } from "@/lib/store/chat-store";
import { trpc } from "@/lib/trpc/client";

const LLM_OPTIONS: { value: LLMProviderType; label: string }[] = [
  { value: "claude", label: "Claude" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "gemini", label: "Gemini" },
];

interface ChatInputProps {
  projectId: string;
  mode?: "cloud" | "local";
}

export function ChatInput({ projectId, mode = "cloud" }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { selectedNode } = useFigmaStore();
  const { isProcessing, provider, addMessage, setProcessing, setError, setProvider } =
    useChatStore();

  const { selectedFilePath, readFileFn, writeFileFn } = useAgentStore();
  const editCodeMutation = trpc.ai.editCode.useMutation();

  const isLocal = mode === "local";
  const canSend = isLocal
    ? !!input.trim() && !!selectedFilePath
    : !!input.trim() && !!selectedNode;

  const handleSend = useCallback(async () => {
    if (!canSend || isProcessing) return;

    const command = input.trim();
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    addMessage({ role: "user", content: command });
    setProcessing(true);

    try {
      if (isLocal && selectedFilePath && readFileFn && writeFileFn) {
        // 로컬 모드: 에이전트에서 읽기 → AI → 에이전트에 쓰기
        const currentCode = await readFileFn(selectedFilePath);

        const result = await editCodeMutation.mutateAsync({
          projectId,
          figmaNodeId: "local",
          figmaNodeName: selectedFilePath.split("/").pop(),
          command,
          filePath: selectedFilePath,
          currentCode,
          provider,
        });

        // AI 결과를 로컬 파일에 쓰기
        if (result.modified) {
          const success = await writeFileFn(selectedFilePath, result.modified);
          addMessage({
            role: "assistant",
            content: `${result.explanation}\n\n${success ? "✅" : "❌"} ${selectedFilePath}`,
            codeEdit: result,
          });
        } else {
          addMessage({
            role: "assistant",
            content: result.explanation,
            codeEdit: result,
          });
        }
      } else {
        // 클라우드 모드: 기존 흐름
        const result = await editCodeMutation.mutateAsync({
          projectId,
          figmaNodeId: selectedNode?.id ?? "local",
          figmaNodeName: selectedNode?.name,
          command,
          provider,
        });

        addMessage({
          role: "assistant",
          content: result.explanation,
          codeEdit: result,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 처리 실패");
      addMessage({
        role: "assistant",
        content: `오류: ${err instanceof Error ? err.message : "처리 실패"}`,
      });
    } finally {
      setProcessing(false);
    }
  }, [canSend, input, isProcessing, isLocal, selectedFilePath, readFileFn, writeFileFn, projectId, selectedNode, provider, addMessage, setProcessing, setError, editCodeMutation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // textarea 자동 높이 조절
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className="space-y-2 px-3 py-3">
      {/* 상단: 선택된 노드/파일 + LLM 선택 */}
      <div className="flex items-center gap-2">
        {isLocal ? (
          <span className="truncate rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
            {selectedFilePath ?? "파일을 선택하세요"}
          </span>
        ) : selectedNode ? (
          <span className="animate-fade-in truncate rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-[#2E86C1]">
            {selectedNode.name}
          </span>
        ) : (
          <span className="text-xs text-[#9CA3AF]">노드를 선택하세요</span>
        )}
        <div className="flex-1" />
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as LLMProviderType)}
          disabled={isProcessing}
          className="rounded-md border border-[#E5E7EB] bg-white px-2 py-1 text-xs text-[#374151] focus:border-[#2E86C1] focus:outline-none disabled:opacity-50"
        >
          {LLM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 하단: textarea + Send */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={
            isLocal
              ? selectedFilePath
                ? "코드 수정 명령을 입력하세요... (Enter 전송)"
                : "먼저 좌측에서 파일을 선택하세요"
              : selectedNode
                ? "명령을 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
                : "먼저 Figma 뷰어에서 엘리먼트를 선택하세요"
          }
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          className="flex-1 resize-none rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm placeholder:text-[#9CA3AF] focus:border-[#2E86C1] focus:outline-none focus:ring-1 focus:ring-[#2E86C1] disabled:opacity-50"
          style={{ maxHeight: 120 }}
          disabled={(isLocal ? !selectedFilePath : !selectedNode) || isProcessing}
        />
        <button
          onClick={handleSend}
          disabled={!canSend || isProcessing}
          className="flex-shrink-0 rounded-lg bg-[#2E86C1] p-2 text-white transition-all hover:bg-[#2573A8] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
