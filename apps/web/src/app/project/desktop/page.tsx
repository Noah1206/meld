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

  // Register handlers in agent-store
  useEffect(() => {
    setHandlers(agent.readFile, agent.writeFile);
  }, [agent.readFile, agent.writeFile, setHandlers]);

  useEffect(() => {
    setStoreFilePath(selectedFilePath);
  }, [selectedFilePath, setStoreFilePath]);

  // Sync store
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

  // No project connected: auto-open folder dialog, redirect to dashboard on cancel
  useEffect(() => {
    if (!agent.connected && !isOpening) {
      setIsOpening(true);
      agent.openProject().then((success) => {
        setIsOpening(false);
        if (!success) router.push("/dashboard");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!agent.connected) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-[#787774]" />
      </div>
    );
  }

  // Project opened: render workspace
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
      sidebarSide="left"
      leftPanel={
        <ChatPanel
          projectId="desktop"
          githubOwner=""
          githubRepo=""
          mode="local"
        />
      }
      rightPanel={
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
    />
  );
}
