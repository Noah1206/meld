"use client";

import { useState, useRef, useEffect } from "react";
import { useLangStore } from "@/lib/store/lang-store";
import Link from "next/link";
import { Blend, Check, ArrowRight } from "lucide-react";

const translations = {
  en: {
    // Nav
    navDocs: "Docs",
    navGitHub: "GitHub",
    navDownload: "Download",
    navPricing: "Pricing",
    navCta: "Get Started",

    // Hero
    heroTitle1: "choose your plan",
    heroTitle2: "design incredible",

    // Toggle
    yearly: "yearly billing",
    yearlySave: "save 20%",

    // Free
    freeName: "Free",
    freePrice: "$0",
    freeTagline: "design, share, ship",
    freeFeatures: [
      "100/week AI code edits",
      "3 projects",
      "GitHub push (public repos)",
      "Community support",
    ],
    freeCta: "get started",

    // Pro
    proName: "Pro",
    proPriceMonthly: "$20",
    proPriceYearly: "$16",
    proPer: "per user/month",
    proFeatures: [
      "Unlimited AI code edits",
      "Unlimited projects",
      "GitHub push (all repos)",
      "Priority AI models",
      "Design change tracking",
      "Team collaboration",
      "Priority support",
    ],
    proCta: "get Meld Pro",

    // Org
    orgName: "Organizations",
    orgPrice: "—",
    orgTagline: "coming soon",
    orgFeatures: [
      "Everything in Pro",
      "SAML / SSO",
      "Admin controls",
      "Custom contracts",
      "Dedicated support",
      "Priority onboarding",
    ],
    orgCta: "contact us",

    // Bottom
    bottomText: "used in production by developers at",

    // Footer
    footerTagline: "Design to Code, seamlessly.",
  },
  ko: {
    navDocs: "Docs",
    navGitHub: "GitHub",
    navDownload: "다운로드",
    navPricing: "가격",
    navCta: "시작하기",

    heroTitle1: "플랜을 선택하세요",
    heroTitle2: "놀라운 디자인을",

    yearly: "연간 결제",
    yearlySave: "20% 할인",

    freeName: "Free",
    freePrice: "$0",
    freeTagline: "디자인, 공유, 배포",
    freeFeatures: [
      "주 100회 AI 코드 수정",
      "3개 프로젝트",
      "GitHub 푸시 (공개 레포)",
      "커뮤니티 지원",
    ],
    freeCta: "시작하기",

    proName: "Pro",
    proPriceMonthly: "$20",
    proPriceYearly: "$16",
    proPer: "유저/월",
    proFeatures: [
      "무제한 AI 코드 수정",
      "무제한 프로젝트",
      "GitHub 푸시 (모든 레포)",
      "우선 AI 모델",
      "디자인 변경 추적",
      "팀 협업",
      "우선 지원",
    ],
    proCta: "Meld Pro 시작",

    orgName: "Organizations",
    orgPrice: "—",
    orgTagline: "출시 예정",
    orgFeatures: [
      "Pro의 모든 기능",
      "SAML / SSO",
      "관리자 제어",
      "맞춤 계약",
      "전담 지원",
      "우선 온보딩",
    ],
    orgCta: "문의하기",

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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0E11]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 lg:px-16 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white">
              <Blend className="h-3 w-3 text-[#0B0E11]" />
            </div>
            <span className="text-[14px] font-semibold text-white">Meld</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="text-[13px] text-[#555] transition-colors hover:text-white">
              {t.navDocs}
            </Link>
            <Link href="/github" className="text-[13px] text-[#555] transition-colors hover:text-white">
              {t.navGitHub}
            </Link>
            <Link href="/download" className="text-[13px] text-[#555] transition-colors hover:text-white">
              {t.navDownload}
            </Link>
            <Link href="/pricing" className="text-[13px] font-medium text-white">
              {t.navPricing}
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-[#F5F0E8] px-4 py-1.5 text-[13px] font-semibold text-[#1A1A1A] transition-colors hover:bg-[#EDE7DB]"
            >
              {t.navCta}
            </Link>
          </div>
        </div>
      </nav>

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
          {/* Free */}
          <div className={`flex flex-col bg-[#0B0E11] p-8 lg:p-10 transition-all duration-700 ${cardsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex-1">
              <h3 className="text-[20px] font-medium text-white">{t.freeName}</h3>
              <p className="mt-1 text-[28px] font-light text-white">{t.freePrice}</p>
              <p className="mt-3 text-[13px] text-[#C5B882]">{t.freeTagline}</p>

              <ul className="mt-8 space-y-3.5">
                {t.freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C5B882]" />
                    <span className="text-[14px] text-[#999]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-lg bg-[#1E2228] px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-[#2A2F36] active:scale-[0.98]"
              >
                {t.freeCta}
              </Link>
            </div>
          </div>

          {/* Pro */}
          <div className={`flex flex-col border-x border-[#1E2228] bg-[#0B0E11] p-8 lg:p-10 transition-all duration-700 delay-150 ${cardsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex-1">
              <h3 className="text-[20px] font-medium text-white">{t.proName}</h3>
              <div className="mt-1 flex items-baseline gap-2">
                {yearly ? (
                  <>
                    <span className="text-[14px] text-[#555] line-through">{t.proPriceMonthly}</span>
                    <span className="text-[28px] font-light text-white">{t.proPriceYearly}</span>
                  </>
                ) : (
                  <span className="text-[28px] font-light text-white">{t.proPriceMonthly}</span>
                )}
                <span className="text-[13px] text-[#555]">{t.proPer}</span>
              </div>

              {/* 연간/월간 토글 */}
              <div className="mt-4 flex items-center gap-2.5">
                <button
                  onClick={() => setYearly(!yearly)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${yearly ? "bg-[#6B8AFF]" : "bg-[#333]"}`}
                >
                  <div
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${yearly ? "left-[18px]" : "left-0.5"}`}
                  />
                </button>
                <span className="text-[12px] text-[#666]">
                  {t.yearly} ({t.yearlySave})
                </span>
              </div>

              <ul className="mt-8 space-y-3.5">
                {t.proFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C5B882]" />
                    <span className="text-[14px] text-[#999]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-lg border border-[#C5B882]/30 bg-transparent px-5 py-2.5 text-[13px] font-medium text-[#C5B882] transition-all hover:bg-[#C5B882]/10 active:scale-[0.98]"
              >
                {t.proCta}
              </Link>
            </div>
          </div>

          {/* Organizations */}
          <div className={`flex flex-col bg-[#0B0E11] p-8 lg:p-10 transition-all duration-700 delay-300 ${cardsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex-1">
              <h3 className="text-[20px] font-medium text-white">{t.orgName}</h3>
              <p className="mt-1 text-[28px] font-light text-white">{t.orgPrice}</p>
              <p className="mt-3 text-[13px] text-[#C5B882]">{t.orgTagline}</p>

              <ul className="mt-8 space-y-3.5">
                {t.orgFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C5B882]" />
                    <span className="text-[14px] text-[#999]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12">
              <Link
                href="/community"
                className="inline-flex items-center rounded-lg bg-[#1E2228] px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-[#2A2F36] active:scale-[0.98]"
              >
                {t.orgCta}
              </Link>
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
