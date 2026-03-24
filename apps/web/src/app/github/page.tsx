"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Blend,
  Github,
  ArrowUpRight,
  GitBranch,
  Star,
  AlertCircle,
  GitPullRequest,
  FileCode,
  Users,
} from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";

const translations = {
  en: {
    back: "Dashboard",
    title: "GitHub",
    subtitle: "Check out the source code and file issues.",

    repoName: "figma-code-bridge",
    repoDesc: "Figma + AI code editing platform",

    sourceCode: "Source Code",
    sourceCodeDesc: "View all source code",
    issues: "Issue Tracker",
    issuesDesc: "Bug reports & feature requests",
    pullRequests: "Pull Requests",
    pullRequestsDesc: "Code contributions & reviews",
    star: "Star",
    starDesc: "Star the project",

    contributing: "Contributing",
    contributingDesc: "FigmaCodeBridge is an open-source project. Anyone can contribute code.",
    contribStep1: "Fork the repository",
    contribStep2: "Create a new branch",
    contribStep3: "Commit your changes",
    contribStep4: "Create a Pull Request",

    techStack: "Tech Stack",

    backToDashboard: "Back to Dashboard",
  },
  ko: {
    back: "대시보드",
    title: "GitHub",
    subtitle: "소스 코드를 확인하고 이슈를 등록하세요.",

    repoName: "figma-code-bridge",
    repoDesc: "Figma + AI 코드 수정 플랫폼",

    sourceCode: "소스 코드",
    sourceCodeDesc: "전체 소스 코드 보기",
    issues: "이슈 트래커",
    issuesDesc: "버그 리포트 및 기능 요청",
    pullRequests: "Pull Requests",
    pullRequestsDesc: "코드 기여 및 리뷰",
    star: "Star",
    starDesc: "프로젝트에 스타 주기",

    contributing: "기여하기",
    contributingDesc: "FigmaCodeBridge는 오픈소스 프로젝트입니다. 누구나 코드에 기여할 수 있습니다.",
    contribStep1: "레포지토리를 Fork 합니다",
    contribStep2: "새 브랜치를 생성합니다",
    contribStep3: "변경사항을 커밋합니다",
    contribStep4: "Pull Request를 생성합니다",

    techStack: "기술 스택",

    backToDashboard: "대시보드로 돌아가기",
  },
} as const;

export default function GitHubPage() {
  const { lang } = useLangStore();
  const t = translations[lang];

  const quickLinks = [
    { icon: FileCode, title: t.sourceCode, desc: t.sourceCodeDesc, href: "https://github.com/figma-code-bridge" },
    { icon: AlertCircle, title: t.issues, desc: t.issuesDesc, href: "https://github.com/figma-code-bridge/issues" },
    { icon: GitPullRequest, title: t.pullRequests, desc: t.pullRequestsDesc, href: "https://github.com/figma-code-bridge/pulls" },
    { icon: Star, title: t.star, desc: t.starDesc, href: "https://github.com/figma-code-bridge" },
  ];

  const contribSteps = [t.contribStep1, t.contribStep2, t.contribStep3, t.contribStep4];

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
          <div className="flex items-center gap-3">
            <Github className="h-8 w-8 text-[#1A1A1A]" />
            <h1 className="text-[36px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
              {t.title}
            </h1>
          </div>
          <p className="mt-2 text-[15px] text-[#787774]">
            {t.subtitle}
          </p>
        </div>

        {/* 메인 링크 카드 */}
        <div className="animate-fade-in-up animation-delay-150 mb-10">
          <a
            href="https://github.com/figma-code-bridge"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between rounded-2xl bg-[#F7F7F5] p-6 transition-colors hover:bg-[#F0F0EE]"
          >
            <div>
              <p className="text-[18px] font-bold text-[#1A1A1A]">{t.repoName}</p>
              <p className="mt-1 text-[13px] text-[#787774]">{t.repoDesc}</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-[#B4B4B0] transition-colors group-hover:text-[#787774]" />
          </a>
        </div>

        {/* 퀵 링크 */}
        <div className="animate-fade-in-up animation-delay-300 mb-14 grid gap-3 sm:grid-cols-2">
          {quickLinks.map((item) => (
            <a
              key={item.href + item.title}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl bg-[#F7F7F5] p-4 transition-colors hover:bg-[#F0F0EE]"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white">
                <item.icon className="h-4 w-4 text-[#787774]" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-[#1A1A1A]">{item.title}</p>
                <p className="text-[11px] text-[#B4B4B0]">{item.desc}</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#D4D4D0] transition-colors group-hover:text-[#787774]" />
            </a>
          ))}
        </div>

        {/* 기여하기 */}
        <section className="animate-fade-in-up animation-delay-450 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">{t.contributing}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#787774]">
            {t.contributingDesc}
          </p>

          <div className="mt-6 space-y-3">
            {contribSteps.map((text, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-[#F7F7F5] px-4 py-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-white text-[12px] font-bold text-[#1A1A1A]">
                  {i + 1}
                </span>
                <span className="text-[13px] text-[#787774]">{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 기술 스택 */}
        <section className="animate-fade-in-up animation-delay-600 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">{t.techStack}</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              "Next.js 15",
              "TypeScript",
              "Tailwind CSS",
              "tRPC",
              "Supabase",
              "Claude API",
              "Octokit",
              "Zustand",
            ].map((tech) => (
              <span
                key={tech}
                className="rounded-lg bg-[#F7F7F5] px-3 py-1.5 text-[12px] font-medium text-[#787774]"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* 하단 */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-[#1A1A1A] transition-colors hover:text-[#787774]"
          >
            {t.backToDashboard}
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>
      </main>
    </div>
  );
}
