import { useState, useEffect, useRef } from "react";
import {
  Blend,
  LogOut,
  Plus,
  FolderOpen,
  Zap,
  Terminal,
  ArrowRight,
  Eye,
  HardDrive,
  Monitor,
  Github,
  MessageCircle,
  ArrowUpRight,
  Check,
  Figma,
  MousePointerClick,
  GitBranch,
  Sparkles,
  ChevronDown,
  Loader2,
} from "lucide-react";

const translations = {
  en: {
    // Greeting
    greetingLateNight: "Burning the midnight oil",
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",

    // Main
    mainTitle: "What shall we build?",

    // Onboarding
    githubConnected: "GitHub connected",
    desktopReady: "Desktop app ready",

    // Quick actions
    newProject: "New Project",
    openFolder: "Open Folder",

    // Figma card
    figmaCardTitle: "Edit Figma Design",
    figmaCardDesc1: "Paste a Figma URL and click — that's it.",
    figmaCardDesc2: "AI modifies code and pushes to GitHub.",
    figmaFlowSelect: "Select",
    figmaSupported: "Supported:",
    figmaWebOnly: "Open in Web App",
    figmaWebOnlyDesc: "Figma mode is available in the web app",

    // Desktop card
    desktopCardTitle: "Edit Local Project",
    desktopCardDesc1: "Open and edit local folders directly.",
    desktopCardDesc2: "Native file access, no agent install.",
    desktopFlowFolder: "Folder",
    desktopFlowDesktop: "Desktop",
    desktopFlowSave: "Save",
    desktopLocalFile: "Local Files",
    desktopOpenFolder: "Open Project Folder",

    // My projects
    myProjects: "My Projects",
    projectCount: "0 projects",
    noProjectsYet: "No projects yet",
    noProjectsDesc: "Open a local folder above to get started",
    startFirstProject: "Start your first project",

    // Resources
    resGitHub: "GitHub",
    resGitHubDesc: "Source code & issue tracker",
    resCommunity: "Community",
    resCommunityDesc: "Ask questions on Discord",

    // Profile
    logOut: "Log Out",
  },
  ko: {
    greetingLateNight: "늦은 밤까지 고생하시네요",
    greetingMorning: "좋은 아침이에요",
    greetingAfternoon: "좋은 오후예요",
    greetingEvening: "좋은 저녁이에요",

    mainTitle: "무엇을 만들어볼까요?",

    githubConnected: "GitHub 연결 완료",
    desktopReady: "데스크톱 앱 준비 완료",

    newProject: "새 프로젝트",
    openFolder: "폴더 열기",

    figmaCardTitle: "Figma 디자인 수정",
    figmaCardDesc1: "Figma URL을 붙여넣고 클릭하면 끝.",
    figmaCardDesc2: "AI가 코드를 수정하고 GitHub에 푸시해요.",
    figmaFlowSelect: "선택",
    figmaSupported: "지원:",
    figmaWebOnly: "웹 앱에서 열기",
    figmaWebOnlyDesc: "Figma 모드는 웹 앱에서 이용 가능합니다",

    desktopCardTitle: "로컬 프로젝트 수정",
    desktopCardDesc1: "로컬 폴더를 바로 열어서 수정해요.",
    desktopCardDesc2: "에이전트 설치 없이 네이티브 파일 접근.",
    desktopFlowFolder: "폴더",
    desktopFlowDesktop: "데스크톱",
    desktopFlowSave: "저장",
    desktopLocalFile: "로컬 파일",
    desktopOpenFolder: "프로젝트 폴더 열기",

    myProjects: "내 프로젝트",
    projectCount: "0개",
    noProjectsYet: "아직 프로젝트가 없어요",
    noProjectsDesc: "위에서 로컬 폴더를 열어 시작하세요",
    startFirstProject: "첫 프로젝트 시작하기",

    resGitHub: "GitHub",
    resGitHubDesc: "소스 코드와 이슈 트래커",
    resCommunity: "커뮤니티",
    resCommunityDesc: "디스코드에서 질문하기",

    logOut: "로그아웃",
  },
} as const;

type Lang = "en" | "ko";

interface DashboardPageProps {
  user: { name: string; avatar: string };
  onOpenProject: () => Promise<void>;
  onCreateProject: () => void;
  onLogout: () => void;
  lang: Lang;
  onToggleLang: () => void;
}

function useGreeting(lang: Lang) {
  const t = translations[lang];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return { text: t.greetingLateNight, emoji: "🌙" };
    if (hour < 12) return { text: t.greetingMorning, emoji: "☀️" };
    if (hour < 18) return { text: t.greetingAfternoon, emoji: "🔥" };
    return { text: t.greetingEvening, emoji: "🌆" };
  };

  const [greeting, setGreeting] = useState(getGreeting);

  useEffect(() => {
    setGreeting(getGreeting());
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return greeting;
}

function ProfilePopover({
  user,
  onLogout,
  logOutLabel,
}: {
  user: { name: string; avatar: string };
  onLogout: () => void;
  logOutLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={popoverRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#F5F5F4]"
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1A1A] text-[11px] font-semibold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-[13px] font-medium text-[#1A1A1A]">
          {user.name}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-[#B4B4B0] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-[#E8E8E4] bg-white shadow-lg">
          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-[#1A1A1A] transition-colors hover:bg-[#F5F5F4]"
            >
              <LogOut className="h-4 w-4 text-[#787774]" />
              <span>{logOutLabel}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardPage({
  user,
  onOpenProject,
  onCreateProject,
  onLogout,
  lang,
  onToggleLang,
}: DashboardPageProps) {
  const t = translations[lang];
  const greeting = useGreeting(lang);
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenProject = async () => {
    setIsOpening(true);
    try {
      await onOpenProject();
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="animate-fade-in min-h-screen bg-white">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
              <Blend className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[16px] font-semibold text-[#1A1A1A]">Meld</span>
          </div>
          <div className="relative flex items-center gap-3">
            <ProfilePopover user={user} onLogout={onLogout} logOutLabel={t.logOut} />
          </div>
        </div>
      </header>

      <main className="px-6 pt-10 pb-20">
        {/* 인사 + 연결 상태 */}
        <div className="animate-fade-in-up mb-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{greeting.emoji}</span>
            <div>
              <p className="text-[13px] text-[#787774]">{greeting.text}</p>
              <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
                {t.mainTitle}
              </h1>
            </div>
          </div>

          {/* 온보딩 체크리스트 */}
          <div className="mt-5 flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                <Check className="h-3 w-3 text-green-600" />
              </div>
              <Github className="h-3.5 w-3.5 text-[#787774]" />
              <span className="text-[12px] font-medium text-[#787774]">{t.githubConnected}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                <Check className="h-3 w-3 text-green-600" />
              </div>
              <Monitor className="h-3.5 w-3.5 text-[#787774]" />
              <span className="text-[12px] font-medium text-[#787774]">{t.desktopReady}</span>
            </div>
          </div>
        </div>

        {/* 퀵 액션 바 */}
        <div className="animate-fade-in-up mb-8 flex items-center gap-2 overflow-x-auto" style={{ animationDelay: "75ms" }}>
          <button
            onClick={onCreateProject}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-3.5 py-2 text-[12px] font-medium text-[#787774] transition-all hover:bg-[#EEEEEC] hover:text-[#1A1A1A] active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.newProject}
          </button>
          <button
            onClick={handleOpenProject}
            disabled={isOpening}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-3.5 py-2 text-[12px] font-medium text-[#787774] transition-all hover:bg-[#EEEEEC] hover:text-[#1A1A1A] active:scale-[0.98] disabled:opacity-50"
          >
            {isOpening ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FolderOpen className="h-3.5 w-3.5" />
            )}
            {t.openFolder}
          </button>
        </div>

        {/* 메인 카드 */}
        <div className="animate-fade-in-up grid gap-5 sm:grid-cols-2" style={{ animationDelay: "150ms" }}>
          {/* 카드 1: Figma 디자인 수정 (웹 전용 안내) */}
          <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-[#F7F7F5] ring-1 ring-black/[0.04] transition-all duration-300 hover:bg-[#F0F0EE] hover:ring-black/[0.06]">
            <div className="relative flex-1 p-6">
              <h3 className="text-[24px] font-bold tracking-[-0.02em] text-[#1A1A1A]">{t.figmaCardTitle}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#787774]">
                {t.figmaCardDesc1}
                <br />
                {t.figmaCardDesc2}
              </p>

              {/* 비주얼 플로우 */}
              <div className="mt-6 flex items-center gap-2 text-[11px]">
                {[
                  { icon: Figma, label: "URL", color: "#787774" },
                  { icon: MousePointerClick, label: t.figmaFlowSelect, color: "#787774" },
                  { icon: Zap, label: "AI", color: "#787774" },
                  { icon: GitBranch, label: "Push", color: "#787774" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5">
                      <step.icon className="h-3 w-3" style={{ color: step.color }} />
                      <span className="text-[#787774]">{step.label}</span>
                    </div>
                    {i < 3 && <ArrowRight className="h-3 w-3 text-[#D4D4D0]" />}
                  </div>
                ))}
              </div>

              {/* 지원 프레임워크 */}
              <div className="mt-4 flex items-center gap-1.5">
                <span className="text-[10px] text-[#B4B4B0]">{t.figmaSupported}</span>
                {["React", "Vue", "Next.js", "Angular"].map((fw) => (
                  <span key={fw} className="rounded bg-white/60 px-1.5 py-0.5 text-[10px] text-[#787774]">{fw}</span>
                ))}
              </div>
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => {
                  // Figma 모드는 웹 앱에서만 사용 가능 안내
                  window.open("https://meld.dev/dashboard", "_blank");
                }}
                className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[13px] font-medium text-[#787774] transition-all hover:bg-[#FAFAFA] hover:text-[#1A1A1A] active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4 transition-transform group-hover/btn:rotate-12" />
                {t.figmaWebOnly}
                <ArrowRight className="h-3.5 w-3.5 text-[#D4D4D0] transition-transform group-hover/btn:translate-x-0.5" />
              </button>
              <p className="mt-2 text-center text-[11px] text-[#B4B4B0]">
                {t.figmaWebOnlyDesc}
              </p>
            </div>
          </div>

          {/* 카드 2: 로컬 프로젝트 수정 */}
          <div className="group relative flex flex-col rounded-2xl bg-[#F7F7F5] ring-1 ring-black/[0.04] transition-all duration-300 hover:bg-[#F0F0EE] hover:ring-black/[0.06]">
            <div className="relative flex-1 p-6">
              <h3 className="text-[24px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
                {t.desktopCardTitle}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#787774]">
                {t.desktopCardDesc1}
                <br />
                {t.desktopCardDesc2}
              </p>

              {/* 비주얼 플로우 */}
              <div className="mt-6 flex items-center gap-2 text-[11px]">
                {[
                  { icon: FolderOpen, label: t.desktopFlowFolder, color: "#787774" },
                  { icon: Monitor, label: t.desktopFlowDesktop, color: "#787774" },
                  { icon: Zap, label: "AI", color: "#787774" },
                  { icon: HardDrive, label: t.desktopFlowSave, color: "#787774" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5">
                      <step.icon className="h-3 w-3" style={{ color: step.color }} />
                      <span className="text-[#787774]">{step.label}</span>
                    </div>
                    {i < 3 && <ArrowRight className="h-3 w-3 text-[#D4D4D0]" />}
                  </div>
                ))}
              </div>

              {/* 특징 */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-1 text-[10px] text-[#787774]">
                  <Eye className="h-3 w-3 text-[#B4B4B0]" />
                  Live Preview
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#787774]">
                  <Zap className="h-3 w-3 text-[#B4B4B0]" />
                  Hot Reload
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#787774]">
                  <HardDrive className="h-3 w-3 text-[#B4B4B0]" />
                  {t.desktopLocalFile}
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={handleOpenProject}
                disabled={isOpening}
                className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-3 text-[13px] font-semibold text-white transition-all hover:bg-[#24282E] active:scale-[0.98] disabled:opacity-40"
              >
                {isOpening ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                )}
                {t.desktopOpenFolder}
                <ArrowRight className="h-3.5 w-3.5 text-[#787774] transition-transform group-hover/btn:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 내 프로젝트 */}
        <div className="animate-fade-in-up mt-14" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.myProjects}</h2>
            <span className="text-[11px] text-[#B4B4B0]">{t.projectCount}</span>
          </div>
          <div className="mt-4 rounded-2xl bg-[#F7F7F5] p-14 text-center ring-1 ring-black/[0.04] transition-colors hover:bg-[#F0F0EE]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
              <span className="text-2xl">📂</span>
            </div>
            <p className="text-[14px] font-medium text-[#787774]">{t.noProjectsYet}</p>
            <p className="mt-1 text-[12px] text-[#B4B4B0]">{t.noProjectsDesc}</p>
            <button
              onClick={handleOpenProject}
              className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1A1A1A] underline decoration-[#E0E0DC] underline-offset-2 transition-colors hover:decoration-[#1A1A1A]"
            >
              {t.startFirstProject}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* 하단 리소스 링크 */}
        <div className="animate-fade-in-up mt-14 grid gap-3 sm:grid-cols-2" style={{ animationDelay: "600ms" }}>
          {[
            {
              icon: Github,
              title: t.resGitHub,
              desc: t.resGitHubDesc,
              href: "https://github.com/meld-dev",
              color: "#787774",
              bg: "#F7F7F5",
            },
            {
              icon: MessageCircle,
              title: t.resCommunity,
              desc: t.resCommunityDesc,
              href: "https://discord.gg/meld",
              color: "#787774",
              bg: "#F7F7F5",
            },
          ].map((resource) => (
            <a
              key={resource.href}
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl bg-[#F7F7F5] p-4 ring-1 ring-black/[0.04] transition-all hover:bg-[#F0F0EE] hover:ring-black/[0.06]"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: resource.bg }}
              >
                <resource.icon className="h-4 w-4" style={{ color: resource.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#1A1A1A]">{resource.title}</p>
                <p className="text-[11px] text-[#B4B4B0]">{resource.desc}</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#D4D4D0] transition-colors group-hover:text-[#787774]" />
            </a>
          ))}
        </div>
      </main>

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
