"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Figma OAuth는 /api/auth/figma에서 직접 리다이렉트 처리
// 이 페이지는 fallback용
export default function FigmaCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard?error=figma_auth_failed");
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
        Figma 인증 처리 중...
      </div>
    </div>
  );
}
