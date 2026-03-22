"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useFigmaStore } from "@/lib/store/figma-store";
import { useChatStore } from "@/lib/store/chat-store";
import type { LLMProviderType } from "@/lib/store/chat-store";
import { trpc } from "@/lib/trpc/client";

const LLM_OPTIONS: { value: LLMProviderType; label: string }[] = [
  { value: "claude", label: "Claude" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "gemini", label: "Gemini" },
];

interface ChatInputProps {
  projectId: string;
}

export function ChatInput({ projectId }: ChatInputProps) {
  const [input, setInput] = useState("");
  const { selectedNode } = useFigmaStore();
  const { isProcessing, provider, addMessage, setProcessing, setError, setProvider } =
    useChatStore();

  const editCodeMutation = trpc.ai.editCode.useMutation();

  const handleSend = async () => {
    if (!input.trim() || !selectedNode || isProcessing) return;

    const command = input.trim();
    setInput("");

    // 사용자 메시지 추가
    addMessage({ role: "user", content: command });
    setProcessing(true);

    try {
      const result = await editCodeMutation.mutateAsync({
        projectId,
        figmaNodeId: selectedNode.id,
        command,
        provider,
      });

      // AI 응답 추가
      addMessage({
        role: "assistant",
        content: result.explanation,
        codeEdit: result,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 처리 실패");
      addMessage({
        role: "assistant",
        content: `오류: ${err instanceof Error ? err.message : "처리 실패"}`,
      });
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value as LLMProviderType)}
        disabled={isProcessing}
        className="flex-shrink-0 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#374151] focus:border-[#2E86C1] focus:outline-none focus:ring-1 focus:ring-[#2E86C1] disabled:opacity-50"
      >
        {LLM_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="flex-1 flex items-center gap-2">
        {selectedNode && (
          <span className="animate-fade-in flex-shrink-0 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-[#2E86C1]">
            {selectedNode.name}
          </span>
        )}
        <input
          type="text"
          placeholder={
            selectedNode
              ? "이 엘리먼트에 대해 명령을 입력하세요..."
              : "먼저 Figma 뷰어에서 엘리먼트를 선택하세요"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm placeholder:text-[#9CA3AF] focus:border-[#2E86C1] focus:outline-none focus:ring-1 focus:ring-[#2E86C1]"
          disabled={!selectedNode || isProcessing}
        />
      </div>
      <button
        onClick={handleSend}
        disabled={!selectedNode || !input.trim() || isProcessing}
        className="flex items-center gap-1.5 rounded-lg bg-[#2E86C1] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#2573A8] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            처리중...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send
          </>
        )}
      </button>
    </div>
  );
}
