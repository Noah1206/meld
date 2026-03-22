import Link from "next/link";
import {
  ArrowRight,
  Figma,
  Code2,
  GitBranch,
  Sparkles,
  Zap,
  MousePointerClick,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ===== 히어로 섹션 (Toss-style 다크) ===== */}
      <section className="relative overflow-hidden bg-[#0B0E11]">
        {/* 배경 그라디언트 오브 */}
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-pulse-glow absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-br from-[#34D399]/20 via-[#06B6D4]/10 to-transparent blur-[120px]" />
          <div className="animate-pulse-glow animation-delay-300 absolute -bottom-20 right-1/4 h-[300px] w-[400px] rounded-full bg-gradient-to-tl from-[#A7F3D0]/10 via-[#34D399]/5 to-transparent blur-[80px]" />
        </div>

        {/* 네비게이션 */}
        <nav className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#34D399] to-[#06B6D4]">
              <Code2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-white">FigmaCodeBridge</span>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg bg-white/10 px-4 py-2 text-[13px] font-medium text-white/90 backdrop-blur-sm transition-all hover:bg-white/15"
          >
            로그인
          </Link>
        </nav>

        {/* 히어로 콘텐츠 */}
        <div className="relative z-10 mx-auto max-w-5xl px-6 pb-24 pt-20 text-center">
          {/* 뱃지 */}
          <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-[#34D399]/20 bg-[#34D399]/10 px-4 py-1.5 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#34D399]" />
            <span className="text-[12px] font-medium text-[#34D399]">Plugin 없이 Figma에서 바로 코드로</span>
          </div>

          {/* 타이틀 */}
          <h1 className="animate-fade-in-up animation-delay-150 text-[44px] font-bold leading-[1.15] tracking-tight text-white sm:text-[56px]">
            디자인에서 코드까지,
            <br />
            <span className="gradient-text-mint">하나의 흐름으로</span>
          </h1>

          {/* 설명 */}
          <p className="animate-fade-in-up animation-delay-300 mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-white/50">
            Figma URL만 붙여넣으면 AI가 디자인을 분석하고,
            <br className="hidden sm:block" />
            코드를 수정해서 GitHub에 바로 푸시합니다.
          </p>

          {/* CTA */}
          <div className="animate-fade-in-up animation-delay-450 mt-10 flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#34D399] to-[#06B6D4] px-7 py-3 text-[14px] font-semibold text-white shadow-lg shadow-[#34D399]/20 transition-all hover:shadow-xl hover:shadow-[#34D399]/30 active:scale-[0.98]"
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-7 py-3 text-[14px] font-medium text-white/70 transition-all hover:border-white/20 hover:text-white/90"
            >
              데모 보기
            </Link>
          </div>

          {/* 플로우 미리보기 */}
          <div className="animate-fade-in-up animation-delay-600 mx-auto mt-16 flex max-w-lg items-center justify-center gap-4 text-[13px]">
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2.5 backdrop-blur-sm">
              <Figma className="h-4 w-4 text-[#A7F3D0]" />
              <span className="text-white/60">URL 붙여넣기</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-white/20" />
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2.5 backdrop-blur-sm">
              <MousePointerClick className="h-4 w-4 text-[#34D399]" />
              <span className="text-white/60">엘리먼트 클릭</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-white/20" />
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2.5 backdrop-blur-sm">
              <GitBranch className="h-4 w-4 text-[#06B6D4]" />
              <span className="text-white/60">코드 푸시</span>
            </div>
          </div>
        </div>

        {/* 하단 그라디언트 페이드 */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ===== 특징 섹션 (Notion-style 클린) ===== */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-[#34D399]">
            How it works
          </h2>
          <p className="mt-3 text-[28px] font-bold leading-tight text-[#1A1A1A]">
            세 단계로 끝나는 워크플로우
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {/* 스텝 1 */}
          <div className="group rounded-2xl border border-[#E8E8E4] bg-white p-6 transition-all hover:border-[#34D399]/30 hover:shadow-lg hover:shadow-[#34D399]/5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF5]">
              <Figma className="h-5 w-5 text-[#10B981]" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-[#1A1A1A]">Figma 연결</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#787774]">
              Figma 파일 URL을 붙여넣으면 노드 트리와 이미지를 자동으로 가져옵니다. Plugin 설치 필요 없음.
            </p>
          </div>

          {/* 스텝 2 */}
          <div className="group rounded-2xl border border-[#E8E8E4] bg-white p-6 transition-all hover:border-[#34D399]/30 hover:shadow-lg hover:shadow-[#34D399]/5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF5]">
              <Zap className="h-5 w-5 text-[#10B981]" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-[#1A1A1A]">AI 코드 생성</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#787774]">
              선택한 엘리먼트를 AI가 분석하고, 기존 코드베이스에 맞는 수정사항을 자동 생성합니다.
            </p>
          </div>

          {/* 스텝 3 */}
          <div className="group rounded-2xl border border-[#E8E8E4] bg-white p-6 transition-all hover:border-[#34D399]/30 hover:shadow-lg hover:shadow-[#34D399]/5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF5]">
              <GitBranch className="h-5 w-5 text-[#10B981]" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-[#1A1A1A]">GitHub 푸시</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#787774]">
              Diff를 확인하고 승인하면 GitHub에 바로 커밋. 브랜치 관리까지 한 곳에서.
            </p>
          </div>
        </div>
      </section>

      {/* ===== 푸터 ===== */}
      <footer className="border-t border-[#E8E8E4] py-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-[#34D399] to-[#06B6D4]">
              <Code2 className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-[13px] font-medium text-[#787774]">FigmaCodeBridge</span>
          </div>
          <p className="text-[12px] text-[#B4B4B0]">Plugin-free Figma to Code</p>
        </div>
      </footer>
    </div>
  );
}
