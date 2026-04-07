import { useState } from "react";
import { MessageSquare, Code, Eye, Send } from "lucide-react";

type TabId = "chat" | "diff" | "preview";

export function ChatPanel() {
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [input, setInput] = useState("");

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "chat", label: "Chat", icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { id: "diff", label: "Diff", icon: <Code className="h-3.5 w-3.5" /> },
    { id: "preview", label: "Preview", icon: <Eye className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-[#E0E0DC]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors ${
              activeTab === tab.id
                ? "text-[#1A1A1A]"
                : "text-[#B4B4B0] hover:text-[#787774]"
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full bg-[#1A1A1A]" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col">
        {activeTab === "chat" && (
          <>
            {/* Empty state */}
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-[#E0E0DC]" />
                <p className="mt-3 text-[14px] font-medium text-[#1A1A1A]">AI Chat</p>
                <p className="mt-1 text-[12px] text-[#B4B4B0]">Select a file and enter a command</p>
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-[#E0E0DC] p-3">
              <div className="flex items-center gap-2 rounded-xl border border-[#E0E0DC] px-3 py-2.5">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Select a file"
                  className="flex-1 bg-transparent text-[13px] text-[#1A1A1A] placeholder:text-[#B4B4B0] outline-none"
                />
                <button className="rounded-lg p-1.5 text-[#B4B4B0] transition-colors hover:bg-[#F5F5F4] hover:text-[#787774]">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === "diff" && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-[12px] text-[#B4B4B0]">Code changes will be shown here</p>
          </div>
        )}

        {activeTab === "preview" && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-[12px] text-[#B4B4B0]">Preview will be shown here</p>
          </div>
        )}
      </div>
    </div>
  );
}
