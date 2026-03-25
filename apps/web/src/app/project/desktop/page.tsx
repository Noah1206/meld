"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Loader2, Monitor, Plus, X } from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { LocalPanel } from "@/components/workspace/LocalPanel";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { useElectronAgent } from "@/lib/hooks/useElectronAgent";
import { useAgentStore } from "@/lib/store/agent-store";

const translations = {
  en: {
    openProject: "Open Project",
    openProjectDesc: "Select an existing project or create a new one.",
    openExisting: "Open Existing Folder",
    createNew: "Create New Project",
    projectName: "Project name",
    selectLocation: "Select Location & Create",
    cancel: "Cancel",
    creating: "Creating...",
    selectingFolder: "Selecting folder...",
    backToDashboard: "Back to Dashboard",
    projectFallback: "Project",
  },
  ko: {
    openProject: "프로젝트 열기",
    openProjectDesc: "기존 프로젝트를 열거나 새 프로젝트를 만드세요.",
    openExisting: "기존 폴더 열기",
    createNew: "새 프로젝트 만들기",
    projectName: "프로젝트 이름",
    selectLocation: "위치 선택 후 생성",
    cancel: "취소",
    creating: "생성 중...",
    selectingFolder: "폴더 선택 중...",
    backToDashboard: "대시보드로 돌아가기",
    projectFallback: "프로젝트",
  },
} as const;

export default function DesktopProjectPage() {
  const router = useRouter();
  const { lang } = useLangStore();
  const t = translations[lang];
  const agent = useElectronAgent();
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
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

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    try {
      await agent.createProject(newProjectName.trim());
      setShowCreateModal(false);
      setNewProjectName("");
    } finally {
      setIsCreating(false);
    }
  };

  // 프로젝트 미선택: 선택 UI
  if (!agent.connected) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
        <div className="w-full max-w-md space-y-6 px-6 text-center" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F7F5]">
            <Monitor className="h-7 w-7 text-[#787774]" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-[#1A1A1A]">{t.openProject}</h1>
            <p className="mt-1.5 text-[13px] text-[#787774]">{t.openProjectDesc}</p>
          </div>

          {/* 두 개의 옵션 카드 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleOpenProject}
              disabled={isOpening}
              className="flex flex-col items-center gap-3 rounded-2xl border border-black/[0.08] p-6 transition-all hover:border-black/[0.15] hover:bg-[#FAFAFA] active:scale-[0.98] disabled:opacity-50"
            >
              {isOpening ? (
                <Loader2 className="h-6 w-6 animate-spin text-[#787774]" />
              ) : (
                <FolderOpen className="h-6 w-6 text-[#787774]" />
              )}
              <span className="text-[14px] font-semibold text-[#1A1A1A]">
                {isOpening ? t.selectingFolder : t.openExisting}
              </span>
            </button>

            <button
              onClick={() => {
                setShowCreateModal(true);
                setTimeout(() => nameInputRef.current?.focus(), 100);
              }}
              className="flex flex-col items-center gap-3 rounded-2xl border border-black/[0.08] p-6 transition-all hover:border-black/[0.15] hover:bg-[#FAFAFA] active:scale-[0.98]"
            >
              <Plus className="h-6 w-6 text-[#787774]" />
              <span className="text-[14px] font-semibold text-[#1A1A1A]">{t.createNew}</span>
            </button>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="text-[12px] text-[#B4B4B0] transition-colors hover:text-[#787774]"
          >
            {t.backToDashboard}
          </button>
        </div>

        {/* 새 프로젝트 모달 */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[16px] font-bold text-[#1A1A1A]">{t.createNew}</h2>
                <button
                  onClick={() => { setShowCreateModal(false); setNewProjectName(""); }}
                  className="rounded-lg p-1.5 text-[#B4B4B0] hover:bg-[#F5F5F4] hover:text-[#787774]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="block text-[12px] font-medium text-[#787774] mb-2">{t.projectName}</label>
              <input
                ref={nameInputRef}
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); }}
                placeholder="my-project"
                className="w-full rounded-xl border border-black/[0.08] px-4 py-3 text-[14px] text-[#1A1A1A] outline-none transition-all focus:border-black/[0.2] focus:ring-2 focus:ring-black/[0.05]"
              />

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => { setShowCreateModal(false); setNewProjectName(""); }}
                  className="flex-1 rounded-xl border border-black/[0.08] px-4 py-3 text-[14px] font-semibold text-[#787774] transition-all hover:bg-[#FAFAFA]"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || isCreating}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-3 text-[14px] font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98] disabled:opacity-40"
                >
                  {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCreating ? t.creating : t.selectLocation}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 프로젝트 열림: 워크스페이스
  return (
    <WorkspaceLayout
      projectName={agent.projectName ?? t.projectFallback}
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
