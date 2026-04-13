"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ExternalLink, X } from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { LocalPanel } from "@/components/workspace/LocalPanel";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { useAgentConnection } from "@/lib/hooks/useAgentConnection";
import { useAgentStore } from "@/lib/store/agent-store";
import { useAgentSessionStore } from "@/lib/store/agent-session-store";
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

  const { addEvent } = useAgentSessionStore();

  // MCP 연결 요청 배너 상태
  const [mcpConnectRequest, setMcpConnectRequest] = useState<{ toolName: string; message: string } | null>(null);

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

  // Agent loop 이벤트를 session store에 연결 + MCP 연결 요청 감지
  useEffect(() => {
    return agent.onAgentEvent((event) => {
      addEvent(event);
      // MCP 서비스 연결 필요 시 배너 표시
      if (event.type === "mcp_connect_required") {
        const e = event as { toolName: string; message: string };
        setMcpConnectRequest({ toolName: e.toolName, message: e.message });
      }
    });
  }, [agent.onAgentEvent, addEvent]);

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
    <>
      {/* MCP 서비스 연결 요청 배너 */}
      {mcpConnectRequest && (
        <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 shadow-lg">
          <div className="flex-1">
            <p className="text-[13px] font-medium text-amber-900">
              {lang === "ko" ? "MCP 서비스 연결 필요" : "MCP Service Connection Required"}
            </p>
            <p className="mt-0.5 text-[12px] text-amber-700">
              {mcpConnectRequest.message}
            </p>
          </div>
          <a
            href="/project/workspace#settings-mcp"
            className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-amber-700 transition-colors"
          >
            {lang === "ko" ? "연결하기" : "Connect"}
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            onClick={() => setMcpConnectRequest(null)}
            className="rounded-full p-1 text-amber-400 hover:bg-amber-100 hover:text-amber-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    <WorkspaceLayout
      projectName={agent.projectName ?? t.projectName}
      onBack={() => router.push("/")}
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
          agentConnection={agent}
        />
      }
    />
    </>
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
