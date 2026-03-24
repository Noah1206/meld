"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Package, Download, Play, Check, AlertCircle } from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { PreviewFrame } from "@/components/workspace/PreviewFrame";
import { useWebContainer } from "@/lib/hooks/useWebContainer";
import { useAgentStore } from "@/lib/store/agent-store";

const sandboxTranslations = {
  en: {
    booting: "Booting WebContainer",
    cloning: "Loading GitHub repo",
    installing: "Installing dependencies",
    starting: "Starting dev server",
    ready: "Ready",
    error: "Error occurred",
    openProject: "Opening project",
    invalidAccess: "Invalid access",
    invalidAccessDesc: "owner and repo parameters are required.",
    backToDashboard: "Back to Dashboard",
    reload: "Reload Page",
  },
  ko: {
    booting: "WebContainer 부팅 중",
    cloning: "GitHub 레포 로드 중",
    installing: "의존성 설치 중",
    starting: "Dev server 시작 중",
    ready: "준비 완료",
    error: "오류 발생",
    openProject: "프로젝트 열기",
    invalidAccess: "잘못된 접근",
    invalidAccessDesc: "owner와 repo 파라미터가 필요합니다.",
    backToDashboard: "대시보드로 돌아가기",
    reload: "페이지 새로고침",
  },
} as const;

const STATUS_ICONS = {
  booting: <Package className="h-5 w-5" />,
  cloning: <Download className="h-5 w-5" />,
  installing: <Loader2 className="h-5 w-5 animate-spin" />,
  starting: <Play className="h-5 w-5" />,
  ready: <Check className="h-5 w-5" />,
  error: <AlertCircle className="h-5 w-5" />,
} as const;

const STATUS_COLORS = {
  booting: "text-[#787774]",
  cloning: "text-[#787774]",
  installing: "text-[#787774]",
  starting: "text-[#787774]",
  ready: "text-[#1A1A1A]",
  error: "text-red-600",
} as const;

// 진행률 바 단계
const STEPS = ["booting", "cloning", "installing", "starting", "ready"] as const;

function SandboxContent() {
  const router = useRouter();
  const { lang } = useLangStore();
  const t = sandboxTranslations[lang];
  const searchParams = useSearchParams();
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const branch = searchParams.get("branch") ?? "main";

  const wc = useWebContainer(owner, repo, branch);
  const { setHandlers, setConnected, setFileTree, setProjectName, setDevServerUrl, setDevServerFramework, setDependencies } = useAgentStore();

  // agent-store에 핸들러 등록 (ChatInput이 store에서 읽음)
  useEffect(() => {
    setHandlers(wc.readFile, wc.writeFile);
  }, [wc.readFile, wc.writeFile, setHandlers]);

  // store 동기화
  useEffect(() => {
    setConnected(wc.connected);
    setFileTree(wc.fileTree);
    setProjectName(wc.projectName);
    setDevServerUrl(wc.devServerUrl);
    setDevServerFramework(wc.devServerFramework);
    setDependencies(wc.dependencies);
  }, [wc.connected, wc.fileTree, wc.projectName, wc.devServerUrl, wc.devServerFramework, wc.dependencies, setConnected, setFileTree, setProjectName, setDevServerUrl, setDevServerFramework, setDependencies]);

  // 파라미터 검증
  if (!owner || !repo) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-[#B4B4B0]" />
          <p className="mt-3 text-[14px] font-medium text-[#1A1A1A]">{t.invalidAccess}</p>
          <p className="mt-1 text-[13px] text-[#787774]">{t.invalidAccessDesc}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 rounded-lg bg-[#1A1A1A] px-4 py-2 text-[13px] font-medium text-white"
          >
            {t.backToDashboard}
          </button>
        </div>
      </div>
    );
  }

  // 부팅 ~ 설치 중: 풀스크린 진행 UI
  if (wc.status !== "ready") {
    const currentStepIndex = STEPS.indexOf(wc.status as typeof STEPS[number]);

    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white">
        <div className="w-full max-w-md space-y-8 px-6">
          {/* 프로젝트 이름 */}
          <div className="text-center">
            <p className="text-[13px] text-[#B4B4B0]">{t.openProject}</p>
            <h1 className="mt-1 text-[20px] font-bold text-[#1A1A1A]">
              {owner}/{repo}
            </h1>
          </div>

          {/* 진행 단계 */}
          <div className="space-y-3">
            {STEPS.map((step, i) => {
              const stepTitle = t[step as keyof typeof t] as string;
              const stepColor = STATUS_COLORS[step];
              const stepIcon = STATUS_ICONS[step];
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
                  <div className={isError ? "text-red-500" : isDone ? "text-[#1A1A1A]" : stepColor}>
                    {isDone ? (
                      <Check className="h-5 w-5" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      stepIcon
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-[13px] font-medium ${isDone ? "text-[#787774]" : "text-[#1A1A1A]"}`}>
                      {stepTitle}
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

          {/* 에러 시 새로고침 */}
          {wc.status === "error" && (
            <div className="text-center">
              <p className="text-[13px] text-red-600">{wc.statusMessage}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-[#1A1A1A] px-4 py-2 text-[13px] font-medium text-white"
              >
                {t.reload}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ready → 워크스페이스 렌더 (Chat 좌측 사이드바, Preview 우측 메인)
  return (
    <WorkspaceLayout
      projectName={wc.projectName}
      onBack={() => router.push("/dashboard")}
      sidebarSide="left"
      headerActions={
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-[12px] text-[#787774]">WebContainer</span>
        </div>
      }
      leftPanel={
        <ChatPanel
          projectId="sandbox"
          githubOwner={owner}
          githubRepo={repo}
          mode="local"
        />
      }
      rightPanel={
        wc.devServerUrl ? (
          <PreviewFrame url={wc.devServerUrl} framework={wc.devServerFramework} />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#F7F7F5]">
            <div className="text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#787774]" />
              <p className="mt-2 text-[13px] text-[#787774]">Dev server 시작 중...</p>
            </div>
          </div>
        )
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
