"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Blend,
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

    // Features
    featuresLabel: "WORKSPACE",
    featuresTitle: "Your design and code, side by side",
    featuresSubtitle: "Meld brings together Figma layers, AI agent, and live code — in one workspace.",
    // Mockup layer tree
    mockupLayerPage: "Pages",
    mockupLayerFrame: "HeroSection",
    mockupLayerChild1: "Navbar",
    mockupLayerChild2: "HeroContent",
    mockupLayerChild3: "CTAButton",
    mockupLayerChild4: "BackgroundImage",
    // Mockup AI steps
    mockupAiStep1: "Analyzing Figma node tree...",
    mockupAiStep2: "Matched → HeroSection.tsx",
    mockupAiStep3: "Modifying button color to #10B981",
    mockupAiStep4: "Writing changes to file...",
    mockupAiStep5: "Done. 1 file changed.",
    // Feature pills
    feat1Title: "Figma Layer Browsing",
    feat1Desc: "See your Figma layer tree and click any element to select it.",
    feat2Title: "AI Code Agent",
    feat2Desc: "Describe changes in natural language. AI finds the file and modifies it.",
    feat3Title: "Live Code Preview",
    feat3Desc: "See the actual code diff before applying. Your dev server refreshes instantly.",

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

    // Features
    featuresLabel: "WORKSPACE",
    featuresTitle: "디자인과 코드를 나란히",
    featuresSubtitle: "Figma 레이어, AI 에이전트, 라이브 코드를 하나의 워크스페이스에서.",
    // Mockup layer tree
    mockupLayerPage: "Pages",
    mockupLayerFrame: "HeroSection",
    mockupLayerChild1: "Navbar",
    mockupLayerChild2: "HeroContent",
    mockupLayerChild3: "CTAButton",
    mockupLayerChild4: "BackgroundImage",
    // Mockup AI steps
    mockupAiStep1: "Figma 노드 트리 분석 중...",
    mockupAiStep2: "매칭 → HeroSection.tsx",
    mockupAiStep3: "버튼 색상을 #10B981로 수정 중",
    mockupAiStep4: "파일에 변경사항 작성 중...",
    mockupAiStep5: "완료. 1개 파일 변경됨.",
    // Feature pills
    feat1Title: "Figma 레이어 탐색",
    feat1Desc: "Figma 레이어 트리를 보고, 요소를 클릭해 선택합니다.",
    feat2Title: "AI 코드 에이전트",
    feat2Desc: "자연어로 변경사항을 설명하면 AI가 파일을 찾아 수정합니다.",
    feat3Title: "실시간 코드 미리보기",
    feat3Desc: "적용 전 코드 diff를 확인합니다. 개발 서버가 즉시 새로고침됩니다.",

    // Bottom CTA
    bottomTitle: "지금 시작하세요",
    bottomDesc: "무료입니다. 설치도 없습니다. 브라우저만 있으면 됩니다.",
    bottomCta: "시작하기",
    bottomCtaSecondary: "브라우저에서 열기",
  },
} as const;

type Lang = keyof typeof translations;

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function useCountUp(end: number, duration = 1500, start = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);

  return value;
}

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

  // 스크롤 기반 애니메이션 트리거
  const logoStrip = useInView();
  const howSection = useInView();
  const modesSection = useInView();
  const diffSection = useInView();
  const statsSection = useInView(0.3);
  const bottomCta = useInView();

  const featuresSection = statsSection;

  // 목업 채팅 메시지 순차 표시
  const [chatStep, setChatStep] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setChatStep(1), 1200),
      setTimeout(() => setChatStep(2), 2400),
      setTimeout(() => setChatStep(3), 3400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [lang]);

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
              <Blend className="h-3 w-3 text-white" />
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
            <Link href="/download" className="text-[13px] text-[#999] transition-colors hover:text-[#1A1A1A]">
              Download
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
      <section className="relative z-10 pt-36 pb-6 lg:pt-44 lg:pb-10">
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
                  <div className={`flex justify-end transition-all duration-500 ${chatStep >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                    <div className="max-w-[200px] rounded-2xl rounded-br-sm bg-[#1A1A1A] px-3 py-2 text-[11px] leading-relaxed text-white">
                      {t.mockupChat1}
                    </div>
                  </div>
                  {/* AI */}
                  <div className={`flex justify-start transition-all duration-500 ${chatStep >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
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
                  <div className={`flex justify-start transition-all duration-500 ${chatStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
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
      <section ref={logoStrip.ref} className="relative z-10 border-y border-black/[0.04] bg-[#FAFAFA] overflow-hidden">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-14 lg:py-20">
          <p className={`mb-10 text-center text-[13px] text-[#B4B4B0] transition-all duration-700 ${logoStrip.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {t.logoSubtitle}
          </p>

          {/* 로고 마키 */}
          <div className={`transition-all duration-700 delay-300 ${logoStrip.inView ? "opacity-100" : "opacity-0"}`}>
            <div className="flex animate-marquee items-center gap-x-10 sm:gap-x-14 lg:gap-x-20 whitespace-nowrap">
              {[...Array(2)].flatMap((_, setIdx) =>
                [
                  { name: "Claude Sonnet", style: "font-serif italic" },
                  { name: "GPT-4o", style: "font-mono font-bold" },
                  { name: "Gemini 2.5 Flash", style: "font-sans font-light tracking-wide" },
                  { name: "Figma", style: "font-sans font-bold" },
                  { name: "GitHub", style: "font-mono font-semibold" },
                  { name: "Supabase", style: "font-mono font-medium" },
                  { name: "Vercel", style: "font-sans font-semibold tracking-tight" },
                ].map((item) => (
                  <span
                    key={`${setIdx}-${item.name}`}
                    className={`text-[18px] text-[#C0C0C0] transition-colors hover:text-[#1A1A1A] sm:text-[20px] px-5 ${item.style}`}
                  >
                    {item.name}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== "이렇게 동작합니다" ===== */}
      <section ref={howSection.ref} className="relative z-10 bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <p className={`mb-2 font-mono text-[12px] tracking-wider text-[#CCC] transition-all duration-500 ${howSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>{t.howLabel}</p>
          <h2 className={`text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[40px] lg:text-[48px] transition-all duration-700 delay-100 ${howSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
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
                delay: "delay-200",
              },
              {
                step: "02",
                icon: MousePointerClick,
                title: t.howStep2Title,
                desc: t.howStep2Desc,
                detail: t.howStep2Detail,
                delay: "delay-[400ms]",
              },
              {
                step: "03",
                icon: GitBranch,
                title: t.howStep3Title,
                desc: t.howStep3Desc,
                detail: t.howStep3Detail,
                delay: "delay-[600ms]",
              },
            ].map((item) => (
              <div key={item.step} className={`group transition-all duration-700 ${item.delay} ${howSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="font-mono text-[32px] font-bold text-[#E8E8E8] transition-colors group-hover:text-[#1A1A1A]">
                    {item.step}
                  </span>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-black/[0.06] transition-transform duration-500 ${howSection.inView ? "rotate-0 scale-100" : "rotate-12 scale-75"}`}>
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
      <section ref={modesSection.ref} className="relative z-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <p className={`mb-2 font-mono text-[12px] tracking-wider text-[#CCC] transition-all duration-500 ${modesSection.inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"}`}>{t.modesLabel}</p>
          <h2 className={`text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[40px] lg:text-[48px] transition-all duration-700 delay-100 ${modesSection.inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}>
            {t.modesTitle}
          </h2>
          <p className={`mt-3 max-w-md text-[15px] text-[#999] transition-all duration-700 delay-200 ${modesSection.inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"}`}>
            {t.modesSubtitle}
          </p>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {/* Cloud */}
            <div className={`flex flex-col rounded-xl bg-[#FAFAFA] p-6 ring-1 ring-black/[0.04] transition-all duration-700 delay-300 hover:ring-black/[0.08] hover:shadow-lg hover:-translate-y-1 ${modesSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
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
            <div className={`flex flex-col rounded-xl bg-[#FAFAFA] p-6 ring-1 ring-black/[0.04] transition-all duration-700 delay-[450ms] hover:ring-black/[0.08] hover:shadow-lg hover:-translate-y-1 ${modesSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
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
            <div className={`flex flex-col rounded-xl bg-[#FAFAFA] p-6 ring-1 ring-black/[0.04] transition-all duration-700 delay-[600ms] hover:ring-black/[0.08] hover:shadow-lg hover:-translate-y-1 ${modesSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
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
      <section ref={diffSection.ref} className="relative z-10 bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <div className="grid items-center gap-12 sm:grid-cols-2 lg:gap-20">
            <div className={`transition-all duration-700 ${diffSection.inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"}`}>
              <p className="mb-2 font-mono text-[12px] tracking-wider text-[#CCC]">{t.diffLabel}</p>
              <h2 className="text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[36px] lg:text-[44px]">
                {t.diffTitle}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#999]">
                {t.diffDesc}
              </p>
              <div className="mt-6 space-y-3 text-[13px] text-[#999]">
                {[t.diffCheck1, t.diffCheck2, t.diffCheck3].map((item, i) => (
                  <div key={item} className={`flex items-center gap-2 transition-all duration-500 ${diffSection.inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: `${400 + i * 150}ms` }}>
                    <Check className="h-3.5 w-3.5 text-[#1A1A1A]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* 코드 블록 */}
            <div className={`overflow-hidden rounded-xl bg-[#1A1A1A] ring-1 ring-black/[0.1] transition-all duration-700 delay-200 ${diffSection.inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}`}>
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

      {/* ===== 서비스 기능 (Product Showcase) ===== */}
      <section ref={featuresSection.ref} className="relative z-10 bg-[#0B0E11]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          {/* 헤더 */}
          <div className={`mb-14 transition-all duration-700 ease-out ${featuresSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <span className="text-[12px] font-semibold tracking-[0.15em] text-[#555]">{t.featuresLabel}</span>
            <h2 className="mt-2 text-[32px] font-bold leading-[1.15] tracking-[-0.03em] text-white sm:text-[40px]">
              {t.featuresTitle}
            </h2>
            <p className="mt-2 text-[15px] text-[#666]">{t.featuresSubtitle}</p>
          </div>

          {/* 프로덕트 목업 — 다크 윈도우 */}
          <div className={`overflow-hidden rounded-2xl border border-[#1E2228] bg-[#131619] shadow-2xl shadow-black/40 transition-all duration-1000 ease-out ${featuresSection.inView ? "opacity-100 scale-100" : "opacity-0 scale-[0.97]"}`}>
            {/* 타이틀바 */}
            <div className="flex items-center gap-2 border-b border-[#1E2228] px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                <span className="h-3 w-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex flex-1 items-center justify-center gap-2">
                <Blend className="h-3.5 w-3.5 text-[#555]" />
                <span className="text-[12px] font-medium text-[#555]">Meld</span>
              </div>
              <div className="w-12" />
            </div>

            {/* 3-패널 레이아웃 */}
            <div className="grid lg:grid-cols-[220px_1fr_1fr] min-h-[420px]">
              {/* 왼쪽: Figma 레이어 트리 */}
              <div className="hidden border-r border-[#1E2228] bg-[#131619] p-4 lg:block">
                <p className="mb-3 text-[11px] font-semibold tracking-wider text-[#555]">{t.mockupLayerPage}</p>
                <div className="space-y-0.5">
                  {/* 프레임 - 확장됨 */}
                  <div className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-500 ${featuresSection.inView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "300ms" }}>
                    <svg className="h-3 w-3 text-[#555]" viewBox="0 0 12 12" fill="none"><path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <Figma className="h-3 w-3 text-[#A78BFA]" />
                    <span className="text-[12px] text-[#CCC]">{t.mockupLayerFrame}</span>
                  </div>
                  {/* 자식 노드들 */}
                  {[t.mockupLayerChild1, t.mockupLayerChild2, t.mockupLayerChild3, t.mockupLayerChild4].map((child, i) => (
                    <div
                      key={child}
                      className={`ml-5 flex items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-500 ${i === 2 ? "bg-[#1A3A5C] ring-1 ring-[#3B82F6]/30" : ""} ${featuresSection.inView ? "opacity-100" : "opacity-0"}`}
                      style={{ transitionDelay: `${400 + i * 100}ms` }}
                    >
                      <Layers className="h-3 w-3 text-[#555]" />
                      <span className={`text-[12px] ${i === 2 ? "text-[#93C5FD]" : "text-[#888]"}`}>{child}</span>
                    </div>
                  ))}
                </div>

                {/* 프레임워크 태그 */}
                <div className={`mt-8 transition-all duration-500 ${featuresSection.inView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "900ms" }}>
                  <p className="mb-2 text-[10px] font-semibold tracking-wider text-[#444]">DETECTED</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["React", "TypeScript", "Tailwind"].map((tag) => (
                      <span key={tag} className="rounded bg-[#1A1F25] px-2 py-0.5 text-[10px] text-[#6EE7B7]">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 중앙: AI 에이전트 채팅 */}
              <div className="border-r border-[#1E2228] bg-[#0F1215] p-5 flex flex-col">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1A1F25]">
                    <Cpu className="h-3.5 w-3.5 text-[#10B981]" />
                  </div>
                  <span className="text-[12px] font-semibold text-[#999]">AI Agent</span>
                  <span className="ml-auto rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-medium text-[#10B981]">Running</span>
                </div>

                <div className="flex-1 space-y-3 font-mono text-[12px]">
                  {[t.mockupAiStep1, t.mockupAiStep2, t.mockupAiStep3, t.mockupAiStep4, t.mockupAiStep5].map((step, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 transition-all duration-500 ${featuresSection.inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                      style={{ transitionDelay: `${500 + i * 250}ms` }}
                    >
                      <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${i === 4 ? "bg-[#10B981]" : "bg-[#3B82F6]"}`} />
                      <span className={`leading-relaxed ${i === 4 ? "text-[#10B981]" : "text-[#888]"}`}>{step}</span>
                    </div>
                  ))}
                </div>

                {/* 입력바 */}
                <div className={`mt-4 flex items-center gap-2 rounded-lg border border-[#1E2228] bg-[#131619] px-3 py-2.5 transition-all duration-500 ${featuresSection.inView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "1800ms" }}>
                  <MessageSquare className="h-3.5 w-3.5 text-[#444]" />
                  <span className="text-[12px] text-[#444]">{t.mockupInput}</span>
                </div>
              </div>

              {/* 오른쪽: 코드 프리뷰 */}
              <div className="bg-[#0F1215] p-5 hidden lg:flex flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-[#555]" />
                    <span className="text-[12px] font-semibold text-[#999]">HeroSection.tsx</span>
                  </div>
                  <div className={`flex items-center gap-1.5 transition-all duration-500 ${featuresSection.inView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "1600ms" }}>
                    <Check className="h-3 w-3 text-[#10B981]" />
                    <span className="text-[10px] font-medium text-[#10B981]">Modified</span>
                  </div>
                </div>

                <div className="flex-1 space-y-0 rounded-lg border border-[#1E2228] bg-[#0B0E11] font-mono text-[11px] overflow-hidden">
                  {[
                    { n: 12, code: "  return (", color: "text-[#555]" },
                    { n: 13, code: '    <section className="hero">', color: "text-[#555]" },
                    { n: 14, code: "      <h1>{title}</h1>", color: "text-[#555]" },
                    { n: 15, code: "      <Button", color: "text-[#555]", removed: true },
                    { n: 15, code: "      <Button", color: "text-[#A5D6A7]", added: true },
                    { n: 16, code: '        className="cta-btn"', color: "text-[#555]", removed: true },
                    { n: 16, code: '        className="cta-btn"', color: "text-[#A5D6A7]", added: true },
                    { n: 17, code: '        color="#6B7280"', color: "text-[#555]", removed: true },
                    { n: 17, code: '        color="#10B981"', color: "text-[#A5D6A7]", added: true },
                    { n: 18, code: "      >", color: "text-[#555]" },
                    { n: 19, code: "        Get Started", color: "text-[#555]" },
                    { n: 20, code: "      </Button>", color: "text-[#555]" },
                  ].map((line, i) => (
                    <div
                      key={i}
                      className={`flex items-center px-3 py-[3px] ${line.removed ? "bg-[#3C1618]" : line.added ? "bg-[#132A1B]" : ""} transition-all duration-400 ${featuresSection.inView ? "opacity-100" : "opacity-0"}`}
                      style={{ transitionDelay: `${800 + i * 60}ms` }}
                    >
                      <span className="mr-4 w-5 text-right text-[10px] text-[#444]">{line.n}</span>
                      <span className={`${line.removed ? "text-[#E57373]" : ""} ${line.added ? "text-[#A5D6A7]" : ""} ${!line.removed && !line.added ? line.color : ""}`}>
                        {line.removed && <span className="mr-1 text-[#E57373]">-</span>}
                        {line.added && <span className="mr-1 text-[#A5D6A7]">+</span>}
                        {line.code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 기능 3-카드 */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Figma, title: t.feat1Title, desc: t.feat1Desc, delay: 200 },
              { icon: Cpu, title: t.feat2Title, desc: t.feat2Desc, delay: 400 },
              { icon: Eye, title: t.feat3Title, desc: t.feat3Desc, delay: 600 },
            ].map((feat) => (
              <div
                key={feat.title}
                className={`group rounded-xl border border-[#1E2228] bg-[#131619] p-5 transition-all duration-500 ease-out hover:border-[#2A3038] hover:bg-[#181C21] ${featuresSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: featuresSection.inView ? `${feat.delay}ms` : "0ms" }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1A1F25] transition-transform duration-300 group-hover:scale-110">
                  <feat.icon className="h-4 w-4 text-[#888]" />
                </div>
                <h3 className="mt-3 text-[14px] font-semibold text-[#DDD]">{feat.title}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-[#666]">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 하단 CTA ===== */}
      <section ref={bottomCta.ref} className="relative z-10 bg-[#1A1A1A] overflow-hidden">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <h2
            className={`text-[36px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[48px] lg:text-[56px] transition-all duration-700 ease-out ${bottomCta.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            {t.bottomTitle}
          </h2>
          <p
            className={`mt-3 text-[16px] text-[#666] transition-all duration-700 delay-200 ease-out ${bottomCta.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            {t.bottomDesc}
          </p>
          <div
            className={`mt-10 flex items-center gap-6 transition-all duration-700 delay-[400ms] ease-out ${bottomCta.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl bg-[#F5F0E8] px-7 py-3.5 text-[15px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#EDE7DB] hover:shadow-lg hover:shadow-white/10 active:scale-[0.98]"
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
                <Blend className="h-2.5 w-2.5 text-[#1A1A1A]" />
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
