"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Figma,
  Github,
  ArrowRight,
  Copy,
  Check,
  Blend,
  LogOut,
  Plus,
  FolderOpen,
  Sparkles,
  Zap,
  Palette,
  MousePointerClick,
  GitBranch,
  Terminal,
  Rocket,
  MessageCircle,
  ArrowUpRight,
  Eye,
  ChevronDown,
  Search,
  Loader2,
  Globe,
  Monitor,
  HardDrive,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useLangStore } from "@/lib/store/lang-store";
import { usePlatform } from "@/lib/hooks/usePlatform";
import { trpc } from "@/lib/trpc/client";

const translations = {
  en: {
    // CopyCommand
    copied: "Copied!",

    // Greeting
    greetingLateNight: "Burning the midnight oil",
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",

    // Main
    mainTitle: "What shall we build?",

    // Onboarding
    githubConnected: "GitHub connected",
    figmaConnected: "Figma connected",
    figmaNeeded: "Figma connection needed",
    connectNow: "Connect now",
    localAgent: "Local agent",

    // Quick actions
    connectFigma: "Connect Figma",
    newProject: "New Project",
    localConnect: "Local Connect",
    designSystem: "Design System",

    // Figma card
    figmaCardTitle: "Edit Figma Design",
    figmaCardDesc1: "Paste a Figma URL and click — that's it.",
    figmaCardDesc2: "AI modifies code and pushes to GitHub.",
    figmaFlowSelect: "Select",
    figmaSupported: "Supported:",
    figmaNewProject: "Create New Project",
    figmaConnectFirst: "Connect Figma first",
    figmaBannerNeeded: "Figma connection required —",
    figmaBannerConnect: "Connect",

    // GitHub card
    githubCardTitle: "Edit GitHub Project",
    githubCardDesc1: "Edit GitHub repos right in the browser.",
    githubCardDesc2: "AI code editing + live preview, no install.",
    githubFlowRepo: "Repo",
    githubFlowBrowser: "Browser",
    githubFlowPreview: "Preview",
    githubSelectRepo: "Select repository...",
    githubSearchRepo: "Search repos...",
    githubNoRepo: "No repos found",
    githubLivePreview: "Live Preview",
    githubOpenProject: "Open Project",
    githubLocalConnect: "Connect locally via terminal agent",

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
    noProjectsDesc: "Create a new project above",
    startFirstProject: "Start your first project",

    // Resources
    resGitHub: "GitHub",
    resGitHubDesc: "Source code & issue tracker",
    resDesktop: "Desktop App",
    resDesktopDesc: "Native performance for local editing",
    resCommunity: "Community",
    resCommunityDesc: "Ask questions on Discord",
  },
  ko: {
    copied: "복사됨!",

    greetingLateNight: "늦은 밤까지 고생하시네요",
    greetingMorning: "좋은 아침이에요",
    greetingAfternoon: "좋은 오후예요",
    greetingEvening: "좋은 저녁이에요",

    mainTitle: "무엇을 만들어볼까요?",

    githubConnected: "GitHub 연결 완료",
    figmaConnected: "Figma 연결 완료",
    figmaNeeded: "Figma 연결 필요",
    connectNow: "지금 연결하기",
    localAgent: "로컬 에이전트",

    connectFigma: "Figma 연결하기",
    newProject: "새 프로젝트",
    localConnect: "로컬 연결",
    designSystem: "디자인 시스템",

    figmaCardTitle: "Figma 디자인 수정",
    figmaCardDesc1: "Figma URL을 붙여넣고 클릭하면 끝.",
    figmaCardDesc2: "AI가 코드를 수정하고 GitHub에 푸시해요.",
    figmaFlowSelect: "선택",
    figmaSupported: "지원:",
    figmaNewProject: "새 프로젝트 만들기",
    figmaConnectFirst: "먼저 Figma를 연결하세요",
    figmaBannerNeeded: "Figma 연결이 필요합니다 —",
    figmaBannerConnect: "연결하기",

    githubCardTitle: "GitHub 프로젝트 수정",
    githubCardDesc1: "GitHub 레포를 브라우저에서 바로 수정해요.",
    githubCardDesc2: "설치 없이 AI 코드 수정 + 실시간 프리뷰.",
    githubFlowRepo: "레포",
    githubFlowBrowser: "브라우저",
    githubFlowPreview: "프리뷰",
    githubSelectRepo: "레포지토리 선택...",
    githubSearchRepo: "레포 검색...",
    githubNoRepo: "레포를 찾을 수 없어요",
    githubLivePreview: "실시간 프리뷰",
    githubOpenProject: "프로젝트 열기",
    githubLocalConnect: "터미널 에이전트로 로컬 연결",

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
    noProjectsDesc: "위에서 새 프로젝트를 만들어보세요",
    startFirstProject: "첫 프로젝트 시작하기",

    resGitHub: "GitHub",
    resGitHubDesc: "소스 코드와 이슈 트래커",
    resDesktop: "데스크톱 앱",
    resDesktopDesc: "네이티브 성능으로 로컬 수정",
    resCommunity: "커뮤니티",
    resCommunityDesc: "디스코드에서 질문하기",
  },
} as const;

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white px-6 lg:px-16 py-4">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between">
          <div className="animate-shimmer h-5 w-28 rounded" />
          <div className="flex items-center gap-3">
            <div className="animate-shimmer h-6 w-6 rounded-full" />
            <div className="animate-shimmer h-4 w-16 rounded" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-6 lg:px-16 pt-10">
        <div className="animate-shimmer mb-8 h-8 w-48 rounded" />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="animate-shimmer h-80 rounded-2xl" />
          <div className="animate-shimmer h-80 rounded-2xl animation-delay-150" />
        </div>
      </main>
    </div>
  );
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
      className="group flex w-full items-center gap-2.5 rounded-xl bg-[#1A1A1A] px-4 py-3 text-left font-mono text-[12px] transition-all hover:bg-[#252525] active:scale-[0.99]"
    >
      <Terminal className="h-3.5 w-3.5 text-[#555] transition-colors group-hover:text-[#999]" />
      <span className="flex-1 text-[#999]">{command}</span>
      {copied ? (
        <span className="flex items-center gap-1 text-[10px] text-[#999]">
          <Check className="h-3 w-3" />
          {copiedLabel}
        </span>
      ) : (
        <Copy className="h-3.5 w-3.5 text-[#555] transition-colors group-hover:text-[#999]" />
      )}
    </button>
  );
}

function useGreeting() {
  const { lang } = useLangStore();
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

function GitHubProjectCard() {
  const router = useRouter();
  const { lang } = useLangStore();
  const t = translations[lang];
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: repos, isLoading } = trpc.git.listRepos.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });

  const filtered = repos?.filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  const selected = repos?.find((r) => r.fullName === selectedRepo);

  const handleOpen = () => {
    if (!selected) return;
    router.push(
      `/project/sandbox?owner=${selected.owner}&repo=${selected.name}`,
    );
  };

  return (
    <div className="group relative flex flex-col rounded-2xl bg-[#F7F7F5] ring-1 ring-black/[0.04] transition-all duration-300 hover:bg-[#F0F0EE] hover:ring-black/[0.06]">
      <div className="relative flex-1 p-6">
        <h3 className="text-[24px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
          {t.githubCardTitle}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#787774]">
          {t.githubCardDesc1}
          <br />
          {t.githubCardDesc2}
        </p>

        {/* 비주얼 플로우 */}
        <div className="mt-6 flex items-center gap-2 text-[11px]">
          {[
            { icon: Github, label: t.githubFlowRepo, color: "#787774" },
            { icon: Globe, label: t.githubFlowBrowser, color: "#787774" },
            { icon: Zap, label: "AI", color: "#787774" },
            { icon: Eye, label: t.githubFlowPreview, color: "#787774" },
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

        {/* 레포 선택 드롭다운 */}
        <div className="relative mt-5">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center gap-2 rounded-xl bg-white px-4 py-3 text-left ring-1 ring-black/[0.04] transition-all hover:bg-white hover:ring-black/[0.08]"
          >
            <Github className="h-4 w-4 text-[#787774]" />
            <span className={`flex-1 text-[13px] ${selected ? "font-medium text-[#1A1A1A]" : "text-[#B4B4B0]"}`}>
              {selected ? selected.fullName : t.githubSelectRepo}
            </span>
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#B4B4B0]" />
            ) : (
              <ChevronDown className={`h-3.5 w-3.5 text-[#B4B4B0] transition-transform ${isOpen ? "rotate-180" : ""}`} />
            )}
          </button>

          {isOpen && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.06]">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <Search className="h-3.5 w-3.5 text-[#B4B4B0]" />
                <input
                  type="text"
                  placeholder={t.githubSearchRepo}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-[12px] text-[#1A1A1A] placeholder:text-[#B4B4B0] focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="mx-3 h-px bg-[#EEEEEC]" />
              <div className="max-h-64 overflow-y-auto overscroll-contain py-1">
                {filtered?.length === 0 && (
                  <p className="px-3 py-4 text-center text-[12px] text-[#B4B4B0]">
                    {t.githubNoRepo}
                  </p>
                )}
                {filtered?.map((repo) => (
                  <button
                    key={repo.fullName}
                    onClick={() => {
                      setSelectedRepo(repo.fullName);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[#F7F7F5] ${
                      selectedRepo === repo.fullName ? "bg-[#F7F7F5]" : ""
                    }`}
                  >
                    <Github className="h-3.5 w-3.5 text-[#787774]" />
                    <span className="flex-1 truncate text-[12px] text-[#1A1A1A]">
                      {repo.fullName}
                    </span>
                    {repo.isPrivate && (
                      <span className="rounded bg-[#F7F7F5] px-1.5 py-0.5 text-[10px] text-[#B4B4B0]">
                        private
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 특징 */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center gap-1 text-[10px] text-[#787774]">
            <Eye className="h-3 w-3 text-[#B4B4B0]" />
            {t.githubLivePreview}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#787774]">
            <Zap className="h-3 w-3 text-[#B4B4B0]" />
            Hot Reload
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#787774]">
            <GitBranch className="h-3 w-3 text-[#B4B4B0]" />
            Git Push
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={handleOpen}
          disabled={!selected}
          className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-3 text-[13px] font-semibold text-white transition-all hover:bg-[#24282E] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Rocket className="h-4 w-4 transition-transform group-hover/btn:-rotate-12" />
          {t.githubOpenProject}
          <ArrowRight className="h-3.5 w-3.5 text-[#787774] transition-transform group-hover/btn:translate-x-0.5" />
        </button>
        <Link
          href="/project/local"
          className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#B4B4B0] transition-colors hover:text-[#787774]"
        >
          <Terminal className="h-3 w-3" />
          {t.githubLocalConnect}
        </Link>
      </div>
    </div>
  );
}

function DesktopProjectCard() {
  const router = useRouter();
  const { lang } = useLangStore();
  const t = translations[lang];

  const handleOpen = () => {
    router.push("/project/desktop");
  };

  return (
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
            {t.githubLivePreview}
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
          onClick={handleOpen}
          className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-3 text-[13px] font-semibold text-white transition-all hover:bg-[#24282E] active:scale-[0.98]"
        >
          <FolderOpen className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
          {t.desktopOpenFolder}
          <ArrowRight className="h-3.5 w-3.5 text-[#787774] transition-transform group-hover/btn:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

const PLAN_LABELS: Record<string, string> = {
  free: "Starter",
  pro: "Pro",
  unlimited: "Unlimited",
};

function ProfilePopover({
  user,
  logout,
}: {
  user: { githubUsername: string; avatarUrl: string | null; plan: string };
  logout: () => void;
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

  const planLabel = PLAN_LABELS[user.plan] ?? "Starter";

  return (
    <div ref={popoverRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#F5F5F4]"
      >
        {user.avatarUrl && (
          <img
            src={user.avatarUrl}
            alt={user.githubUsername}
            className="h-6 w-6 rounded-full"
          />
        )}
        <span className="text-[13px] font-medium text-[#1A1A1A]">
          {user.githubUsername}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-[#B4B4B0] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-[#E8E8E4] bg-white shadow-lg">
          {/* 플랜 표시 */}
          <div className="border-b border-[#E8E8E4] px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#B4B4B0]">Current Plan</p>
            <p className="mt-0.5 text-[14px] font-semibold text-[#1A1A1A]">{planLabel}</p>
          </div>

          <div className="py-1">
            {/* Manage Subscription */}
            <a
              href="/api/portal"
              className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#1A1A1A] transition-colors hover:bg-[#F5F5F4]"
            >
              <CreditCard className="h-4 w-4 text-[#787774]" />
              <span>Manage Subscription</span>
              <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#B4B4B0]" />
            </a>

            {/* 로그아웃 */}
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-[#1A1A1A] transition-colors hover:bg-[#F5F5F4]"
            >
              <LogOut className="h-4 w-4 text-[#787774]" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading, fetchUser, logout } = useAuthStore();
  const { lang, toggleLang } = useLangStore();
  const t = translations[lang];
  const greeting = useGreeting();
  const platform = usePlatform();

  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-fade-in min-h-screen bg-white">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 lg:px-16 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
              <Blend className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[16px] font-semibold text-[#1A1A1A]">Meld</span>
          </Link>
          <div className="relative flex items-center gap-3">
            {user && (
              <ProfilePopover user={user} logout={logout} />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 lg:px-16 pt-10 pb-20">
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

            {user?.hasFigmaToken ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-3 w-3 text-green-600" />
                </div>
                <Figma className="h-3.5 w-3.5 text-[#787774]" />
                <span className="text-[12px] font-medium text-[#787774]">{t.figmaConnected}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100">
                  <Zap className="h-3 w-3 text-amber-600" />
                </div>
                <Figma className="h-3.5 w-3.5 text-[#B4B4B0]" />
                <span className="text-[12px] text-[#787774]">{t.figmaNeeded}</span>
                <a
                  href="/api/auth/figma"
                  className="rounded-lg bg-[#1A1A1A] px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#333]"
                >
                  {t.connectNow}
                </a>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100">
                <Terminal className="h-3 w-3 text-blue-600" />
              </div>
              <Terminal className="h-3.5 w-3.5 text-[#B4B4B0]" />
              <span className="text-[12px] text-[#787774]">{t.localAgent}</span>
              <code className="rounded bg-[#F7F7F5] px-1.5 py-0.5 text-[10px] text-[#787774]">npx meld</code>
            </div>
          </div>
        </div>

        {/* 퀵 액션 바 */}
        <div className="animate-fade-in-up animation-delay-75 mb-8 flex items-center gap-2 overflow-x-auto">
          {!user?.hasFigmaToken && (
            <a
              href="/api/auth/figma"
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#1A1A1A] px-3.5 py-2 text-[12px] font-medium text-white transition-all hover:bg-[#333] active:scale-[0.98]"
            >
              <Figma className="h-3.5 w-3.5" />
              {t.connectFigma}
            </a>
          )}
          <Link
            href="/project/new"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-3.5 py-2 text-[12px] font-medium text-[#787774] transition-all hover:bg-[#EEEEEC] hover:text-[#1A1A1A] active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.newProject}
          </Link>
          <Link
            href="/project/local"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-3.5 py-2 text-[12px] font-medium text-[#787774] transition-all hover:bg-[#EEEEEC] hover:text-[#1A1A1A] active:scale-[0.98]"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {t.localConnect}
          </Link>
          <Link
            href="/project/local?tab=design"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-3.5 py-2 text-[12px] font-medium text-[#787774] transition-all hover:bg-[#EEEEEC] hover:text-[#1A1A1A] active:scale-[0.98]"
          >
            <Palette className="h-3.5 w-3.5" />
            {t.designSystem}
          </Link>
        </div>

        {/* 메인 카드 */}
        <div className="animate-fade-in-up animation-delay-150 grid gap-5 sm:grid-cols-2">
          {/* 카드 1: Figma 디자인 수정 */}
          <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-[#F7F7F5] ring-1 ring-black/[0.04] transition-all duration-300 hover:bg-[#F0F0EE] hover:ring-black/[0.06]">
            {!user?.hasFigmaToken && (
              <div className="flex items-center gap-2 bg-amber-50 px-4 py-2.5 text-[11px] text-amber-700">
                <Figma className="h-3 w-3 flex-shrink-0" />
                <span>{t.figmaBannerNeeded}</span>
                <a href="/api/auth/figma" className="font-semibold underline underline-offset-2 hover:text-amber-900">
                  {t.figmaBannerConnect}
                </a>
              </div>
            )}
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
              {user?.hasFigmaToken ? (
                <Link
                  href="/project/new"
                  className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[13px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#FAFAFA] active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4 transition-transform group-hover/btn:rotate-12" />
                  {t.figmaNewProject}
                  <ArrowRight className="h-3.5 w-3.5 text-[#B4B4B0] transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              ) : (
                <a
                  href="/api/auth/figma"
                  className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[13px] font-medium text-[#787774] transition-all hover:bg-[#FAFAFA] hover:text-[#1A1A1A] active:scale-[0.98]"
                >
                  <Figma className="h-3.5 w-3.5" />
                  {t.figmaConnectFirst}
                  <ArrowRight className="h-3.5 w-3.5 text-[#D4D4D0] transition-transform group-hover/btn:translate-x-0.5" />
                </a>
              )}
            </div>
          </div>

          {/* 카드 2 */}
          {platform === "desktop" ? <DesktopProjectCard /> : <GitHubProjectCard />}
        </div>

        {/* 내 프로젝트 */}
        <div className="animate-fade-in-up animation-delay-300 mt-14">
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
            <Link
              href="/project/new"
              className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1A1A1A] underline decoration-[#E0E0DC] underline-offset-2 transition-colors hover:decoration-[#1A1A1A]"
            >
              {t.startFirstProject}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* 하단 리소스 링크 */}
        <div className="animate-fade-in-up animation-delay-600 mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Github,
              title: t.resGitHub,
              desc: t.resGitHubDesc,
              href: "/github",
              color: "#787774",
              bg: "#F7F7F5",
            },
            {
              icon: Monitor,
              title: t.resDesktop,
              desc: t.resDesktopDesc,
              href: "/download",
              color: "#787774",
              bg: "#F7F7F5",
            },
            {
              icon: MessageCircle,
              title: t.resCommunity,
              desc: t.resCommunityDesc,
              href: "/community",
              color: "#787774",
              bg: "#F7F7F5",
            },
          ].map((resource) => (
            <Link
              key={resource.href}
              href={resource.href}
              className="group flex items-center gap-3 rounded-xl bg-[#F7F7F5] p-4 ring-1 ring-black/[0.04] transition-all hover:bg-[#F0F0EE] hover:ring-black/[0.06]"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: resource.bg }}>
                <resource.icon className="h-4 w-4" style={{ color: resource.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#1A1A1A]">{resource.title}</p>
                <p className="text-[11px] text-[#B4B4B0]">{resource.desc}</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#D4D4D0] transition-colors group-hover:text-[#787774]" />
            </Link>
          ))}
        </div>
      </main>

      {/* 언어 토글 (고정) */}
      <button
        onClick={toggleLang}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[14px] font-semibold text-[#1A1A1A] shadow-lg ring-1 ring-black/[0.08] transition-all hover:scale-105 hover:shadow-xl active:scale-95"
      >
        {lang === "en" ? "KO" : "EN"}
      </button>
    </div>
  );
}
