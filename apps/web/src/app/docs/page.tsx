"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { LandingNav } from "@/components/layout/LandingNav";
import {
  Blend,
  Figma,
  MousePointerClick,
  Zap,
  GitBranch,
  Terminal,
  ArrowRight,
  Check,
} from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";

const translations = {
  en: {
    // Hero
    heroTitle1: "learn the basics",
    heroTitle2: "build with confidence",

    // Getting started
    gettingStarted: "Getting Started",
    gettingStartedDesc: "Meld is an AI tool that applies Figma designs to your existing code. No plugin installation needed — it works with the Figma REST API alone.",
    step1Title: "Log in with GitHub",
    step1Desc: "Sign in with your GitHub account to load your repository list.",
    step2Title: "Connect Figma",
    step2Desc: "Connect your Figma account from the dashboard. Securely authenticated via OAuth.",
    step3Title: "Create a Project",
    step3Desc: "Select a Figma file URL and GitHub repo to create a new project.",
    step4Title: "Request Design Edits",
    step4Desc: "Click an element in the Figma viewer and ask AI to make changes.",

    // Modes
    modesTitle: "Two ways to work",
    cloudMode: "Cloud Mode",
    cloudModeDesc: "Paste a Figma URL and select an element — AI modifies the code and automatically pushes to GitHub.",
    cloudFeatures: [
      "No installation required",
      "GitHub auto-push",
      "Real-time diff preview",
      "Works in any browser",
    ],
    localMode: "Local Mode",
    localModeDesc: "Run the agent from the terminal and AI will directly modify code on your machine. Supports live preview and Hot Reload.",
    localFeatures: [
      "Native file access",
      "Built-in dev server",
      "Hot reload support",
      "Instant file watching",
    ],
    localHint: "After running, click \"Local Connect\" on the dashboard.",

    // Frameworks
    frameworks: "Supported Frameworks",
    frameworksDesc: "Works with a variety of frontend frameworks and conventions.",

    // FAQ
    faqTitle: "FAQ",
    faq1Q: "Do I need a Figma plugin?",
    faq1A: "No. Meld uses only the Figma REST API, so no plugin installation is needed.",
    faq2Q: "Does it overwrite my existing code?",
    faq2A: "It doesn't generate new code from scratch. It follows your project's existing patterns and conventions to modify code.",
    faq3Q: "Is it free?",
    faq3A: "Yes, it's currently free to use. Nothing to install.",
    faq4Q: "Which AI model does it use?",
    faq4A: "It uses Claude Sonnet 4.6, with prompts optimized for code modifications.",

    // Footer
    footerTagline: "Design to Code, seamlessly.",
  },
  ko: {
    heroTitle1: "기본을 익히고",
    heroTitle2: "자신있게 만드세요",

    gettingStarted: "시작하기",
    gettingStartedDesc: "Meld는 Figma 디자인을 기존 코드에 반영하는 AI 도구입니다. 플러그인 설치 없이, Figma REST API만으로 동작합니다.",
    step1Title: "GitHub로 로그인",
    step1Desc: "GitHub 계정으로 로그인하면 레포지토리 목록을 불러옵니다.",
    step2Title: "Figma 연결",
    step2Desc: "대시보드에서 Figma 계정을 연결하세요. OAuth로 안전하게 인증됩니다.",
    step3Title: "프로젝트 생성",
    step3Desc: "Figma 파일 URL과 GitHub 레포를 선택하여 새 프로젝트를 만드세요.",
    step4Title: "디자인 수정 요청",
    step4Desc: "Figma 뷰어에서 엘리먼트를 클릭하고, AI에게 수정을 요청하세요.",

    modesTitle: "두 가지 작업 방식",
    cloudMode: "Cloud 모드",
    cloudModeDesc: "Figma URL을 붙여넣고 엘리먼트를 선택하면, AI가 코드를 수정하고 GitHub에 자동으로 푸시합니다.",
    cloudFeatures: [
      "설치 불필요",
      "GitHub 자동 푸시",
      "실시간 diff 미리보기",
      "모든 브라우저에서 동작",
    ],
    localMode: "Local 모드",
    localModeDesc: "터미널에서 에이전트를 실행하면 내 컴퓨터의 코드를 AI가 직접 수정합니다. 실시간 프리뷰와 Hot Reload를 지원합니다.",
    localFeatures: [
      "네이티브 파일 접근",
      "내장 dev server",
      "Hot reload 지원",
      "즉시 파일 감시",
    ],
    localHint: "실행 후 대시보드에서 \"로컬 연결\" 버튼을 클릭하세요.",

    frameworks: "지원 프레임워크",
    frameworksDesc: "다양한 프론트엔드 프레임워크와 컨벤션을 지원합니다.",

    faqTitle: "자주 묻는 질문",
    faq1Q: "Figma 플러그인이 필요한가요?",
    faq1A: "아닙니다. Meld는 Figma REST API만 사용하므로 별도의 플러그인 설치가 필요 없습니다.",
    faq2Q: "기존 코드를 덮어쓰나요?",
    faq2A: "새 코드를 생성하지 않습니다. 기존 프로젝트의 패턴과 컨벤션을 따라 코드를 수정합니다.",
    faq3Q: "무료인가요?",
    faq3A: "네, 현재 무료로 사용할 수 있습니다. 설치할 것도 없습니다.",
    faq4Q: "어떤 AI 모델을 사용하나요?",
    faq4A: "Claude Sonnet 4.6을 사용합니다. 코드 수정에 최적화된 프롬프트로 동작합니다.",

    footerTagline: "Design to Code, seamlessly.",
  },
} as const;

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export default function DocsPage() {
  const { lang } = useLangStore();
  const t = translations[lang];

  const stepsSection = useInView(0.1);
  const modesSection = useInView(0.1);
  const frameworksSection = useInView(0.1);
  const faqSection = useInView(0.1);

  const steps = [
    { step: "1", title: t.step1Title, desc: t.step1Desc },
    { step: "2", title: t.step2Title, desc: t.step2Desc },
    { step: "3", title: t.step3Title, desc: t.step3Desc },
    { step: "4", title: t.step4Title, desc: t.step4Desc },
  ];

  const faqs = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq3Q, a: t.faq3A },
    { q: t.faq4Q, a: t.faq4A },
  ];

  return (
    <div className="min-h-screen bg-[#0B0E11] selection:bg-white selection:text-[#0B0E11]">
      {/* 그리드 배경 */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* 네비게이션 */}
      <LandingNav dark activePath="/docs" />

      {/* 히어로 */}
      <section className="relative z-10 pt-36 pb-6 lg:pt-44 lg:pb-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          <h1 className="animate-fade-in-up text-[40px] font-light leading-[1.15] tracking-[-0.03em] sm:text-[52px] lg:text-[64px]">
            <span className="text-[#999]">{t.heroTitle1}</span>
            <br />
            <span className="text-[#C5B882]">{t.heroTitle2}</span>
          </h1>
        </div>
      </section>

      {/* Getting Started — 4 스텝 카드 */}
      <section ref={stepsSection.ref} className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-16 py-16 lg:py-24">
        <h2 className={`text-[22px] font-medium text-white transition-all duration-700 ${stepsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {t.gettingStarted}
        </h2>
        <p className={`mt-3 max-w-2xl text-[16px] leading-relaxed text-[#666] transition-all duration-700 delay-100 ${stepsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          {t.gettingStartedDesc}
        </p>

        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[#1E2228] sm:grid-cols-4">
          {steps.map((item, i) => {
            const delays = ["", "delay-150", "delay-300", "delay-[450ms]"];
            return (
              <div
                key={item.step}
                className={`flex flex-col bg-[#0B0E11] p-8 ${i < 3 ? "sm:border-r sm:border-[#1E2228]" : ""} transition-all duration-700 ${delays[i]} ${stepsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E2228] text-[16px] font-semibold text-[#C5B882]">
                  {item.step}
                </div>
                <h3 className="text-[16px] font-medium text-white">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#666]">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cloud vs Local 모드 */}
      <section ref={modesSection.ref} className="relative z-10 border-t border-[#1E2228]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-20 lg:py-28">
          <h2 className={`text-[22px] font-medium text-white transition-all duration-700 ${modesSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {t.modesTitle}
          </h2>

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[#1E2228] sm:grid-cols-2">
            {/* Cloud */}
            <div className={`flex flex-col bg-[#0B0E11] p-10 lg:p-12 transition-all duration-700 ${modesSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <h3 className="text-[20px] font-medium text-white">{t.cloudMode}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#666]">{t.cloudModeDesc}</p>

              <ul className="mt-8 space-y-4">
                {t.cloudFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C5B882]" />
                    <span className="text-[16px] text-[#999]">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* 플로우 */}
              <div className="mt-10 flex flex-wrap items-center gap-2 text-[12px]">
                {[
                  { icon: Figma, label: "URL" },
                  { icon: MousePointerClick, label: lang === "ko" ? "선택" : "Select" },
                  { icon: Zap, label: "AI" },
                  { icon: GitBranch, label: "Push" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-[#1E2228] px-2.5 py-1.5">
                      <step.icon className="h-3 w-3 text-[#555]" />
                      <span className="text-[#666]">{step.label}</span>
                    </div>
                    {i < 3 && <ArrowRight className="h-3 w-3 text-[#333]" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Local */}
            <div className={`flex flex-col border-t sm:border-t-0 sm:border-l border-[#1E2228] bg-[#0B0E11] p-10 lg:p-12 transition-all duration-700 delay-150 ${modesSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <h3 className="text-[20px] font-medium text-white">{t.localMode}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#666]">{t.localModeDesc}</p>

              <ul className="mt-8 space-y-4">
                {t.localFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C5B882]" />
                    <span className="text-[16px] text-[#999]">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CLI 명령어 */}
              <div className="mt-10 rounded-xl bg-[#1E2228] px-5 py-4">
                <div className="flex items-center gap-2 font-mono text-[14px]">
                  <Terminal className="h-4 w-4 text-[#555]" />
                  <span className="text-[#999]">npx figma-code-bridge</span>
                </div>
              </div>
              <p className="mt-3 text-[13px] text-[#444]">{t.localHint}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 지원 프레임워크 */}
      <section ref={frameworksSection.ref} className="relative z-10 border-t border-[#1E2228]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-20 lg:py-28">
          <h2 className={`text-[22px] font-medium text-white transition-all duration-700 ${frameworksSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {t.frameworks}
          </h2>
          <p className={`mt-3 text-[16px] text-[#666] transition-all duration-700 delay-100 ${frameworksSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {t.frameworksDesc}
          </p>

          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#1E2228] sm:grid-cols-4">
            {[
              { name: "React", desc: "JSX / TSX" },
              { name: "Next.js", desc: "App Router" },
              { name: "Vue", desc: "SFC / Composition" },
              { name: "Angular", desc: "Component" },
            ].map((fw, i) => {
              const delays = ["", "delay-150", "delay-300", "delay-[450ms]"];
              return (
                <div
                  key={fw.name}
                  className={`bg-[#0B0E11] p-8 transition-all duration-700 ${delays[i]} ${frameworksSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <p className="text-[18px] font-medium text-white">{fw.name}</p>
                  <p className="mt-1 text-[14px] text-[#555]">{fw.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section ref={faqSection.ref} className="relative z-10 border-t border-[#1E2228]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-20 lg:py-28">
          <h2 className={`text-[22px] font-medium text-white transition-all duration-700 ${faqSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {t.faqTitle}
          </h2>

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[#1E2228] sm:grid-cols-2">
            {faqs.map((item, i) => {
              const delays = ["", "delay-150", "delay-300", "delay-[450ms]"];
              return (
                <div
                  key={i}
                  className={`bg-[#0B0E11] p-8 lg:p-10 transition-all duration-700 ${delays[i]} ${faqSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <p className="text-[16px] font-medium text-white">{item.q}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#666]">{item.a}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="relative z-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 pb-8">
          <div className="h-px w-full bg-[#1E2228]" />
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-white">
                <Blend className="h-2.5 w-2.5 text-[#0B0E11]" />
              </div>
              <span className="text-[12px] text-[#333]">Meld</span>
            </div>
            <p className="font-mono text-[11px] text-[#333]">{t.footerTagline}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
