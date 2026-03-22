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
    <div className="min-h-screen bg-white">
      {/* ===== 네비게이션 ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#F0F0EE] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-8">
            {/* 로고 */}
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
                <Code2 className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[15px] font-semibold text-[#1A1A1A]">FigmaCodeBridge</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-[13px] font-medium text-[#787774] transition-colors hover:text-[#1A1A1A]"
            >
              로그인
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-[#E0E0DC] px-4 py-2 text-[13px] font-semibold text-[#1A1A1A] transition-all hover:border-[#1A1A1A] active:scale-[0.98]"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== 히어로 섹션 ===== */}
      <section className="relative pt-32 pb-10">
        {/* 배경 그라디언트 (미묘한 민트 글로우) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#34D399]/[0.07] via-[#06B6D4]/[0.04] to-transparent blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          {/* 메인 타이틀 */}
          <h1 className="animate-fade-in-up animation-delay-150 text-[42px] font-bold leading-[1.15] tracking-[-0.02em] text-[#1A1A1A] sm:text-[56px]">
            디자인 수정을
            <br />
            코드로 바꾸는 AI
          </h1>

          {/* 서브 텍스트 */}
          <p className="animate-fade-in-up animation-delay-300 mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-[#787774]">
            Figma URL을 붙여넣고 엘리먼트를 클릭하면,
            <br className="hidden sm:block" />
            AI가 기존 코드를 수정해서 GitHub에 푸시합니다.
          </p>

          {/* CTA 버튼 */}
          <div className="animate-fade-in-up animation-delay-450 mt-10 flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-xl border border-[#E0E0DC] px-7 py-3.5 text-[14px] font-semibold text-[#1A1A1A] transition-all hover:border-[#1A1A1A] active:scale-[0.98]"
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4 text-[#B4B4B0] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1A1A1A]" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-[14px] font-medium text-[#787774] underline decoration-[#E0E0DC] underline-offset-4 transition-all hover:text-[#1A1A1A] hover:decoration-[#1A1A1A]"
            >
              데모 보기
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 프로덕트 목업 ===== */}
      <section className="animate-fade-in-up animation-delay-600 relative mx-auto max-w-5xl px-6 pb-24">
        <div className="overflow-hidden rounded-2xl border border-[#E8E8E4] bg-white shadow-2xl shadow-black/[0.06]">
          {/* 브라우저 탑바 */}
          <div className="flex items-center gap-2 border-b border-[#E8E8E4] bg-[#FAFAFA] px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#E8E8E4]" />
              <div className="h-3 w-3 rounded-full bg-[#E8E8E4]" />
              <div className="h-3 w-3 rounded-full bg-[#E8E8E4]" />
            </div>
            <div className="ml-3 flex flex-1 items-center gap-2 rounded-md bg-white px-3 py-1 text-[11px] text-[#B4B4B0] border border-[#E8E8E4]">
              figmacodebridge.com/project/new
            </div>
          </div>

          {/* 목업 콘텐츠 — 앱 워크스페이스 시뮬레이션 */}
          <div className="flex h-[420px] sm:h-[480px]">
            {/* 왼쪽: Figma 뷰어 영역 */}
            <div className="flex-1 bg-[#FAFAFA] p-6 flex flex-col">
              <div className="mb-4 flex items-center gap-2">
                <Figma className="h-4 w-4 text-[#787774]" />
                <span className="text-[12px] font-medium text-[#787774]">Figma Viewer</span>
              </div>

              {/* 가상 프레임 */}
              <div className="flex-1 rounded-xl border border-[#E8E8E4] bg-white p-4 relative">
                {/* 목업 UI 요소들 */}
                <div className="space-y-3">
                  {/* 네비 바 모의 */}
                  <div className="flex items-center justify-between rounded-lg bg-[#F7F7F5] p-3">
                    <div className="h-3 w-20 rounded bg-[#E0E0DC]" />
                    <div className="flex gap-2">
                      <div className="h-3 w-12 rounded bg-[#E0E0DC]" />
                      <div className="h-3 w-12 rounded bg-[#E0E0DC]" />
                      <div className="h-3 w-16 rounded bg-[#10B981]/30" />
                    </div>
                  </div>
                  {/* 히어로 모의 */}
                  <div className="rounded-lg bg-[#F7F7F5] p-4 space-y-2">
                    <div className="h-4 w-48 rounded bg-[#E0E0DC]" />
                    <div className="h-3 w-64 rounded bg-[#EEEEEC]" />
                    <div className="flex gap-2 mt-3">
                      <div className="h-7 w-24 rounded-md bg-[#10B981]/20" />
                      <div className="h-7 w-20 rounded-md bg-[#E8E8E4]" />
                    </div>
                  </div>
                  {/* 카드 모의 */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-[#F7F7F5] p-3 space-y-1.5">
                      <div className="h-3 w-full rounded bg-[#E0E0DC]" />
                      <div className="h-2 w-3/4 rounded bg-[#EEEEEC]" />
                    </div>
                    <div className="rounded-lg bg-[#F7F7F5] p-3 space-y-1.5">
                      <div className="h-3 w-full rounded bg-[#E0E0DC]" />
                      <div className="h-2 w-3/4 rounded bg-[#EEEEEC]" />
                    </div>
                    <div className="rounded-lg bg-[#F7F7F5] p-3 space-y-1.5">
                      <div className="h-3 w-full rounded bg-[#E0E0DC]" />
                      <div className="h-2 w-3/4 rounded bg-[#EEEEEC]" />
                    </div>
                  </div>
                </div>

                {/* 선택 오버레이 (민트 하이라이트) */}
                <div className="absolute top-[88px] left-[22px] right-[22px] h-[100px] rounded-lg border-2 border-[#34D399] bg-[#34D399]/5 pointer-events-none">
                  <div className="absolute -top-6 left-0 flex items-center gap-1 rounded-md bg-[#1A1A1A] px-2 py-0.5 text-[9px] text-white">
                    <MousePointerClick className="h-2.5 w-2.5" />
                    Hero Section
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: AI 채팅 패널 */}
            <div className="w-[320px] border-l border-[#E8E8E4] bg-white p-4 flex flex-col">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#787774]" />
                <span className="text-[12px] font-medium text-[#787774]">AI Chat</span>
              </div>

              <div className="flex-1 space-y-3 overflow-hidden">
                {/* 유저 메시지 */}
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-md bg-[#1A1A1A] px-3.5 py-2 text-[11px] leading-relaxed text-white max-w-[220px]">
                    이 히어로 섹션의 버튼 색상을 민트로 바꿔줘
                  </div>
                </div>

                {/* AI 응답 */}
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-[#F7F7F5] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#1A1A1A] max-w-[240px] space-y-2">
                    <p className="text-[#787774]">Button.tsx의 스타일을 수정합니다:</p>
                    {/* 코드 블록 */}
                    <div className="rounded-md bg-[#1A1A1A] px-2.5 py-2 font-mono text-[10px] text-[#A7F3D0]">
                      <span className="text-[#EF4444]">- bg-blue-500</span>
                      <br />
                      <span className="text-[#34D399]">+ bg-emerald-500</span>
                    </div>
                  </div>
                </div>

                {/* AI 액션 */}
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-3 py-1.5 text-[10px] font-medium text-[#10B981]">
                    <GitBranch className="h-3 w-3" />
                    main에 커밋 완료
                  </div>
                </div>
              </div>

              {/* 입력창 */}
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#E8E8E4] bg-[#FAFAFA] px-3 py-2.5">
                <span className="flex-1 text-[11px] text-[#B4B4B0]">디자인 수정 요청...</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1A1A1A]">
                  <ArrowRight className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 플로우 인디케이터 ===== */}
      <section className="border-t border-[#F0F0EE] bg-[#FAFAFA] py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            {[
              { icon: Figma, label: "URL 붙여넣기", color: "#787774" },
              { icon: MousePointerClick, label: "엘리먼트 선택", color: "#10B981" },
              { icon: Zap, label: "AI 코드 수정", color: "#10B981" },
              { icon: GitBranch, label: "GitHub 푸시", color: "#1A1A1A" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-6 sm:gap-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#E8E8E4]">
                    <step.icon className="h-4.5 w-4.5" style={{ color: step.color }} />
                  </div>
                  <span className="text-[11px] font-medium text-[#787774]">{step.label}</span>
                </div>
                {i < 3 && (
                  <ArrowRight className="h-3.5 w-3.5 text-[#D4D4D0] -mt-5" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 특징 섹션 ===== */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-[28px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
            왜 FigmaCodeBridge인가
          </h2>
          <p className="mt-3 text-[15px] text-[#787774]">
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
              className="rounded-2xl border border-[#E8E8E4] bg-white p-6 transition-all hover:border-[#D4D4D0] hover:shadow-lg hover:shadow-black/[0.03]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F7F5]">
                <feature.icon className="h-5 w-5 text-[#1A1A1A]" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-[#1A1A1A]">{feature.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#787774]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 하단 CTA ===== */}
      <section className="border-t border-[#F0F0EE]">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-[28px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
            지금 바로 시작하세요
          </h2>
          <p className="mt-3 text-[15px] text-[#787774]">
            무료로 사용할 수 있습니다. 설치할 것도 없습니다.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-xl border border-[#E0E0DC] px-7 py-3.5 text-[14px] font-semibold text-[#1A1A1A] transition-all hover:border-[#1A1A1A] active:scale-[0.98]"
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4 text-[#B4B4B0] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1A1A1A]" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 푸터 ===== */}
      <footer className="border-t border-[#F0F0EE] bg-[#FAFAFA] py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-[#1A1A1A]">
              <Code2 className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-[12px] font-medium text-[#787774]">FigmaCodeBridge</span>
          </div>
          <p className="text-[11px] text-[#B4B4B0]">Design to Code, without plugins.</p>
        </div>
      </footer>
    </div>
  );
}
