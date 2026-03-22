"use client";

import { useChatStore, type ChatMessage } from "@/lib/store/chat-store";
import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";

export function ChatMessages() {
  const { messages, isProcessing } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isProcessing]);

  // 빈 상태
  if (messages.length === 0 && !isProcessing) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-[#D1D5DB]" />
          <p className="mt-3 text-sm font-medium text-[#6B7280]">AI 채팅</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            Figma 뷰어에서 엘리먼트를 선택하고
            <br />
            명령을 입력하면 AI가 코드를 수정합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 py-3">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isProcessing && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`animate-fade-in-up flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
          isUser
            ? "bg-[#2E86C1] text-white"
            : "bg-[#F3F4F6] text-[#374151]"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.codeEdit && message.codeEdit.filePath && (
          <div className="mt-1.5 rounded-md bg-black/10 px-2 py-1 text-[10px] font-mono">
            {message.codeEdit.filePath}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-lg bg-[#F3F4F6] px-3 py-2">
        <span className="animate-typing-dot h-1.5 w-1.5 rounded-full bg-[#9CA3AF]" />
        <span className="animate-typing-dot animation-delay-150 h-1.5 w-1.5 rounded-full bg-[#9CA3AF]" />
        <span className="animate-typing-dot animation-delay-300 h-1.5 w-1.5 rounded-full bg-[#9CA3AF]" />
      </div>
    </div>
  );
}
