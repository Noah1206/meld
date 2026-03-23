"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Package, Download, Play, Check, AlertCircle } from "lucide-react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { LocalPanel } from "@/components/workspace/LocalPanel";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { useWebContainer } from "@/lib/hooks/useWebContainer";
import { useAgentStore } from "@/lib/store/agent-store";

// 부팅 상태별 아이콘 + 설명
const STATUS_CONFIG = {
  booting: {
    icon: <Package className="h-5 w-5" />,
    title: "WebContainer 부팅 중",
    color: "text-[#787774]",
  },
  cloning: {
    icon: <Download className="h-5 w-5" />,
    title: "GitHub 레포 로드 중",
    color: "text-[#787774]",
  },
  installing: {
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    title: "의존성 설치 중",
    color: "text-[#787774]",
  },
  starting: {
    icon: <Play className="h-5 w-5" />,
    title: "Dev server 시작 중",
    color: "text-[#787774]",
  },
  ready: {
    icon: <Check className="h-5 w-5" />,
    title: "준비 완료",
    color: "text-[#1A1A1A]",
  },
  error: {
    icon: <AlertCircle className="h-5 w-5" />,
    title: "오류 발생",
    color: "text-red-600",
  },
} as const;

// 진행률 바 단계
const STEPS = ["booting", "cloning", "installing", "starting", "ready"] as const;

function SandboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const branch = searchParams.get("branch") ?? "main";

  const wc = useWebContainer(owner, repo, branch);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const { setHandlers, setSelectedFilePath: setStoreFilePath, setConnected, setFileTree, setProjectName, setDevServerUrl } = useAgentStore();

  // agent-store에 핸들러 등록 (ChatInput이 store에서 읽음)
  useEffect(() => {
    setHandlers(wc.readFile, wc.writeFile);
  }, [wc.readFile, wc.writeFile, setHandlers]);

  useEffect(() => {
    setStoreFilePath(selectedFilePath);
  }, [selectedFilePath, setStoreFilePath]);

  // store 동기화
  useEffect(() => {
    setConnected(wc.connected);
    setFileTree(wc.fileTree);
    setProjectName(wc.projectName);
    setDevServerUrl(wc.devServerUrl);
  }, [wc.connected, wc.fileTree, wc.projectName, wc.devServerUrl, setConnected, setFileTree, setProjectName, setDevServerUrl]);

  // 파라미터 검증
  if (!owner || !repo) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-[#B4B4B0]" />
          <p className="mt-3 text-[14px] font-medium text-[#1A1A1A]">잘못된 접근</p>
          <p className="mt-1 text-[13px] text-[#787774]">owner와 repo 파라미터가 필요합니다.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 rounded-lg bg-[#1A1A1A] px-4 py-2 text-[13px] font-medium text-white"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 부팅 ~ 설치 중: 풀스크린 진행 UI
  if (wc.status !== "ready") {
    const currentStepIndex = STEPS.indexOf(wc.status as typeof STEPS[number]);
    const config = STATUS_CONFIG[wc.status];

    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white">
        <div className="w-full max-w-md space-y-8 px-6">
          {/* 프로젝트 이름 */}
          <div className="text-center">
            <p className="text-[13px] text-[#B4B4B0]">프로젝트 열기</p>
            <h1 className="mt-1 text-[20px] font-bold text-[#1A1A1A]">
              {owner}/{repo}
            </h1>
          </div>

          {/* 진행 단계 */}
          <div className="space-y-3">
            {STEPS.map((step, i) => {
              const stepConfig = STATUS_CONFIG[step];
              const isActive = step === wc.status;
              const isDone = i < currentStepIndex;
              const isError = wc.status === "error" && i === currentStepIndex;

              return (
                <div
                  key={step}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                    isActive
                      ? "bg-[#F7F7F5]"
                      : isDone
                        ? "opacity-50"
                        : "opacity-30"
                  }`}
                >
                  <div className={isError ? "text-red-500" : isDone ? "text-[#1A1A1A]" : stepConfig.color}>
                    {isDone ? (
                      <Check className="h-5 w-5" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      stepConfig.icon
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-[13px] font-medium ${isDone ? "text-[#787774]" : "text-[#1A1A1A]"}`}>
                      {stepConfig.title}
                    </p>
                    {isActive && (
                      <p className="mt-0.5 text-[12px] text-[#787774]">
                        {wc.statusMessage}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 에러 시 뒤로가기 */}
          {wc.status === "error" && (
            <div className="text-center">
              <p className="text-[13px] text-red-600">{wc.statusMessage}</p>
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-4 rounded-lg bg-[#1A1A1A] px-4 py-2 text-[13px] font-medium text-white"
              >
                대시보드로 돌아가기
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ready → 워크스페이스 렌더
  return (
    <WorkspaceLayout
      projectName={wc.projectName}
      onBack={() => router.push("/dashboard")}
      headerActions={
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-[12px] text-[#787774]">WebContainer</span>
        </div>
      }
      leftPanel={
        <LocalPanel
          connected={wc.connected}
          fileTree={wc.fileTree}
          projectName={wc.projectName}
          devServerUrl={wc.devServerUrl}
          devServerFramework={wc.devServerFramework}
          readFile={wc.readFile}
          selectedFilePath={selectedFilePath}
          onSelectFile={setSelectedFilePath}
        />
      }
      rightPanel={
        <ChatPanel
          projectId="sandbox"
          githubOwner={owner}
          githubRepo={repo}
          mode="local"
        />
      }
    />
  );
}

export default function SandboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-white">
          <Loader2 className="h-5 w-5 animate-spin text-[#787774]" />
        </div>
      }
    >
      <SandboxContent />
    </Suspense>
  );
}
