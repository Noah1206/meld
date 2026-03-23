"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Code2,
  Figma,
  MousePointerClick,
  GitBranch,
  MessageSquare,
  Eye,
  Zap,
  Terminal,
  Layers,
  MousePointer,
  Monitor,
  Globe,
  Cpu,
  Check,
} from "lucide-react";

const translations = {
  en: {
    // Nav
    navDocs: "Docs",
    navGitHub: "GitHub",
    navCta: "Get Started",

    // Hero
    heroTitle1: "The perfect design IDE",
    heroTitle2: "for one person",
    heroDesc1: "We don't generate new code.",
    heroDesc2: "We automatically link design elements to code files,",
    heroDesc3: "and modify your existing code in place.",
    heroCta: "Get Started",
    heroCtaSecondary: "Open in Browser",

    // Product mockup
    mockupChat1: "Change the CTA button in this hero section to mint color",
    mockupChat2: "Modifying HeroSection.tsx:",
    mockupCommit: "Committed to main",
    mockupInput: "Enter your edit request...",

    // Logo strip
    logoSubtitle: "Connect various AI models and tools freely in one workspace",

    // How it works
    howLabel: "HOW IT WORKS",
    howTitle: "Done in 30 seconds",
    howStep1Title: "Paste a Figma link",
    howStep1Desc: "Copy and paste a share link from Figma to load your design as-is. No plugins needed.",
    howStep1Detail: "Just a share link is all you need",
    howStep2Title: "Click the element to change",
    howStep2Desc: "Click the design element you want to modify, and AI will automatically find the corresponding code file.",
    howStep2Detail: "95%+ accuracy",
    howStep3Title: "Review and apply",
    howStep3Desc: "AI shows you a preview of the code changes. After review, apply to GitHub with one click.",
    howStep3Detail: "Change preview provided",

    // Modes
    modesLabel: "MODES",
    modesTitle: "Anywhere, your way",
    modesSubtitle: "Choose the method that fits your situation. The result is the same either way.",
    cloudTitle: "Cloud",
    cloudDesc: "Just connect your GitHub account to edit and save code right in your browser. Nothing to install.",
    cloudTags: ["GitHub Sync", "Figma Sync", "One-click Save"],
    localTitle: "Local",
    localDesc: "Run one command in your terminal to apply changes directly to files on your machine. Save and your dev server refreshes instantly.",
    sandboxTitle: "Sandbox",
    sandboxDesc: "No installation needed. A dev environment is set up automatically in your browser, and you can see results right away.",
    sandboxTags: ["No Install", "Live Preview", "Auto Refresh"],

    // Diff preview
    diffLabel: "DIFF PREVIEW",
    diffTitle: "Modifies your existing code",
    diffDesc: "AI highlights only the parts it changed. See exactly what code was modified at a glance, and apply it with one approval.",
    diffCheck1: "Preserves your existing code style",
    diffCheck2: "Choose from Claude · GPT-4o · Gemini",
    diffCheck3: "Before/after comparison preview",

    // Stats
    statFrameworkLabel: "Supported Frameworks",
    statFrameworkSub: "Next.js · React · Vue · Angular & more",
    statAiLabel: "AI Models",
    statAiSub: "Claude · GPT-4o · Gemini",
    statAccuracyLabel: "Matching Accuracy",
    statAccuracySub: "Design → Code auto-linking",
    statPluginLabel: "Plugin Installs",
    statPluginSub: "A browser is all you need",

    // Bottom CTA
    bottomTitle: "Get started now",
    bottomDesc: "It's free. No installation. Just a browser.",
    bottomCta: "Get Started",
    bottomCtaSecondary: "Open in Browser",
  },
  ko: {
    // Nav
    navDocs: "Docs",
    navGitHub: "GitHub",
    navCta: "시작하기",

    // Hero
    heroTitle1: "한 사람을 위한",
    heroTitle2: "완벽한 디자인 IDE",
    heroDesc1: "새 코드를 만들지 않습니다.",
    heroDesc2: "디자인 요소와 코드 파일을 자동으로 연결해서,",
    heroDesc3: "이미 작성된 코드 위에서 수정합니다.",
    heroCta: "시작하기",
    heroCtaSecondary: "브라우저에서 열기",

    // Product mockup
    mockupChat1: "이 히어로 섹션의 CTA 버튼을 민트색으로 바꿔줘",
    mockupChat2: "HeroSection.tsx를 수정합니다:",
    mockupCommit: "main에 커밋 완료",
    mockupInput: "수정 요청을 입력하세요...",

    // Logo strip
    logoSubtitle: "다양한 AI 모델과 도구를 하나의 워크스페이스에서 자유롭게 연결하세요",

    // How it works
    howLabel: "HOW IT WORKS",
    howTitle: "30초면 끝납니다",
    howStep1Title: "Figma 링크를 붙여넣으세요",
    howStep1Desc: "Figma에서 공유 링크를 복사해 붙여넣으면, 디자인을 그대로 불러옵니다. 플러그인은 필요 없습니다.",
    howStep1Detail: "공유 링크만 있으면 끝",
    howStep2Title: "바꿀 요소를 클릭하세요",
    howStep2Desc: "수정하고 싶은 디자인 요소를 클릭하면, AI가 해당하는 코드 파일을 자동으로 찾아줍니다.",
    howStep2Detail: "95% 이상 정확도",
    howStep3Title: "확인하고 반영하세요",
    howStep3Desc: "AI가 수정한 코드의 변경 내역을 미리 보여줍니다. 확인 후 한 클릭으로 GitHub에 반영됩니다.",
    howStep3Detail: "변경 사항 미리보기 제공",

    // Modes
    modesLabel: "MODES",
    modesTitle: "어디서든, 원하는 방식으로",
    modesSubtitle: "상황에 맞는 방식을 선택하세요. 어떤 방식이든 결과는 같습니다.",
    cloudTitle: "Cloud",
    cloudDesc: "GitHub 계정만 연결하면 브라우저에서 바로 코드를 수정하고 저장할 수 있습니다. 설치할 것이 없습니다.",
    cloudTags: ["GitHub 연동", "Figma 연동", "원클릭 저장"],
    localTitle: "Local",
    localDesc: "터미널에서 한 줄만 실행하면 내 컴퓨터의 파일에 직접 반영됩니다. 저장하면 개발 서버가 바로 새로고침됩니다.",
    sandboxTitle: "Sandbox",
    sandboxDesc: "아무것도 설치하지 않아도 됩니다. 브라우저 안에서 개발 환경이 자동으로 세팅되고, 결과를 바로 확인할 수 있습니다.",
    sandboxTags: ["설치 불필요", "실시간 미리보기", "자동 새로고침"],

    // Diff preview
    diffLabel: "DIFF PREVIEW",
    diffTitle: "기존 코드를 수정합니다",
    diffDesc: "AI가 수정한 부분만 하이라이트로 보여줍니다. 어떤 코드가 바뀌었는지 한눈에 확인하고, 승인하면 바로 반영됩니다.",
    diffCheck1: "기존 코드 스타일 그대로 유지",
    diffCheck2: "Claude · GPT-4o · Gemini 중 선택",
    diffCheck3: "변경 전/후 비교 미리보기",

    // Stats
    statFrameworkLabel: "지원 프레임워크",
    statFrameworkSub: "Next.js · React · Vue · Angular 등",
    statAiLabel: "AI 모델",
    statAiSub: "Claude · GPT-4o · Gemini",
    statAccuracyLabel: "매칭 정확도",
    statAccuracySub: "디자인 → 코드 자동 연결",
    statPluginLabel: "플러그인 설치",
    statPluginSub: "브라우저만 있으면 충분",

    // Bottom CTA
    bottomTitle: "지금 시작하세요",
    bottomDesc: "무료입니다. 설치도 없습니다. 브라우저만 있으면 됩니다.",
    bottomCta: "시작하기",
    bottomCtaSecondary: "브라우저에서 열기",
  },
} as const;

type Lang = keyof typeof translations;

function useTypewriter(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayed, done };
}

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = translations[lang];

  const { displayed: title1, done: title1Done } = useTypewriter(t.heroTitle1, 50);
  const { displayed: title2 } = useTypewriter(title1Done ? t.heroTitle2 : "", 50);

  return (
    <div className="min-h-screen bg-white selection:bg-[#1A1A1A] selection:text-white">
      {/* ===== 그리드 배경 ===== */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* ===== 네비게이션 ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 lg:px-16 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1A1A1A]">
              <Code2 className="h-3 w-3 text-white" />
            </div>
            <span className="text-[14px] font-semibold text-[#1A1A1A]">Meld</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="text-[13px] text-[#999] transition-colors hover:text-[#1A1A1A]">
              {t.navDocs}
            </Link>
            <Link href="/github" className="text-[13px] text-[#999] transition-colors hover:text-[#1A1A1A]">
              {t.navGitHub}
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-[#F5F0E8] px-4 py-1.5 text-[13px] font-semibold text-[#1A1A1A] transition-colors hover:bg-[#EDE7DB]"
            >
              {t.navCta}
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== 히어로 ===== */}
      <section className="relative z-10 pt-28 pb-6 lg:pt-32 lg:pb-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          <h1 className="text-[48px] font-bold leading-[1.05] tracking-[-0.04em] text-[#1A1A1A] sm:text-[64px] lg:text-[76px] xl:text-[88px]">
            {title1}
            {!title1Done && <span className="inline-block w-[3px] h-[0.9em] bg-[#1A1A1A] align-middle ml-1 animate-blink" />}
            {title1Done && (
              <>
                <br />
                <span className="text-[#CCC]">
                  {title2}
                  {title2 !== t.heroTitle2 && <span className="inline-block w-[3px] h-[0.9em] bg-[#CCC] align-middle ml-1 animate-blink" />}
                </span>
              </>
            )}
          </h1>

          <p className="animate-fade-in-up animation-delay-150 mt-6 max-w-lg text-[17px] leading-[1.7] text-[#999]">
            {t.heroDesc1}
            <br />
            {t.heroDesc2}
            <br />
            {t.heroDesc3}
          </p>

          {/* CTA */}
          <div className="animate-fade-in-up animation-delay-300 mt-10 flex items-center gap-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl bg-[#F5F0E8] px-7 py-3.5 text-[15px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#EDE7DB] active:scale-[0.98]"
            >
              {t.heroCta}
            </Link>
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-1.5 text-[15px] text-[#999] transition-colors hover:text-[#1A1A1A]"
            >
              {t.heroCtaSecondary}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* 프레임워크 태그 */}
          <div className="animate-fade-in animation-delay-450 mt-8 flex items-center gap-2 text-[12px] text-[#CCC]">
            {["Next.js", "React", "Vue", "Angular", "Svelte", "Vite", "Astro"].map((fw) => (
              <span key={fw} className="rounded-full bg-[#FAFAFA] px-2.5 py-0.5 ring-1 ring-black/[0.04]">
                {fw}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 프로덕트 목업 ===== */}
      <section className="animate-fade-in-up animation-delay-600 relative z-10 mx-auto max-w-[1440px] px-6 lg:px-16 pt-10 pb-24 lg:pb-32">
        <div className="overflow-hidden rounded-xl ring-1 ring-black/[0.08]">
          {/* 브라우저 바 */}
          <div className="flex items-center bg-[#FAFAFA] px-4 py-2.5">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#E0E0E0]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#E0E0E0]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#E0E0E0]" />
            </div>
            <div className="mx-auto text-[11px] text-[#CCC]">meld.dev</div>
          </div>

          {/* 3-패널 앱 목업 */}
          <div className="flex h-[400px] bg-white sm:h-[460px] lg:h-[540px]">
            {/* 좌: Figma 뷰어 */}
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-2 bg-[#FAFAFA] px-4 py-2">
                <Figma className="h-3.5 w-3.5 text-[#999]" />
                <span className="text-[11px] font-medium text-[#999]">Figma Viewer</span>
              </div>
              <div className="relative flex-1 bg-[#FAFAFA] p-4">
                <div className="h-full rounded-lg bg-white p-4 ring-1 ring-black/[0.04]">
                  <div className="space-y-2.5">
                    {/* 네비게이션 바 목업 */}
                    <div className="flex items-center justify-between rounded-md bg-[#FAFAFA] p-2.5">
                      <div className="h-2.5 w-14 rounded-full bg-[#E0E0E0]" />
                      <div className="flex gap-2">
                        <div className="h-2.5 w-10 rounded-full bg-[#E8E8E8]" />
                        <div className="h-2.5 w-10 rounded-full bg-[#E8E8E8]" />
                        <div className="h-6 w-16 rounded-full bg-[#1A1A1A]" />
                      </div>
                    </div>
                    {/* 히어로 목업 */}
                    <div className="space-y-2 rounded-md bg-[#FAFAFA] p-4">
                      <div className="h-4 w-56 rounded bg-[#D4D4D4]" />
                      <div className="h-3 w-72 rounded bg-[#E8E8E8]" />
                      <div className="h-3 w-48 rounded bg-[#E8E8E8]" />
                      <div className="mt-3 flex gap-2">
                        <div className="h-7 w-24 rounded-full bg-[#1A1A1A]" />
                        <div className="h-7 w-20 rounded-full bg-[#F0F0F0] ring-1 ring-black/[0.06]" />
                      </div>
                    </div>
                    {/* 카드 그리드 목업 */}
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="space-y-1.5 rounded-md bg-[#FAFAFA] p-2.5">
                          <div className="h-12 rounded bg-[#F0F0F0]" />
                          <div className="h-2 w-full rounded-full bg-[#E8E8E8]" />
                          <div className="h-2 w-2/3 rounded-full bg-[#F0F0F0]" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 셀렉션 오버레이 */}
                  <div className="pointer-events-none absolute left-8 right-8 top-[82px] h-[100px] rounded border-2 border-[#1A1A1A]">
                    <div className="absolute -top-5 left-0 flex items-center gap-1 rounded bg-[#1A1A1A] px-2 py-0.5 text-[9px] font-medium text-white">
                      <MousePointer className="h-2.5 w-2.5" />
                      Hero Section
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-[#1A1A1A]" />
                    <div className="absolute -top-1 -left-1 h-2 w-2 bg-[#1A1A1A]" />
                    <div className="absolute -top-1 -right-1 h-2 w-2 bg-[#1A1A1A]" />
                    <div className="absolute -bottom-1 -left-1 h-2 w-2 bg-[#1A1A1A]" />
                  </div>
                </div>
              </div>
            </div>

            {/* 구분 */}
            <div className="w-px bg-black/[0.06]" />

            {/* 우: AI 채팅 */}
            <div className="hidden w-[300px] flex-col sm:flex lg:w-[360px]">
              <div className="flex items-center gap-2 bg-[#FAFAFA] px-4 py-2">
                <MessageSquare className="h-3.5 w-3.5 text-[#999]" />
                <span className="text-[11px] font-medium text-[#999]">AI Chat</span>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <div className="flex-1 space-y-3">
                  {/* 유저 */}
                  <div className="flex justify-end">
                    <div className="max-w-[200px] rounded-2xl rounded-br-sm bg-[#1A1A1A] px-3 py-2 text-[11px] leading-relaxed text-white">
                      {t.mockupChat1}
                    </div>
                  </div>
                  {/* AI */}
                  <div className="flex justify-start">
                    <div className="max-w-[220px] space-y-2 rounded-2xl rounded-bl-sm bg-[#FAFAFA] px-3 py-2.5 text-[11px] leading-relaxed text-[#666] ring-1 ring-black/[0.04]">
                      <p>{t.mockupChat2}</p>
                      {/* 코드 diff */}
                      <div className="overflow-hidden rounded-md bg-[#1A1A1A] font-mono text-[10px]">
                        <div className="bg-[#FEE2E2]/10 px-2.5 py-1 text-[#F87171]">
                          - className=&quot;bg-blue-500&quot;
                        </div>
                        <div className="bg-[#D1FAE5]/10 px-2.5 py-1 text-[#34D399]">
                          + className=&quot;bg-emerald-500&quot;
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 완료 */}
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-3 py-1.5 text-[10px] font-medium text-[#16A34A] ring-1 ring-[#16A34A]/10">
                      <Check className="h-3 w-3" />
                      {t.mockupCommit}
                    </div>
                  </div>
                </div>
                {/* 인풋 */}
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#FAFAFA] px-3 py-2 ring-1 ring-black/[0.04]">
                  <span className="flex-1 text-[11px] text-[#CCC]">{t.mockupInput}</span>
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#1A1A1A]">
                    <ArrowRight className="h-2.5 w-2.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 호환성 로고 스트립 ===== */}
      <section className="relative z-10 border-y border-black/[0.04] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-14 lg:py-20">
          <p className="mb-10 text-center text-[13px] text-[#B4B4B0]">
            {t.logoSubtitle}
          </p>

          {/* 로고 스트립 */}
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-14 lg:gap-x-20">
            {[
              { name: "Claude Sonnet", style: "font-serif italic" },
              { name: "GPT-4o", style: "font-mono font-bold" },
              { name: "Gemini 2.5 Flash", style: "font-sans font-light tracking-wide" },
              { name: "Figma", style: "font-sans font-bold" },
              { name: "GitHub", style: "font-mono font-semibold" },
              { name: "Supabase", style: "font-mono font-medium" },
              { name: "Vercel", style: "font-sans font-semibold tracking-tight" },
            ].map((item) => (
              <span
                key={item.name}
                className={`text-[18px] text-[#C0C0C0] transition-colors hover:text-[#1A1A1A] sm:text-[20px] ${item.style}`}
              >
                {item.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== "이렇게 동작합니다" ===== */}
      <section className="relative z-10 bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <p className="mb-2 font-mono text-[12px] tracking-wider text-[#CCC]">{t.howLabel}</p>
          <h2 className="text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[40px] lg:text-[48px]">
            {t.howTitle}
          </h2>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: Figma,
                title: t.howStep1Title,
                desc: t.howStep1Desc,
                detail: t.howStep1Detail,
              },
              {
                step: "02",
                icon: MousePointerClick,
                title: t.howStep2Title,
                desc: t.howStep2Desc,
                detail: t.howStep2Detail,
              },
              {
                step: "03",
                icon: GitBranch,
                title: t.howStep3Title,
                desc: t.howStep3Desc,
                detail: t.howStep3Detail,
              },
            ].map((item) => (
              <div key={item.step} className="group">
                <div className="mb-4 flex items-center gap-3">
                  <span className="font-mono text-[32px] font-bold text-[#E8E8E8] transition-colors group-hover:text-[#1A1A1A]">
                    {item.step}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-black/[0.06]">
                    <item.icon className="h-4 w-4 text-[#999]" />
                  </div>
                </div>
                <h3 className="text-[16px] font-semibold text-[#1A1A1A]">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#999]">{item.desc}</p>
                <p className="mt-3 font-mono text-[11px] text-[#CCC]">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 3가지 모드 ===== */}
      <section className="relative z-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <p className="mb-2 font-mono text-[12px] tracking-wider text-[#CCC]">{t.modesLabel}</p>
          <h2 className="text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[40px] lg:text-[48px]">
            {t.modesTitle}
          </h2>
          <p className="mt-3 max-w-md text-[15px] text-[#999]">
            {t.modesSubtitle}
          </p>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {/* Cloud */}
            <div className="flex flex-col rounded-xl bg-[#FAFAFA] p-6 ring-1 ring-black/[0.04] transition-colors hover:ring-black/[0.08]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white ring-1 ring-black/[0.06]">
                <Globe className="h-5 w-5 text-[#1A1A1A]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#1A1A1A]">{t.cloudTitle}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[#999]">
                {t.cloudDesc}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.cloudTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#999] ring-1 ring-black/[0.04]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Local */}
            <div className="flex flex-col rounded-xl bg-[#FAFAFA] p-6 ring-1 ring-black/[0.04] transition-colors hover:ring-black/[0.08]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white ring-1 ring-black/[0.06]">
                <Terminal className="h-5 w-5 text-[#1A1A1A]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#1A1A1A]">{t.localTitle}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[#999]">
                {t.localDesc}
              </p>
              <div className="mt-4 overflow-hidden rounded-md bg-[#1A1A1A] px-3 py-2 font-mono text-[11px]">
                <span className="text-[#666]">$</span>
                <span className="text-[#999]"> npx figma-code-bridge --port 3100</span>
              </div>
            </div>

            {/* Sandbox */}
            <div className="flex flex-col rounded-xl bg-[#FAFAFA] p-6 ring-1 ring-black/[0.04] transition-colors hover:ring-black/[0.08]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white ring-1 ring-black/[0.06]">
                <Monitor className="h-5 w-5 text-[#1A1A1A]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#1A1A1A]">{t.sandboxTitle}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[#999]">
                {t.sandboxDesc}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.sandboxTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#999] ring-1 ring-black/[0.04]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 코드 디프 예시 ===== */}
      <section className="relative z-10 bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <div className="grid items-center gap-12 sm:grid-cols-2 lg:gap-20">
            <div>
              <p className="mb-2 font-mono text-[12px] tracking-wider text-[#CCC]">{t.diffLabel}</p>
              <h2 className="text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[36px] lg:text-[44px]">
                {t.diffTitle}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#999]">
                {t.diffDesc}
              </p>
              <div className="mt-6 space-y-3 text-[13px] text-[#999]">
                {[t.diffCheck1, t.diffCheck2, t.diffCheck3].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1A1A1A]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* 코드 블록 */}
            <div className="overflow-hidden rounded-xl bg-[#1A1A1A] ring-1 ring-black/[0.1]">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="font-mono text-[11px] text-[#555]">HeroSection.tsx</span>
                <span className="rounded bg-[#333] px-2 py-0.5 text-[10px] text-[#888]">modified</span>
              </div>
              <div className="border-t border-white/[0.06] font-mono text-[12px] leading-[1.8]">
                <div className="px-4 py-0.5 text-[#666]">
                  <span className="mr-4 inline-block w-6 text-right text-[#444]">14</span>
                  {"  "}return (
                </div>
                <div className="px-4 py-0.5 text-[#666]">
                  <span className="mr-4 inline-block w-6 text-right text-[#444]">15</span>
                  {"    "}&lt;section className=&quot;hero&quot;&gt;
                </div>
                <div className="bg-[#FEE2E2]/[0.06] px-4 py-0.5 text-[#F87171]">
                  <span className="mr-4 inline-block w-6 text-right text-[#F87171]/50">16</span>
                  -{"      "}&lt;Button className=&quot;bg-blue-500&quot;&gt;
                </div>
                <div className="bg-[#D1FAE5]/[0.08] px-4 py-0.5 text-[#34D399]">
                  <span className="mr-4 inline-block w-6 text-right text-[#34D399]/50">16</span>
                  +{"      "}&lt;Button className=&quot;bg-emerald-500&quot;&gt;
                </div>
                <div className="px-4 py-0.5 text-[#666]">
                  <span className="mr-4 inline-block w-6 text-right text-[#444]">17</span>
                  {"        "}시작하기
                </div>
                <div className="px-4 py-0.5 text-[#666]">
                  <span className="mr-4 inline-block w-6 text-right text-[#444]">18</span>
                  {"      "}&lt;/Button&gt;
                </div>
                <div className="px-4 py-0.5 text-[#666]">
                  <span className="mr-4 inline-block w-6 text-right text-[#444]">19</span>
                  {"    "}&lt;/section&gt;
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 숫자들 ===== */}
      <section className="relative z-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <div className="grid gap-px overflow-hidden rounded-xl bg-black/[0.04] ring-1 ring-black/[0.04] sm:grid-cols-4">
            {[
              { value: "7", label: t.statFrameworkLabel, sub: t.statFrameworkSub },
              { value: "3", label: t.statAiLabel, sub: t.statAiSub },
              { value: "95%+", label: t.statAccuracyLabel, sub: t.statAccuracySub },
              { value: "0", label: t.statPluginLabel, sub: t.statPluginSub },
            ].map((stat) => (
              <div key={stat.label} className="bg-white p-6 text-center lg:p-10">
                <div className="font-mono text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] lg:text-[40px]">
                  {stat.value}
                </div>
                <div className="mt-1 text-[13px] font-medium text-[#1A1A1A]">{stat.label}</div>
                <div className="mt-0.5 text-[11px] text-[#CCC]">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 하단 CTA ===== */}
      <section className="relative z-10 bg-[#1A1A1A]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <h2 className="text-[36px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[48px] lg:text-[56px]">
            {t.bottomTitle}
          </h2>
          <p className="mt-3 text-[16px] text-[#666]">
            {t.bottomDesc}
          </p>
          <div className="mt-10 flex items-center gap-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl bg-[#F5F0E8] px-7 py-3.5 text-[15px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#EDE7DB] active:scale-[0.98]"
            >
              {t.bottomCta}
            </Link>
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-1.5 text-[15px] text-[#666] transition-colors hover:text-white"
            >
              {t.bottomCtaSecondary}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 푸터 ===== */}
      <footer className="relative z-10 bg-[#1A1A1A]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 pb-8">
          <div className="h-px w-full bg-white/[0.06]" />
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-white">
                <Code2 className="h-2.5 w-2.5 text-[#1A1A1A]" />
              </div>
              <span className="text-[12px] text-[#555]">Meld</span>
            </div>
            <p className="font-mono text-[11px] text-[#444]">Design to Code, seamlessly.</p>
          </div>
        </div>
      </footer>

      {/* ===== 언어 토글 (고정) ===== */}
      <button
        onClick={() => setLang(lang === "en" ? "ko" : "en")}
        className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#1A1A1A] shadow-lg ring-1 ring-black/[0.08] transition-all hover:scale-105 hover:shadow-xl active:scale-95"
      >
        {lang === "en" ? "KO" : "EN"}
      </button>
    </div>
  );
}
