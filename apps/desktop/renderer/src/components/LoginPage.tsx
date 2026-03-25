import { useState } from "react";
import { Github, Blend, ArrowRight } from "lucide-react";

const translations = {
  en: {
    title: "Welcome back",
    subtitle: "Get started with your GitHub account",
    continueGithub: "Continue with GitHub",
    termsPrefix: "By continuing, you agree to the ",
    termsLink: "Terms of Service",
    termsLine2: "Only your public GitHub info will be used.",
  },
  ko: {
    title: "다시 오신 걸 환영해요",
    subtitle: "GitHub 계정으로 시작하세요",
    continueGithub: "GitHub로 계속하기",
    termsPrefix: "계속 진행하면 ",
    termsLink: "서비스 이용약관",
    termsLine2: "에 동의하게 됩니다. GitHub 공개 정보만 사용됩니다.",
  },
} as const;

type Lang = "en" | "ko";

interface LoginPageProps {
  onLogin: () => void;
  lang: Lang;
  onToggleLang: () => void;
}

export function LoginPage({ onLogin, lang, onToggleLang }: LoginPageProps) {
  const t = translations[lang];
  const [pressing, setPressing] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="animate-scale-in w-full max-w-sm px-6">
        {/* 로고 */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A]">
              <Blend className="h-4 w-4 text-white" />
            </div>
            <span className="text-[16px] font-semibold text-[#1A1A1A]">Meld</span>
          </div>
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

        {/* GitHub 로그인 버튼 */}
        <button
          onClick={onLogin}
          onMouseDown={() => setPressing(true)}
          onMouseUp={() => setPressing(false)}
          onMouseLeave={() => setPressing(false)}
          className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1A1A1A] px-4 py-3.5 text-[14px] font-semibold text-white transition-all hover:bg-[#333]"
          style={{ transform: pressing ? "scale(0.98)" : "scale(1)" }}
        >
          <Github className="h-5 w-5" />
          {t.continueGithub}
          <ArrowRight className="h-4 w-4 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
        </button>

        {/* 안내 문구 */}
        <p className="mt-6 text-center text-[12px] leading-relaxed text-[#B4B4B0]">
          {t.termsPrefix}
          <span className="underline underline-offset-2 transition-colors hover:text-[#787774] cursor-pointer">
            {t.termsLink}
          </span>
          {lang === "en" ? "." : ""}
          <br />
          {t.termsLine2}
        </p>
      </div>

      {/* 언어 토글 (고정) */}
      <button
        onClick={onToggleLang}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[14px] font-semibold text-[#1A1A1A] shadow-lg ring-1 ring-black/[0.08] transition-all hover:scale-105 hover:shadow-xl active:scale-95"
      >
        {lang === "en" ? "KO" : "EN"}
      </button>
    </div>
  );
}
