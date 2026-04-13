"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLangStore } from "@/lib/store/lang-store";
import Link from "next/link";
import { LandingNav } from "@/components/layout/LandingNav";
import { LoginModal } from "@/components/auth/LoginModal";
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
  Bell,
  RefreshCw,
  Download,
  Copy,
  FolderOpen,
} from "lucide-react";

const APP_VERSION = "0.1.1";
const GITHUB_RELEASE_BASE = "https://github.com/Noah1206/meld/releases/download";
const PLATFORMS = {
  mac: { filename: `Meld-${APP_VERSION}.dmg`, ext: ".dmg", size: "~85 MB" },
  windows: { filename: `Meld-Setup-${APP_VERSION}.exe`, ext: ".exe", size: "~75 MB" },
  linux: { filename: `Meld-${APP_VERSION}.AppImage`, ext: ".AppImage", size: "~90 MB" },
} as const;
type Platform = keyof typeof PLATFORMS;

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
      className="group flex w-full items-center gap-2.5 rounded-lg border border-white/[0.08] px-4 py-2.5 text-left font-mono text-[13px] transition-all hover:border-black/[0.15] active:scale-[0.99]"
    >
      <Terminal className="h-3.5 w-3.5 text-[#CCC] transition-colors group-hover:text-[#999]" />
      <span className="flex-1 text-[#999]">{command}</span>
      {copied ? (
        <span className="flex items-center gap-1 text-[11px] text-[#999]">
          <Check className="h-3 w-3" />
          {copiedLabel}
        </span>
      ) : (
        <Copy className="h-3.5 w-3.5 text-[#CCC] transition-colors group-hover:text-[#999]" />
      )}
    </button>
  );
}

function AuthModal({ onClose, onSuccess, redirectUrl }: { onClose: () => void; onSuccess: () => void; redirectUrl: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-[440px] rounded-3xl bg-[#0F0F0F] p-10 shadow-[0_32px_64px_rgba(0,0,0,0.2)] ring-1 ring-white/[0.06]"
        style={{ animation: "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 rounded-full p-2 text-[#CCC] transition-colors hover:bg-white/[0.06] hover:text-[#E8E8E5]"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4L4 12" strokeLinecap="round"/></svg>
        </button>

        {/* Logo */}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A1A1A]">
          <Blend className="h-6 w-6 text-white" />
        </div>

        {/* Header */}
        <div className="mt-7">
          <p className="text-[24px] font-light text-[#CCC]">Start building.</p>
          <h2 className="mt-0.5 text-[30px] font-bold tracking-[-0.02em] text-[#E8E8E5]">Create free account</h2>
        </div>

        {/* OAuth Buttons */}
        <div className="mt-9 space-y-3">
          <a
            href={`/api/auth/github?redirect_to=${encodeURIComponent(redirectUrl)}`}
            className="flex w-full items-center rounded-2xl border border-[#E0E0DC] px-6 py-4 text-[16px] font-medium text-[#E8E8E5] transition-all hover:bg-[#111111] hover:border-[#CCC] active:scale-[0.99]"
          >
            <svg className="mr-5 h-6 w-6" viewBox="0 0 24 24" fill="#1A1A1A"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            Continue with GitHub
          </a>
        </div>

        {/* Divider */}
        <div className="my-7 flex items-center gap-4">
          <div className="h-px flex-1 bg-[#E8E8E5]" />
          <span className="text-[13px] font-medium text-[#CCC]">OR</span>
          <div className="h-px flex-1 bg-[#E8E8E5]" />
        </div>

        {/* Email (placeholder — future) */}
        <button
          disabled
          className="w-full rounded-2xl border border-[#E0E0DC] px-6 py-4 text-[16px] font-medium text-[#CCC] cursor-not-allowed"
        >
          Continue with email (coming soon)
        </button>

        {/* Terms */}
        <p className="mt-8 text-[12px] leading-relaxed text-[#CCC]">
          By continuing, you agree to the{" "}
          <span className="underline decoration-[#E0E0DC] hover:decoration-[#999] cursor-pointer">Terms of Service</span> and{" "}
          <span className="underline decoration-[#E0E0DC] hover:decoration-[#999] cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

const PLACEHOLDER_TEXTS = [
  "A portfolio website with dark mode and animated sections...",
  "Build a SaaS dashboard with auth and billing...",
  "Create a landing page like Stripe...",
  "An e-commerce store with cart and checkout...",
  "A blog with MDX support and dark mode...",
];

function useTypingPlaceholder(texts: string[], typeSpeed = 40, pauseMs = 2000, deleteSpeed = 20) {
  // Start with first text to match SSR
  const [display, setDisplay] = useState(texts[0]);
  const [textIndex, setTextIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    let i = texts[textIndex].length; // Start full (first render shows full text)
    let deleting = textIndex === 0; // First text: start deleting after pause
    let timeout: ReturnType<typeof setTimeout>;
    const text = texts[textIndex];

    if (textIndex === 0 && deleting) {
      // First text already displayed — pause then start deleting
      timeout = setTimeout(() => {
        const deleteTick = () => {
          i--;
          setDisplay(text.slice(0, i));
          if (i <= 0) {
            setTextIndex(1);
            return;
          }
          timeout = setTimeout(deleteTick, deleteSpeed);
        };
        deleteTick();
      }, pauseMs);
      return () => clearTimeout(timeout);
    }

    i = 0;
    const tick = () => {
      if (!deleting) {
        i++;
        setDisplay(text.slice(0, i));
        if (i >= text.length) {
          timeout = setTimeout(() => { deleting = true; tick(); }, pauseMs);
          return;
        }
        timeout = setTimeout(tick, typeSpeed + Math.random() * 30);
      } else {
        i--;
        setDisplay(text.slice(0, i));
        if (i <= 0) {
          deleting = false;
          setTextIndex((prev) => (prev + 1) % texts.length);
          return;
        }
        timeout = setTimeout(tick, deleteSpeed);
      }
    };

    timeout = setTimeout(tick, 300);
    return () => clearTimeout(timeout);
  }, [textIndex, mounted, texts, typeSpeed, pauseMs, deleteSpeed]);

  return display;
}

function HeroInput({ onSubmit }: { onSubmit: (prompt: string, category: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"website" | "app" | "service" | "tool">("website");
  const [showDropdown, setShowDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const animatedPlaceholder = useTypingPlaceholder(PLACEHOLDER_TEXTS);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [prompt]);

  const categories = [
    { id: "website" as const, label: "Website", icon: <Globe className="h-4 w-4" /> },
    { id: "app" as const, label: "App", icon: <Monitor className="h-4 w-4" /> },
    { id: "service" as const, label: "Server", icon: <Cpu className="h-4 w-4" /> },
    { id: "tool" as const, label: "Automation", icon: <Zap className="h-4 w-4" /> },
  ];
  const current = categories.find(c => c.id === selectedCategory) || categories[0];

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    onSubmit(prompt.trim(), selectedCategory);
  };

  return (
    <div>
      <div className="relative rounded-2xl border border-white/[0.1] bg-[#151515]/90 backdrop-blur-sm transition-all focus-within:border-white/[0.2]">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
          }}
          placeholder={prompt ? "" : (animatedPlaceholder || PLACEHOLDER_TEXTS[0])}
          className="w-full resize-none rounded-t-2xl bg-transparent px-6 pt-6 pb-4 text-[16px] leading-relaxed text-white outline-none placeholder:text-[#555]"
          rows={3}
          style={{ minHeight: "120px" }}
        />

        <div className="flex items-center justify-between px-5 py-3.5">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 rounded-xl bg-transparent px-4 py-2.5 text-[14px] font-medium text-[#ccc] transition-colors hover:bg-white/[0.06]"
            >
              {current.icon}
              <span>{current.label}</span>
              <svg className={`h-3.5 w-3.5 text-[#666] transition-transform ${showDropdown ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            {showDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border border-white/[0.1] bg-[#1A1A1A] shadow-2xl z-[100] overflow-hidden">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setShowDropdown(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.06] text-[#ccc] ${selectedCategory === cat.id ? "bg-white/[0.06]" : ""}`}
                  >
                    <span className="text-[#888]">{cat.icon}</span>
                    <span className="text-[14px] font-medium">{cat.label}</span>
                    {selectedCategory === cat.id && <Check className="h-4 w-4 ml-auto text-purple-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {prompt.trim() && (
            <button
              onClick={handleSubmit}
              className="flex items-center justify-center h-9 w-9 rounded-full bg-[#0F0F0F] text-[#0A0A0A] hover:bg-[#E8E8E5] active:scale-[0.95] transition-all"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2.5">
        {[
          { icon: <FolderOpen className="h-4 w-4" />, label: "Open folder" },
          { icon: <GitBranch className="h-4 w-4" />, label: "GitHub" },
          { icon: <Zap className="h-4 w-4" />, label: "Connectors" },
          { icon: <Eye className="h-4 w-4" />, label: "Web search" },
        ].map((chip) => (
          <button
            key={chip.label}
            className="no-hover-fill flex items-center gap-2.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-[14px] text-[#777] ring-1 ring-white/[0.06] transition-all duration-200 hover:bg-white/[0.06] hover:text-[#E8E8E5] hover:ring-white/[0.12]"
          >
            {chip.icon} {chip.label}
          </button>
        ))}
      </div>

    </div>
  );
}

const translations = {
  en: {
    // Hero
    heroTitle1: "The perfect design IDE",
    heroTitle2: "for one person",
    heroDesc1: "We don't generate new code.",
    heroDesc2: "We automatically link design elements to code files,",
    heroDesc3: "and modify your existing code in place.",
    heroDownload: "Download for",
    heroCta: "Open in Browser",
    macNotice: "macOS: \"App is damaged\" error?",
    copied: "Copied!",

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

    // Features — 4대 핵심 기능
    featuresLabel: "CORE FEATURES",
    featuresTitle: "What Meld actually does",
    feat1Label: "DESIGN → CODE MAPPING",
    feat1Title: "Click design, find code",
    feat1Desc: "Click any element in Figma viewer and AI automatically locates the matching code file in your project. Name-convention matching → AI inference → cache. 3-step fallback.",
    feat1Visual1: "CTAButton",
    feat1Visual2: "HeroSection.tsx",
    feat1Visual3: "95%+ match accuracy",
    feat2Label: "REAL-TIME PREVIEW",
    feat2Title: "Edit, save, see instantly",
    feat2Desc: "Code changes trigger your dev server's hot reload. See the result in the embedded iframe — no tab switching. The loop is under 2 seconds.",
    feat2Visual1: "Code modified",
    feat2Visual2: "Hot reload triggered",
    feat2Visual3: "Preview updated",
    feat3Label: "FRAMEWORK-AWARE",
    feat3Title: "Respects your conventions",
    feat3Desc: "AI analyzes your existing code patterns — component structure, naming, import style — and generates modifications that match. Not boilerplate. Your code, your way.",
    feat4Label: "DESIGN TRACKING",
    feat4Title: "Figma changed? We notice.",
    feat4Desc: "When a designer updates the Figma file, Meld detects the diff and asks: \"Update your code?\" One click to review and apply the changes.",
    feat4Visual1: "Figma design updated",
    feat4Visual2: "2 elements changed",
    feat4Visual3: "Update code?",

    // Bottom CTA
    bottomTitle: "Get started now",
    bottomDesc: "Download the desktop app, or open in your browser. It's free.",
    bottomDownload: "Download Desktop App",
    bottomCta: "Open in Browser",
  },
  ko: {
    // Hero
    heroTitle1: "한 사람을 위한",
    heroTitle2: "완벽한 디자인 IDE",
    heroDesc1: "새 코드를 만들지 않습니다.",
    heroDesc2: "디자인 요소와 코드 파일을 자동으로 연결해서,",
    heroDesc3: "이미 작성된 코드 위에서 수정합니다.",
    heroDownload: "다운로드",
    heroCta: "브라우저에서 열기",
    macNotice: "macOS: \"앱이 손상되었습니다\" 오류?",
    copied: "복사됨!",

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

    // Features — 4대 핵심 기능
    featuresLabel: "CORE FEATURES",
    featuresTitle: "Meld가 실제로 하는 일",
    feat1Label: "디자인 → 코드 매핑",
    feat1Title: "디자인을 클릭하면, 코드를 찾습니다",
    feat1Desc: "Figma 뷰어에서 아무 요소나 클릭하면 AI가 프로젝트에서 해당 코드 파일을 자동으로 찾아냅니다. 네이밍 매칭 → AI 추론 → 캐시. 3단계 폴백.",
    feat1Visual1: "CTAButton",
    feat1Visual2: "HeroSection.tsx",
    feat1Visual3: "95% 이상 매칭 정확도",
    feat2Label: "실시간 프리뷰",
    feat2Title: "수정하고, 저장하고, 바로 확인",
    feat2Desc: "코드 변경이 dev server의 hot reload를 트리거합니다. 내장된 iframe에서 결과를 바로 확인하세요 — 탭 전환 없이. 루프는 2초 이내.",
    feat2Visual1: "코드 수정됨",
    feat2Visual2: "Hot reload 트리거",
    feat2Visual3: "미리보기 업데이트",
    feat3Label: "프레임워크 인식",
    feat3Title: "기존 코드 컨벤션을 따릅니다",
    feat3Desc: "AI가 기존 코드 패턴을 분석합니다 — 컴포넌트 구조, 네이밍, import 스타일 — 그에 맞는 수정을 생성합니다. 보일러플레이트가 아닙니다.",
    feat4Label: "디자인 변경 추적",
    feat4Title: "Figma가 바뀌면? 알려드립니다.",
    feat4Desc: "디자이너가 Figma 파일을 업데이트하면, Meld가 변경을 감지하고 묻습니다: \"코드를 업데이트할까요?\" 한 클릭으로 변경사항을 확인하고 적용합니다.",
    feat4Visual1: "Figma 디자인 업데이트됨",
    feat4Visual2: "2개 요소 변경",
    feat4Visual3: "코드 업데이트?",

    // Bottom CTA
    bottomTitle: "지금 시작하세요",
    bottomDesc: "데스크톱 앱을 다운로드하거나, 브라우저에서 바로 시작하세요. 무료입니다.",
    bottomDownload: "데스크톱 앱 다운로드",
    bottomCta: "브라우저에서 열기",
  },
} as const;

type Lang = keyof typeof translations;

function useInView(threshold = 0.15): [React.RefObject<HTMLDivElement | null>, boolean] {
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

  return [ref, inView];
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
  const router = useRouter();
  const { lang, toggleLang } = useLangStore();
  const t = translations[lang];
  // Lazy init reads platform once on client mount.
  const [detectedPlatform] = useState<Platform>(() =>
    typeof window === "undefined" ? "mac" : detectPlatform()
  );
  const [authModal, setAuthModal] = useState<{ prompt: string; category: string } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Check if already logged in
    fetch("/api/auth/me").then(res => {
      if (res.ok) setLoggedIn(true);
    }).catch(() => {});
  }, []);

  const platformNames: Record<Platform, string> = { mac: "macOS", windows: "Windows", linux: "Linux" };
  const getDownloadUrl = (p: Platform) => `${GITHUB_RELEASE_BASE}/v${APP_VERSION}/${PLATFORMS[p].filename}`;

  const { displayed: title1, done: title1Done } = useTypewriter(t.heroTitle1, 50);
  const { displayed: title2 } = useTypewriter(title1Done ? t.heroTitle2 : "", 50);

  // 스크롤 기반 애니메이션 트리거
  const [logoStripRef, logoStripInView] = useInView();
  const [howSectionRef, howSectionInView] = useInView();
  const [modesSectionRef, modesSectionInView] = useInView();
  const [diffSectionRef, diffSectionInView] = useInView();
  const [statsSectionRef, statsSectionInView] = useInView(0.3);
  const [bottomCtaRef, bottomCtaInView] = useInView();

  const featuresSectionRef = statsSectionRef;
  const featuresSectionInView = statsSectionInView;

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
    <div className="min-h-screen bg-[#0A0A0A] selection:bg-[#0F0F0F] selection:text-black">
      {/* ===== 블랙홀 배경 ===== */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Star field */}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.1) 0%, transparent 100%),
            radial-gradient(1px 1px at 30% 65%, rgba(255,255,255,0.06) 0%, transparent 100%),
            radial-gradient(1px 1px at 55% 15%, rgba(255,255,255,0.08) 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 45%, rgba(255,255,255,0.05) 0%, transparent 100%),
            radial-gradient(1px 1px at 85% 75%, rgba(255,255,255,0.07) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 15% 45%, rgba(255,255,255,0.09) 0%, transparent 100%),
            radial-gradient(1px 1px at 90% 10%, rgba(255,255,255,0.06) 0%, transparent 100%)`
        }} />
        {/* Blackhole image */}
        <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 w-[1400px] max-w-[140vw] opacity-50">
          <img src="/blackhole.png" alt="" className="w-full h-auto select-none" draggable={false} style={{ filter: "blur(2px)" }} />
        </div>
        {/* Fade edges */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]" style={{ opacity: 0.7 }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-transparent to-[#0A0A0A]" style={{ opacity: 0.5 }} />
      </div>

      {/* ===== 네비게이션 ===== */}
      <LandingNav activePath="/" onLogin={() => setShowLoginModal(true)} />

      {/* ===== 히어로 ===== */}
      <section className="relative z-10 pt-44 pb-6 lg:pt-56 lg:pb-12">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="animate-fade-in-up text-[36px] font-bold leading-[1.05] tracking-[-0.04em] text-white sm:text-[48px] lg:text-[60px] xl:text-[68px]">
            {t.heroTitle1}
            <br />
            <span className="text-[#999]">{t.heroTitle2}</span>
          </h1>

          <p className="animate-fade-in-up animation-delay-150 mx-auto mt-5 text-[17px] text-[#AAA]">
            {lang === "ko"
              ? "아이디어를 설명하세요 — Meld AI가 계획, 구현, 검증까지 완료합니다"
              : "Just describe it — Meld AI plans, builds, and delivers working code"}
          </p>

          {/* 인풋란 — workspace 스타일 */}
          <div className="animate-fade-in-up animation-delay-300 mx-auto mt-10 max-w-3xl" style={{ animationDelay: "0.3s" }}>
            <HeroInput onSubmit={(prompt, category) => {
              if (loggedIn) {
                router.push(`/projects?prompt=${encodeURIComponent(prompt)}&category=${encodeURIComponent(category)}`);
              } else {
                setAuthModal({ prompt, category });
              }
            }} />
          </div>

          <div className="mt-6" />
        </div>
      </section>

      {/* ===== 프로덕트 목업 ===== */}
      <section className="animate-fade-in-up animation-delay-600 relative z-10 mx-auto max-w-[1440px] px-6 lg:px-16 pt-10 pb-24 lg:pb-32">
        <div className="overflow-hidden rounded-xl ring-1 ring-white/[0.08]">
          {/* 브라우저 바 */}
          <div className="flex items-center bg-[#111111] px-4 py-2.5">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-white/[0.1]" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/[0.1]" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/[0.1]" />
            </div>
            <div className="mx-auto text-[11px] text-[#CCC]">meld.dev</div>
          </div>

          {/* 3-패널 앱 목업 */}
          <div className="flex h-[400px] bg-[#0F0F0F] sm:h-[460px] lg:h-[540px]">
            {/* 좌: Figma 뷰어 */}
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-2 bg-[#111111] px-4 py-2">
                <Figma className="h-3.5 w-3.5 text-[#999]" />
                <span className="text-[11px] font-medium text-[#999]">Figma Viewer</span>
              </div>
              <div className="relative flex-1 bg-[#111111] p-4">
                <div className="h-full rounded-lg bg-white/[0.08] p-4 ring-1 ring-white/[0.06]">
                  <div className="space-y-2.5">
                    {/* 네비게이션 바 목업 */}
                    <div className="flex items-center justify-between rounded-md bg-[#111111] p-2.5">
                      <div className="h-2.5 w-14 rounded-full bg-white/[0.1]" />
                      <div className="flex gap-2">
                        <div className="h-2.5 w-10 rounded-full bg-white/[0.08]" />
                        <div className="h-2.5 w-10 rounded-full bg-white/[0.08]" />
                        <div className="h-6 w-16 rounded-full bg-[#1A1A1A]" />
                      </div>
                    </div>
                    {/* 히어로 목업 */}
                    <div className="space-y-2 rounded-md bg-[#111111] p-4">
                      <div className="h-4 w-56 rounded bg-white/[0.12]" />
                      <div className="h-3 w-72 rounded bg-white/[0.08]" />
                      <div className="h-3 w-48 rounded bg-white/[0.08]" />
                      <div className="mt-3 flex gap-2">
                        <div className="h-7 w-24 rounded-full bg-[#1A1A1A]" />
                        <div className="h-7 w-20 rounded-full bg-[#F0F0F0] ring-1 ring-white/[0.06]" />
                      </div>
                    </div>
                    {/* 카드 그리드 목업 */}
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="space-y-1.5 rounded-md bg-[#111111] p-2.5">
                          <div className="h-12 rounded bg-[#F0F0F0]" />
                          <div className="h-2 w-full rounded-full bg-white/[0.08]" />
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
              <div className="flex items-center gap-2 bg-[#111111] px-4 py-2">
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
                    <div className="max-w-[220px] space-y-2 rounded-2xl rounded-bl-sm bg-[#111111] px-3 py-2.5 text-[11px] leading-relaxed text-[#666] ring-1 ring-white/[0.06]">
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
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#111111] px-3 py-2 ring-1 ring-white/[0.06]">
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
      <section ref={logoStripRef} className="relative z-10 border-y border-white/[0.06] bg-[#111111] overflow-hidden">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-14 lg:py-20">
          <p className={`mb-10 text-center text-[13px] text-[#B4B4B0] transition-all duration-700 ${logoStripInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {t.logoSubtitle}
          </p>

          {/* 로고 마키 */}
          <div className={`transition-all duration-700 delay-300 ${logoStripInView ? "opacity-100" : "opacity-0"}`}>
            <div className="flex animate-marquee items-center gap-x-10 sm:gap-x-14 lg:gap-x-20 whitespace-nowrap">
              {[...Array(2)].flatMap((_, setIdx) =>
                [
                  { name: "Claude Sonnet", style: "font-serif italic" },
                  { name: "GPT-4o", style: "font-mono font-bold" },
                  { name: "Gemini 2.5 Flash", style: "font-sans font-light tracking-wide" },
                  { name: "Grok", style: "font-sans font-bold" },
                  { name: "LLaMA 4", style: "font-mono font-semibold" },
                  { name: "Mistral Large", style: "font-sans font-medium tracking-tight" },
                  { name: "DeepSeek V3", style: "font-mono font-light" },
                ].map((item) => (
                  <span
                    key={`${setIdx}-${item.name}`}
                    className={`text-[18px] text-[#C0C0C0] transition-colors hover:text-[#E8E8E5] sm:text-[20px] px-5 ${item.style}`}
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
      <section ref={howSectionRef} className="relative z-10 bg-[#111111]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <p className={`mb-2 font-mono text-[12px] tracking-wider text-[#CCC] transition-all duration-500 ${howSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>{t.howLabel}</p>
          <h2 className={`text-[32px] font-bold tracking-[-0.03em] text-[#E8E8E5] sm:text-[40px] lg:text-[48px] transition-all duration-700 delay-100 ${howSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
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
              <div key={item.step} className={`group transition-all duration-700 ${item.delay} ${howSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="font-mono text-[32px] font-bold text-[#E8E8E8] transition-colors group-hover:text-[#E8E8E5]">
                    {item.step}
                  </span>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.08] ring-1 ring-white/[0.06] transition-transform duration-500 ${howSectionInView ? "rotate-0 scale-100" : "rotate-12 scale-75"}`}>
                    <item.icon className="h-4 w-4 text-[#999]" />
                  </div>
                </div>
                <h3 className="text-[16px] font-semibold text-[#E8E8E5]">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#999]">{item.desc}</p>
                <p className="mt-3 font-mono text-[11px] text-[#CCC]">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 3가지 모드 ===== */}
      <section ref={modesSectionRef} className="relative z-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <p className={`mb-2 font-mono text-[12px] tracking-wider text-[#CCC] transition-all duration-500 ${modesSectionInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"}`}>{t.modesLabel}</p>
          <h2 className={`text-[32px] font-bold tracking-[-0.03em] text-[#E8E8E5] sm:text-[40px] lg:text-[48px] transition-all duration-700 delay-100 ${modesSectionInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}>
            {t.modesTitle}
          </h2>
          <p className={`mt-3 max-w-md text-[15px] text-[#999] transition-all duration-700 delay-200 ${modesSectionInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"}`}>
            {t.modesSubtitle}
          </p>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {/* Cloud */}
            <div className={`flex flex-col rounded-xl bg-[#111111] p-6 ring-1 ring-white/[0.06] transition-all duration-700 delay-300 hover:ring-white/[0.08] hover:shadow-lg hover:-translate-y-1 ${modesSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.08] ring-1 ring-white/[0.06]">
                <Globe className="h-5 w-5 text-[#E8E8E5]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#E8E8E5]">{t.cloudTitle}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[#999]">
                {t.cloudDesc}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.cloudTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#999] ring-1 ring-white/[0.06]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Local */}
            <div className={`flex flex-col rounded-xl bg-[#111111] p-6 ring-1 ring-white/[0.06] transition-all duration-700 delay-[450ms] hover:ring-white/[0.08] hover:shadow-lg hover:-translate-y-1 ${modesSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.08] ring-1 ring-white/[0.06]">
                <Terminal className="h-5 w-5 text-[#E8E8E5]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#E8E8E5]">{t.localTitle}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[#999]">
                {t.localDesc}
              </p>
              <div className="mt-4 overflow-hidden rounded-md bg-[#1A1A1A] px-3 py-2 font-mono text-[11px]">
                <span className="text-[#666]">$</span>
                <span className="text-[#999]"> npx meld --port 3100</span>
              </div>
            </div>

            {/* Sandbox */}
            <div className={`flex flex-col rounded-xl bg-[#111111] p-6 ring-1 ring-white/[0.06] transition-all duration-700 delay-[600ms] hover:ring-white/[0.08] hover:shadow-lg hover:-translate-y-1 ${modesSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.08] ring-1 ring-white/[0.06]">
                <Monitor className="h-5 w-5 text-[#E8E8E5]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#E8E8E5]">{t.sandboxTitle}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[#999]">
                {t.sandboxDesc}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.sandboxTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#999] ring-1 ring-white/[0.06]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 코드 디프 예시 ===== */}
      <section ref={diffSectionRef} className="relative z-10 bg-[#111111]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <div className="grid items-center gap-12 sm:grid-cols-2 lg:gap-20">
            <div className={`transition-all duration-700 ${diffSectionInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"}`}>
              <p className="mb-2 font-mono text-[12px] tracking-wider text-[#CCC]">{t.diffLabel}</p>
              <h2 className="text-[32px] font-bold tracking-[-0.03em] text-[#E8E8E5] sm:text-[36px] lg:text-[44px]">
                {t.diffTitle}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#999]">
                {t.diffDesc}
              </p>
              <div className="mt-6 space-y-3 text-[13px] text-[#999]">
                {[t.diffCheck1, t.diffCheck2, t.diffCheck3].map((item, i) => (
                  <div key={item} className={`flex items-center gap-2 transition-all duration-500 ${diffSectionInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: `${400 + i * 150}ms` }}>
                    <Check className="h-3.5 w-3.5 text-[#E8E8E5]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* 코드 블록 */}
            <div className={`overflow-hidden rounded-xl bg-[#1A1A1A] ring-1 ring-black/[0.1] transition-all duration-700 delay-200 ${diffSectionInView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}`}>
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

      {/* ===== 4대 핵심 기능 ===== */}
      <section ref={featuresSectionRef} className="relative z-10 bg-[#0B0E11] overflow-hidden">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          {/* 섹션 헤더 */}
          <div className={`mb-20 transition-all duration-700 ease-out ${featuresSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <span className="text-[12px] font-semibold tracking-[0.15em] text-[#555]">{t.featuresLabel}</span>
            <h2 className="mt-2 text-[32px] font-bold leading-[1.15] tracking-[-0.03em] text-white sm:text-[40px]">
              {t.featuresTitle}
            </h2>
          </div>

          {/* ── 기능 1: 디자인-코드 매핑 ── */}
          <div className={`mb-24 grid items-center gap-12 lg:grid-cols-2 transition-all duration-700 ease-out ${featuresSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`} style={{ transitionDelay: "200ms" }}>
            <div>
              <span className="text-[11px] font-semibold tracking-[0.12em] text-[#10B981]">{t.feat1Label}</span>
              <h3 className="mt-2 text-[24px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[28px]">{t.feat1Title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#777]">{t.feat1Desc}</p>
            </div>
            {/* 비주얼: 클릭 → 매칭 플로우 */}
            <div className="rounded-2xl border border-[#1E2228] bg-[#131619] p-6">
              <div className="flex items-center justify-between gap-4">
                {/* Figma 요소 */}
                <div className={`flex-1 rounded-xl border border-[#1E2228] bg-[#0B0E11] p-4 transition-all duration-500 ${featuresSectionInView ? "opacity-100 scale-100" : "opacity-0 scale-95"}`} style={{ transitionDelay: "500ms" }}>
                  <div className="mb-3 flex items-center gap-2">
                    <Figma className="h-3.5 w-3.5 text-[#A78BFA]" />
                    <span className="text-[11px] font-semibold text-[#888]">Figma</span>
                  </div>
                  <div className="rounded-lg bg-[#1A3A5C] ring-1 ring-[#3B82F6]/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <MousePointerClick className="h-3 w-3 text-[#60A5FA]" />
                      <span className="text-[12px] font-medium text-[#93C5FD]">{t.feat1Visual1}</span>
                    </div>
                  </div>
                </div>
                {/* 화살표 */}
                <div className={`flex flex-col items-center gap-1 transition-all duration-500 ${featuresSectionInView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "800ms" }}>
                  <ArrowRight className="h-4 w-4 text-[#10B981]" />
                  <span className="text-[9px] text-[#555]">AI</span>
                </div>
                {/* 코드 파일 */}
                <div className={`flex-1 rounded-xl border border-[#1E2228] bg-[#0B0E11] p-4 transition-all duration-500 ${featuresSectionInView ? "opacity-100 scale-100" : "opacity-0 scale-95"}`} style={{ transitionDelay: "1100ms" }}>
                  <div className="mb-3 flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-[#10B981]" />
                    <span className="text-[11px] font-semibold text-[#888]">Code</span>
                  </div>
                  <div className="rounded-lg bg-[#132A1B] ring-1 ring-[#10B981]/20 px-3 py-2">
                    <span className="font-mono text-[12px] text-[#6EE7B7]">{t.feat1Visual2}</span>
                  </div>
                </div>
              </div>
              <div className={`mt-4 flex items-center justify-center gap-1.5 transition-all duration-500 ${featuresSectionInView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "1400ms" }}>
                <Check className="h-3 w-3 text-[#10B981]" />
                <span className="text-[11px] font-medium text-[#10B981]">{t.feat1Visual3}</span>
              </div>
            </div>
          </div>

          {/* ── 기능 2: 실시간 프리뷰 루프 ── */}
          <div className={`mb-24 grid items-center gap-12 lg:grid-cols-2 transition-all duration-700 ease-out ${featuresSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`} style={{ transitionDelay: "400ms" }}>
            {/* 비주얼: 3-step 루프 */}
            <div className="order-2 lg:order-1 rounded-2xl border border-[#1E2228] bg-[#131619] p-6">
              <div className="space-y-3">
                {[
                  { icon: MessageSquare, text: t.feat2Visual1, color: "text-[#60A5FA]", bg: "bg-[#1A2A4A]", ring: "ring-[#3B82F6]/20" },
                  { icon: RefreshCw, text: t.feat2Visual2, color: "text-[#FBBF24]", bg: "bg-[#2A2410]", ring: "ring-[#FBBF24]/20" },
                  { icon: Monitor, text: t.feat2Visual3, color: "text-[#10B981]", bg: "bg-[#132A1B]", ring: "ring-[#10B981]/20" },
                ].map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-xl ${step.bg} ring-1 ${step.ring} px-4 py-3 transition-all duration-500 ${featuresSectionInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"}`}
                    style={{ transitionDelay: `${600 + i * 200}ms` }}
                  >
                    <step.icon className={`h-4 w-4 flex-shrink-0 ${step.color}`} />
                    <span className={`text-[13px] font-medium ${step.color}`}>{step.text}</span>
                    {i < 2 && <ArrowRight className="ml-auto h-3 w-3 text-[#444]" />}
                    {i === 2 && <Check className="ml-auto h-3 w-3 text-[#10B981]" />}
                  </div>
                ))}
              </div>
              <div className={`mt-4 flex items-center justify-center gap-4 text-[10px] text-[#555] transition-all duration-500 ${featuresSectionInView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "1300ms" }}>
                <span>{"< 2s"}</span>
                <div className="h-px flex-1 bg-[#1E2228]" />
                <span>loop</span>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-[#FBBF24]">{t.feat2Label}</span>
              <h3 className="mt-2 text-[24px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[28px]">{t.feat2Title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#777]">{t.feat2Desc}</p>
            </div>
          </div>

          {/* ── 기능 3: 프레임워크 인식 코드 생성 ── */}
          <div className={`mb-24 grid items-center gap-12 lg:grid-cols-2 transition-all duration-700 ease-out ${featuresSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`} style={{ transitionDelay: "600ms" }}>
            <div>
              <span className="text-[11px] font-semibold tracking-[0.12em] text-[#A78BFA]">{t.feat3Label}</span>
              <h3 className="mt-2 text-[24px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[28px]">{t.feat3Title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#777]">{t.feat3Desc}</p>
            </div>
            {/* 비주얼: 프레임워크 감지 + 코드 스타일 */}
            <div className="rounded-2xl border border-[#1E2228] bg-[#131619] p-6">
              <div className={`mb-4 flex flex-wrap gap-2 transition-all duration-500 ${featuresSectionInView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "800ms" }}>
                {["Next.js", "React", "Vue", "Angular", "Svelte"].map((fw, i) => (
                  <span key={fw} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${i === 0 ? "bg-[#1A2A4A] text-[#93C5FD] ring-1 ring-[#3B82F6]/30" : "bg-[#1A1F25] text-[#666]"}`}>{fw}</span>
                ))}
              </div>
              <div className={`rounded-xl border border-[#1E2228] bg-[#0B0E11] font-mono text-[11px] overflow-hidden transition-all duration-500 ${featuresSectionInView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "1000ms" }}>
                <div className="border-b border-[#1E2228] px-3 py-1.5 text-[10px] text-[#555]">
                  your-project/src/components/Hero.tsx
                </div>
                {[
                  { code: "export function Hero() {", color: "text-[#C792EA]" },
                  { code: "  const { title } = useHeroData();", color: "text-[#82AAFF]" },
                  { code: "  return (", color: "text-[#888]" },
                  { code: '    <section className={styles.hero}>', color: "text-[#A5D6A7]", highlight: true },
                  { code: "      <h1>{title}</h1>", color: "text-[#888]" },
                  { code: "    </section>", color: "text-[#888]" },
                ].map((line, i) => (
                  <div key={i} className={`px-3 py-[3px] ${line.highlight ? "bg-[#132A1B]/50" : ""}`}>
                    <span className={line.color}>{line.code}</span>
                  </div>
                ))}
              </div>
              <p className={`mt-3 text-center text-[10px] text-[#555] transition-all duration-500 ${featuresSectionInView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "1200ms" }}>
                AI follows your existing patterns
              </p>
            </div>
          </div>

          {/* ── 기능 4: 디자인 변경 추적 ── */}
          <div className={`grid items-center gap-12 lg:grid-cols-2 transition-all duration-700 ease-out ${featuresSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`} style={{ transitionDelay: "800ms" }}>
            {/* 비주얼: 알림 카드 */}
            <div className="order-2 lg:order-1 rounded-2xl border border-[#1E2228] bg-[#131619] p-6">
              <div className={`rounded-xl border border-[#1E2228] bg-[#0B0E11] p-5 transition-all duration-700 ${featuresSectionInView ? "opacity-100 scale-100" : "opacity-0 scale-95"}`} style={{ transitionDelay: "1000ms" }}>
                {/* 알림 헤더 */}
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#2A2410]">
                    <Bell className="h-4 w-4 text-[#FBBF24]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-white">{t.feat4Visual1}</p>
                    <p className="mt-0.5 text-[11px] text-[#666]">{t.feat4Visual2}</p>
                  </div>
                  <span className="rounded-full bg-[#FBBF24]/10 px-2 py-0.5 text-[10px] font-medium text-[#FBBF24]">NEW</span>
                </div>
                {/* 변경된 요소 리스트 */}
                <div className="mt-4 space-y-2">
                  {["CTAButton — color changed", "Heading — font-size 36→40px"].map((item, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-lg bg-[#131619] px-3 py-2 text-[11px] text-[#888] transition-all duration-500 ${featuresSectionInView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: `${1200 + i * 150}ms` }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-[#FBBF24]" />
                      {item}
                    </div>
                  ))}
                </div>
                {/* CTA 버튼 */}
                <button className={`mt-4 w-full rounded-lg bg-[#10B981] py-2.5 text-[12px] font-semibold text-white transition-all duration-500 hover:bg-[#059669] ${featuresSectionInView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "1500ms" }}>
                  {t.feat4Visual3}
                </button>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-[#FBBF24]">{t.feat4Label}</span>
              <h3 className="mt-2 text-[24px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[28px]">{t.feat4Title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#777]">{t.feat4Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 하단 CTA ===== */}
      <section ref={bottomCtaRef} className="relative z-10 bg-[#1A1A1A] overflow-hidden">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <h2
            className={`text-[36px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[48px] lg:text-[56px] transition-all duration-700 ease-out ${bottomCtaInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            {t.bottomTitle}
          </h2>
          <p
            className={`mt-3 text-[16px] text-[#666] transition-all duration-700 delay-200 ease-out ${bottomCtaInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            {t.bottomDesc}
          </p>
          <div
            className={`mt-10 flex items-center gap-6 transition-all duration-700 delay-[400ms] ease-out ${bottomCtaInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <Link
              href="/download"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-white px-7 py-3.5 text-[15px] font-semibold text-[#0A0A0A] transition-all hover:bg-[#E8E8E5] hover:shadow-lg hover:shadow-white/10 active:scale-[0.98]"
            >
              <Download className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
              {t.bottomDownload}
            </Link>
            <Link
              href="/project/workspace"
              className="group inline-flex items-center gap-1.5 text-[15px] text-[#666] transition-colors hover:text-white"
            >
              {t.bottomCta}
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
              <div className="flex h-5 w-5 items-center justify-center rounded bg-white/[0.1]">
                <Blend className="h-2.5 w-2.5 text-[#E8E8E5]" />
              </div>
              <span className="text-[12px] text-[#555]">Meld</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="text-[11px] text-[#444] transition-colors hover:text-[#888]">
                {lang === "ko" ? "이용약관" : "Terms"}
              </Link>
              <Link href="/privacy" className="text-[11px] text-[#444] transition-colors hover:text-[#888]">
                {lang === "ko" ? "개인정보" : "Privacy"}
              </Link>
              <Link href="/refund" className="text-[11px] text-[#444] transition-colors hover:text-[#888]">
                {lang === "ko" ? "환불" : "Refund"}
              </Link>
              <span className="text-[11px] text-[#333]">|</span>
              <p className="font-mono text-[11px] text-[#444]">© 2026 Meld</p>
            </div>
          </div>
        </div>
      </footer>

      {/* ===== 언어 토글 (고정) ===== */}
      <button
        onClick={toggleLang}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1A1A] text-[14px] font-semibold text-[#E8E8E5] shadow-lg ring-1 ring-white/[0.08] transition-all hover:scale-105 hover:shadow-xl active:scale-95"
      >
        {lang === "en" ? "KO" : "EN"}
      </button>

      {/* ===== Login Modal (from prompt) ===== */}
      {authModal && (
        <LoginModal
          isOpen={true}
          onClose={() => setAuthModal(null)}
          redirectTo={`/projects?prompt=${encodeURIComponent(authModal.prompt)}&category=${authModal.category}`}
        />
      )}

      {/* ===== Login Modal (from nav) ===== */}
      {showLoginModal && !authModal && (
        <LoginModal
          isOpen={true}
          onClose={() => setShowLoginModal(false)}
          redirectTo="/projects"
        />
      )}
    </div>
  );
}
