"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Github, Blend, ArrowRight, Check, Loader2 } from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";

const translations = {
  en: {
    title: "Welcome back",
    subtitle: "Get started with your GitHub account",
    errorGithub: "GitHub authentication failed. Please try again.",
    errorGeneral: "An error occurred during login.",
    continueGithub: "Continue with GitHub",
    rememberMe: "Remember me",
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
    rememberMe: "로그인 상태 유지",
    termsPrefix: "계속 진행하면 ",
    termsLink: "서비스 이용약관",
    termsLine2: "에 동의하게 됩니다. GitHub 공개 정보만 사용됩니다.",
    backHome: "홈으로 돌아가기",
  },
} as const;

// Electron Agent type
interface ElectronAgent {
  loginWithGithub?: () => Promise<{
    id: string;
    githubUsername: string;
    avatarUrl?: string;
    hasFigmaToken?: boolean;
  } | null>;
  saveSession?: (user: {
    id: string;
    githubUsername: string;
    avatarUrl?: string;
    hasFigmaToken?: boolean;
  }) => Promise<boolean>;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");
  const redirectTo = searchParams.get("redirect_to");
  const { lang } = useLangStore();
  const t = translations[lang];

  const [isElectron, setIsElectron] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    setIsElectron(!!(window as unknown as { electronAgent?: ElectronAgent }).electronAgent);
  }, []);

  // Build GitHub OAuth URL with remember_me parameter
  const buildGithubUrl = () => {
    const params = new URLSearchParams();
    params.set("redirect_to", "/api/auth/desktop");
    params.set("remember_me", rememberMe ? "true" : "false");
    return `/api/auth/github?${params.toString()}`;
  };

  // Electron: GitHub login via IPC
  const handleElectronLogin = async () => {
    const ea = (window as unknown as { electronAgent?: ElectronAgent }).electronAgent;
    if (!ea?.loginWithGithub) return;

    setIsLoggingIn(true);
    try {
      const user = await ea.loginWithGithub();
      if (user) {
        // Save session if "Remember me" is checked
        if (rememberMe && ea.saveSession) {
          await ea.saveSession(user);
        }
        // Navigate to workspace
        router.replace("/project/workspace");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

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
        {isElectron ? (
          <button
            onClick={handleElectronLogin}
            disabled={isLoggingIn}
            className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1A1A1A] px-4 py-3.5 text-[14px] font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98] disabled:opacity-60"
          >
            {isLoggingIn ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Github className="h-5 w-5" />
            )}
            {t.continueGithub}
            {!isLoggingIn && (
              <ArrowRight className="h-4 w-4 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
            )}
          </button>
        ) : (
          <button
            onClick={() => window.location.href = buildGithubUrl()}
            className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1A1A1A] px-4 py-3.5 text-[14px] font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98]"
          >
            <Github className="h-5 w-5" />
            {t.continueGithub}
            <ArrowRight className="h-4 w-4 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
          </button>
        )}

        {/* Remember me checkbox */}
        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setRememberMe(!rememberMe)}
            className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
              rememberMe
                ? "border-[#1A1A1A] bg-[#1A1A1A]"
                : "border-[#D4D4D0] bg-white hover:border-[#B4B4B0]"
            }`}
          >
            {rememberMe && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </button>
          <span className="text-[13px] text-[#787774]">{t.rememberMe}</span>
        </label>

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
