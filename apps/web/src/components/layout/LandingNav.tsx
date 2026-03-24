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
    { href: "/docs", label: "Docs" },
    { href: "/github", label: "GitHub" },
    { href: "/download", label: lang === "ko" ? "다운로드" : "Download" },
    { href: "/pricing", label: lang === "ko" ? "가격" : "Pricing" },
  ];

  const navBg = dark ? "bg-[#0B0E11]/80" : "bg-white/80";
  const logoBg = dark ? "bg-white" : "bg-[#1A1A1A]";
  const logoIcon = dark ? "text-[#0B0E11]" : "text-white";
  const logoText = dark ? "text-white" : "text-[#1A1A1A]";
  const linkColor = dark ? "text-[#555] hover:text-white" : "text-[#999] hover:text-[#1A1A1A]";
  const activeColor = dark ? "font-medium text-white" : "font-medium text-[#1A1A1A]";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${navBg} backdrop-blur-xl`}>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 lg:px-16 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-md ${logoBg}`}>
            <Blend className={`h-3.5 w-3.5 ${logoIcon}`} />
          </div>
          <span className={`text-[16px] font-semibold ${logoText}`}>Meld</span>
        </Link>
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
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#F5F0E8] px-5 py-2 text-[15px] font-semibold text-[#1A1A1A] transition-colors hover:bg-[#EDE7DB]"
          >
            {lang === "ko" ? "시작하기" : "Get Started"}
          </Link>
        </div>
      </div>
    </nav>
  );
}
