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
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* ===== 네비게이션 ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080808]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
              <Code2 className="h-3.5 w-3.5 text-[#080808]" />
            </div>
            <span className="text-[15px] font-semibold text-white">FigmaCodeBridge</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-[13px] font-medium text-[#666] transition-colors hover:text-white"
            >
              로그인
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-[#080808] transition-all hover:bg-[#E0E0E0] active:scale-[0.98]"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== 히어로 섹션 ===== */}
      <section className="relative pt-36 pb-16">
        {/* 배경 글로우 */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-16 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#34D399]/[0.06] via-[#06B6D4]/[0.03] to-transparent blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          {/* 뱃지 */}
          <div className="animate-fade-in mb-8 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-1.5 ring-1 ring-white/[0.08]">
            <div className="h-1.5 w-1.5 rounded-full bg-[#34D399] animate-pulse" />
            <span className="text-[12px] text-[#999]">No plugin required</span>
          </div>

          <h1 className="animate-fade-in-up animation-delay-150 text-[44px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[64px]">
            디자인 수정을
            <br />
            <span className="text-[#666]">코드로 바꾸는 AI</span>
          </h1>

          <p className="animate-fade-in-up animation-delay-300 mx-auto mt-6 max-w-md text-[16px] leading-relaxed text-[#666]">
            Figma URL을 붙여넣고 엘리먼트를 클릭하면,
            <br className="hidden sm:block" />
            AI가 기존 코드를 수정해서 GitHub에 푸시합니다.
          </p>

          <div className="animate-fade-in-up animation-delay-450 mt-10 flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-[14px] font-semibold text-[#080808] transition-all hover:bg-[#E0E0E0] active:scale-[0.98]"
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4 text-[#080808]/40 transition-transform group-hover:translate-x-0.5 group-hover:text-[#080808]" />
            </Link>
            <Link
              href="/dashboard"
              className="text-[14px] font-medium text-[#555] transition-colors hover:text-white"
            >
              데모 보기
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 프로덕트 목업 ===== */}
      <section className="animate-fade-in-up animation-delay-600 relative mx-auto max-w-5xl px-6 pb-28">
        <div className="overflow-hidden rounded-2xl bg-[#111] ring-1 ring-white/[0.06]">
          {/* 브라우저 탑바 */}
          <div className="flex items-center gap-2 bg-[#0E0E0E] px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#222]" />
              <div className="h-3 w-3 rounded-full bg-[#222]" />
              <div className="h-3 w-3 rounded-full bg-[#222]" />
            </div>
            <div className="ml-3 flex flex-1 rounded-md bg-[#1A1A1A] px-3 py-1 text-[11px] text-[#444]">
              figmacodebridge.com/project/new
            </div>
          </div>

          {/* 목업 콘텐츠 */}
          <div className="flex h-[420px] sm:h-[480px]">
            {/* 왼쪽: Figma 뷰어 */}
            <div className="flex flex-1 flex-col p-6">
              <div className="mb-4 flex items-center gap-2">
                <Figma className="h-4 w-4 text-[#555]" />
                <span className="text-[12px] font-medium text-[#555]">Figma Viewer</span>
              </div>

              <div className="relative flex-1 rounded-xl bg-[#0E0E0E] p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-[#161616] p-3">
                    <div className="h-3 w-20 rounded bg-[#222]" />
                    <div className="flex gap-2">
                      <div className="h-3 w-12 rounded bg-[#222]" />
                      <div className="h-3 w-12 rounded bg-[#222]" />
                      <div className="h-3 w-16 rounded bg-[#34D399]/20" />
                    </div>
                  </div>
                  <div className="space-y-2 rounded-lg bg-[#161616] p-4">
                    <div className="h-4 w-48 rounded bg-[#222]" />
                    <div className="h-3 w-64 rounded bg-[#1A1A1A]" />
                    <div className="mt-3 flex gap-2">
                      <div className="h-7 w-24 rounded-md bg-[#34D399]/15" />
                      <div className="h-7 w-20 rounded-md bg-[#1E1E1E]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="space-y-1.5 rounded-lg bg-[#161616] p-3">
                        <div className="h-3 w-full rounded bg-[#222]" />
                        <div className="h-2 w-3/4 rounded bg-[#1A1A1A]" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 선택 표시 */}
                <div className="pointer-events-none absolute left-[22px] right-[22px] top-[88px] h-[100px] rounded-lg border border-[#34D399]/40 bg-[#34D399]/[0.04]">
                  <div className="absolute -top-6 left-0 flex items-center gap-1 rounded-md bg-[#34D399] px-2 py-0.5 text-[9px] font-medium text-[#080808]">
                    <MousePointerClick className="h-2.5 w-2.5" />
                    Hero Section
                  </div>
                </div>
              </div>
            </div>

            {/* 구분선 */}
            <div className="w-px bg-white/[0.04]" />

            {/* 오른쪽: AI 채팅 패널 */}
            <div className="flex w-[320px] flex-col p-4">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#555]" />
                <span className="text-[12px] font-medium text-[#555]">AI Chat</span>
              </div>

              <div className="flex-1 space-y-3 overflow-hidden">
                {/* 유저 메시지 */}
                <div className="flex justify-end">
                  <div className="max-w-[220px] rounded-2xl rounded-br-md bg-white px-3.5 py-2 text-[11px] leading-relaxed text-[#080808]">
                    이 히어로 섹션의 버튼 색상을 민트로 바꿔줘
                  </div>
                </div>

                {/* AI 응답 */}
                <div className="flex justify-start">
                  <div className="max-w-[240px] space-y-2 rounded-2xl rounded-bl-md bg-[#161616] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#CCC]">
                    <p className="text-[#666]">Button.tsx의 스타일을 수정합니다:</p>
                    <div className="rounded-md bg-[#0E0E0E] px-2.5 py-2 font-mono text-[10px]">
                      <span className="text-[#EF4444]/80">- bg-blue-500</span>
                      <br />
                      <span className="text-[#34D399]">+ bg-emerald-500</span>
                    </div>
                  </div>
                </div>

                {/* 완료 뱃지 */}
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-full bg-[#34D399]/10 px-3 py-1.5 text-[10px] font-medium text-[#34D399] ring-1 ring-[#34D399]/20">
                    <GitBranch className="h-3 w-3" />
                    main에 커밋 완료
                  </div>
                </div>
              </div>

              {/* 입력창 */}
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#161616] px-3 py-2.5 ring-1 ring-white/[0.04]">
                <span className="flex-1 text-[11px] text-[#444]">디자인 수정 요청...</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white">
                  <ArrowRight className="h-3 w-3 text-[#080808]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 플로우 인디케이터 ===== */}
      <section className="bg-[#0E0E0E] py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            {[
              { icon: Figma, label: "URL 붙여넣기" },
              { icon: MousePointerClick, label: "엘리먼트 선택" },
              { icon: Zap, label: "AI 코드 수정" },
              { icon: GitBranch, label: "GitHub 푸시" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-6 sm:gap-10">
                <div className="flex flex-col items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1A1A] ring-1 ring-white/[0.06]">
                    <step.icon className="h-4.5 w-4.5 text-[#888]" />
                  </div>
                  <span className="text-[11px] font-medium text-[#555]">{step.label}</span>
                </div>
                {i < 3 && (
                  <ArrowRight className="-mt-5 h-3.5 w-3.5 text-[#333]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 특징 섹션 ===== */}
      <section className="mx-auto max-w-4xl px-6 py-28">
        <div className="mb-16 text-center">
          <h2 className="text-[28px] font-bold tracking-[-0.02em] text-white sm:text-[36px]">
            왜 FigmaCodeBridge인가
          </h2>
          <p className="mt-3 text-[15px] text-[#555]">
            Figma Make와는 다릅니다. 새로 만드는 게 아니라, 기존 코드를 수정합니다.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Eye,
              title: "비주얼 선택",
              desc: "Figma 뷰어에서 수정할 엘리먼트를 클릭하면, 해당 코드 파일을 AI가 자동 매칭합니다.",
            },
            {
              icon: Zap,
              title: "기존 코드 수정",
              desc: "새 코드를 생성하는 게 아닙니다. 프로젝트의 기존 패턴과 컨벤션을 따라 수정합니다.",
            },
            {
              icon: GitBranch,
              title: "바로 푸시",
              desc: "Diff를 확인하고 승인하면 GitHub에 바로 커밋. 로컬 모드면 파일에 직접 반영.",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[#111] p-6 ring-1 ring-white/[0.04] transition-colors hover:bg-[#141414] hover:ring-white/[0.08]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1A1A] ring-1 ring-white/[0.06]">
                <feature.icon className="h-5 w-5 text-[#999]" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#555]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 하단 CTA ===== */}
      <section className="bg-[#0E0E0E]">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="text-[28px] font-bold tracking-[-0.02em] text-white sm:text-[36px]">
            지금 바로 시작하세요
          </h2>
          <p className="mt-3 text-[15px] text-[#555]">
            무료로 사용할 수 있습니다. 설치할 것도 없습니다.
          </p>
          <div className="mt-10">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-[14px] font-semibold text-[#080808] transition-all hover:bg-[#E0E0E0] active:scale-[0.98]"
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4 text-[#080808]/40 transition-transform group-hover:translate-x-0.5 group-hover:text-[#080808]" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 푸터 ===== */}
      <footer className="bg-[#0E0E0E] pb-8">
        <div className="mx-auto max-w-6xl px-6 pt-6">
          <div className="h-px w-full bg-white/[0.04]" />
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-white">
                <Code2 className="h-2.5 w-2.5 text-[#080808]" />
              </div>
              <span className="text-[12px] font-medium text-[#444]">FigmaCodeBridge</span>
            </div>
            <p className="text-[11px] text-[#333]">Design to Code, without plugins.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
