"use client";

import { useState, useRef, useEffect } from "react";
import { useLangStore } from "@/lib/store/lang-store";
import Link from "next/link";
import { LandingNav } from "@/components/layout/LandingNav";
import { Blend, Check, ArrowRight } from "lucide-react";
import { createCheckout } from "./actions";

const translations = {
  en: {
    // Hero
    heroTitle1: "choose your plan",
    heroTitle2: "design to code",

    // Toggle
    yearly: "yearly billing",
    yearlySave: "save 20%",

    // Starter
    starterName: "Meld Starter",
    starterPrice: "Free",
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
    proPriceMonthly: "$20",
    proPriceYearly: "$16",
    proPer: "/ mo",
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
    unlimitedPriceMonthly: "$49",
    unlimitedPriceYearly: "$39",
    unlimitedPer: "/ mo",
    unlimitedFeatures: [
      "Everything in Pro",
      "Team collaboration",
      "SAML / SSO",
      "Admin controls & audit logs",
      "Custom contracts",
      "Dedicated support & onboarding",
    ],
    unlimitedCta: "get Unlimited",

    // Bottom
    bottomText: "trusted by developers shipping with",

    // Footer
    footerTagline: "Design to Code, seamlessly.",
  },
  ko: {
    heroTitle1: "플랜을 선택하세요",
    heroTitle2: "디자인을 코드로",

    yearly: "연간 결제",
    yearlySave: "20% 할인",

    starterName: "Meld Starter",
    starterPrice: "Free",
    starterTagline: "Figma to Code 시작하기",
    starterFeatures: [
      "3개 프로젝트",
      "월 50회 AI 수정",
      "클라우드 모드만",
      "커뮤니티 지원",
    ],
    starterCta: "시작하기",

    proName: "Meld Pro",
    proPriceMonthly: "$20",
    proPriceYearly: "$16",
    proPer: "/ 월",
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
    unlimitedPriceMonthly: "$49",
    unlimitedPriceYearly: "$39",
    unlimitedPer: "/ 월",
    unlimitedFeatures: [
      "Pro의 모든 기능",
      "팀 협업",
      "SAML / SSO",
      "관리자 제어 & 감사 로그",
      "맞춤 계약",
      "전담 지원 & 온보딩",
    ],
    unlimitedCta: "Unlimited 시작",

    bottomText: "현재 사용 중인 개발자들",

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

export default function PricingPage() {
  const { lang, toggleLang } = useLangStore();
  const t = translations[lang];
  const [yearly, setYearly] = useState(true);

  const cardsSection = useInView(0.1);
  const bottomSection = useInView();

  return (
    <div className="min-h-screen bg-[#0B0E11] selection:bg-white selection:text-[#0B0E11]">
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
      <LandingNav dark activePath="/pricing" />

      {/* 히어로 */}
      <section className="relative z-10 pt-36 pb-6 lg:pt-44 lg:pb-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
          <h1 className="animate-fade-in-up text-[40px] font-light leading-[1.15] tracking-[-0.03em] sm:text-[52px] lg:text-[64px]">
            <span className="text-[#999]">{t.heroTitle1}</span>
            <br />
            <span className="text-[#C5B882]">{t.heroTitle2}</span>
          </h1>
        </div>
      </section>

      {/* 가격 카드 */}
      <section ref={cardsSection.ref} className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-16 py-16 lg:py-24">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-[#1E2228] sm:grid-cols-3">
          {/* Starter */}
          <div className={`flex flex-col bg-[#0B0E11] p-10 lg:p-12 transition-all duration-700 ${cardsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex-1">
              <h3 className="text-[22px] font-medium text-white">{t.starterName}</h3>
              <p className="mt-1.5 text-[32px] font-light text-white">{t.starterPrice}</p>
              <p className="mt-4 text-[14px] text-[#C5B882]">{t.starterTagline}</p>

              <ul className="mt-10 space-y-4">
                {t.starterFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 text-[#C5B882]" />
                    <span className="text-[16px] text-[#999]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-14">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-lg bg-[#1E2228] px-6 py-3 text-[15px] font-medium text-white transition-all hover:bg-[#2A2F36] active:scale-[0.98]"
              >
                {t.starterCta}
              </Link>
            </div>
          </div>

          {/* Pro */}
          <div className={`flex flex-col border-x border-[#1E2228] bg-[#0B0E11] p-10 lg:p-12 transition-all duration-700 delay-150 ${cardsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex-1">
              <h3 className="text-[22px] font-medium text-white">{t.proName}</h3>
              <div className="mt-1.5 flex items-baseline gap-2.5">
                {yearly ? (
                  <>
                    <span className="text-[16px] text-[#555] line-through">{t.proPriceMonthly}</span>
                    <span className="text-[32px] font-light text-white">{t.proPriceYearly}</span>
                  </>
                ) : (
                  <span className="text-[32px] font-light text-white">{t.proPriceMonthly}</span>
                )}
                <span className="text-[15px] text-[#555]">{t.proPer}</span>
              </div>

              {/* 연간/월간 토글 */}
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={() => setYearly(!yearly)}
                  className={`relative h-6 w-10 rounded-full transition-colors ${yearly ? "bg-[#6B8AFF]" : "bg-[#333]"}`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${yearly ? "left-[18px]" : "left-0.5"}`}
                  />
                </button>
                <span className="text-[14px] text-[#666]">
                  {t.yearly} ({t.yearlySave})
                </span>
              </div>

              <ul className="mt-10 space-y-4">
                {t.proFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 text-[#C5B882]" />
                    <span className="text-[16px] text-[#999]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-14">
              <form action={createCheckout.bind(null, "pro")}>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-lg border border-[#C5B882]/30 bg-transparent px-6 py-3 text-[15px] font-medium text-[#C5B882] transition-all hover:bg-[#C5B882]/10 active:scale-[0.98]"
                >
                  {t.proCta}
                </button>
              </form>
            </div>
          </div>

          {/* Unlimited */}
          <div className={`flex flex-col bg-[#0B0E11] p-10 lg:p-12 transition-all duration-700 delay-300 ${cardsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex-1">
              <h3 className="text-[22px] font-medium text-white">{t.unlimitedName}</h3>
              <div className="mt-1.5 flex items-baseline gap-2.5">
                {yearly ? (
                  <>
                    <span className="text-[16px] text-[#555] line-through">{t.unlimitedPriceMonthly}</span>
                    <span className="text-[32px] font-light text-white">{t.unlimitedPriceYearly}</span>
                  </>
                ) : (
                  <span className="text-[32px] font-light text-white">{t.unlimitedPriceMonthly}</span>
                )}
                <span className="text-[15px] text-[#555]">{t.unlimitedPer}</span>
              </div>

              <ul className="mt-10 space-y-4">
                {t.unlimitedFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 text-[#C5B882]" />
                    <span className="text-[16px] text-[#999]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-14">
              <form action={createCheckout.bind(null, "unlimited")}>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-lg bg-[#1E2228] px-6 py-3 text-[15px] font-medium text-white transition-all hover:bg-[#2A2F36] active:scale-[0.98]"
                >
                  {t.unlimitedCta}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 하단 로고 스트립 */}
      <section ref={bottomSection.ref} className="relative z-10 border-t border-[#1E2228]">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-16 lg:py-20">
          <p className={`text-center text-[13px] text-[#555] transition-all duration-700 ${bottomSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {t.bottomText}
          </p>
          <div className={`mt-8 flex items-center justify-center gap-x-10 sm:gap-x-14 lg:gap-x-20 transition-all duration-700 delay-200 ${bottomSection.inView ? "opacity-100" : "opacity-0"}`}>
            {[
              { name: "Vercel", style: "font-sans font-semibold tracking-tight" },
              { name: "Figma", style: "font-sans font-bold" },
              { name: "GitHub", style: "font-mono font-semibold" },
              { name: "Supabase", style: "font-mono font-medium" },
              { name: "Linear", style: "font-sans font-semibold" },
            ].map((item) => (
              <span
                key={item.name}
                className={`text-[16px] text-[#333] transition-colors hover:text-[#666] sm:text-[18px] ${item.style}`}
              >
                {item.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="relative z-10">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-16 pb-8">
          <div className="h-px w-full bg-[#1E2228]" />
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-white">
                <Blend className="h-2.5 w-2.5 text-[#0B0E11]" />
              </div>
              <span className="text-[12px] text-[#333]">Meld</span>
            </div>
            <p className="font-mono text-[11px] text-[#333]">{t.footerTagline}</p>
          </div>
        </div>
      </footer>

      {/* 언어 토글 */}
      <button
        onClick={toggleLang}
        className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#1E2228] text-[12px] font-semibold text-white shadow-lg ring-1 ring-white/[0.06] transition-all hover:scale-105 hover:bg-[#2A2F36] active:scale-95"
      >
        {lang === "en" ? "KO" : "EN"}
      </button>
    </div>
  );
}
