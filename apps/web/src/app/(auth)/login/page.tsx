"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Github, Blend, ArrowRight } from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";

const translations = {
  en: {
    title: "Welcome back",
    subtitle: "Get started with your GitHub account",
    errorGithub: "GitHub authentication failed. Please try again.",
    errorGeneral: "An error occurred during login.",
    continueGithub: "Continue with GitHub",
    termsPrefix: "By continuing, you agree to the ",
    termsLink: "Terms of Service",
    termsLine2: "Only your public GitHub info will be used.",
    backHome: "Back to home",
  },
  ko: {
    title: "다시 오신 걸 환영해요",
    subtitle: "GitHub 계정으로 시작하세요",
    errorGithub: "GitHub 인증에 실패했습니다. 다시 시도해주세요.",
    errorGeneral: "로그인 중 오류가 발생했습니다.",
    continueGithub: "GitHub로 계속하기",
    termsPrefix: "계속 진행하면 ",
    termsLink: "서비스 이용약관",
    termsLine2: "에 동의하게 됩니다. GitHub 공개 정보만 사용됩니다.",
    backHome: "홈으로 돌아가기",
  },
} as const;

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const redirectTo = searchParams.get("redirect_to");
  const { lang } = useLangStore();
  const t = translations[lang];

  const githubUrl = redirectTo
    ? `/api/auth/github?redirect_to=${encodeURIComponent(redirectTo)}`
    : "/api/auth/github";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="animate-scale-in w-full max-w-sm px-6">
        {/* 로고 */}
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A]">
              <Blend className="h-4 w-4 text-white" />
            </div>
            <span className="text-[16px] font-semibold text-[#1A1A1A]">Meld</span>
          </Link>
        </div>

        {/* 타이틀 */}
        <div className="mb-8 text-center">
          <h1 className="text-[24px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
            {t.title}
          </h1>
          <p className="mt-2 text-[14px] text-[#787774]">
            {t.subtitle}
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="animate-fade-in mb-6 rounded-xl bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#DC2626]">
            {error === "github_auth_failed" ? t.errorGithub : t.errorGeneral}
          </div>
        )}

        {/* GitHub 로그인 버튼 */}
        <a
          href={githubUrl}
          className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1A1A1A] px-4 py-3.5 text-[14px] font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98]"
        >
          <Github className="h-5 w-5" />
          {t.continueGithub}
          <ArrowRight className="h-4 w-4 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
        </a>

        {/* 안내 문구 */}
        <p className="mt-6 text-center text-[12px] leading-relaxed text-[#B4B4B0]">
          {t.termsPrefix}
          <Link href="/terms" className="underline underline-offset-2 transition-colors hover:text-[#787774]">
            {t.termsLink}
          </Link>
          {lang === "en" ? "." : ""}
          <br />
          {t.termsLine2}
        </p>

        {/* 홈으로 */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-[13px] text-[#B4B4B0] transition-colors hover:text-[#787774]"
          >
            {t.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
