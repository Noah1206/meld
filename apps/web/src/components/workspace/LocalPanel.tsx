"use client";

import { useState, useCallback } from "react";
import { FolderOpen, Eye, Code, Loader2 } from "lucide-react";
import { FileTreeBrowser } from "./FileTreeBrowser";
import { PreviewFrame } from "./PreviewFrame";
import type { FileEntry } from "@figma-code-bridge/shared";

type LeftTab = "files" | "preview";

interface LocalPanelProps {
  connected: boolean;
  fileTree: FileEntry[];
  projectName: string | null;
  devServerUrl: string | null;
  devServerFramework: string | null;
  readFile: (path: string) => Promise<string>;
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
}

export function LocalPanel({
  connected,
  fileTree,
  projectName,
  devServerUrl,
  devServerFramework,
  readFile,
  selectedFilePath,
  onSelectFile,
}: LocalPanelProps) {
  const [activeTab, setActiveTab] = useState<LeftTab>("files");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  const handleSelectFile = useCallback(
    async (path: string) => {
      onSelectFile(path);
      setIsLoadingFile(true);
      try {
        const content = await readFile(path);
        setFileContent(content);
      } catch {
        setFileContent("// 파일을 읽을 수 없습니다");
      } finally {
        setIsLoadingFile(false);
      }
    },
    [readFile, onSelectFile],
  );

  // 미연결 상태
  if (!connected) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-fade-in space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#2E86C1]" />
          <p className="text-sm font-medium text-[#1C1C1C]">에이전트 연결 대기 중...</p>
          <p className="text-xs text-[#6B7280]">
            로컬에서 에이전트를 실행하세요:
          </p>
          <code className="block rounded-lg bg-[#1C1C1C] px-4 py-2 text-xs text-green-400">
            npx figma-code-bridge
          </code>
        </div>
      </div>
    );
  }

  const TABS: { id: LeftTab; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: "files", label: "파일", icon: <FolderOpen className="h-3.5 w-3.5" /> },
    {
      id: "preview",
      label: "프리뷰",
      icon: <Eye className="h-3.5 w-3.5" />,
      disabled: !devServerUrl,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* 프로젝트 정보 */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-xs font-medium text-[#374151]">
          {projectName ?? "로컬 프로젝트"}
        </span>
        <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
          연결됨
        </span>
      </div>

      {/* 탭 바 */}
      <div className="flex border-b border-[#E5E7EB]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-[#2E86C1] text-[#2E86C1]"
                : tab.disabled
                  ? "cursor-not-allowed text-[#D1D5DB]"
                  : "text-[#6B7280] hover:text-[#374151]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeTab === "files" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* 파일 트리 */}
            <div className={`overflow-hidden ${selectedFilePath ? "h-1/2" : "flex-1"}`}>
              <FileTreeBrowser
                files={fileTree}
                selectedPath={selectedFilePath}
                onSelectFile={handleSelectFile}
              />
            </div>

            {/* 파일 내용 미리보기 */}
            {selectedFilePath && (
              <div className="flex flex-1 flex-col border-t border-[#E5E7EB]">
                <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-3 py-1.5">
                  <Code className="h-3 w-3 text-[#9CA3AF]" />
                  <span className="truncate text-[10px] font-medium text-[#6B7280]">
                    {selectedFilePath}
                  </span>
                </div>
                <div className="flex-1 overflow-auto bg-[#FAFBFC] p-3">
                  {isLoadingFile ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-[#9CA3AF]" />
                      <span className="text-xs text-[#9CA3AF]">로딩 중...</span>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-[#374151]">
                      {fileContent}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "preview" && devServerUrl && (
          <PreviewFrame url={devServerUrl} framework={devServerFramework} />
        )}
      </div>
    </div>
  );
}
