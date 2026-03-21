"use client";

import { useState } from "react";
import { useFigmaStore } from "@/lib/store/figma-store";
import { useChatStore } from "@/lib/store/chat-store";
import { trpc } from "@/lib/trpc/client";

interface ChatInputProps {
  projectId: string;
}

export function ChatInput({ projectId }: ChatInputProps) {
  const [input, setInput] = useState("");
  const { selectedNode } = useFigmaStore();
  const { isProcessing, addMessage, setProcessing, setError } = useChatStore();

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
      <div className="flex-1 flex items-center gap-2">
        {selectedNode && (
          <span className="flex-shrink-0 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-[#2E86C1]">
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
        className="rounded-lg bg-[#2E86C1] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2573A8] disabled:opacity-50"
      >
        {isProcessing ? "처리중..." : "Send"}
      </button>
    </div>
  );
}
