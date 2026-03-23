"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { LocalPanel } from "@/components/workspace/LocalPanel";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { useAgentConnection } from "@/lib/hooks/useAgentConnection";
import { useAgentStore } from "@/lib/store/agent-store";

function LocalProjectContent() {
  const searchParams = useSearchParams();
  const agentUrl = searchParams.get("agent") ?? "ws://localhost:3100";

  const agent = useAgentConnection(agentUrl);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const { setHandlers, setSelectedFilePath: setStoreFilePath } = useAgentStore();

  useEffect(() => {
    setHandlers(agent.readFile, agent.writeFile);
  }, [agent.readFile, agent.writeFile, setHandlers]);

  useEffect(() => {
    setStoreFilePath(selectedFilePath);
  }, [selectedFilePath, setStoreFilePath]);

  return (
    <WorkspaceLayout
      projectName={agent.projectName ?? "로컬 프로젝트"}
      headerActions={
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${agent.connected ? "bg-[#1A1A1A]" : "bg-[#B4B4B0]"}`}
          />
          <span className="text-[12px] text-[#787774]">
            {agent.connected ? "에이전트 연결됨" : "연결 대기 중"}
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
