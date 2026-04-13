"use client";

import { useRef, useEffect, useState, useSyncExternalStore } from "react";

// Shared hydration-safe mounted flag helpers.
function subscribeMountFlag(cb: () => void) {
  const timer = setTimeout(cb, 0);
  return () => clearTimeout(timer);
}
function getMountedFlagClient() {
  return true;
}
function getMountedFlagServer() {
  return false;
}
import { useLangStore } from "@/lib/store/lang-store";
import { useAuthStore } from "@/lib/store/auth-store";
import Link from "next/link";
import { LandingNav } from "@/components/layout/LandingNav";
import { Blend, Check, ArrowRight } from "lucide-react";

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, unlimited: 2 };

const translations = {
  en: {
    // Hero
    heroTitle1: "Meld",
    heroTitle2: "Pricing",

    // Billing toggle
    monthly: "Monthly",
    yearly: "Yearly",
    savePercent: "Save 17%",

    // Starter
    starterName: "Meld Starter",
    starterPrice: "Free",
    starterTagline: "Basic prototyping",
    starterFeatures: [
      "Unlimited projects",
      "100K tokens / month",
      "Standard cloud environment",
      "Basic preview",
      "Community support",
    ],
    starterCta: "get started",

    // Pro
    proName: "Meld Pro",
    proOriginalPriceMonthly: "$39",
    proPriceMonthly: "$29",
    proOriginalPriceYearly: "$468",
    proPriceYearly: "$290",
    proPerMonthly: "/ mo",
    proPerYearly: "/ year",
    proDiscountMonthly: "26% off",
    proDiscountYearly: "38% off",
    proFeatures: [
      "Unlimited projects",
      "20M tokens / month",
      "Fully autonomous agent (50 rounds)",
      "9 powerful coding tools",
      "E2B cloud sandbox",
      "Real-time preview & dev server",
      "Web search & URL browsing",
      "Vision AI analysis",
      "14 MCP server presets",
      "Priority support",
    ],
    proCta: "get Meld Pro",

    // Unlimited
    unlimitedName: "Meld Unlimited",
    unlimitedOriginalPriceMonthly: "$129",
    unlimitedPriceMonthly: "$99",
    unlimitedOriginalPriceYearly: "$1548",
    unlimitedPriceYearly: "$990",
    unlimitedPerMonthly: "/ mo",
    unlimitedPerYearly: "/ year",
    unlimitedDiscountMonthly: "23% off",
    unlimitedDiscountYearly: "36% off",
    unlimitedFeatures: [
      "Everything in Pro",
      "100M tokens / month",
      "Extended sandbox timeout",
      "Longer command runtime",
      "Higher file limits",
      "Dedicated support",
    ],
    unlimitedCta: "get Unlimited",

    // Plan state
    currentPlan: "Current Plan",
    upgrade: "Upgrade",
    manage: "Manage Subscription",

    // Footer
    footerTagline: "Design to Code, seamlessly.",
  },
  ko: {
    heroTitle1: "Meld",
    heroTitle2: "요금제",

    monthly: "월간",
    yearly: "연간",
    savePercent: "17% 할인",

    starterName: "Meld Starter",
    starterPrice: "Free",
    starterTagline: "기본 프로토타이핑",
    starterFeatures: [
      "무제한 프로젝트",
      "월 100K 토큰",
      "표준 클라우드 환경",
      "기본 프리뷰",
      "커뮤니티 지원",
    ],
    starterCta: "시작하기",

    proName: "Meld Pro",
    proOriginalPriceMonthly: "$39",
    proPriceMonthly: "$29",
    proOriginalPriceYearly: "$468",
    proPriceYearly: "$290",
    proPerMonthly: "/ 월",
    proPerYearly: "/ 년",
    proDiscountMonthly: "26% 할인",
    proDiscountYearly: "38% 할인",
    proFeatures: [
      "무제한 프로젝트",
      "월 20M 토큰",
      "완전 자율 에이전트 (50 라운드)",
      "9가지 코딩 도구",
      "E2B 클라우드 샌드박스",
      "실시간 프리뷰 & dev server",
      "웹 검색 & URL 브라우징",
      "Vision AI 분석",
      "14개 MCP 서버 프리셋",
      "우선 지원",
    ],
    proCta: "Meld Pro 시작",

    unlimitedName: "Meld Unlimited",
    unlimitedOriginalPriceMonthly: "$129",
    unlimitedPriceMonthly: "$99",
    unlimitedOriginalPriceYearly: "$1548",
    unlimitedPriceYearly: "$990",
    unlimitedPerMonthly: "/ 월",
    unlimitedPerYearly: "/ 년",
    unlimitedDiscountMonthly: "23% 할인",
    unlimitedDiscountYearly: "36% 할인",
    unlimitedFeatures: [
      "Pro의 모든 기능",
      "월 100M 토큰",
      "확장된 샌드박스 타임아웃",
      "더 긴 명령어 런타임",
      "더 높은 파일 제한",
      "전담 지원",
    ],
    unlimitedCta: "Unlimited 시작",

    currentPlan: "현재 플랜",
    upgrade: "업그레이드",
    manage: "구독 관리",

    footerTagline: "Design to Code, seamlessly.",
  },
} as const;

function useInView(threshold = 0.15): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}

function PlanButton({
  plan,
  currentPlan,
  label,
  t,
  variant,
  billing,
}: {
  plan: "free" | "pro" | "unlimited";
  currentPlan: string | null;
  label: string;
  t: { currentPlan: string; upgrade: string; manage: string };
  variant: "starter" | "pro" | "unlimited";
  billing: "monthly" | "yearly";
}) {
  const isCurrent = currentPlan === plan;
  const isUpgrade = currentPlan ? (PLAN_RANK[plan] ?? 0) > (PLAN_RANK[currentPlan] ?? 0) : false;
  const isDowngrade = currentPlan ? (PLAN_RANK[plan] ?? 0) < (PLAN_RANK[currentPlan] ?? 0) : false;

  const baseStyles = "flex w-full items-center justify-center rounded-full py-3.5 text-[15px] font-medium transition-all active:scale-[0.98]";

  // 현재 플랜
  if (isCurrent) {
    return (
      <span className={`${baseStyles} border border-[#C5B882]/30 bg-[#C5B882]/10 text-[#C5B882]`}>
        {t.currentPlan}
      </span>
    );
  }

  // 다운그레이드 → 구독 관리 (Polar 포털)
  if (isDowngrade) {
    return (
      <a
        href="/api/portal"
        className={`${baseStyles} border border-[#333] text-[#666] hover:border-[#555] hover:text-[#888]`}
      >
        {t.manage}
      </a>
    );
  }

  // 업그레이드 또는 비로그인
  const href = plan === "free" ? "/project/workspace" : `/api/checkout?plan=${plan}&billing=${billing}`;
  const text = currentPlan && isUpgrade ? t.upgrade : label;

  const styles = {
    starter: "bg-[#1A1A1A] text-white border border-[#333] hover:bg-[#252525]",
    pro: "bg-[#3B82F6] text-white hover:bg-[#2563EB]",
    unlimited: "bg-[#1A1A1A] text-white border border-[#333] hover:bg-[#252525]",
  };

  return (
    <a
      href={href}
      className={`${baseStyles} ${styles[variant]}`}
    >
      {text}
    </a>
  );
}

export default function PricingPage() {
  const { lang, toggleLang } = useLangStore();
  const { user, fetchUser } = useAuthStore();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  // Hydration-safe mounted flag via useSyncExternalStore (no effect).
  const mounted = useSyncExternalStore(
    subscribeMountFlag,
    getMountedFlagClient,
    getMountedFlagServer,
  );

  // 서버-클라이언트 hydration 불일치 방지
  const t = translations[mounted ? lang : "en"];

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const currentPlan = user?.plan ?? null;
  const [cardsSectionRef, cardsSectionInView] = useInView(0.1);

  return (
    <div className="min-h-screen bg-[#0A0A0A] selection:bg-white selection:text-[#0A0A0A]">
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

      {/* 네비게이션 */}
      <LandingNav activePath="/pricing" />

      {/* 히어로 */}
      <section className="relative z-10 pt-32 pb-0 lg:pt-40 lg:pb-0">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 text-center">
          <h1 className="animate-fade-in-up text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] sm:text-[32px] lg:text-[36px]">
            <span className="text-white">{t.heroTitle1}</span>
            {" "}
            <span className="text-[#555]">{t.heroTitle2}</span>
          </h1>

          {/* 월간/연간 토글 */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <div className="inline-flex items-center rounded-full bg-[#1A1A1A] p-1">
              <button
                onClick={() => setBilling("monthly")}
                className={`rounded-full px-5 py-2 text-[14px] font-medium transition-all ${
                  billing === "monthly"
                    ? "bg-[#2A2A2A] text-white"
                    : "text-[#666] hover:text-[#999]"
                }`}
              >
                {t.monthly}
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`rounded-full px-5 py-2 text-[14px] font-medium transition-all ${
                  billing === "yearly"
                    ? "bg-[#2A2A2A] text-white"
                    : "text-[#666] hover:text-[#999]"
                }`}
              >
                {t.yearly}
              </button>
            </div>
            {billing === "yearly" && (
              <span className="rounded-full bg-[#C5B882]/15 px-3 py-1 text-[12px] font-medium text-[#C5B882]">
                {t.savePercent}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 가격 카드 */}
      <section ref={cardsSectionRef} className="relative z-10 pt-6 pb-8 lg:pt-8 lg:pb-12">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
          {/* Starter */}
          <div className={`flex flex-col rounded-2xl border border-[#2A2A2A] bg-[#111111] p-8 lg:p-10 transition-all duration-700 ${cardsSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex items-center gap-3">
              <h3 className="text-[20px] font-medium text-white">{t.starterName}</h3>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[32px] font-light text-white">{t.starterPrice}</span>
            </div>

            <div className="mt-6">
              <PlanButton plan="free" currentPlan={currentPlan} label={t.starterCta} t={t} variant="starter" billing={billing} />
            </div>

            <p className="mt-6 text-[14px] text-[#666]">{t.starterTagline}</p>

            <ul className="mt-4 flex-1 space-y-3">
              {t.starterFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C5B882]" />
                  <span className="text-[14px] text-[#888]">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className={`flex flex-col rounded-2xl border border-[#2A2A2A] bg-[#161616] p-8 lg:p-10 transition-all duration-700 delay-150 ${cardsSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex items-center gap-3">
              <h3 className="text-[20px] font-medium text-white">{t.proName}</h3>
              <span className="rounded-full bg-[#C5B882]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#C5B882]">
                {billing === "monthly" ? t.proDiscountMonthly : t.proDiscountYearly}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[14px] text-[#555] line-through">
                {billing === "monthly" ? t.proOriginalPriceMonthly : t.proOriginalPriceYearly}
              </span>
              <span className="text-[32px] font-light text-white">
                {billing === "monthly" ? t.proPriceMonthly : t.proPriceYearly}
              </span>
              <span className="text-[14px] text-[#555]">
                {billing === "monthly" ? t.proPerMonthly : t.proPerYearly}
              </span>
            </div>

            <div className="mt-6">
              <PlanButton plan="pro" currentPlan={currentPlan} label={t.proCta} t={t} variant="pro" billing={billing} />
            </div>

            <ul className="mt-8 flex-1 space-y-3">
              {t.proFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C5B882]" />
                  <span className="text-[14px] text-[#888]">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Unlimited */}
          <div className={`flex flex-col rounded-2xl border border-[#2A2A2A] bg-[#111111] p-8 lg:p-10 transition-all duration-700 delay-300 ${cardsSectionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex items-center gap-3">
              <h3 className="text-[20px] font-medium text-white">{t.unlimitedName}</h3>
              <span className="rounded-full bg-[#C5B882]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#C5B882]">
                {billing === "monthly" ? t.unlimitedDiscountMonthly : t.unlimitedDiscountYearly}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[14px] text-[#555] line-through">
                {billing === "monthly" ? t.unlimitedOriginalPriceMonthly : t.unlimitedOriginalPriceYearly}
              </span>
              <span className="text-[32px] font-light text-white">
                {billing === "monthly" ? t.unlimitedPriceMonthly : t.unlimitedPriceYearly}
              </span>
              <span className="text-[14px] text-[#555]">
                {billing === "monthly" ? t.unlimitedPerMonthly : t.unlimitedPerYearly}
              </span>
            </div>

            <div className="mt-6">
              <PlanButton plan="unlimited" currentPlan={currentPlan} label={t.unlimitedCta} t={t} variant="unlimited" billing={billing} />
            </div>

            <ul className="mt-8 flex-1 space-y-3">
              {t.unlimitedFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C5B882]" />
                  <span className="text-[14px] text-[#888]">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          </div>
        </div>
      </section>

      {/* 언어 토글 */}
      <button
        onClick={toggleLang}
        className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#0A0A0A] shadow-lg ring-1 ring-white/10 transition-all hover:scale-105 hover:bg-[#EEE] active:scale-95"
      >
        {lang === "en" ? "KO" : "EN"}
      </button>
    </div>
  );
}
