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
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <header className="border-b border-[#E8E8E4] bg-white px-6 py-4">
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
      className="group flex w-full items-center gap-2 rounded-lg bg-[#1A1A1A] px-3 py-2.5 text-left font-mono text-xs text-[#A7F3D0] transition-colors hover:bg-[#24282E]"
    >
      <span className="text-[#787774]">$</span>
      <span className="flex-1">{command}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-[#34D399]" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-[#787774] transition-colors group-hover:text-white" />
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
    <div className="animate-fade-in min-h-screen bg-[#F7F7F5]">
      {/* 헤더 */}
      <header className="border-b border-[#E8E8E4] bg-white px-6 py-3.5">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#34D399] to-[#06B6D4]">
              <Code2 className="h-3 w-3 text-white" />
            </div>
            <h1 className="text-[15px] font-semibold text-[#1A1A1A]">FigmaCodeBridge</h1>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="flex items-center gap-2">
                  {user.avatarUrl && (
                    <img
                      src={user.avatarUrl}
                      alt={user.githubUsername}
                      className="h-6 w-6 rounded-full ring-1 ring-[#E8E8E4]"
                    />
                  )}
                  <span className="text-[13px] text-[#1A1A1A]">
                    {user.githubUsername}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 text-[13px] text-[#787774] transition-colors hover:text-[#1A1A1A]"
                >
                  <LogOut className="h-3.5 w-3.5" />
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
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-[#E8E8E4] bg-white px-4 py-3 transition-colors hover:border-[#D4D4D0]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ECFDF5]">
              <Github className="h-4 w-4 text-[#10B981]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[#1A1A1A]">GitHub</p>
              <p className="truncate text-[11px] text-[#10B981]">{user?.githubUsername}</p>
            </div>
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-[#34D399]" />
          </div>

          {/* Figma */}
          {user?.hasFigmaToken ? (
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-[#E8E8E4] bg-white px-4 py-3 transition-colors hover:border-[#D4D4D0]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ECFDF5]">
                <Figma className="h-4 w-4 text-[#10B981]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-[#1A1A1A]">Figma</p>
                <p className="text-[11px] text-[#10B981]">연결됨</p>
              </div>
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-[#34D399]" />
            </div>
          ) : (
            <a
              href="/api/auth/figma"
              className="flex flex-1 items-center gap-3 rounded-xl border-2 border-dashed border-[#34D399]/30 bg-[#ECFDF5]/50 px-4 py-3 transition-all hover:border-[#34D399]/60 hover:bg-[#ECFDF5]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#34D399]/10">
                <Figma className="h-4 w-4 text-[#10B981]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-[#10B981]">Figma 연결하기</p>
                <p className="text-[11px] text-[#787774]">클릭하여 연결</p>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-[#10B981]" />
            </a>
          )}
        </div>

        {/* 시작하기 */}
        <div className="mb-4">
          <h2 className="text-[14px] font-semibold text-[#1A1A1A]">시작하기</h2>
          <p className="mt-0.5 text-[12px] text-[#787774]">원하는 방식을 선택하세요</p>
        </div>

        <div className="animate-fade-in-up animation-delay-150 grid gap-4 sm:grid-cols-2">
          {/* 카드 1: Figma 디자인 수정 */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#E8E8E4] bg-white transition-all hover:border-[#34D399]/30 hover:shadow-lg hover:shadow-[#34D399]/5">
            {/* 상단 비주얼 */}
            <div className="relative bg-gradient-to-br from-[#ECFDF5] to-[#F0FDFA] px-5 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#34D399] to-[#06B6D4] shadow-lg shadow-[#34D399]/20">
                  <Paintbrush className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#1A1A1A]">Figma 디자인 수정</h3>
                  <p className="text-[11px] text-[#787774]">디자인 파일에서 바로 코드 생성</p>
                </div>
              </div>
            </div>

            {/* 스텝 설명 */}
            <div className="px-5 pb-2">
              <div className="space-y-2.5 py-3">
                {[
                  "Figma 파일 URL을 연결",
                  "뷰어에서 엘리먼트 선택",
                  "AI가 코드 생성 → GitHub 푸시",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-[9px] font-bold text-[#10B981]">
                      {i + 1}
                    </span>
                    <p className="text-[12px] text-[#374151]">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="border-t border-[#E8E8E4] px-5 py-3">
              {user?.hasFigmaToken ? (
                <Link
                  href="/project/new"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#34D399] to-[#06B6D4] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition-all hover:shadow-md hover:shadow-[#34D399]/20 active:scale-[0.98]"
                >
                  <Figma className="h-3.5 w-3.5" />
                  새 프로젝트 만들기
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <a
                  href="/api/auth/figma"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-[12px] font-medium text-white transition-all hover:bg-[#24282E] active:scale-[0.98]"
                >
                  <Figma className="h-3.5 w-3.5" />
                  먼저 Figma를 연결하세요
                </a>
              )}
            </div>
          </div>

          {/* 카드 2: 로컬 프로젝트 */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#E8E8E4] bg-white transition-all hover:border-[#34D399]/30 hover:shadow-lg hover:shadow-[#34D399]/5">
            {/* 상단 비주얼 */}
            <div className="relative bg-gradient-to-br from-[#F0FDFA] to-[#ECFDF5] px-5 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] shadow-lg shadow-[#10B981]/20">
                  <Laptop className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#1A1A1A]">로컬 프로젝트 수정</h3>
                  <p className="text-[11px] text-[#787774]">내 컴퓨터의 코드를 AI로 수정</p>
                </div>
              </div>
            </div>

            {/* 스텝 설명 */}
            <div className="px-5 pb-2">
              <div className="space-y-2.5 py-3">
                {[
                  "터미널에서 에이전트 실행",
                  "파일 트리에서 수정할 파일 선택",
                  "AI가 코드 수정 → 로컬 파일에 바로 반영",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-[9px] font-bold text-[#10B981]">
                      {i + 1}
                    </span>
                    <p className="text-[12px] text-[#374151]">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 하단: 터미널 명령어 + 연결 버튼 */}
            <div className="space-y-2.5 border-t border-[#E8E8E4] px-5 py-3">
              <CopyCommand command="npx figma-code-bridge" />
              <Link
                href="/project/local"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#10B981] px-4 py-2.5 text-[12px] font-semibold text-white transition-all hover:bg-[#059669] active:scale-[0.98]"
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
            <h2 className="mb-3 text-[14px] font-semibold text-[#1A1A1A]">내 프로젝트</h2>
            <div className="rounded-xl border border-dashed border-[#E8E8E4] bg-white p-10 text-center">
              <p className="text-[13px] text-[#B4B4B0]">
                아직 프로젝트가 없습니다
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
