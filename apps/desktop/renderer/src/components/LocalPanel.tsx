import { useState, useCallback } from "react";
import { FolderOpen, Eye, Code, Loader2 } from "lucide-react";
import { FileTreeBrowser } from "./FileTreeBrowser";
import { PreviewFrame } from "./PreviewFrame";
import { useAgentStore } from "../store/agent-store";
import type { FileEntry } from "../types";

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
  const inspectorEnabled = useAgentStore((s) => s.inspectorEnabled);

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

  // 미연결 상태 (데스크톱에서는 표시되지 않지만 안전장치)
  if (!connected) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-6">
        <div className="text-center">
          <FolderOpen className="mx-auto h-5 w-5 text-[#D4D4D0]" />
          <p className="mt-2 text-[12px] text-[#B4B4B0]">프로젝트를 열어주세요</p>
        </div>
      </div>
    );
  }

  const TABS: { id: LeftTab; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: "files", label: "파일", icon: <FolderOpen className="h-3.5 w-3.5" /> },
    {
      id: "preview",
      label: "프리뷰",
      icon: (
        <span className="relative">
          <Eye className="h-3.5 w-3.5" />
          {inspectorEnabled && (
            <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
          )}
        </span>
      ),
      disabled: !devServerUrl,
    },
  ];

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 탭 바 */}
      <div className="flex border-b border-[#E0E0DC]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors ${
              activeTab === tab.id
                ? "text-[#1A1A1A]"
                : tab.disabled
                  ? "cursor-not-allowed text-[#D4D4D0]"
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

      {/* 탭 컨텐츠 */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        {activeTab === "files" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className={`overflow-hidden ${selectedFilePath ? "h-[55%]" : "flex-1"}`}>
              {fileTree.length === 0 ? (
                <div className="flex h-full items-center justify-center p-6">
                  <div className="text-center">
                    <FolderOpen className="mx-auto h-5 w-5 text-[#D4D4D0]" />
                    <p className="mt-2 text-[12px] text-[#B4B4B0]">
                      프로젝트 파일이 스캔되면 여기에 표시됩니다
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
