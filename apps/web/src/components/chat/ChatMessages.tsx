"use client";

import { useChatStore, type ChatMessage } from "@/lib/store/chat-store";
import { useEffect, useRef } from "react";

export function ChatMessages() {
  const { messages } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div className="max-h-48 overflow-y-auto border-b border-[#E5E7EB] px-4 py-2 space-y-2">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
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
