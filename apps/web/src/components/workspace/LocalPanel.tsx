"use client";

import { useState, useCallback } from "react";
import { FolderOpen, Eye, Code, Loader2, Terminal } from "lucide-react";
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
      <div className="flex h-full items-center justify-center bg-white">
        <div className="animate-fade-in space-y-4 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#787774]" />
          <div>
            <p className="text-[14px] font-semibold text-[#1A1A1A]">에이전트 연결 대기 중</p>
            <p className="mt-1 text-[13px] text-[#787774]">
              로컬에서 에이전트를 실행하세요
            </p>
          </div>
          <div className="rounded-xl bg-[#1A1A1A] px-5 py-3 font-mono text-[12px]">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-[#555]" />
              <span className="text-[#999]">npx figma-code-bridge</span>
            </div>
          </div>
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
    <div className="flex h-full flex-col bg-[#F7F7F5]">
      {/* 탭 바 */}
      <div className="flex">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-[#1A1A1A]"
                : tab.disabled
                  ? "cursor-not-allowed text-[#D4D4D0]"
                  : "text-[#787774] hover:text-[#1A1A1A]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        {activeTab === "files" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className={`overflow-hidden ${selectedFilePath ? "h-1/2" : "flex-1"}`}>
              <FileTreeBrowser
                files={fileTree}
                selectedPath={selectedFilePath}
                onSelectFile={handleSelectFile}
              />
            </div>

            {selectedFilePath && (
              <div className="flex flex-1 flex-col bg-[#F7F7F5]">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Code className="h-3 w-3 text-[#B4B4B0]" />
                  <span className="truncate text-[11px] font-medium text-[#787774]">
                    {selectedFilePath}
                  </span>
                </div>
                <div className="mx-2 mb-2 flex-1 overflow-auto rounded-lg bg-[#EEEEEC] p-3">
                  {isLoadingFile ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-[#B4B4B0]" />
                      <span className="text-[12px] text-[#B4B4B0]">로딩 중...</span>
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

        {activeTab === "preview" && devServerUrl && (
          <PreviewFrame url={devServerUrl} framework={devServerFramework} />
        )}
      </div>
    </div>
  );
}
