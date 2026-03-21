"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth-store";

export default function DashboardPage() {
  const { user, loading, fetchUser, logout } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2E86C1] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="border-b border-[#E5E7EB] bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1C1C1C]">Dashboard</h1>
          <div className="flex items-center gap-4">
            {user && (
              <>
                {!user.hasFigmaToken && (
                  <a
                    href="/api/auth/figma"
                    className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#6B7280] transition-colors hover:bg-[#F3F4F6]"
                  >
                    Figma 연결
                  </a>
                )}
                {user.hasFigmaToken && (
                  <span className="text-xs text-green-600">Figma 연결됨</span>
                )}
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

      <main className="mx-auto max-w-4xl p-6">
        <div className="mb-4 flex justify-end">
          <Link
            href="/project/new"
            className="rounded-lg bg-[#2E86C1] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2573A8]"
          >
            + 새 프로젝트
          </Link>
        </div>

        <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white p-12 text-center">
          <p className="text-[#6B7280]">
            아직 프로젝트가 없습니다. 새 프로젝트를 만들어 Figma 파일을
            연결하세요.
          </p>
        </div>
      </main>
    </div>
  );
}
