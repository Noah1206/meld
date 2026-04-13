"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Blend } from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";

interface LandingNavProps {
  activePath?: string;
  onLogin?: () => void;
}

export function LandingNav({ activePath, onLogin }: LandingNavProps) {
  const { lang } = useLangStore();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div
        className={`mx-auto flex h-16 max-w-7xl items-center justify-between px-6 mt-2 transition-all duration-500 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
        }`}
      >
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.1] ring-1 ring-white/[0.08]">
              <Blend className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[24px] font-bold tracking-[-0.02em] text-white">Meld</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            <Link
              href="/pricing"
              className={`rounded-lg px-4 py-2 text-[16px] transition-colors ${
                activePath === "/pricing"
                  ? "text-white font-medium"
                  : "text-[#888] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {lang === "ko" ? "가격" : "Pricing"}
            </Link>
            <Link
              href="/download"
              className={`rounded-lg px-4 py-2 text-[16px] transition-colors ${
                activePath === "/download"
                  ? "text-white font-medium"
                  : "text-[#888] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {lang === "ko" ? "다운로드" : "Download"}
            </Link>
          </div>
        </div>

        {/* Right: Auth */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLogin}
            className="rounded-lg px-4 py-2 text-[16px] text-[#999] transition-colors hover:text-white hover:bg-white/[0.04]"
          >
            {lang === "ko" ? "로그인" : "Log in"}
          </button>
          <button
            onClick={onLogin}
            className="rounded-lg bg-white px-5 py-2 text-[15px] font-semibold text-[#0A0A0A] transition-all hover:bg-[#E8E8E5] active:scale-[0.97]"
          >
            {lang === "ko" ? "시작하기" : "Get started"}
          </button>
        </div>
      </div>
    </nav>
  );
}
