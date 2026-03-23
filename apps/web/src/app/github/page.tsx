import Link from "next/link";
import {
  ArrowLeft,
  Code2,
  Github,
  ArrowUpRight,
  GitBranch,
  Star,
  AlertCircle,
  GitPullRequest,
  FileCode,
  Users,
} from "lucide-react";

export default function GitHubPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-[13px] text-[#787774] transition-colors hover:text-[#1A1A1A]"
          >
            <ArrowLeft className="h-4 w-4" />
            대시보드
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
              <Code2 className="h-3.5 w-3.5 text-white" />
            </div>
          </Link>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-12 pb-24">
        {/* 타이틀 */}
        <div className="animate-fade-in-up mb-14">
          <div className="flex items-center gap-3">
            <Github className="h-8 w-8 text-[#1A1A1A]" />
            <h1 className="text-[36px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
              GitHub
            </h1>
          </div>
          <p className="mt-2 text-[15px] text-[#787774]">
            소스 코드를 확인하고 이슈를 등록하세요.
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
              <p className="text-[18px] font-bold text-[#1A1A1A]">figma-code-bridge</p>
              <p className="mt-1 text-[13px] text-[#787774]">Figma + AI 코드 수정 플랫폼</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-[#B4B4B0] transition-colors group-hover:text-[#787774]" />
          </a>
        </div>

        {/* 퀵 링크 */}
        <div className="animate-fade-in-up animation-delay-300 mb-14 grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: FileCode,
              title: "소스 코드",
              desc: "전체 소스 코드 보기",
              href: "https://github.com/figma-code-bridge",
            },
            {
              icon: AlertCircle,
              title: "이슈 트래커",
              desc: "버그 리포트 및 기능 요청",
              href: "https://github.com/figma-code-bridge/issues",
            },
            {
              icon: GitPullRequest,
              title: "Pull Requests",
              desc: "코드 기여 및 리뷰",
              href: "https://github.com/figma-code-bridge/pulls",
            },
            {
              icon: Star,
              title: "Star",
              desc: "프로젝트에 스타 주기",
              href: "https://github.com/figma-code-bridge",
            },
          ].map((item) => (
            <a
              key={item.title}
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
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">기여하기</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#787774]">
            FigmaCodeBridge는 오픈소스 프로젝트입니다.
            누구나 코드에 기여할 수 있습니다.
          </p>

          <div className="mt-6 space-y-3">
            {[
              { step: "1", text: "레포지토리를 Fork 합니다" },
              { step: "2", text: "새 브랜치를 생성합니다" },
              { step: "3", text: "변경사항을 커밋합니다" },
              { step: "4", text: "Pull Request를 생성합니다" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3 rounded-xl bg-[#F7F7F5] px-4 py-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-white text-[12px] font-bold text-[#1A1A1A]">
                  {item.step}
                </span>
                <span className="text-[13px] text-[#787774]">{item.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 기술 스택 */}
        <section className="animate-fade-in-up animation-delay-600 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">기술 스택</h2>
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
            대시보드로 돌아가기
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>
      </main>
    </div>
  );
}
