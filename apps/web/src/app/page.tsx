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
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-4">
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
      <section className="relative z-10 pt-32 pb-6">
        <div className="mx-auto max-w-[1100px] px-6">
          {/* 뱃지 */}
          <div className="animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full bg-[#F5F5F5] px-3 py-1 font-mono text-[12px] text-[#999]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#34D399]" />
            Figma REST API only — 플러그인 필요 없음
          </div>

          <h1 className="animate-fade-in-up text-[48px] font-bold leading-[1.05] tracking-[-0.04em] text-[#1A1A1A] sm:text-[64px] lg:text-[76px]">
            Figma에서 클릭하면
            <br />
            <span className="text-[#CCC]">AI가 기존 코드를 수정합니다</span>
          </h1>

          <p className="animate-fade-in-up animation-delay-150 mt-6 max-w-lg text-[17px] leading-[1.7] text-[#999]">
            새 코드를 생성하지 않습니다.
            <br />
            네이밍 컨벤션 매칭 → AI 추론 → 캐시,
            <br />
            3단계 매핑으로 기존 코드 파일을 찾아 수정합니다.
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
      <section className="animate-fade-in-up animation-delay-600 relative z-10 mx-auto max-w-[1100px] px-6 pt-10 pb-24">
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
          <div className="flex h-[400px] bg-white sm:h-[460px]">
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
            <div className="hidden w-[300px] flex-col sm:flex">
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

      {/* ===== "이렇게 동작합니다" ===== */}
      <section className="relative z-10 bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <p className="mb-2 font-mono text-[12px] tracking-wider text-[#CCC]">HOW IT WORKS</p>
          <h2 className="text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[40px]">
            30초면 끝납니다
          </h2>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: Figma,
                title: "URL을 붙여넣으세요",
                desc: "Figma 공유 링크만 있으면 됩니다. REST API /v1/files로 노드 트리와 이미지를 가져와 웹에서 렌더링합니다.",
                detail: "/v1/files/{key} · /v1/images/{key}",
              },
              {
                step: "02",
                icon: MousePointerClick,
                title: "엘리먼트를 클릭하세요",
                desc: "클릭한 요소의 이름과 구조로 코드 파일을 매칭합니다. 네이밍 매칭 → AI 추론 → 캐시, 3단계 폴백.",
                detail: "confidence 0.7~0.95",
              },
              {
                step: "03",
                icon: GitBranch,
                title: "수정이 푸시됩니다",
                desc: "AI가 JSON으로 { filePath, original, modified }를 반환합니다. Diff 확인 후 Octokit으로 GitHub 커밋.",
                detail: "octokit.createOrUpdateFileContents()",
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
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <p className="mb-2 font-mono text-[12px] tracking-wider text-[#CCC]">MODES</p>
          <h2 className="text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[40px]">
            어디서든, 원하는 방식으로
          </h2>
          <p className="mt-3 max-w-md text-[15px] text-[#999]">
            브라우저에서 바로, 로컬에서 에이전트로, 또는 설치 없이 샌드박스로.
          </p>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {/* Cloud */}
            <div className="flex flex-col rounded-xl bg-[#FAFAFA] p-6 ring-1 ring-black/[0.04] transition-colors hover:ring-black/[0.08]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white ring-1 ring-black/[0.06]">
                <Globe className="h-5 w-5 text-[#1A1A1A]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#1A1A1A]">Cloud</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[#999]">
                GitHub OAuth + Figma OAuth로 인증합니다. Octokit으로 레포 파일을 읽고, 수정 후 바로 커밋합니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["GitHub OAuth", "Figma OAuth", "Octokit"].map((tag) => (
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
                npx로 에이전트를 실행하면 WebSocket(포트 3100)으로 연결됩니다. chokidar가 파일 변경을 감지하고 실시간 동기화합니다.
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
                WebContainer API로 브라우저 안에서 Node.js가 실행됩니다. GitHub 레포를 마운트하고 npm install → dev server를 자동 부팅합니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["WebContainer API", "iframe 프리뷰", "HMR"].map((tag) => (
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
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <div className="grid items-center gap-12 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-mono text-[12px] tracking-wider text-[#CCC]">DIFF PREVIEW</p>
              <h2 className="text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-[36px]">
                새 코드가 아닙니다
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#999]">
                AI가 JSON으로 {"{ filePath, original, modified, explanation }"}을 반환합니다.
                original과 modified를 비교해 Diff를 보여주고, 승인하면 커밋됩니다.
              </p>
              <div className="mt-6 space-y-3 text-[13px] text-[#999]">
                {[
                  "기존 코드 패턴 유지 (max_tokens 4096)",
                  "Claude Sonnet 4.6 · GPT-4o · Gemini 2.5 Flash",
                  "tRPC ai.generateEdit 프로시저",
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
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <div className="grid gap-px overflow-hidden rounded-xl bg-black/[0.04] ring-1 ring-black/[0.04] sm:grid-cols-4">
            {[
              { value: "7", label: "프레임워크 지원", sub: "Next.js · React · Vue · Angular · Svelte · Vite · Astro" },
              { value: "3", label: "AI 프로바이더", sub: "Claude Sonnet 4.6 · GPT-4o · Gemini 2.5 Flash" },
              { value: "12", label: "tRPC 프로시저", sub: "figma 4 · ai 1 · git 4 · project 3" },
              { value: "0", label: "플러그인 설치", sub: "Figma REST API만 사용" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white p-6 text-center">
                <div className="font-mono text-[32px] font-bold tracking-[-0.03em] text-[#1A1A1A]">
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
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <h2 className="text-[36px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[48px]">
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
        <div className="mx-auto max-w-[1100px] px-6 pb-8">
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
