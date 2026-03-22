"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Figma,
  CheckCircle,
  Github,
  Monitor,
  ArrowRight,
  Copy,
  Check,
  Laptop,
  Paintbrush,
  Code2,
  LogOut,
  Plus,
  FolderOpen,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#F0F0EE] bg-white px-6 py-3.5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="animate-shimmer h-5 w-28 rounded" />
          <div className="flex items-center gap-3">
            <div className="animate-shimmer h-6 w-6 rounded-full" />
            <div className="animate-shimmer h-4 w-16 rounded" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 pt-10">
        <div className="animate-shimmer mb-8 h-6 w-32 rounded" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="animate-shimmer h-64 rounded-2xl" />
          <div className="animate-shimmer h-64 rounded-2xl animation-delay-150" />
        </div>
      </main>
    </div>
  );
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex w-full items-center gap-2 rounded-lg bg-[#1A1A1A] px-3 py-2.5 text-left font-mono text-[11px] text-[#999] transition-colors hover:bg-[#252525]"
    >
      <span className="text-[#555]">$</span>
      <span className="flex-1 text-[#ccc]">{command}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-[#34D399]" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-[#555] transition-colors group-hover:text-[#999]" />
      )}
    </button>
  );
}

export default function DashboardPage() {
  const { user, loading, fetchUser, logout } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-fade-in min-h-screen bg-white">
      {/* 헤더 */}
      <header className="border-b border-[#F0F0EE] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
              <Code2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-[#1A1A1A]">FigmaCodeBridge</span>
          </Link>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="flex items-center gap-2.5">
                  {user.avatarUrl && (
                    <img
                      src={user.avatarUrl}
                      alt={user.githubUsername}
                      className="h-6 w-6 rounded-full ring-1 ring-[#F0F0EE]"
                    />
                  )}
                  <span className="text-[13px] font-medium text-[#1A1A1A]">
                    {user.githubUsername}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="text-[#B4B4B0] transition-colors hover:text-[#787774]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pt-10 pb-20">
        {/* 인사 + 연결 상태 */}
        <div className="animate-fade-in-up mb-10">
          <h1 className="text-[24px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
            {user ? `${user.githubUsername}님, 안녕하세요` : "시작하기"}
          </h1>
          <p className="mt-1 text-[14px] text-[#787774]">프로젝트를 선택하거나 새로 만드세요.</p>

          {/* 연결 상태 인라인 */}
          <div className="mt-5 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-[#34D399]" />
              <span className="text-[12px] text-[#787774]">GitHub 연결됨</span>
            </div>
            {user?.hasFigmaToken ? (
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-[#34D399]" />
                <span className="text-[12px] text-[#787774]">Figma 연결됨</span>
              </div>
            ) : (
              <a
                href="/api/auth/figma"
                className="flex items-center gap-1.5 text-[12px] font-medium text-[#1A1A1A] underline decoration-[#E0E0DC] underline-offset-2 transition-colors hover:decoration-[#1A1A1A]"
              >
                <Figma className="h-3.5 w-3.5" />
                Figma 연결하기
              </a>
            )}
          </div>
        </div>

        {/* 새 프로젝트 카드 */}
        <div className="animate-fade-in-up animation-delay-150 grid gap-4 sm:grid-cols-2">
          {/* 카드 1: Figma 디자인 수정 */}
          <div className="group flex flex-col rounded-2xl border border-[#E8E8E4] bg-white transition-all hover:border-[#D4D4D0] hover:shadow-lg hover:shadow-black/[0.04]">
            <div className="flex-1 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F7F5]">
                <Paintbrush className="h-5 w-5 text-[#1A1A1A]" />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-[#1A1A1A]">Figma 디자인 수정</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#787774]">
                Figma URL을 연결하고, 뷰어에서 엘리먼트를 선택하면 AI가 코드를 수정해서 GitHub에 푸시합니다.
              </p>

              <div className="mt-5 space-y-2">
                {[
                  "Figma 파일 URL 연결",
                  "뷰어에서 엘리먼트 클릭",
                  "AI 코드 수정 → GitHub 푸시",
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-[#F7F7F5] text-[10px] font-semibold text-[#787774]">
                      {i + 1}
                    </span>
                    <span className="text-[12px] text-[#787774]">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#F0F0EE] p-4">
              {user?.hasFigmaToken ? (
                <Link
                  href="/project/new"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  새 프로젝트
                </Link>
              ) : (
                <a
                  href="/api/auth/figma"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E0E0DC] px-4 py-2.5 text-[13px] font-medium text-[#1A1A1A] transition-all hover:bg-[#FAFAFA] active:scale-[0.98]"
                >
                  <Figma className="h-3.5 w-3.5" />
                  먼저 Figma를 연결하세요
                </a>
              )}
            </div>
          </div>

          {/* 카드 2: 로컬 프로젝트 */}
          <div className="group flex flex-col rounded-2xl border border-[#E8E8E4] bg-white transition-all hover:border-[#D4D4D0] hover:shadow-lg hover:shadow-black/[0.04]">
            <div className="flex-1 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F7F5]">
                <Laptop className="h-5 w-5 text-[#1A1A1A]" />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-[#1A1A1A]">로컬 프로젝트 수정</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#787774]">
                터미널에서 에이전트를 실행하면, 웹에서 파일을 선택하고 AI가 로컬 코드를 직접 수정합니다.
              </p>

              <div className="mt-5 space-y-2">
                {[
                  "터미널에서 에이전트 실행",
                  "파일 트리에서 수정할 파일 선택",
                  "AI 코드 수정 → 로컬 파일 반영",
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-[#F7F7F5] text-[10px] font-semibold text-[#787774]">
                      {i + 1}
                    </span>
                    <span className="text-[12px] text-[#787774]">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 border-t border-[#F0F0EE] p-4">
              <CopyCommand command="npx figma-code-bridge" />
              <Link
                href="/project/local"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98]"
              >
                <FolderOpen className="h-4 w-4" />
                로컬 프로젝트 열기
              </Link>
            </div>
          </div>
        </div>

        {/* 내 프로젝트 */}
        {user?.hasFigmaToken && (
          <div className="animate-fade-in-up animation-delay-300 mt-14">
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">내 프로젝트</h2>
            <div className="mt-4 rounded-2xl border border-dashed border-[#E8E8E4] p-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F7F5]">
                <FolderOpen className="h-5 w-5 text-[#B4B4B0]" />
              </div>
              <p className="text-[13px] text-[#B4B4B0]">아직 프로젝트가 없습니다</p>
              <p className="mt-1 text-[12px] text-[#D4D4D0]">위에서 새 프로젝트를 만들어보세요</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
