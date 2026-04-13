"use client";

import { useState, useCallback } from "react";
import { MessageSquare, Info, Code, GitBranch, Eye, Palette, FolderOpen, Loader2 } from "lucide-react";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatStore } from "@/lib/store/chat-store";
import { NodeProperties } from "@/components/figma-viewer/NodeProperties";
import { DiffViewer } from "@/components/diff-viewer/DiffViewer";
import { CommitDialog } from "@/components/git-panel/CommitDialog";
import { DesignSystemPanel } from "@/components/design-system/DesignSystemPanel";
import { FileTreeBrowser } from "@/components/workspace/FileTreeBrowser";
import { useAgentStore } from "@/lib/store/agent-store";

type TabId = "chat" | "files" | "properties" | "diff" | "git" | "preview" | "design";

interface AgentConnectionLike {
  startAgent: (input: { command: string; context?: Record<string, unknown> }) => void;
  cancelAgent: () => void;
  approveEdit: (toolCallId: string, approved: boolean) => void;
  getTerminalBuffer?: () => Promise<string[]>;
}

interface ChatPanelProps {
  projectId: string;
  githubOwner: string;
  githubRepo: string;
  mode?: "cloud" | "local";
  agentConnection?: AgentConnectionLike;
}

export function ChatPanel({ projectId, githubOwner, githubRepo, mode = "cloud", agentConnection }: ChatPanelProps) {
  const isLocal = mode === "local";
  const isSandbox = projectId === "sandbox";

  // Files tab state (sandbox mode)
  const fileTree = useAgentStore((s) => s.fileTree);
  const selectedFilePath = useAgentStore((s) => s.selectedFilePath);
  const setSelectedFilePath = useAgentStore((s) => s.setSelectedFilePath);
  const readFileFn = useAgentStore((s) => s.readFileFn);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  const handleSelectFile = useCallback(
    async (path: string) => {
      setSelectedFilePath(path);
      if (!readFileFn) return;
      setIsLoadingFile(true);
      try {
        const content = await readFileFn(path);
        setFileContent(content);
      } catch {
        setFileContent("// Unable to read file");
      } finally {
        setIsLoadingFile(false);
      }
    },
    [readFileFn, setSelectedFilePath],
  );

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = isLocal
    ? isSandbox
      ? [
          { id: "chat", label: "Chat", icon: <MessageSquare className="h-3.5 w-3.5" /> },
          { id: "files", label: "Files", icon: <FolderOpen className="h-3.5 w-3.5" /> },
          { id: "design", label: "Design", icon: <Palette className="h-3.5 w-3.5" /> },
          { id: "diff", label: "Diff", icon: <Code className="h-3.5 w-3.5" /> },
          { id: "git", label: "Git", icon: <GitBranch className="h-3.5 w-3.5" /> },
        ]
      : [
          { id: "chat", label: "Chat", icon: <MessageSquare className="h-3.5 w-3.5" /> },
          { id: "design", label: "Design", icon: <Palette className="h-3.5 w-3.5" /> },
          { id: "diff", label: "Diff", icon: <Code className="h-3.5 w-3.5" /> },
          { id: "preview", label: "Preview", icon: <Eye className="h-3.5 w-3.5" /> },
        ]
    : [
        { id: "chat", label: "Chat", icon: <MessageSquare className="h-3.5 w-3.5" /> },
        { id: "design", label: "Design", icon: <Palette className="h-3.5 w-3.5" /> },
        { id: "properties", label: "Properties", icon: <Info className="h-3.5 w-3.5" /> },
        { id: "diff", label: "Diff", icon: <Code className="h-3.5 w-3.5" /> },
        { id: "git", label: "Git", icon: <GitBranch className="h-3.5 w-3.5" /> },
      ];

  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const inputPosition = useChatStore((s) => s.inputPosition);

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

      {/* Tab content */}
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        {activeTab === "chat" && (
          <div className="relative flex min-h-0 flex-1 flex-col">
            {/* Input at top */}
            {inputPosition === "top" && (
              <div className="flex-shrink-0 border-b border-[#E0E0DC]">
                <ChatInput projectId={projectId} mode={mode} agentConnection={agentConnection} />
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
              <ChatMessages />
            </div>
            {/* Input at bottom */}
            {inputPosition === "bottom" && (
              <div className="flex-shrink-0 border-t border-[#E0E0DC]">
                <ChatInput projectId={projectId} mode={mode} agentConnection={agentConnection} />
              </div>
            )}
          </div>
        )}

        {activeTab === "files" && isSandbox && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className={`overflow-hidden ${selectedFilePath ? "h-[55%]" : "flex-1"}`}>
              {fileTree.length === 0 ? (
                <div className="flex h-full items-center justify-center p-6">
                  <div className="text-center">
                    <FolderOpen className="mx-auto h-5 w-5 text-[#D4D4D0]" />
                    <p className="mt-2 text-[12px] text-[#B4B4B0]">
                      Project files will appear here after scanning
                    </p>
                  </div>
                </div>
              ) : (
                <FileTreeBrowser
                  files={fileTree}
                  selectedPath={selectedFilePath}
                  onSelectFile={handleSelectFile}
                />
              )}
            </div>

            {selectedFilePath && (
              <div className="flex flex-1 flex-col bg-[#F7F7F5]">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Code className="h-3 w-3 text-[#B4B4B0]" />
                  <span className="truncate text-[11px] font-medium text-[#787774]">
                    {selectedFilePath}
                  </span>
                </div>
                <div className="mx-2 mb-2 flex-1 overflow-auto rounded-lg bg-[#EEEEEC] p-4">
                  {isLoadingFile ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-[#B4B4B0]" />
                      <span className="text-[12px] text-[#B4B4B0]">Loading...</span>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-[#1A1A1A]">
                      {fileContent}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "design" && (
          <div className="flex-1 overflow-y-auto">
            <DesignSystemPanel embedded />
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
              Check the preview in the left panel
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
