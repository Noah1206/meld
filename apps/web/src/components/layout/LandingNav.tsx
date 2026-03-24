"use client";

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

  const links = [
    { href: "/github", label: "GitHub" },
    { href: "/download", label: lang === "ko" ? "다운로드" : "Download" },
    { href: "/pricing", label: lang === "ko" ? "가격" : "Pricing" },
  ];

  const linkColor = dark
    ? "text-white/60 hover:text-white"
    : "text-white/60 hover:text-white";
  const activeColor = "font-medium text-white";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4">
      <div
        className="flex items-center gap-8 rounded-full border border-white/[0.08] px-8 py-3"
        style={{
          background: dark
            ? "linear-gradient(135deg, rgba(15,18,25,0.85) 0%, rgba(30,34,50,0.75) 50%, rgba(60,50,90,0.65) 100%)"
            : "linear-gradient(135deg, rgba(15,18,25,0.85) 0%, rgba(30,34,50,0.75) 50%, rgba(60,50,90,0.65) 100%)",
          backdropFilter: "blur(24px) saturate(1.8)",
          WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
            <Blend className="h-3.5 w-3.5 text-[#0B0E11]" />
          </div>
          <span className="text-[17px] font-semibold text-white">Meld</span>
        </Link>

        {/* 링크 */}
        <div className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[15px] transition-colors ${
                activePath === link.href ? activeColor : linkColor
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="rounded-full bg-gradient-to-r from-[#C5B882] to-[#A89660] px-6 py-2 text-[14px] font-semibold text-[#0B0E11] transition-all hover:shadow-[0_0_20px_rgba(197,184,130,0.3)] active:scale-[0.97]"
        >
          {lang === "ko" ? "시작하기" : "Get Started"}
        </Link>
      </div>
    </nav>
  );
}
