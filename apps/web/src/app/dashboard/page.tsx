"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Figma,
  Github,
  ArrowRight,
  Copy,
  Check,
  Laptop,
  Paintbrush,
  Code2,
  LogOut,
  Plus,
  FolderOpen,
  Sparkles,
  Zap,
  MousePointerClick,
  GitBranch,
  Terminal,
  Rocket,
  BookOpen,
  MessageCircle,
  Keyboard,
  ArrowUpRight,
  Clock,
  Shield,
  Eye,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white px-6 py-3.5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="animate-shimmer h-5 w-28 rounded" />
          <div className="flex items-center gap-3">
            <div className="animate-shimmer h-6 w-6 rounded-full" />
            <div className="animate-shimmer h-4 w-16 rounded" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 pt-10">
        <div className="animate-shimmer mb-8 h-8 w-48 rounded" />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="animate-shimmer h-80 rounded-2xl" />
          <div className="animate-shimmer h-80 rounded-2xl animation-delay-150" />
        </div>
      </main>
    </div>
  );
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex w-full items-center gap-2.5 rounded-xl bg-[#1A1A1A] px-4 py-3 text-left font-mono text-[12px] transition-all hover:bg-[#252525] hover:shadow-lg hover:shadow-black/10 active:scale-[0.99]"
    >
      <Terminal className="h-3.5 w-3.5 text-[#555] transition-colors group-hover:text-[#34D399]" />
      <span className="flex-1 text-[#A7F3D0]">{command}</span>
      {copied ? (
        <span className="flex items-center gap-1 text-[10px] text-[#34D399]">
          <Check className="h-3 w-3" />
          복사됨!
        </span>
      ) : (
        <Copy className="h-3.5 w-3.5 text-[#555] transition-colors group-hover:text-[#999]" />
      )}
    </button>
  );
}

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { text: "늦은 밤까지 고생하시네요", emoji: "🌙" };
  if (hour < 12) return { text: "좋은 아침이에요", emoji: "☀️" };
  if (hour < 18) return { text: "좋은 오후예요", emoji: "🔥" };
  return { text: "좋은 저녁이에요", emoji: "🌆" };
}

export default function DashboardPage() {
  const { user, loading, fetchUser, logout } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const greeting = getGreeting();

  return (
    <div className="animate-fade-in min-h-screen bg-white">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
              <Code2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-[#1A1A1A]">FigmaCodeBridge</span>
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <button className="hidden items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-2.5 py-1.5 text-[11px] text-[#B4B4B0] transition-all hover:bg-[#EEEEEC] hover:text-[#787774] sm:flex">
                  <Keyboard className="h-3 w-3" />
                  <kbd className="font-mono text-[10px]">⌘K</kbd>
                </button>
                <div className="flex items-center gap-2.5">
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
                </div>
                <button
                  onClick={logout}
                  className="text-[#B4B4B0] transition-colors hover:text-[#787774]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pt-10 pb-20">
        {/* 인사 + 연결 상태 */}
        <div className="animate-fade-in-up mb-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{greeting.emoji}</span>
            <div>
              <p className="text-[13px] text-[#787774]">{greeting.text}</p>
              <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
                무엇을 만들어볼까요?
              </h1>
            </div>
          </div>

          {/* 연결 상태 칩 */}
          <div className="mt-5 flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-3 py-1">
              <Github className="h-3 w-3 text-[#22C55E]" />
              <span className="text-[11px] font-medium text-[#16A34A]">GitHub</span>
            </div>
            {user?.hasFigmaToken ? (
              <div className="flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-3 py-1">
                <Figma className="h-3 w-3 text-[#22C55E]" />
                <span className="text-[11px] font-medium text-[#16A34A]">Figma</span>
              </div>
            ) : (
              <a
                href="/api/auth/figma"
                className="group flex items-center gap-1.5 rounded-full bg-[#F7F7F5] px-3 py-1 transition-all hover:bg-[#EEEEEC]"
              >
                <Figma className="h-3 w-3 text-[#B4B4B0] transition-colors group-hover:text-[#1A1A1A]" />
                <span className="text-[11px] font-medium text-[#787774] transition-colors group-hover:text-[#1A1A1A]">Figma 연결</span>
                <Plus className="h-2.5 w-2.5 text-[#B4B4B0] transition-colors group-hover:text-[#1A1A1A]" />
              </a>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-[#F7F7F5] px-3 py-1">
              <Shield className="h-3 w-3 text-[#787774]" />
              <span className="text-[11px] font-medium text-[#787774]">무료 플랜</span>
            </div>
          </div>
        </div>

        {/* 퀵 액션 바 */}
        <div className="animate-fade-in-up animation-delay-75 mb-8 flex items-center gap-2 overflow-x-auto">
          {[
            { icon: Plus, label: "새 프로젝트", href: "/project/new" },
            { icon: FolderOpen, label: "로컬 연결", href: "/project/local" },
            { icon: BookOpen, label: "사용 가이드", href: "#guide" },
            { icon: MessageCircle, label: "피드백", href: "#feedback" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-3.5 py-2 text-[12px] font-medium text-[#787774] transition-all hover:bg-[#EEEEEC] hover:text-[#1A1A1A] active:scale-[0.98]"
            >
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </Link>
          ))}
        </div>

        {/* 메인 카드 */}
        <div className="animate-fade-in-up animation-delay-150 grid gap-5 sm:grid-cols-2">
          {/* 카드 1: Figma 디자인 수정 */}
          <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-[#F7F7F5] transition-all duration-300 hover:bg-[#F0F0EE] hover:shadow-xl hover:shadow-purple-500/[0.04]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-[#C4B5FD]/20 to-[#818CF8]/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative flex-1 p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EDE9FE] to-[#F3E8FF]">
                  <Paintbrush className="h-5 w-5 text-[#7C3AED]" />
                </div>
                <span className="rounded-full bg-[#F5F3FF] px-2.5 py-0.5 text-[10px] font-semibold text-[#7C3AED]">Cloud</span>
              </div>

              <h3 className="mt-5 text-[18px] font-bold text-[#1A1A1A]">Figma 디자인 수정</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#787774]">
                Figma URL을 붙여넣고 클릭하면 끝.
                <br />
                AI가 코드를 수정하고 GitHub에 푸시해요.
              </p>

              {/* 비주얼 플로우 */}
              <div className="mt-6 flex items-center gap-2 text-[11px]">
                {[
                  { icon: Figma, label: "URL", color: "#787774" },
                  { icon: MousePointerClick, label: "선택", color: "#7C3AED" },
                  { icon: Zap, label: "AI", color: "#F59E0B" },
                  { icon: GitBranch, label: "Push", color: "#22C55E" },
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
                <span className="text-[10px] text-[#B4B4B0]">지원:</span>
                {["React", "Vue", "Next.js", "Angular"].map((fw) => (
                  <span key={fw} className="rounded bg-white/60 px-1.5 py-0.5 text-[10px] text-[#787774]">{fw}</span>
                ))}
              </div>
            </div>

            <div className="px-4 pb-4">
              {user?.hasFigmaToken ? (
                <Link
                  href="/project/new"
                  className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[13px] font-semibold text-[#7C3AED] shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4 transition-transform group-hover/btn:rotate-12" />
                  새 프로젝트 만들기
                  <ArrowRight className="h-3.5 w-3.5 text-[#C4B5FD] transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              ) : (
                <a
                  href="/api/auth/figma"
                  className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[13px] font-medium text-[#787774] shadow-sm transition-all hover:shadow-md hover:text-[#7C3AED] active:scale-[0.98]"
                >
                  <Figma className="h-3.5 w-3.5" />
                  먼저 Figma를 연결하세요
                  <ArrowRight className="h-3.5 w-3.5 text-[#D4D4D0] transition-transform group-hover/btn:translate-x-0.5" />
                </a>
              )}
            </div>
          </div>

          {/* 카드 2: 로컬 프로젝트 */}
          <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-[#F7F7F5] transition-all duration-300 hover:bg-[#F0F0EE] hover:shadow-xl hover:shadow-emerald-500/[0.04]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-[#A7F3D0]/20 to-[#6EE7B7]/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative flex-1 p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5]">
                  <Laptop className="h-5 w-5 text-[#059669]" />
                </div>
                <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[10px] font-semibold text-[#059669]">Local</span>
              </div>

              <h3 className="mt-5 text-[18px] font-bold text-[#1A1A1A]">로컬 프로젝트 수정</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#787774]">
                터미널 한 줄이면 연결 완료.
                <br />
                내 컴퓨터의 코드를 AI가 직접 수정해요.
              </p>

              {/* 비주얼 플로우 */}
              <div className="mt-6 flex items-center gap-2 text-[11px]">
                {[
                  { icon: Terminal, label: "npx", color: "#787774" },
                  { icon: FolderOpen, label: "파일", color: "#059669" },
                  { icon: Zap, label: "AI", color: "#F59E0B" },
                  { icon: Check, label: "반영", color: "#22C55E" },
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
                  실시간 프리뷰
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#787774]">
                  <Zap className="h-3 w-3 text-[#B4B4B0]" />
                  Hot Reload
                </div>
              </div>
            </div>

            <div className="space-y-2.5 px-4 pb-4">
              <CopyCommand command="npx figma-code-bridge" />
              <Link
                href="/project/local"
                className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[13px] font-semibold text-[#059669] shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
              >
                <Rocket className="h-4 w-4 transition-transform group-hover/btn:-rotate-12" />
                로컬 프로젝트 열기
                <ArrowRight className="h-3.5 w-3.5 text-[#A7F3D0] transition-transform group-hover/btn:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 내 프로젝트 */}
        <div className="animate-fade-in-up animation-delay-300 mt-14">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">내 프로젝트</h2>
            <span className="text-[11px] text-[#B4B4B0]">0개</span>
          </div>
          <div className="mt-4 rounded-2xl bg-[#F7F7F5] p-14 text-center transition-colors hover:bg-[#F0F0EE]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <span className="text-2xl">📂</span>
            </div>
            <p className="text-[14px] font-medium text-[#787774]">아직 프로젝트가 없어요</p>
            <p className="mt-1 text-[12px] text-[#B4B4B0]">위에서 새 프로젝트를 만들어보세요</p>
            <Link
              href="/project/new"
              className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1A1A1A] underline decoration-[#E0E0DC] underline-offset-2 transition-colors hover:decoration-[#1A1A1A]"
            >
              첫 프로젝트 시작하기
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="animate-fade-in-up animation-delay-450 mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">최근 활동</h2>
            <button className="text-[12px] text-[#787774] transition-colors hover:text-[#1A1A1A]">전체 보기</button>
          </div>
          <div className="mt-4 space-y-1">
            {[
              { icon: Github, text: "GitHub 계정이 연결되었습니다", time: "방금 전", color: "#22C55E" },
              { icon: Code2, text: "FigmaCodeBridge에 오신 것을 환영합니다!", time: "방금 전", color: "#7C3AED" },
            ].map((activity, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-[#F7F7F5]">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#F7F7F5]">
                  <activity.icon className="h-4 w-4" style={{ color: activity.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-[#1A1A1A]">{activity.text}</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#B4B4B0]">
                  <Clock className="h-3 w-3" />
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 리소스 링크 */}
        <div className="animate-fade-in-up animation-delay-600 mt-14 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: BookOpen,
              title: "문서",
              desc: "시작 가이드와 API 레퍼런스",
              href: "#docs",
              color: "#3B82F6",
              bg: "#EFF6FF",
            },
            {
              icon: Github,
              title: "GitHub",
              desc: "소스 코드와 이슈 트래커",
              href: "#github",
              color: "#1A1A1A",
              bg: "#F7F7F5",
            },
            {
              icon: MessageCircle,
              title: "커뮤니티",
              desc: "디스코드에서 질문하기",
              href: "#community",
              color: "#5865F2",
              bg: "#EEF2FF",
            },
          ].map((resource) => (
            <Link
              key={resource.title}
              href={resource.href}
              className="group flex items-center gap-3 rounded-xl bg-[#F7F7F5] p-4 transition-all hover:bg-[#F0F0EE] hover:shadow-md hover:shadow-black/[0.03]"
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
    </div>
  );
}
