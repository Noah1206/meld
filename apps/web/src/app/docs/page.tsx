"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Blend,
  Figma,
  MousePointerClick,
  Zap,
  GitBranch,
  Terminal,
  ArrowRight,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";

const translations = {
  en: {
    back: "Dashboard",
    title: "Docs",
    subtitle: "Learn how to get started and make the most of FigmaCodeBridge.",

    gettingStarted: "Getting Started",
    gettingStartedDesc: "FigmaCodeBridge is an AI tool that applies Figma designs to your existing code. No plugin installation needed — it works with the Figma REST API alone.",
    step1Title: "Log in with GitHub",
    step1Desc: "Sign in with your GitHub account to load your repository list.",
    step2Title: "Connect Figma",
    step2Desc: "Connect your Figma account from the dashboard. Securely authenticated via OAuth.",
    step3Title: "Create a Project",
    step3Desc: "Select a Figma file URL and GitHub repo to create a new project.",
    step4Title: "Request Design Edits",
    step4Desc: "Click an element in the Figma viewer and ask AI to make changes.",

    cloudMode: "Cloud Mode",
    cloudModeDesc: "Paste a Figma URL and select an element — AI modifies the code and automatically pushes to GitHub.",
    cloudFlowUrl: "Enter URL",
    cloudFlowSelect: "Select Element",
    cloudFlowAi: "AI Code Edit",
    cloudFlowPush: "GitHub Push",

    localMode: "Local Mode",
    localModeDesc: "Run the agent from the terminal and AI will directly modify code on your machine. Supports live preview and Hot Reload.",
    localModeHint: "After running, click \"Local Connect\" on the dashboard.",

    frameworks: "Supported Frameworks",
    frameworksDesc: "Works with a variety of frontend frameworks.",

    faqTitle: "FAQ",
    faq1Q: "Do I need a Figma plugin?",
    faq1A: "No. FigmaCodeBridge uses only the Figma REST API, so no plugin installation is needed.",
    faq2Q: "Does it overwrite my existing code?",
    faq2A: "It doesn't generate new code from scratch. It follows your project's existing patterns and conventions to modify code.",
    faq3Q: "Is it free?",
    faq3A: "Yes, it's currently free to use. Nothing to install.",
    faq4Q: "Which AI model does it use?",
    faq4A: "It uses Claude Sonnet 4.6, with prompts optimized for code modifications.",

    backToDashboard: "Back to Dashboard",
  },
  ko: {
    back: "대시보드",
    title: "문서",
    subtitle: "FigmaCodeBridge를 시작하고 활용하는 방법을 안내합니다.",

    gettingStarted: "시작하기",
    gettingStartedDesc: "FigmaCodeBridge는 Figma 디자인을 기존 코드에 반영하는 AI 도구입니다. 플러그인 설치 없이, Figma REST API만으로 동작합니다.",
    step1Title: "GitHub로 로그인",
    step1Desc: "GitHub 계정으로 로그인하면 레포지토리 목록을 불러옵니다.",
    step2Title: "Figma 연결",
    step2Desc: "대시보드에서 Figma 계정을 연결하세요. OAuth로 안전하게 인증됩니다.",
    step3Title: "프로젝트 생성",
    step3Desc: "Figma 파일 URL과 GitHub 레포를 선택하여 새 프로젝트를 만드세요.",
    step4Title: "디자인 수정 요청",
    step4Desc: "Figma 뷰어에서 엘리먼트를 클릭하고, AI에게 수정을 요청하세요.",

    cloudMode: "Cloud 모드",
    cloudModeDesc: "Figma URL을 붙여넣고 엘리먼트를 선택하면, AI가 코드를 수정하고 GitHub에 자동으로 푸시합니다.",
    cloudFlowUrl: "URL 입력",
    cloudFlowSelect: "엘리먼트 선택",
    cloudFlowAi: "AI 코드 수정",
    cloudFlowPush: "GitHub 푸시",

    localMode: "Local 모드",
    localModeDesc: "터미널에서 에이전트를 실행하면 내 컴퓨터의 코드를 AI가 직접 수정합니다. 실시간 프리뷰와 Hot Reload를 지원합니다.",
    localModeHint: "실행 후 대시보드에서 \"로컬 연결\" 버튼을 클릭하세요.",

    frameworks: "지원 프레임워크",
    frameworksDesc: "다양한 프론트엔드 프레임워크에서 사용할 수 있습니다.",

    faqTitle: "자주 묻는 질문",
    faq1Q: "Figma 플러그인이 필요한가요?",
    faq1A: "아닙니다. FigmaCodeBridge는 Figma REST API만 사용하므로 별도의 플러그인 설치가 필요 없습니다.",
    faq2Q: "기존 코드를 덮어쓰나요?",
    faq2A: "새 코드를 생성하지 않습니다. 기존 프로젝트의 패턴과 컨벤션을 따라 코드를 수정합니다.",
    faq3Q: "무료인가요?",
    faq3A: "네, 현재 무료로 사용할 수 있습니다. 설치할 것도 없습니다.",
    faq4Q: "어떤 AI 모델을 사용하나요?",
    faq4A: "Claude Sonnet 4.6을 사용합니다. 코드 수정에 최적화된 프롬프트로 동작합니다.",

    backToDashboard: "대시보드로 돌아가기",
  },
} as const;

export default function DocsPage() {
  const { lang } = useLangStore();
  const t = translations[lang];

  const steps = [
    { step: "1", title: t.step1Title, desc: t.step1Desc },
    { step: "2", title: t.step2Title, desc: t.step2Desc },
    { step: "3", title: t.step3Title, desc: t.step3Desc },
    { step: "4", title: t.step4Title, desc: t.step4Desc },
  ];

  const cloudFlow = [
    { icon: Figma, label: t.cloudFlowUrl },
    { icon: MousePointerClick, label: t.cloudFlowSelect },
    { icon: Zap, label: t.cloudFlowAi },
    { icon: GitBranch, label: t.cloudFlowPush },
  ];

  const faqs = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq3Q, a: t.faq3A },
    { q: t.faq4Q, a: t.faq4A },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 lg:px-16 py-3.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-[13px] text-[#787774] transition-colors hover:text-[#1A1A1A]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
              <Blend className="h-3.5 w-3.5 text-white" />
            </div>
          </Link>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 lg:px-16 pt-12 pb-24">
        {/* 타이틀 */}
        <div className="animate-fade-in-up mb-14">
          <h1 className="text-[36px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
            {t.title}
          </h1>
          <p className="mt-2 text-[15px] text-[#787774]">
            {t.subtitle}
          </p>
        </div>

        {/* 시작하기 */}
        <section className="animate-fade-in-up animation-delay-150 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">{t.gettingStarted}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#787774]">
            {t.gettingStartedDesc}
          </p>

          <div className="mt-8 space-y-4">
            {steps.map((item) => (
              <div key={item.step} className="flex gap-4 rounded-2xl bg-[#F7F7F5] p-5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[14px] font-bold text-[#1A1A1A]">
                  {item.step}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#1A1A1A]">{item.title}</p>
                  <p className="mt-0.5 text-[13px] text-[#787774]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cloud 모드 */}
        <section className="animate-fade-in-up animation-delay-300 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">{t.cloudMode}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#787774]">
            {t.cloudModeDesc}
          </p>

          <div className="mt-6 flex items-center gap-3 text-[12px]">
            {cloudFlow.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-3 py-2">
                  <step.icon className="h-3.5 w-3.5 text-[#787774]" />
                  <span className="text-[#787774]">{step.label}</span>
                </div>
                {i < 3 && <ArrowRight className="h-3 w-3 text-[#D4D4D0]" />}
              </div>
            ))}
          </div>
        </section>

        {/* Local 모드 */}
        <section className="animate-fade-in-up animation-delay-450 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">{t.localMode}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#787774]">
            {t.localModeDesc}
          </p>

          <div className="mt-6 rounded-xl bg-[#1A1A1A] px-5 py-4">
            <div className="flex items-center gap-2 font-mono text-[13px]">
              <Terminal className="h-3.5 w-3.5 text-[#555]" />
              <span className="text-[#999]">npx figma-code-bridge</span>
            </div>
          </div>

          <p className="mt-3 text-[12px] text-[#B4B4B0]">
            {t.localModeHint}
          </p>
        </section>

        {/* 지원 프레임워크 */}
        <section className="animate-fade-in-up animation-delay-600 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">{t.frameworks}</h2>
          <p className="mt-2 text-[14px] text-[#787774]">
            {t.frameworksDesc}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name: "React", desc: "JSX / TSX" },
              { name: "Next.js", desc: "App Router" },
              { name: "Vue", desc: "SFC / Composition" },
              { name: "Angular", desc: "Component" },
            ].map((fw) => (
              <div key={fw.name} className="rounded-xl bg-[#F7F7F5] p-4 transition-colors hover:bg-[#F0F0EE]">
                <p className="text-[14px] font-semibold text-[#1A1A1A]">{fw.name}</p>
                <p className="mt-0.5 text-[12px] text-[#B4B4B0]">{fw.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">{t.faqTitle}</h2>

          <div className="mt-6 space-y-4">
            {faqs.map((item, i) => (
              <div key={i} className="rounded-2xl bg-[#F7F7F5] p-5">
                <p className="text-[14px] font-semibold text-[#1A1A1A]">{item.q}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#787774]">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 하단 CTA */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-[#1A1A1A] transition-colors hover:text-[#787774]"
          >
            {t.backToDashboard}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
