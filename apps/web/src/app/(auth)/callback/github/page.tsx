"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Blend } from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";

export default function GitHubCallbackPage() {
  const router = useRouter();
  const { lang } = useLangStore();

  useEffect(() => {
    router.replace("/login?error=github_auth_failed");
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1A1A]">
        <Blend className="h-5 w-5 text-white" />
      </div>
      <div className="mt-5 flex items-center gap-2 text-[#787774]">
        <div className="h-4 w-4 animate-spin rounded-full bg-[#EEEEEC]" style={{ borderTop: "2px solid #787774" }} />
        <span className="text-[14px]">{lang === "ko" ? "GitHub 인증 처리 중..." : "Processing GitHub auth..."}</span>
      </div>
    </div>
  );
}
