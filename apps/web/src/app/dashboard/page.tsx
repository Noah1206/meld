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
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="border-b border-[#E5E7EB] bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="animate-shimmer h-5 w-24 rounded" />
          <div className="flex items-center gap-4">
            <div className="animate-shimmer h-7 w-7 rounded-full" />
            <div className="animate-shimmer h-4 w-20 rounded" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-6">
        <div className="space-y-4">
          <div className="animate-shimmer h-48 rounded-xl" />
          <div className="animate-shimmer h-48 rounded-xl animation-delay-150" />
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
      className="group flex w-full items-center gap-2 rounded-lg bg-[#1C1C1C] px-3 py-2 text-left font-mono text-xs text-[#E5E7EB] transition-colors hover:bg-[#374151]"
    >
      <span className="text-[#6B7280]">$</span>
      <span className="flex-1">{command}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-[#6B7280] transition-colors group-hover:text-white" />
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
    <div className="animate-fade-in min-h-screen bg-[#F8F9FA]">
      {/* 헤더 */}
      <header className="border-b border-[#E5E7EB] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-[#1C1C1C]">FigmaCodeBridge</h1>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-[#2E86C1]">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="flex items-center gap-2">
                  {user.avatarUrl && (
                    <img
                      src={user.avatarUrl}
                      alt={user.githubUsername}
                      className="h-7 w-7 rounded-full"
                    />
                  )}
                  <span className="text-sm text-[#1C1C1C]">
                    {user.githubUsername}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="text-sm text-[#6B7280] hover:text-[#1C1C1C]"
                >
                  로그아웃
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-6">
        {/* 연결 상태 */}
        <div className="animate-fade-in-up mb-8 flex gap-3">
          {/* GitHub */}
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50">
              <Github className="h-4 w-4 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#1C1C1C]">GitHub</p>
              <p className="truncate text-[11px] text-green-600">{user?.githubUsername}</p>
            </div>
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
          </div>

          {/* Figma */}
          {user?.hasFigmaToken ? (
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50">
                <Figma className="h-4 w-4 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#1C1C1C]">Figma</p>
                <p className="text-[11px] text-green-600">연결됨</p>
              </div>
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
            </div>
          ) : (
            <a
              href="/api/auth/figma"
              className="flex flex-1 items-center gap-3 rounded-xl border-2 border-dashed border-[#2E86C1]/40 bg-blue-50/50 px-4 py-3 transition-colors hover:border-[#2E86C1] hover:bg-blue-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2E86C1]/10">
                <Figma className="h-4 w-4 text-[#2E86C1]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#2E86C1]">Figma 연결하기</p>
                <p className="text-[11px] text-[#6B7280]">클릭하여 연결</p>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-[#2E86C1]" />
            </a>
          )}
        </div>

        {/* 시작하기 섹션 */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-[#1C1C1C]">시작하기</h2>
          <p className="mt-0.5 text-xs text-[#6B7280]">원하는 방식을 선택하세요</p>
        </div>

        <div className="animate-fade-in-up animation-delay-150 grid gap-4 sm:grid-cols-2">
          {/* 카드 1: Figma 디자인 → 코드 */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white transition-all hover:border-[#2E86C1]/30 hover:shadow-lg hover:shadow-[#2E86C1]/5">
            {/* 상단 비주얼 */}
            <div className="relative bg-gradient-to-br from-[#2E86C1]/5 to-purple-500/5 px-5 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2E86C1] to-[#7C3AED] shadow-lg shadow-[#2E86C1]/20">
                  <Paintbrush className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1C1C1C]">Figma 디자인 수정</h3>
                  <p className="text-[11px] text-[#6B7280]">디자인 파일에서 바로 코드 생성</p>
                </div>
              </div>
            </div>

            {/* 설명 */}
            <div className="px-5 pb-2">
              <div className="space-y-2 py-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#2E86C1]/10 text-[9px] font-bold text-[#2E86C1]">1</span>
                  <p className="text-xs text-[#374151]">Figma 파일 URL을 연결</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#2E86C1]/10 text-[9px] font-bold text-[#2E86C1]">2</span>
                  <p className="text-xs text-[#374151]">뷰어에서 엘리먼트 선택</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#2E86C1]/10 text-[9px] font-bold text-[#2E86C1]">3</span>
                  <p className="text-xs text-[#374151]">AI가 코드 생성 &rarr; GitHub 푸시</p>
                </div>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="border-t border-[#E5E7EB] px-5 py-3">
              {user?.hasFigmaToken ? (
                <Link
                  href="/project/new"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2E86C1] px-4 py-2.5 text-xs font-medium text-white transition-all hover:bg-[#2573A8] active:scale-[0.98]"
                >
                  <Figma className="h-3.5 w-3.5" />
                  새 프로젝트 만들기
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <a
                  href="/api/auth/figma"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#374151] px-4 py-2.5 text-xs font-medium text-white transition-all hover:bg-[#1F2937] active:scale-[0.98]"
                >
                  <Figma className="h-3.5 w-3.5" />
                  먼저 Figma를 연결하세요
                </a>
              )}
            </div>
          </div>

          {/* 카드 2: 로컬 프로젝트 연결 */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white transition-all hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/5">
            {/* 상단 비주얼 */}
            <div className="relative bg-gradient-to-br from-green-500/5 to-emerald-500/5 px-5 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20">
                  <Laptop className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1C1C1C]">로컬 프로젝트 수정</h3>
                  <p className="text-[11px] text-[#6B7280]">내 컴퓨터의 코드를 AI로 수정</p>
                </div>
              </div>
            </div>

            {/* 설명 */}
            <div className="px-5 pb-2">
              <div className="space-y-2 py-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-500/10 text-[9px] font-bold text-green-600">1</span>
                  <p className="text-xs text-[#374151]">터미널에서 에이전트 실행</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-500/10 text-[9px] font-bold text-green-600">2</span>
                  <p className="text-xs text-[#374151]">파일 트리에서 수정할 파일 선택</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-500/10 text-[9px] font-bold text-green-600">3</span>
                  <p className="text-xs text-[#374151]">AI가 코드 수정 &rarr; 로컬 파일에 바로 반영</p>
                </div>
              </div>
            </div>

            {/* 하단: 터미널 명령어 + 연결 버튼 */}
            <div className="space-y-2.5 border-t border-[#E5E7EB] px-5 py-3">
              <CopyCommand command="npx figma-code-bridge" />
              <Link
                href="/project/local"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 py-2.5 text-xs font-medium text-white transition-all hover:bg-[#047857] active:scale-[0.98]"
              >
                <Monitor className="h-3.5 w-3.5" />
                로컬 프로젝트 열기
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 기존 프로젝트 리스트 */}
        {user?.hasFigmaToken && (
          <div className="animate-fade-in-up animation-delay-300 mt-10">
            <h2 className="mb-3 text-sm font-semibold text-[#1C1C1C]">내 프로젝트</h2>
            <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white p-10 text-center">
              <p className="text-sm text-[#9CA3AF]">
                아직 프로젝트가 없습니다
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
