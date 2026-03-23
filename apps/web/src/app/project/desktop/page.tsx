"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Loader2, Monitor } from "lucide-react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { LocalPanel } from "@/components/workspace/LocalPanel";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { useElectronAgent } from "@/lib/hooks/useElectronAgent";
import { useAgentStore } from "@/lib/store/agent-store";

export default function DesktopProjectPage() {
  const router = useRouter();
  const agent = useElectronAgent();
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const {
    setHandlers,
    setSelectedFilePath: setStoreFilePath,
    setConnected,
    setFileTree,
    setProjectName,
    setDevServerUrl,
  } = useAgentStore();

  // agent-store에 핸들러 등록
  useEffect(() => {
    setHandlers(agent.readFile, agent.writeFile);
  }, [agent.readFile, agent.writeFile, setHandlers]);

  useEffect(() => {
    setStoreFilePath(selectedFilePath);
  }, [selectedFilePath, setStoreFilePath]);

  // store 동기화
  useEffect(() => {
    setConnected(agent.connected);
    setFileTree(agent.fileTree);
    setProjectName(agent.projectName);
    setDevServerUrl(agent.devServerUrl);
  }, [agent.connected, agent.fileTree, agent.projectName, agent.devServerUrl, setConnected, setFileTree, setProjectName, setDevServerUrl]);

  const handleOpenProject = async () => {
    setIsOpening(true);
    try {
      await agent.openProject();
    } finally {
      setIsOpening(false);
    }
  };

  // 프로젝트 미선택: 폴더 선택 UI
  if (!agent.connected) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white">
        <div className="w-full max-w-sm space-y-6 px-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F7F5]">
            <Monitor className="h-7 w-7 text-[#787774]" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-[#1A1A1A]">
              프로젝트 열기
            </h1>
            <p className="mt-1.5 text-[13px] text-[#787774]">
              로컬 프로젝트 폴더를 선택해서 AI 코드 수정을 시작하세요.
            </p>
          </div>
          <button
            onClick={handleOpenProject}
            disabled={isOpening}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-3.5 text-[14px] font-semibold text-white transition-all hover:bg-[#24282E] active:scale-[0.98] disabled:opacity-50"
          >
            {isOpening ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderOpen className="h-4 w-4" />
            )}
            {isOpening ? "폴더 선택 중..." : "폴더 선택"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[12px] text-[#B4B4B0] transition-colors hover:text-[#787774]"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 프로젝트 열림: 워크스페이스
  return (
    <WorkspaceLayout
      projectName={agent.projectName ?? "프로젝트"}
      onBack={() => router.push("/dashboard")}
      headerActions={
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-[12px] text-[#787774]">Desktop</span>
        </div>
      }
      leftPanel={
        <LocalPanel
          connected={agent.connected}
          fileTree={agent.fileTree}
          projectName={agent.projectName}
          devServerUrl={agent.devServerUrl}
          devServerFramework={agent.devServerFramework}
          readFile={agent.readFile}
          selectedFilePath={selectedFilePath}
          onSelectFile={setSelectedFilePath}
        />
      }
      rightPanel={
        <ChatPanel
          projectId="desktop"
          githubOwner=""
          githubRepo=""
          mode="local"
        />
      }
    />
  );
}
