"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { LocalPanel } from "@/components/workspace/LocalPanel";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { useAgentConnection } from "@/lib/hooks/useAgentConnection";
import { useAgentStore } from "@/lib/store/agent-store";
import { injectInspectorViaAgent } from "@/lib/webcontainer/inject-inspector-agent";

const translations = {
  en: { projectName: "Local Project", connected: "Agent connected", waiting: "Waiting for connection" },
  ko: { projectName: "로컬 프로젝트", connected: "에이전트 연결됨", waiting: "연결 대기 중" },
} as const;

function LocalProjectContent() {
  const router = useRouter();
  const { lang } = useLangStore();
  const t = translations[lang];
  const searchParams = useSearchParams();
  const agentUrl = searchParams.get("agent") ?? "ws://localhost:3100";

  const agent = useAgentConnection(agentUrl);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const {
    setHandlers,
    setSelectedFilePath: setStoreFilePath,
    setConnected,
    setFileTree,
    setProjectName,
    setDevServerUrl,
    setDevServerFramework,
  } = useAgentStore();

  useEffect(() => {
    setHandlers(agent.readFile, agent.writeFile);
  }, [agent.readFile, agent.writeFile, setHandlers]);

  useEffect(() => {
    setStoreFilePath(selectedFilePath);
  }, [selectedFilePath, setStoreFilePath]);

  // 에이전트 상태를 store에 동기화
  useEffect(() => {
    setConnected(agent.connected);
  }, [agent.connected, setConnected]);

  useEffect(() => {
    setFileTree(agent.fileTree);
  }, [agent.fileTree, setFileTree]);

  useEffect(() => {
    setProjectName(agent.projectName);
  }, [agent.projectName, setProjectName]);

  useEffect(() => {
    setDevServerUrl(agent.devServerUrl);
  }, [agent.devServerUrl, setDevServerUrl]);

  useEffect(() => {
    setDevServerFramework(agent.devServerFramework);
  }, [agent.devServerFramework, setDevServerFramework]);

  // 에이전트 연결 시 인스펙터 스크립트 주입
  const injectedRef = useRef(false);
  useEffect(() => {
    if (!agent.connected || injectedRef.current) return;
    injectedRef.current = true;

    injectInspectorViaAgent(agent.readFile, agent.writeFile).catch(() => {
      // 인스펙터는 optional feature
    });
  }, [agent.connected, agent.readFile, agent.writeFile]);

  return (
    <WorkspaceLayout
      projectName={agent.projectName ?? t.projectName}
      onBack={() => router.push("/dashboard")}
      headerActions={
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${agent.connected ? "bg-[#1A1A1A]" : "bg-[#B4B4B0]"}`}
          />
          <span className="text-[12px] text-[#787774]">
            {agent.connected ? t.connected : t.waiting}
          </span>
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
          projectId="local"
          githubOwner=""
          githubRepo=""
          mode="local"
        />
      }
    />
  );
}

export default function LocalProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-white">
          <Loader2 className="h-5 w-5 animate-spin text-[#787774]" />
        </div>
      }
    >
      <LocalProjectContent />
    </Suspense>
  );
}
