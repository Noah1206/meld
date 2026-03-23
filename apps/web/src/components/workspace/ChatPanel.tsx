"use client";

import { useState } from "react";
import { MessageSquare, Info, Code, GitBranch, Eye } from "lucide-react";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { NodeProperties } from "@/components/figma-viewer/NodeProperties";
import { DiffViewer } from "@/components/diff-viewer/DiffViewer";
import { CommitDialog } from "@/components/git-panel/CommitDialog";

type TabId = "chat" | "properties" | "diff" | "git" | "preview";

interface ChatPanelProps {
  projectId: string;
  githubOwner: string;
  githubRepo: string;
  mode?: "cloud" | "local";
}

export function ChatPanel({ projectId, githubOwner, githubRepo, mode = "cloud" }: ChatPanelProps) {
  const isLocal = mode === "local";
  const isSandbox = projectId === "sandbox";

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = isLocal
    ? isSandbox
      ? [
          { id: "chat", label: "Chat", icon: <MessageSquare className="h-3.5 w-3.5" /> },
          { id: "diff", label: "Diff", icon: <Code className="h-3.5 w-3.5" /> },
          { id: "git", label: "Git", icon: <GitBranch className="h-3.5 w-3.5" /> },
        ]
      : [
          { id: "chat", label: "Chat", icon: <MessageSquare className="h-3.5 w-3.5" /> },
          { id: "diff", label: "Diff", icon: <Code className="h-3.5 w-3.5" /> },
          { id: "preview", label: "Preview", icon: <Eye className="h-3.5 w-3.5" /> },
        ]
    : [
        { id: "chat", label: "Chat", icon: <MessageSquare className="h-3.5 w-3.5" /> },
        { id: "properties", label: "속성", icon: <Info className="h-3.5 w-3.5" /> },
        { id: "diff", label: "Diff", icon: <Code className="h-3.5 w-3.5" /> },
        { id: "git", label: "Git", icon: <GitBranch className="h-3.5 w-3.5" /> },
      ];

  const [activeTab, setActiveTab] = useState<TabId>("chat");

  return (
    <div className="flex h-full flex-col bg-[#F7F7F5]">
      {/* 탭 바 */}
      <div className="flex bg-[#F7F7F5]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-[#1A1A1A]"
                : "text-[#787774] hover:text-[#1A1A1A]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        {activeTab === "chat" && (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pb-2">
              <ChatMessages />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-[var(--input-h,100px)] h-8 bg-gradient-to-t from-white to-transparent" />
            <div className="flex-shrink-0 bg-[#F7F7F5]">
              <ChatInput projectId={projectId} mode={mode} />
            </div>
          </div>
        )}

        {activeTab === "properties" && !isLocal && (
          <div className="flex-1 overflow-y-auto">
            <NodeProperties />
          </div>
        )}

        {activeTab === "diff" && (
          <div className="flex-1 overflow-y-auto">
            <DiffViewer />
          </div>
        )}

        {activeTab === "git" && (!isLocal || isSandbox) && (
          <div className="flex-1 overflow-y-auto">
            <CommitDialog
              projectId={projectId}
              githubOwner={githubOwner}
              githubRepo={githubRepo}
              githubBranch="main"
            />
          </div>
        )}

        {activeTab === "preview" && isLocal && !isSandbox && (
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-center text-[12px] text-[#B4B4B0]">
              좌측 패널에서 프리뷰를 확인하세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
