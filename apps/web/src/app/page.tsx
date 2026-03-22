import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="animate-fade-in-up text-4xl font-bold text-[#1C1C1C]">
          FigmaCodeBridge
        </h1>
        <p className="animate-fade-in-up animation-delay-150 mt-2 text-lg text-[#6B7280]">
          Figma 디자인 → AI 코드 수정 → GitHub 푸시
        </p>
      </div>

      <div className="animate-fade-in-up animation-delay-300 flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-lg bg-[#2E86C1] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#2573A8] hover:scale-105 hover:shadow-md active:scale-100"
        >
          시작하기
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-[#E5E7EB] px-6 py-3 text-sm font-medium text-[#1C1C1C] transition-all hover:bg-[#F8F9FA] hover:scale-105 hover:shadow-md active:scale-100"
        >
          데모 보기
        </Link>
      </div>
    </div>
  );
}
