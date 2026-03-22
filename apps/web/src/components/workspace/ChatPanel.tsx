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

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = isLocal
    ? [
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
    <div className="flex h-full flex-col">
      {/* 탭 바 */}
      <div className="flex border-b border-[#E5E7EB]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-[#2E86C1] text-[#2E86C1]"
                : "text-[#6B7280] hover:text-[#374151]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex min-h-0 flex-1 flex-col">
        {activeTab === "chat" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ChatMessages />
            </div>
            <div className="flex-shrink-0 border-t border-[#E5E7EB]">
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

        {activeTab === "git" && !isLocal && (
          <div className="flex-1 overflow-y-auto">
            <CommitDialog
              projectId={projectId}
              githubOwner={githubOwner}
              githubRepo={githubRepo}
              githubBranch="main"
            />
          </div>
        )}

        {activeTab === "preview" && isLocal && (
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-center text-xs text-[#9CA3AF]">
              좌측 패널에서 프리뷰를 확인하세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
