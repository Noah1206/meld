"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Figma, CheckCircle, Github } from "lucide-react";
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
      <main className="mx-auto max-w-2xl p-6">
        <div className="space-y-4">
          <div className="animate-shimmer h-40 rounded-xl" />
          <div className="animate-shimmer h-40 rounded-xl animation-delay-150" />
        </div>
      </main>
    </div>
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
      <header className="border-b border-[#E5E7EB] bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1C1C1C]">Dashboard</h1>
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

      <main className="mx-auto max-w-2xl p-6">
        {/* 연결 상태 카드 */}
        <div className="animate-fade-in-up space-y-4">
          {/* Step 1: GitHub — 이미 로그인 돼 있으니 완료 상태 */}
          <div className="flex items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
              <Github className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[#1C1C1C]">GitHub 연결됨</p>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-xs text-[#6B7280]">{user?.githubUsername}</p>
            </div>
          </div>

          {/* Step 2: Figma 연결 */}
          {user && !user.hasFigmaToken ? (
            <div className="animate-fade-in-up animation-delay-150 rounded-xl border-2 border-dashed border-[#2E86C1] bg-white p-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                  <Figma className="h-7 w-7 text-[#2E86C1]" />
                </div>
                <div>
                  <p className="text-base font-semibold text-[#1C1C1C]">
                    Figma 계정을 연결하세요
                  </p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    디자인 파일을 불러오려면 Figma 인증이 필요합니다.
                    <br />
                    연결 후 프로젝트를 생성할 수 있습니다.
                  </p>
                </div>
                <a
                  href="/api/auth/figma"
                  className="flex items-center gap-2 rounded-lg bg-[#2E86C1] px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#2573A8] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Figma className="h-4 w-4" />
                  Figma 연결하기
                </a>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in-up animation-delay-150 flex items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                <Figma className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[#1C1C1C]">Figma 연결됨</p>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-xs text-[#6B7280]">디자인 파일을 불러올 수 있습니다</p>
              </div>
            </div>
          )}
        </div>

        {/* 프로젝트 섹션 — Figma 연결 후에만 표시 */}
        {user?.hasFigmaToken && (
          <div className="animate-fade-in-up animation-delay-300 mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#1C1C1C]">프로젝트</h2>
              <Link
                href="/project/new"
                className="rounded-lg bg-[#2E86C1] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#2573A8] hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]"
              >
                + 새 프로젝트
              </Link>
            </div>

            <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white p-12 text-center">
              <p className="text-[#6B7280]">
                아직 프로젝트가 없습니다. 새 프로젝트를 만들어보세요.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
