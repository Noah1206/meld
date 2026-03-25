import Link from "next/link";
import { Atom, CheckCircle } from "lucide-react";

const t = {
  en: {
    title: "Payment Successful",
    description: "Your subscription is now active. Welcome aboard!",
    dashboard: "Go to Dashboard",
  },
  ko: {
    title: "결제 완료",
    description: "구독이 활성화되었습니다. 환영합니다!",
    dashboard: "대시보드로 이동",
  },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string }>;
}) {
  const { checkout_id } = await searchParams;

  // 간단한 언어 감지 (서버 컴포넌트이므로 header 기반)
  const lang = "en";
  const text = t[lang];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0E11] px-6">
      {/* 그리드 배경 */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C5B882]/10">
          <CheckCircle className="h-8 w-8 text-[#C5B882]" />
        </div>

        <h1 className="mt-6 text-[32px] font-light tracking-[-0.02em] text-white">
          {text.title}
        </h1>
        <p className="mt-3 text-[16px] text-[#999]">{text.description}</p>

        {checkout_id && (
          <p className="mt-4 font-mono text-[12px] text-[#555]">
            ID: {checkout_id}
          </p>
        )}

        <Link
          href="/dashboard"
          className="mt-10 inline-flex items-center rounded-lg border border-[#C5B882]/30 bg-transparent px-6 py-3 text-[15px] font-medium text-[#C5B882] transition-all hover:bg-[#C5B882]/10 active:scale-[0.98]"
        >
          {text.dashboard}
        </Link>

        {/* 로고 */}
        <div className="mt-16 flex items-center gap-2 opacity-30">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-white">
            <Atom className="h-2.5 w-2.5 text-[#0B0E11]" />
          </div>
          <span className="text-[12px] text-white">Meld</span>
        </div>
      </div>
    </div>
  );
}
