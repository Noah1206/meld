"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Blend,
  Apple,
  Monitor,
  Terminal,
  Download,
  Copy,
  Check,
  FolderOpen,
  Eye,
  Zap,
  HardDrive,
  Server,
} from "lucide-react";

const APP_VERSION = "0.1.0";
const GITHUB_RELEASE_BASE = "#"; // GitHub Releases URL — 릴리즈 연동 전 placeholder

const PLATFORMS = {
  mac: {
    filename: `Meld-${APP_VERSION}.dmg`,
    ext: ".dmg",
    size: "~85 MB",
    requirement: "macOS 12+",
  },
  windows: {
    filename: `Meld-Setup-${APP_VERSION}.exe`,
    ext: ".exe",
    size: "~75 MB",
    requirement: "Windows 10+",
  },
  linux: {
    filename: `Meld-${APP_VERSION}.AppImage`,
    ext: ".AppImage",
    size: "~90 MB",
    requirement: "Ubuntu 20.04+",
  },
} as const;

type Platform = keyof typeof PLATFORMS;

const translations = {
  en: {
    // Nav
    navDocs: "Docs",
    navGitHub: "GitHub",
    navDownload: "Download",
    navCta: "Get Started",

    // Hero
    heroLabel: "DESKTOP APP",
    heroTitle: "Native performance\nfor your local projects",
    heroDesc: "Edit local projects with native file access. No agent installation needed.",
    heroDownload: "Download for",
    heroVersion: `v${APP_VERSION}`,

    // Platforms
    platformTitle: "All Platforms",
    platformDownload: "Download",
    macName: "macOS",
    windowsName: "Windows",
    linuxName: "Linux",

    // Comparison
    compareTitle: "Desktop vs Web",
    compareDesc: "The desktop app provides a native experience that goes beyond the browser.",
    compareFeature1: "Native file access",
    compareFeature1Desc: "No agent installation needed",
    compareFeature2: "Built-in Dev Server",
    compareFeature2Desc: "Manage dev server within the app",
    compareFeature3: "Real-time file watching",
    compareFeature3Desc: "Instant change detection with chokidar",
    compareFeature4: "Native folder dialog",
    compareFeature4Desc: "OS-native folder selection",
    compareDesktop: "Desktop",
    compareWeb: "Web",

    // CLI
    cliTitle: "Prefer the terminal?",
    cliDesc: "You can also run the agent from the terminal without the desktop app.",
    cliCopied: "Copied!",

    // Footer
    footerTagline: "Design to Code, seamlessly.",
  },
  ko: {
    // Nav
    navDocs: "Docs",
    navGitHub: "GitHub",
    navDownload: "다운로드",
    navCta: "시작하기",

    // Hero
    heroLabel: "데스크톱 앱",
    heroTitle: "로컬 프로젝트를\n네이티브 성능으로 수정하세요",
    heroDesc: "에이전트 설치 없이 로컬 파일에 직접 접근합니다.",
    heroDownload: "다운로드",
    heroVersion: `v${APP_VERSION}`,

    // Platforms
    platformTitle: "모든 플랫폼",
    platformDownload: "다운로드",
    macName: "macOS",
    windowsName: "Windows",
    linuxName: "Linux",

    // Comparison
    compareTitle: "데스크톱 vs 웹",
    compareDesc: "데스크톱 앱은 브라우저를 넘어서는 네이티브 경험을 제공합니다.",
    compareFeature1: "네이티브 파일 접근",
    compareFeature1Desc: "에이전트 설치 불필요",
    compareFeature2: "내장 Dev Server 관리",
    compareFeature2Desc: "앱 안에서 개발 서버 관리",
    compareFeature3: "실시간 파일 감시",
    compareFeature3Desc: "chokidar 기반 즉시 변경 감지",
    compareFeature4: "네이티브 폴더 다이얼로그",
    compareFeature4Desc: "OS 기본 폴더 선택 UI",
    compareDesktop: "데스크톱",
    compareWeb: "웹",

    // CLI
    cliTitle: "터미널을 선호하시나요?",
    cliDesc: "데스크톱 앱 없이도 터미널에서 에이전트를 실행할 수 있습니다.",
    cliCopied: "복사됨!",

    // Footer
    footerTagline: "Design to Code, seamlessly.",
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

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "mac";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux")) return "linux";
  return "mac";
}

function CopyCommand({ command, copiedLabel }: { command: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex w-full items-center gap-2.5 rounded-xl bg-[#252525] px-4 py-3.5 text-left font-mono text-[13px] transition-all hover:bg-[#2A2A2A] active:scale-[0.99]"
    >
      <Terminal className="h-3.5 w-3.5 text-[#555] transition-colors group-hover:text-[#999]" />
      <span className="flex-1 text-[#999]">{command}</span>
      {copied ? (
        <span className="flex items-center gap-1 text-[11px] text-[#999]">
          <Check className="h-3 w-3" />
          {copiedLabel}
        </span>
      ) : (
        <Copy className="h-3.5 w-3.5 text-[#555] transition-colors group-hover:text-[#999]" />
      )}
    </button>
  );
}

function PlatformIcon({ platform }: { platform: Platform }) {
  switch (platform) {
    case "mac":
      return <Apple className="h-5 w-5" />;
    case "windows":
      return <Monitor className="h-5 w-5" />;
    case "linux":
      return <Terminal className="h-5 w-5" />;
  }
}

export default function DownloadPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [detectedPlatform, setDetectedPlatform] = useState<Platform>("mac");
  const t = translations[lang];

  useEffect(() => {
    setDetectedPlatform(detectPlatform());
  }, []);

  const platformSection = useInView();
  const compareSection = useInView();
  const cliSection = useInView();

  const platformNames: Record<Platform, string> = {
    mac: t.macName,
    windows: t.windowsName,
    linux: t.linuxName,
  };

  const getDownloadUrl = (platform: Platform) => {
    if (GITHUB_RELEASE_BASE === "#") return "#";
    return `${GITHUB_RELEASE_BASE}/${PLATFORMS[platform].filename}`;
  };

  return (
    <div className="min-h-screen bg-white selection:bg-[#1A1A1A] selection:text-white">
      {/* 그리드 배경 */}
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

      {/* 네비게이션 */}
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
            <Link href="/download" className="text-[13px] font-medium text-[#1A1A1A]">
              {t.navDownload}
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

      {/* 히어로 — OS 자동 감지 + 메인 다운로드 */}
      <section className="relative z-10 pt-36 pb-6 lg:pt-44 lg:pb-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          <p className="animate-fade-in-up mb-3 font-mono text-[12px] tracking-wider text-[#CCC]">
            {t.heroLabel}
          </p>
          <h1 className="animate-fade-in-up animation-delay-75 whitespace-pre-line text-[40px] font-bold leading-[1.1] tracking-[-0.04em] text-[#1A1A1A] sm:text-[52px] lg:text-[64px]">
            {t.heroTitle}
          </h1>
          <p className="animate-fade-in-up animation-delay-150 mt-5 max-w-lg text-[17px] leading-[1.7] text-[#999]">
            {t.heroDesc}
          </p>

          {/* 메인 다운로드 버튼 */}
          <div className="animate-fade-in-up animation-delay-300 mt-10 flex items-center gap-5">
            <a
              href={getDownloadUrl(detectedPlatform)}
              className="group inline-flex items-center gap-3 rounded-xl bg-[#1A1A1A] px-7 py-4 text-[15px] font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98]"
            >
              <Download className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
              {t.heroDownload} {platformNames[detectedPlatform]}
              <span className="text-[13px] text-[#666]">{PLATFORMS[detectedPlatform].ext}</span>
            </a>
            <div className="text-[12px] text-[#CCC]">
              <span className="font-mono">{t.heroVersion}</span>
              <span className="mx-2">·</span>
              <span>{PLATFORMS[detectedPlatform].size}</span>
            </div>
          </div>

          {/* 플랫폼 태그 */}
          <div className="animate-fade-in animation-delay-450 mt-6 flex items-center gap-2 text-[12px] text-[#CCC]">
            {(["mac", "windows", "linux"] as Platform[]).map((p) => (
              <span
                key={p}
                className={`rounded-full px-2.5 py-0.5 ring-1 ${
                  p === detectedPlatform
                    ? "bg-[#1A1A1A] text-white ring-[#1A1A1A]"
                    : "bg-[#FAFAFA] ring-black/[0.04]"
                }`}
              >
                {platformNames[p]}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 전체 플랫폼 카드 */}
      <section ref={platformSection.ref} className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-16 py-20 lg:py-28">
        <h2 className={`text-[28px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[36px] transition-all duration-700 ${platformSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {t.platformTitle}
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {(["mac", "windows", "linux"] as Platform[]).map((p, i) => {
            const info = PLATFORMS[p];
            const delays = ["delay-200", "delay-[400ms]", "delay-[600ms]"];
            return (
              <div
                key={p}
                className={`group flex flex-col rounded-2xl bg-[#FAFAFA] p-6 ring-1 ring-black/[0.04] transition-all duration-700 ${delays[i]} hover:ring-black/[0.08] hover:shadow-lg hover:-translate-y-1 ${platformSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white ring-1 ring-black/[0.06]">
                  <PlatformIcon platform={p} />
                </div>
                <h3 className="text-[16px] font-semibold text-[#1A1A1A]">{platformNames[p]}</h3>
                <p className="mt-1 text-[12px] text-[#999]">
                  {info.ext} · {info.size}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-[#CCC]">{info.requirement}</p>
                <div className="mt-auto pt-5">
                  <a
                    href={getDownloadUrl(p)}
                    className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-3 text-[13px] font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98]"
                  >
                    <Download className="h-4 w-4 transition-transform group-hover/btn:-translate-y-0.5" />
                    {t.platformDownload}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 데스크톱 vs 웹 비교 */}
      <section ref={compareSection.ref} className="relative z-10 bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <h2 className={`text-[28px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[36px] transition-all duration-700 ${compareSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {t.compareTitle}
          </h2>
          <p className={`mt-3 max-w-md text-[15px] text-[#999] transition-all duration-700 delay-100 ${compareSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {t.compareDesc}
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: FolderOpen,
                title: t.compareFeature1,
                desc: t.compareFeature1Desc,
                desktop: true,
                web: false,
                delay: "delay-200",
              },
              {
                icon: Server,
                title: t.compareFeature2,
                desc: t.compareFeature2Desc,
                desktop: true,
                web: false,
                delay: "delay-[350ms]",
              },
              {
                icon: Eye,
                title: t.compareFeature3,
                desc: t.compareFeature3Desc,
                desktop: true,
                web: true,
                delay: "delay-[500ms]",
              },
              {
                icon: HardDrive,
                title: t.compareFeature4,
                desc: t.compareFeature4Desc,
                desktop: true,
                web: false,
                delay: "delay-[650ms]",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className={`rounded-2xl bg-white p-5 ring-1 ring-black/[0.04] transition-all duration-700 ${feature.delay} ${compareSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#FAFAFA] ring-1 ring-black/[0.04]">
                  <feature.icon className="h-4 w-4 text-[#1A1A1A]" />
                </div>
                <h3 className="text-[14px] font-semibold text-[#1A1A1A]">{feature.title}</h3>
                <p className="mt-1 text-[12px] text-[#999]">{feature.desc}</p>
                <div className="mt-4 flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1">
                    {feature.desktop ? (
                      <Check className="h-3 w-3 text-[#059669]" />
                    ) : (
                      <span className="h-3 w-3 text-center text-[#CCC]">—</span>
                    )}
                    <span className="text-[#787774]">{t.compareDesktop}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    {feature.web ? (
                      <Check className="h-3 w-3 text-[#059669]" />
                    ) : (
                      <span className="h-3 w-3 text-center text-[#CCC]">—</span>
                    )}
                    <span className="text-[#787774]">{t.compareWeb}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLI 대안 섹션 */}
      <section ref={cliSection.ref} className="relative z-10 bg-[#1A1A1A]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <div className={`max-w-xl transition-all duration-700 ${cliSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#252525] ring-1 ring-white/[0.06]">
              <Terminal className="h-5 w-5 text-[#999]" />
            </div>
            <h2 className="text-[28px] font-bold tracking-[-0.03em] text-white sm:text-[36px]">
              {t.cliTitle}
            </h2>
            <p className="mt-3 text-[15px] text-[#666]">
              {t.cliDesc}
            </p>
            <div className={`mt-8 transition-all duration-700 delay-200 ${cliSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <CopyCommand command="npx figma-code-bridge" copiedLabel={t.cliCopied} />
            </div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
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
            <p className="font-mono text-[11px] text-[#444]">{t.footerTagline}</p>
          </div>
        </div>
      </footer>

      {/* 언어 토글 (고정) */}
      <button
        onClick={() => setLang(lang === "en" ? "ko" : "en")}
        className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#1A1A1A] shadow-lg ring-1 ring-black/[0.08] transition-all hover:scale-105 hover:shadow-xl active:scale-95"
      >
        {lang === "en" ? "KO" : "EN"}
      </button>
    </div>
  );
}
