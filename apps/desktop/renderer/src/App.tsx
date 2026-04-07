import { useState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { LocalPanel } from "./components/LocalPanel";
import { ChatPanel } from "./components/ChatPanel";
import { LoginPage } from "./components/LoginPage";
import { DashboardPage } from "./components/DashboardPage";
import { useElectronAgent } from "./hooks/useElectronAgent";
import { useAgentStore } from "./store/agent-store";

type View = "loading" | "login" | "dashboard" | "project";

export function App() {
  const agent = useElectronAgent();
  const [view, setView] = useState<View>("loading");
  const [user, setUser] = useState<{ id?: string; name: string; avatar: string; hasFigmaToken?: boolean } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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

  // Check for saved session on mount
  useEffect(() => {
    const checkSession = async () => {
      const electronAgent = window.electronAgent;
      if (electronAgent?.getSavedSession) {
        const savedUser = await electronAgent.getSavedSession();
        if (savedUser) {
          setUser({
            id: savedUser.id,
            name: savedUser.githubUsername,
            avatar: savedUser.avatarUrl ?? "",
            hasFigmaToken: savedUser.hasFigmaToken,
          });
          setView("dashboard");
          return;
        }
      }
      setView("login");
    };
    checkSession();
  }, []);

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

  const handleLogin = async (rememberMe: boolean) => {
    const electronAgent = window.electronAgent;
    if (!electronAgent?.loginWithGithub) return;

    setIsLoggingIn(true);
    try {
      const authUser = await electronAgent.loginWithGithub();
      if (authUser) {
        const userData = {
          id: authUser.id,
          name: authUser.githubUsername,
          avatar: authUser.avatarUrl ?? "",
          hasFigmaToken: authUser.hasFigmaToken,
        };
        setUser(userData);
        setView("dashboard");

        // Save session if "Remember me" is checked
        if (rememberMe && electronAgent.saveSession) {
          await electronAgent.saveSession({
            id: authUser.id,
            githubUsername: authUser.githubUsername,
            avatarUrl: authUser.avatarUrl,
            hasFigmaToken: authUser.hasFigmaToken,
          });
        }
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    const electronAgent = window.electronAgent;
    if (electronAgent?.clearSession) {
      await electronAgent.clearSession();
    }
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

  // -- Loading view --
  if (view === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-[#1A1A1A]" />
      </div>
    );
  }

  // -- Login view --
  if (view === "login") {
    return (
      <LoginPage onLogin={handleLogin} />
    );
  }

  // -- Dashboard view --
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
        />

        {/* New project creation modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[16px] font-bold text-[#1A1A1A]">
                  Create New Project
                </h2>
                <button
                  onClick={() => { setShowCreateModal(false); setNewProjectName(""); }}
                  className="rounded-lg p-1.5 text-[#B4B4B0] hover:bg-[#F5F5F4] hover:text-[#787774]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="block text-[12px] font-medium text-[#787774] mb-2">
                Project Name
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
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || isCreating}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-3 text-[14px] font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98] disabled:opacity-40"
                >
                  {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCreating ? "Creating..." : "Choose Location & Create"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // -- Project (workspace) view --
  // If agent.connected is false but view is project, fall back to dashboard
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
          />
        ) : (
          <LoginPage onLogin={handleLogin} />
        )}
      </>
    );
  }

  return (
    <WorkspaceLayout
      projectName={agent.projectName ?? "Project"}
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
