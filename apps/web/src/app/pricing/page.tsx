"use client";

import { useRef, useEffect, useState } from "react";
import { useLangStore } from "@/lib/store/lang-store";
import { useAuthStore } from "@/lib/store/auth-store";
import Link from "next/link";
import { LandingNav } from "@/components/layout/LandingNav";
import { Blend, Check, ArrowRight } from "lucide-react";

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, unlimited: 2 };

const translations = {
  en: {
    // Hero
    heroTitle1: "choose your plan",
    heroTitle2: "design to code",

    // Starter
    starterName: "Meld Starter",
    starterPrice: "$5",
    starterPer: "/ mo",
    starterTagline: "get started with Figma to Code",
    starterFeatures: [
      "3 projects",
      "50 AI edits / month",
      "Cloud mode only",
      "Community support",
    ],
    starterCta: "get started",

    // Pro
    proName: "Meld Pro",
    proOriginalPrice: "$30",
    proPrice: "$20",
    proPer: "/ mo",
    proDiscount: "33% off",
    proFeatures: [
      "Unlimited projects",
      "Unlimited AI edits",
      "Cloud + Local + Sandbox mode",
      "All AI models (Claude, GPT-4o, Gemini)",
      "Design change tracking",
      "Priority support",
    ],
    proCta: "get Meld Pro",

    // Unlimited
    unlimitedName: "Meld Unlimited",
    unlimitedOriginalPrice: "$69",
    unlimitedPrice: "$49",
    unlimitedPer: "/ mo",
    unlimitedDiscount: "29% off",
    unlimitedFeatures: [
      "Everything in Pro",
      "Team collaboration",
      "SAML / SSO",
      "Admin controls & audit logs",
      "Custom contracts",
      "Dedicated support & onboarding",
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
    heroTitle1: "플랜을 선택하세요",
    heroTitle2: "디자인을 코드로",

    starterName: "Meld Starter",
    starterPrice: "$5",
    starterPer: "/ mo",
    starterTagline: "Figma to Code 시작하기",
    starterFeatures: [
      "3개 프로젝트",
      "월 50회 AI 수정",
      "클라우드 모드만",
      "커뮤니티 지원",
    ],
    starterCta: "시작하기",

    proName: "Meld Pro",
    proOriginalPrice: "$30",
    proPrice: "$20",
    proPer: "/ 월",
    proDiscount: "33% 할인",
    proFeatures: [
      "무제한 프로젝트",
      "무제한 AI 수정",
      "클라우드 + 로컬 + 샌드박스 모드",
      "모든 AI 모델 (Claude, GPT-4o, Gemini)",
      "디자인 변경 추적",
      "우선 지원",
    ],
    proCta: "Meld Pro 시작",

    unlimitedName: "Meld Unlimited",
    unlimitedOriginalPrice: "$69",
    unlimitedPrice: "$49",
    unlimitedPer: "/ 월",
    unlimitedDiscount: "29% 할인",
    unlimitedFeatures: [
      "Pro의 모든 기능",
      "팀 협업",
      "SAML / SSO",
      "관리자 제어 & 감사 로그",
      "맞춤 계약",
      "전담 지원 & 온보딩",
    ],
    unlimitedCta: "Unlimited 시작",

    currentPlan: "현재 플랜",
    upgrade: "업그레이드",
    manage: "구독 관리",

    footerTagline: "Design to Code, seamlessly.",
  },
} as const;

function useInView(threshold = 0.15) {
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

  return { ref, inView };
}

function PlanButton({
  plan,
  currentPlan,
  label,
  t,
  variant,
}: {
  plan: "free" | "pro" | "unlimited";
  currentPlan: string | null;
  label: string;
  t: { currentPlan: string; upgrade: string; manage: string };
  variant: "starter" | "pro" | "unlimited";
}) {
  const isCurrent = currentPlan === plan;
  const isUpgrade = currentPlan ? (PLAN_RANK[plan] ?? 0) > (PLAN_RANK[currentPlan] ?? 0) : false;
  const isDowngrade = currentPlan ? (PLAN_RANK[plan] ?? 0) < (PLAN_RANK[currentPlan] ?? 0) : false;

  // 현재 플랜
  if (isCurrent) {
    return (
      <span className="inline-flex items-center rounded-lg border border-[#C5B882]/30 bg-[#C5B882]/10 px-6 py-3 text-[15px] font-medium text-[#C5B882]">
        {t.currentPlan}
      </span>
    );
  }

  // 다운그레이드 → 구독 관리 (Polar 포털)
  if (isDowngrade) {
    return (
      <a
        href="/api/portal"
        className="inline-flex items-center rounded-lg border border-[#E5E5E5] px-6 py-3 text-[15px] font-medium text-[#999] transition-all hover:border-[#CCC] hover:text-[#666]"
      >
        {t.manage}
      </a>
    );
  }

  // 업그레이드 또는 비로그인
  const href = `/api/checkout?plan=${plan}`;
  const text = currentPlan && isUpgrade ? t.upgrade : label;

  const styles = {
    starter: "bg-[#1A1A1A] text-white hover:bg-[#333]",
    pro: "bg-[#C5B882] text-[#1A1A1A] hover:bg-[#B8AB75] font-semibold",
    unlimited: "bg-[#1A1A1A] text-white hover:bg-[#333]",
  };

  return (
    <a
      href={href}
      className={`inline-flex items-center rounded-lg px-6 py-3 text-[15px] font-medium transition-all active:scale-[0.98] ${styles[variant]}`}
    >
      {text}
    </a>
  );
}

export default function PricingPage() {
  const { lang, toggleLang } = useLangStore();
  const { user, fetchUser } = useAuthStore();
  const t = translations[lang];

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const currentPlan = user?.plan ?? null;
  const cardsSection = useInView(0.1);

  return (
    <div className="min-h-screen bg-white selection:bg-[#1A1A1A] selection:text-white">
      {/* 그리드 배경 */}
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

      {/* 네비게이션 */}
      <LandingNav activePath="/pricing" />

      {/* 히어로 */}
      <section className="relative z-10 pt-36 pb-6 lg:pt-44 lg:pb-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          <h1 className="animate-fade-in-up text-[40px] font-bold leading-[1.15] tracking-[-0.03em] sm:text-[52px] lg:text-[64px]">
            <span className="text-[#1A1A1A]">{t.heroTitle1}</span>
            <br />
            <span className="text-[#CCC]">{t.heroTitle2}</span>
          </h1>
        </div>
      </section>

      {/* 가격 카드 */}
      <section ref={cardsSection.ref} className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-16 py-16 lg:py-24">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-[#E5E5E5] sm:grid-cols-3">
          {/* Starter */}
          <div className={`flex flex-col bg-white p-10 lg:p-12 transition-all duration-700 ${cardsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex-1">
              <h3 className="text-[22px] font-medium text-[#1A1A1A]">{t.starterName}</h3>
              <p className="mt-1.5 flex items-baseline gap-1">
                <span className="text-[32px] font-light text-[#1A1A1A]">{t.starterPrice}</span>
                <span className="text-[16px] text-[#CCC]">{t.starterPer}</span>
              </p>
              <p className="mt-4 text-[14px] text-[#C5B882]">{t.starterTagline}</p>

              <ul className="mt-10 space-y-4">
                {t.starterFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 text-[#C5B882]" />
                    <span className="text-[16px] text-[#666]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-14">
              <PlanButton plan="free" currentPlan={currentPlan} label={t.starterCta} t={t} variant="starter" />
            </div>
          </div>

          {/* Pro */}
          <div className={`flex flex-col border-x border-[#E5E5E5] bg-[#FAFAF8] p-10 lg:p-12 transition-all duration-700 delay-150 ${cardsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-[22px] font-medium text-[#1A1A1A]">{t.proName}</h3>
                <span className="rounded-full bg-[#C5B882]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#C5B882]">{t.proDiscount}</span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2.5">
                <span className="text-[16px] text-[#CCC] line-through">{t.proOriginalPrice}</span>
                <span className="text-[32px] font-light text-[#1A1A1A]">{t.proPrice}</span>
                <span className="text-[15px] text-[#CCC]">{t.proPer}</span>
              </div>

              <ul className="mt-10 space-y-4">
                {t.proFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 text-[#C5B882]" />
                    <span className="text-[16px] text-[#666]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-14">
              <PlanButton plan="pro" currentPlan={currentPlan} label={t.proCta} t={t} variant="pro" />
            </div>
          </div>

          {/* Unlimited */}
          <div className={`flex flex-col bg-white p-10 lg:p-12 transition-all duration-700 delay-300 ${cardsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-[22px] font-medium text-[#1A1A1A]">{t.unlimitedName}</h3>
                <span className="rounded-full bg-[#C5B882]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#C5B882]">{t.unlimitedDiscount}</span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2.5">
                <span className="text-[16px] text-[#CCC] line-through">{t.unlimitedOriginalPrice}</span>
                <span className="text-[32px] font-light text-[#1A1A1A]">{t.unlimitedPrice}</span>
                <span className="text-[15px] text-[#CCC]">{t.unlimitedPer}</span>
              </div>

              <ul className="mt-10 space-y-4">
                {t.unlimitedFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 text-[#C5B882]" />
                    <span className="text-[16px] text-[#666]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-14">
              <PlanButton plan="unlimited" currentPlan={currentPlan} label={t.unlimitedCta} t={t} variant="unlimited" />
            </div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="relative z-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 pb-8">
          <div className="h-px w-full bg-[#E5E5E5]" />
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-[#1A1A1A]">
                <Blend className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-[12px] text-[#999]">Meld</span>
            </div>
            <p className="font-mono text-[11px] text-[#999]">{t.footerTagline}</p>
          </div>
        </div>
      </footer>

      {/* 언어 토글 */}
      <button
        onClick={toggleLang}
        className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1A1A] text-[12px] font-semibold text-white shadow-lg ring-1 ring-black/[0.06] transition-all hover:scale-105 hover:bg-[#333] active:scale-95"
      >
        {lang === "en" ? "KO" : "EN"}
      </button>
    </div>
  );
}
