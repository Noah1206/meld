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
          <MessageSquare className="mx-auto h-6 w-6 text-[#D4D4D0]" />
          <p className="mt-3 text-[13px] font-medium text-[#787774]">AI 채팅</p>
          <p className="mt-1 text-[11px] text-[#B4B4B0]">
            엘리먼트를 선택하고 명령을 입력하세요
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
        className={`max-w-[80%] rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
          isUser
            ? "bg-[#1A1A1A] text-white"
            : "bg-[#F7F7F5] text-[#1A1A1A]"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.codeEdit && message.codeEdit.filePath && (
          <div className={`mt-1.5 rounded-md px-2 py-1 font-mono text-[10px] ${
            isUser ? "bg-white/10" : "bg-[#EEEEEC]"
          }`}>
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
      <div className="flex items-center gap-1 rounded-lg bg-[#F7F7F5] px-3 py-2">
        <span className="animate-typing-dot h-1.5 w-1.5 rounded-full bg-[#B4B4B0]" />
        <span className="animate-typing-dot animation-delay-150 h-1.5 w-1.5 rounded-full bg-[#B4B4B0]" />
        <span className="animate-typing-dot animation-delay-300 h-1.5 w-1.5 rounded-full bg-[#B4B4B0]" />
      </div>
    </div>
  );
}
