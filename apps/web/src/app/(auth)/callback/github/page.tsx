"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// GitHub OAuth는 /api/auth/github에서 직접 리다이렉트 처리
// 이 페이지는 fallback용
export default function GitHubCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // API route에서 처리되므로 여기 도착하면 에러 상황
    router.replace("/login?error=github_auth_failed");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-2 text-[#6B7280]">
        <svg
          className="h-5 w-5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        GitHub 인증 처리 중...
      </div>
    </div>
  );
}
