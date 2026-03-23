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
  Terminal,
  Layers,
  MousePointer,
  Monitor,
  Globe,
  Cpu,
  Check,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white selection:bg-[#1A1A1A] selection:text-white">
      {/* ===== 그리드 배경 ===== */}
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

      {/* ===== 네비게이션 ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 lg:px-16 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1A1A1A]">
              <Code2 className="h-3 w-3 text-white" />
            </div>
            <span className="text-[14px] font-semibold text-[#1A1A1A]">FigmaCodeBridge</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="text-[13px] text-[#999] transition-colors hover:text-[#1A1A1A]">
              Docs
            </Link>
            <Link href="/github" className="text-[13px] text-[#999] transition-colors hover:text-[#1A1A1A]">
              GitHub
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-[#F5F0E8] px-4 py-1.5 text-[13px] font-semibold text-[#1A1A1A] transition-colors hover:bg-[#EDE7DB]"
            >
              시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== 히어로 ===== */}
      <section className="relative z-10 pt-32 pb-6 lg:pt-40 lg:pb-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          {/* 뱃지 */}
          <div className="animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full bg-[#F5F5F5] px-3 py-1 font-mono text-[12px] text-[#999]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#34D399]" />
            플러그인 설치 없이 바로 사용
          </div>

          <h1 className="animate-fade-in-up text-[48px] font-bold leading-[1.05] tracking-[-0.04em] text-[#1A1A1A] sm:text-[64px] lg:text-[76px] xl:text-[88px]">
            한 사람을 위한
            <br />
            <span className="text-[#CCC]">완벽한 디자인 IDE</span>
          </h1>

          <p className="animate-fade-in-up animation-delay-150 mt-6 max-w-lg text-[17px] leading-[1.7] text-[#999]">
            새 코드를 만들지 않습니다.
            <br />
            디자인 요소와 코드 파일을 자동으로 연결해서,
            <br />
            이미 작성된 코드 위에서 수정합니다.
          </p>

          {/* CTA */}
          <div className="animate-fade-in-up animation-delay-300 mt-10 flex items-center gap-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl bg-[#F5F0E8] px-7 py-3.5 text-[15px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#EDE7DB] active:scale-[0.98]"
            >
              시작하기
            </Link>
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-1.5 text-[15px] text-[#999] transition-colors hover:text-[#1A1A1A]"
            >
              브라우저에서 열기
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* 프레임워크 태그 */}
          <div className="animate-fade-in animation-delay-450 mt-8 flex items-center gap-2 text-[12px] text-[#CCC]">
            {["Next.js", "React", "Vue", "Angular", "Svelte", "Vite", "Astro"].map((fw) => (
              <span key={fw} className="rounded-full bg-[#FAFAFA] px-2.5 py-0.5 ring-1 ring-black/[0.04]">
                {fw}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 프로덕트 목업 ===== */}
      <section className="animate-fade-in-up animation-delay-600 relative z-10 mx-auto max-w-[1440px] px-6 lg:px-16 pt-10 pb-24 lg:pb-32">
        <div className="overflow-hidden rounded-xl ring-1 ring-black/[0.08]">
          {/* 브라우저 바 */}
          <div className="flex items-center bg-[#FAFAFA] px-4 py-2.5">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#E0E0E0]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#E0E0E0]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#E0E0E0]" />
            </div>
            <div className="mx-auto text-[11px] text-[#CCC]">figmacodebridge.com</div>
          </div>

          {/* 3-패널 앱 목업 */}
          <div className="flex h-[400px] bg-white sm:h-[460px] lg:h-[540px]">
            {/* 좌: Figma 뷰어 */}
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-2 bg-[#FAFAFA] px-4 py-2">
                <Figma className="h-3.5 w-3.5 text-[#999]" />
                <span className="text-[11px] font-medium text-[#999]">Figma Viewer</span>
              </div>
              <div className="relative flex-1 bg-[#FAFAFA] p-4">
                <div className="h-full rounded-lg bg-white p-4 ring-1 ring-black/[0.04]">
                  <div className="space-y-2.5">
                    {/* 네비게이션 바 목업 */}
                    <div className="flex items-center justify-between rounded-md bg-[#FAFAFA] p-2.5">
                      <div className="h-2.5 w-14 rounded-full bg-[#E0E0E0]" />
                      <div className="flex gap-2">
                        <div className="h-2.5 w-10 rounded-full bg-[#E8E8E8]" />
                        <div className="h-2.5 w-10 rounded-full bg-[#E8E8E8]" />
                        <div className="h-6 w-16 rounded-full bg-[#1A1A1A]" />
                      </div>
                    </div>
                    {/* 히어로 목업 */}
                    <div className="space-y-2 rounded-md bg-[#FAFAFA] p-4">
                      <div className="h-4 w-56 rounded bg-[#D4D4D4]" />
                      <div className="h-3 w-72 rounded bg-[#E8E8E8]" />
                      <div className="h-3 w-48 rounded bg-[#E8E8E8]" />
                      <div className="mt-3 flex gap-2">
                        <div className="h-7 w-24 rounded-full bg-[#1A1A1A]" />
                        <div className="h-7 w-20 rounded-full bg-[#F0F0F0] ring-1 ring-black/[0.06]" />
                      </div>
                    </div>
                    {/* 카드 그리드 목업 */}
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="space-y-1.5 rounded-md bg-[#FAFAFA] p-2.5">
                          <div className="h-12 rounded bg-[#F0F0F0]" />
                          <div className="h-2 w-full rounded-full bg-[#E8E8E8]" />
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
              <div className="flex items-center gap-2 bg-[#FAFAFA] px-4 py-2">
                <MessageSquare className="h-3.5 w-3.5 text-[#999]" />
                <span className="text-[11px] font-medium text-[#999]">AI Chat</span>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <div className="flex-1 space-y-3">
                  {/* 유저 */}
                  <div className="flex justify-end">
                    <div className="max-w-[200px] rounded-2xl rounded-br-sm bg-[#1A1A1A] px-3 py-2 text-[11px] leading-relaxed text-white">
                      이 히어로 섹션의 CTA 버튼을 민트색으로 바꿔줘
                    </div>
                  </div>
                  {/* AI */}
                  <div className="flex justify-start">
                    <div className="max-w-[220px] space-y-2 rounded-2xl rounded-bl-sm bg-[#FAFAFA] px-3 py-2.5 text-[11px] leading-relaxed text-[#666] ring-1 ring-black/[0.04]">
                      <p>HeroSection.tsx를 수정합니다:</p>
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
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-3 py-1.5 text-[10px] font-medium text-[#16A34A] ring-1 ring-[#16A34A]/10">
                      <Check className="h-3 w-3" />
                      main에 커밋 완료
                    </div>
                  </div>
                </div>
                {/* 인풋 */}
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#FAFAFA] px-3 py-2 ring-1 ring-black/[0.04]">
                  <span className="flex-1 text-[11px] text-[#CCC]">수정 요청을 입력하세요...</span>
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
      <section className="relative z-10 border-y border-black/[0.04] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-14 lg:py-20">
          <p className="mb-10 text-center text-[13px] text-[#B4B4B0]">
            다양한 AI 모델과 도구를 하나의 워크스페이스에서 자유롭게 연결하세요
          </p>

          {/* 로고 스트립 */}
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-14 lg:gap-x-20">
            {[
              { name: "Claude Sonnet", style: "font-serif italic" },
              { name: "GPT-4o", style: "font-mono font-bold" },
              { name: "Gemini 2.5 Flash", style: "font-sans font-light tracking-wide" },
              { name: "Figma", style: "font-sans font-bold" },
              { name: "GitHub", style: "font-mono font-semibold" },
              { name: "Supabase", style: "font-mono font-medium" },
              { name: "Vercel", style: "font-sans font-semibold tracking-tight" },
            ].map((item) => (
              <span
                key={item.name}
                className={`text-[18px] text-[#C0C0C0] transition-colors hover:text-[#1A1A1A] sm:text-[20px] ${item.style}`}
              >
                {item.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== "이렇게 동작합니다" ===== */}
      <section className="relative z-10 bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <p className="mb-2 font-mono text-[12px] tracking-wider text-[#CCC]">HOW IT WORKS</p>
          <h2 className="text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[40px] lg:text-[48px]">
            30초면 끝납니다
          </h2>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: Figma,
                title: "Figma 링크를 붙여넣으세요",
                desc: "Figma에서 공유 링크를 복사해 붙여넣으면, 디자인을 그대로 불러옵니다. 플러그인은 필요 없습니다.",
                detail: "공유 링크만 있으면 끝",
              },
              {
                step: "02",
                icon: MousePointerClick,
                title: "바꿀 요소를 클릭하세요",
                desc: "수정하고 싶은 디자인 요소를 클릭하면, AI가 해당하는 코드 파일을 자동으로 찾아줍니다.",
                detail: "95% 이상 정확도",
              },
              {
                step: "03",
                icon: GitBranch,
                title: "확인하고 반영하세요",
                desc: "AI가 수정한 코드의 변경 내역을 미리 보여줍니다. 확인 후 한 클릭으로 GitHub에 반영됩니다.",
                detail: "변경 사항 미리보기 제공",
              },
            ].map((item) => (
              <div key={item.step} className="group">
                <div className="mb-4 flex items-center gap-3">
                  <span className="font-mono text-[32px] font-bold text-[#E8E8E8] transition-colors group-hover:text-[#1A1A1A]">
                    {item.step}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-black/[0.06]">
                    <item.icon className="h-4 w-4 text-[#999]" />
                  </div>
                </div>
                <h3 className="text-[16px] font-semibold text-[#1A1A1A]">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#999]">{item.desc}</p>
                <p className="mt-3 font-mono text-[11px] text-[#CCC]">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 3가지 모드 ===== */}
      <section className="relative z-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <p className="mb-2 font-mono text-[12px] tracking-wider text-[#CCC]">MODES</p>
          <h2 className="text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[40px] lg:text-[48px]">
            어디서든, 원하는 방식으로
          </h2>
          <p className="mt-3 max-w-md text-[15px] text-[#999]">
            상황에 맞는 방식을 선택하세요. 어떤 방식이든 결과는 같습니다.
          </p>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {/* Cloud */}
            <div className="flex flex-col rounded-xl bg-[#FAFAFA] p-6 ring-1 ring-black/[0.04] transition-colors hover:ring-black/[0.08]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white ring-1 ring-black/[0.06]">
                <Globe className="h-5 w-5 text-[#1A1A1A]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#1A1A1A]">Cloud</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[#999]">
                GitHub 계정만 연결하면 브라우저에서 바로 코드를 수정하고 저장할 수 있습니다. 설치할 것이 없습니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["GitHub 연동", "Figma 연동", "원클릭 저장"].map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#999] ring-1 ring-black/[0.04]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Local */}
            <div className="flex flex-col rounded-xl bg-[#FAFAFA] p-6 ring-1 ring-black/[0.04] transition-colors hover:ring-black/[0.08]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white ring-1 ring-black/[0.06]">
                <Terminal className="h-5 w-5 text-[#1A1A1A]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#1A1A1A]">Local</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[#999]">
                터미널에서 한 줄만 실행하면 내 컴퓨터의 파일에 직접 반영됩니다. 저장하면 개발 서버가 바로 새로고침됩니다.
              </p>
              <div className="mt-4 overflow-hidden rounded-md bg-[#1A1A1A] px-3 py-2 font-mono text-[11px]">
                <span className="text-[#666]">$</span>
                <span className="text-[#999]"> npx figma-code-bridge --port 3100</span>
              </div>
            </div>

            {/* Sandbox */}
            <div className="flex flex-col rounded-xl bg-[#FAFAFA] p-6 ring-1 ring-black/[0.04] transition-colors hover:ring-black/[0.08]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white ring-1 ring-black/[0.06]">
                <Monitor className="h-5 w-5 text-[#1A1A1A]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#1A1A1A]">Sandbox</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[#999]">
                아무것도 설치하지 않아도 됩니다. 브라우저 안에서 개발 환경이 자동으로 세팅되고, 결과를 바로 확인할 수 있습니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["설치 불필요", "실시간 미리보기", "자동 새로고침"].map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#999] ring-1 ring-black/[0.04]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 코드 디프 예시 ===== */}
      <section className="relative z-10 bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <div className="grid items-center gap-12 sm:grid-cols-2 lg:gap-20">
            <div>
              <p className="mb-2 font-mono text-[12px] tracking-wider text-[#CCC]">DIFF PREVIEW</p>
              <h2 className="text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[36px] lg:text-[44px]">
                기존 코드를 수정합니다
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#999]">
                AI가 수정한 부분만 하이라이트로 보여줍니다.
                어떤 코드가 바뀌었는지 한눈에 확인하고, 승인하면 바로 반영됩니다.
              </p>
              <div className="mt-6 space-y-3 text-[13px] text-[#999]">
                {[
                  "기존 코드 스타일 그대로 유지",
                  "Claude · GPT-4o · Gemini 중 선택",
                  "변경 전/후 비교 미리보기",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1A1A1A]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* 코드 블록 */}
            <div className="overflow-hidden rounded-xl bg-[#1A1A1A] ring-1 ring-black/[0.1]">
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

      {/* ===== 숫자들 ===== */}
      <section className="relative z-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <div className="grid gap-px overflow-hidden rounded-xl bg-black/[0.04] ring-1 ring-black/[0.04] sm:grid-cols-4">
            {[
              { value: "7", label: "지원 프레임워크", sub: "Next.js · React · Vue · Angular 등" },
              { value: "3", label: "AI 모델", sub: "Claude · GPT-4o · Gemini" },
              { value: "95%+", label: "매칭 정확도", sub: "디자인 → 코드 자동 연결" },
              { value: "0", label: "플러그인 설치", sub: "브라우저만 있으면 충분" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white p-6 text-center lg:p-10">
                <div className="font-mono text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] lg:text-[40px]">
                  {stat.value}
                </div>
                <div className="mt-1 text-[13px] font-medium text-[#1A1A1A]">{stat.label}</div>
                <div className="mt-0.5 text-[11px] text-[#CCC]">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 하단 CTA ===== */}
      <section className="relative z-10 bg-[#1A1A1A]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-24 lg:py-32">
          <h2 className="text-[36px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[48px] lg:text-[56px]">
            지금 시작하세요
          </h2>
          <p className="mt-3 text-[16px] text-[#666]">
            무료입니다. 설치도 없습니다. 브라우저만 있으면 됩니다.
          </p>
          <div className="mt-10 flex items-center gap-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl bg-[#F5F0E8] px-7 py-3.5 text-[15px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#EDE7DB] active:scale-[0.98]"
            >
              시작하기
            </Link>
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-1.5 text-[15px] text-[#666] transition-colors hover:text-white"
            >
              브라우저에서 열기
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
              <div className="flex h-5 w-5 items-center justify-center rounded bg-white">
                <Code2 className="h-2.5 w-2.5 text-[#1A1A1A]" />
              </div>
              <span className="text-[12px] text-[#555]">FigmaCodeBridge</span>
            </div>
            <p className="font-mono text-[11px] text-[#444]">Design to Code, without plugins.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
