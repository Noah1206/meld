"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Blend } from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";

interface LandingNavProps {
  /** 다크 테마 (pricing 페이지 등) */
  dark?: boolean;
  /** 현재 활성 경로 */
  activePath?: string;
}

export function LandingNav({ dark = false, activePath }: LandingNavProps) {
  const { lang } = useLangStore();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // 입장 애니메이션 트리거
    const timer = setTimeout(() => setMounted(true), 100);

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const links = [
    { href: "/pricing", label: lang === "ko" ? "가격" : "Pricing" },
  ];

  // 다크 배경이거나 스크롤돼서 글래스가 뜨면 → 흰색, 밝은 배경이면 → 검은색
  const onDark = dark || scrolled;
  const logoText = onDark ? "text-white" : "text-[#1A1A1A]";
  const activeColor = onDark
    ? "font-medium text-white"
    : "font-medium text-[#1A1A1A]";
  const linkColor = onDark
    ? "text-white/50 hover:text-white"
    : "text-[#999] hover:text-[#1A1A1A]";
  const logoBg = onDark ? "bg-white/90" : "bg-[#1A1A1A]";
  const logoIcon = onDark ? "text-[#0B0E11]" : "text-white";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 pointer-events-none">
      <div
        className={`pointer-events-auto relative flex items-center gap-14 rounded-full px-8 py-3 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mounted
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 -translate-y-6 scale-95"
        } ${
          scrolled ? "shadow-2xl" : ""
        }`}
        style={{
          backdropFilter: scrolled ? "blur(40px) saturate(1.8)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(40px) saturate(1.8)" : "none",
        }}
      >
        {/* 글래스 배경 레이어 — 스크롤 시에만 등장 */}
        <div
          className="absolute inset-0 rounded-full transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(135deg, rgba(15,18,30,0.6) 0%, rgba(25,28,50,0.5) 40%, rgba(50,40,80,0.4) 100%)",
            opacity: scrolled ? 1 : 0,
          }}
        />

        {/* 테두리 글로우 — 스크롤 시에만 등장 */}
        <div
          className="absolute inset-0 rounded-full transition-opacity duration-500"
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.3)",
            opacity: scrolled ? 1 : 0,
          }}
        />

        {/* 빛 반사 하이라이트 (상단) — 스크롤 시에만 */}
        <div
          className="absolute inset-x-0 top-0 h-[1px] rounded-full transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.2) 50%, transparent 90%)",
            opacity: scrolled ? 1 : 0,
          }}
        />

        {/* 떠다니는 오로라 글로우 — 스크롤 시에만 */}
        <div
          className="absolute -inset-1 rounded-full transition-opacity duration-700"
          style={{
            background:
              "linear-gradient(135deg, rgba(100,130,255,0.15) 0%, rgba(160,100,255,0.1) 50%, rgba(200,170,100,0.1) 100%)",
            filter: "blur(20px)",
            opacity: scrolled ? 0.6 : 0,
            animation: "navAuroraShift 8s ease-in-out infinite",
          }}
        />

        {/* 로고 */}
        <Link
          href="/"
          className={`relative z-10 flex items-center gap-2.5 transition-all duration-700 delay-200 ${
            mounted
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-4"
          }`}
        >
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${logoBg} backdrop-blur-sm transition-all duration-500 hover:scale-110 hover:rotate-3`}>
            <Blend className={`h-3.5 w-3.5 ${logoIcon}`} />
          </div>
          <span className={`text-[17px] font-semibold transition-colors duration-500 ${logoText}`}>Meld</span>
        </Link>

        <div className="w-8" />

        {/* 링크 */}
        <div className="relative z-10 flex items-center gap-6">
          {links.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative text-[15px] transition-all duration-500 ${
                activePath === link.href ? activeColor : linkColor
              } ${
                mounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-3"
              }`}
              style={{
                transitionDelay: mounted ? `${300 + i * 80}ms` : "0ms",
              }}
            >
              {link.label}
              {/* 액티브 인디케이터 dot */}
              {activePath === link.href && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#C5B882]" />
              )}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className={`relative z-10 rounded-full bg-gradient-to-r from-[#C5B882] to-[#A89660] px-6 py-2 text-[14px] font-semibold text-[#0B0E11] transition-all duration-500 hover:shadow-[0_0_24px_rgba(197,184,130,0.4)] hover:scale-[1.03] active:scale-[0.97] ${
            mounted
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-4"
          }`}
          style={{
            transitionDelay: mounted ? "500ms" : "0ms",
          }}
        >
          {lang === "ko" ? "시작하기" : "Get Started"}
        </Link>
      </div>

      {/* 커스텀 키프레임 */}
      <style jsx>{`
        @keyframes navAuroraShift {
          0%, 100% {
            transform: translateX(0%) scale(1);
            opacity: 0.4;
          }
          33% {
            transform: translateX(3%) scale(1.02);
            opacity: 0.6;
          }
          66% {
            transform: translateX(-3%) scale(0.98);
            opacity: 0.5;
          }
        }
      `}</style>
    </nav>
  );
}
