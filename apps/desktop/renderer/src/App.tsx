import { useState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { LocalPanel } from "./components/LocalPanel";
import { ChatPanel } from "./components/ChatPanel";
import { LoginPage } from "./components/LoginPage";
import { DashboardPage } from "./components/DashboardPage";
import { useElectronAgent } from "./hooks/useElectronAgent";
import { useAgentStore } from "./store/agent-store";

type View = "login" | "dashboard" | "project";
type Lang = "en" | "ko";

export function App() {
  const agent = useElectronAgent();
  const [view, setView] = useState<View>("login");
  const [user, setUser] = useState<{ name: string; avatar: string } | null>(null);
  const [lang, setLang] = useState<Lang>("ko");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
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

  useEffect(() => {
    setHandlers(agent.readFile, agent.writeFile);
  }, [agent.readFile, agent.writeFile, setHandlers]);

  useEffect(() => {
    setStoreFilePath(selectedFilePath);
  }, [selectedFilePath, setStoreFilePath]);

  useEffect(() => {
    setConnected(agent.connected);
    setFileTree(agent.fileTree);
    setProjectName(agent.projectName);
    setDevServerUrl(agent.devServerUrl);
  }, [agent.connected, agent.fileTree, agent.projectName, agent.devServerUrl, setConnected, setFileTree, setProjectName, setDevServerUrl]);

  const toggleLang = () => setLang((prev) => (prev === "en" ? "ko" : "en"));

  const handleLogin = () => {
    // 시뮬레이션: 실제 인증 없이 UI 플로우만
    setUser({ name: "User", avatar: "" });
    setView("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setView("login");
  };

  const handleOpenProject = async () => {
    const success = await agent.openProject();
    if (success) {
      setView("project");
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    try {
      const success = await agent.createProject(newProjectName.trim());
      if (success) {
        setShowCreateModal(false);
        setNewProjectName("");
        setView("project");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackToDashboard = () => {
    setView("dashboard");
  };

  // -- 로그인 뷰 --
  if (view === "login") {
    return (
      <LoginPage
        onLogin={handleLogin}
        lang={lang}
        onToggleLang={toggleLang}
      />
    );
  }

  // -- 대시보드 뷰 --
  if (view === "dashboard" && user) {
    return (
      <>
        <DashboardPage
          user={user}
          onOpenProject={handleOpenProject}
          onCreateProject={() => {
            setShowCreateModal(true);
            setTimeout(() => nameInputRef.current?.focus(), 100);
          }}
          onLogout={handleLogout}
          lang={lang}
          onToggleLang={toggleLang}
        />

        {/* 새 프로젝트 생성 모달 */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[16px] font-bold text-[#1A1A1A]">
                  {lang === "ko" ? "새 프로젝트 만들기" : "Create New Project"}
                </h2>
                <button
                  onClick={() => { setShowCreateModal(false); setNewProjectName(""); }}
                  className="rounded-lg p-1.5 text-[#B4B4B0] hover:bg-[#F5F5F4] hover:text-[#787774]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="block text-[12px] font-medium text-[#787774] mb-2">
                {lang === "ko" ? "프로젝트 이름" : "Project Name"}
              </label>
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
                  {lang === "ko" ? "취소" : "Cancel"}
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || isCreating}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-3 text-[14px] font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98] disabled:opacity-40"
                >
                  {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCreating
                    ? (lang === "ko" ? "생성 중..." : "Creating...")
                    : (lang === "ko" ? "위치 선택 후 생성" : "Choose Location & Create")
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // -- 프로젝트(워크스페이스) 뷰 --
  // agent.connected가 false인데 view가 project인 경우 대시보드로 복귀
  if (!agent.connected && view === "project") {
    return (
      <>
        {user ? (
          <DashboardPage
            user={user}
            onOpenProject={handleOpenProject}
            onCreateProject={() => {
              setShowCreateModal(true);
              setTimeout(() => nameInputRef.current?.focus(), 100);
            }}
            onLogout={handleLogout}
            lang={lang}
            onToggleLang={toggleLang}
          />
        ) : (
          <LoginPage onLogin={handleLogin} lang={lang} onToggleLang={toggleLang} />
        )}
      </>
    );
  }

  return (
    <WorkspaceLayout
      projectName={agent.projectName ?? (lang === "ko" ? "프로젝트" : "Project")}
      onBack={handleBackToDashboard}
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
      rightPanel={<ChatPanel />}
    />
  );
}
