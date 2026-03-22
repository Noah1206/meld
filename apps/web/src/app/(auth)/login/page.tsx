"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Github } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="animate-scale-in w-full max-w-sm space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[#1C1C1C]">
          FigmaCodeBridge
        </h1>
        <p className="text-sm text-[#6B7280]">
          GitHub 계정으로 로그인하세요
        </p>
      </div>

      {error && (
        <div className="animate-fade-in rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error === "github_auth_failed"
            ? "GitHub 인증에 실패했습니다. 다시 시도해주세요."
            : "로그인 중 오류가 발생했습니다."}
        </div>
      )}

      <a
        href="/api/auth/github"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1C1C1C] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[#333] hover:scale-[1.02] active:scale-[0.98]"
      >
        <Github className="h-5 w-5" />
        GitHub로 로그인
      </a>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
      <Suspense>
        <LoginContent />
      </Suspense>
    </div>
  );
}
