import Link from "next/link";
import {
  ArrowLeft,
  Blend,
  Figma,
  MousePointerClick,
  Zap,
  GitBranch,
  Terminal,
  ArrowRight,
  Copy,
  ExternalLink,
} from "lucide-react";

export default function DocsPage() {
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
            대시보드
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
          <h1 className="text-[36px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
            문서
          </h1>
          <p className="mt-2 text-[15px] text-[#787774]">
            FigmaCodeBridge를 시작하고 활용하는 방법을 안내합니다.
          </p>
        </div>

        {/* 시작하기 */}
        <section className="animate-fade-in-up animation-delay-150 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">시작하기</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#787774]">
            FigmaCodeBridge는 Figma 디자인을 기존 코드에 반영하는 AI 도구입니다.
            플러그인 설치 없이, Figma REST API만으로 동작합니다.
          </p>

          <div className="mt-8 space-y-4">
            {[
              {
                step: "1",
                title: "GitHub로 로그인",
                desc: "GitHub 계정으로 로그인하면 레포지토리 목록을 불러옵니다.",
              },
              {
                step: "2",
                title: "Figma 연결",
                desc: "대시보드에서 Figma 계정을 연결하세요. OAuth로 안전하게 인증됩니다.",
              },
              {
                step: "3",
                title: "프로젝트 생성",
                desc: "Figma 파일 URL과 GitHub 레포를 선택하여 새 프로젝트를 만드세요.",
              },
              {
                step: "4",
                title: "디자인 수정 요청",
                desc: "Figma 뷰어에서 엘리먼트를 클릭하고, AI에게 수정을 요청하세요.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 rounded-2xl bg-[#F7F7F5] p-5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[14px] font-bold text-[#1A1A1A]">
                  {item.step}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#1A1A1A]">{item.title}</p>
                  <p className="mt-0.5 text-[13px] text-[#787774]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cloud 모드 */}
        <section className="animate-fade-in-up animation-delay-300 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">Cloud 모드</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#787774]">
            Figma URL을 붙여넣고 엘리먼트를 선택하면, AI가 코드를 수정하고 GitHub에 자동으로 푸시합니다.
          </p>

          <div className="mt-6 flex items-center gap-3 text-[12px]">
            {[
              { icon: Figma, label: "URL 입력" },
              { icon: MousePointerClick, label: "엘리먼트 선택" },
              { icon: Zap, label: "AI 코드 수정" },
              { icon: GitBranch, label: "GitHub 푸시" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-3 py-2">
                  <step.icon className="h-3.5 w-3.5 text-[#787774]" />
                  <span className="text-[#787774]">{step.label}</span>
                </div>
                {i < 3 && <ArrowRight className="h-3 w-3 text-[#D4D4D0]" />}
              </div>
            ))}
          </div>
        </section>

        {/* Local 모드 */}
        <section className="animate-fade-in-up animation-delay-450 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">Local 모드</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#787774]">
            터미널에서 에이전트를 실행하면 내 컴퓨터의 코드를 AI가 직접 수정합니다.
            실시간 프리뷰와 Hot Reload를 지원합니다.
          </p>

          <div className="mt-6 rounded-xl bg-[#1A1A1A] px-5 py-4">
            <div className="flex items-center gap-2 font-mono text-[13px]">
              <Terminal className="h-3.5 w-3.5 text-[#555]" />
              <span className="text-[#999]">npx figma-code-bridge</span>
            </div>
          </div>

          <p className="mt-3 text-[12px] text-[#B4B4B0]">
            실행 후 대시보드에서 "로컬 연결" 버튼을 클릭하세요.
          </p>
        </section>

        {/* 지원 프레임워크 */}
        <section className="animate-fade-in-up animation-delay-600 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">지원 프레임워크</h2>
          <p className="mt-2 text-[14px] text-[#787774]">
            다양한 프론트엔드 프레임워크에서 사용할 수 있습니다.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name: "React", desc: "JSX / TSX" },
              { name: "Next.js", desc: "App Router" },
              { name: "Vue", desc: "SFC / Composition" },
              { name: "Angular", desc: "Component" },
            ].map((fw) => (
              <div key={fw.name} className="rounded-xl bg-[#F7F7F5] p-4 transition-colors hover:bg-[#F0F0EE]">
                <p className="text-[14px] font-semibold text-[#1A1A1A]">{fw.name}</p>
                <p className="mt-0.5 text-[12px] text-[#B4B4B0]">{fw.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">자주 묻는 질문</h2>

          <div className="mt-6 space-y-4">
            {[
              {
                q: "Figma 플러그인이 필요한가요?",
                a: "아닙니다. FigmaCodeBridge는 Figma REST API만 사용하므로 별도의 플러그인 설치가 필요 없습니다.",
              },
              {
                q: "기존 코드를 덮어쓰나요?",
                a: "새 코드를 생성하지 않습니다. 기존 프로젝트의 패턴과 컨벤션을 따라 코드를 수정합니다.",
              },
              {
                q: "무료인가요?",
                a: "네, 현재 무료로 사용할 수 있습니다. 설치할 것도 없습니다.",
              },
              {
                q: "어떤 AI 모델을 사용하나요?",
                a: "Claude Sonnet 4.6을 사용합니다. 코드 수정에 최적화된 프롬프트로 동작합니다.",
              },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl bg-[#F7F7F5] p-5">
                <p className="text-[14px] font-semibold text-[#1A1A1A]">{item.q}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#787774]">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 하단 CTA */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-[#1A1A1A] transition-colors hover:text-[#787774]"
          >
            대시보드로 돌아가기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
