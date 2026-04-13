"use client";

import { useState } from "react";
import { useLangStore } from "@/lib/store/lang-store";
import { LandingNav } from "@/components/layout/LandingNav";
import { Download, Terminal, Check, Copy, ArrowRight } from "lucide-react";
import Link from "next/link";

const APP_VERSION = "0.1.1";
const GITHUB_RELEASE_BASE = "https://github.com/Noah1206/meld/releases/download";
const PLATFORMS = {
  mac: { filename: `Meld-${APP_VERSION}.dmg`, ext: ".dmg", size: "~85 MB" },
  windows: { filename: `Meld-Setup-${APP_VERSION}.exe`, ext: ".exe", size: "~75 MB" },
} as const;
type Platform = keyof typeof PLATFORMS;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "mac";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  return "mac";
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(command); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="group flex w-full items-center gap-2.5 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2.5 text-left font-mono text-[13px] transition-all hover:border-[#3A3A3A] active:scale-[0.99]"
    >
      <Terminal className="h-3.5 w-3.5 text-[#555]" />
      <span className="flex-1 text-[#888]">{command}</span>
      {copied ? (
        <span className="flex items-center gap-1 text-[11px] text-[#C5B882]"><Check className="h-3 w-3" /> Copied</span>
      ) : (
        <Copy className="h-3.5 w-3.5 text-[#555] group-hover:text-[#888]" />
      )}
    </button>
  );
}

export default function DownloadPage() {
  const { lang } = useLangStore();
  // Lazy initializer reads user agent once on mount (client only).
  const [platform, setPlatform] = useState<Platform>(() =>
    typeof window === "undefined" ? "mac" : detectPlatform()
  );

  const getUrl = (p: Platform) => `${GITHUB_RELEASE_BASE}/v${APP_VERSION}/${PLATFORMS[p].filename}`;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <LandingNav activePath="/download" />

      <section className="pt-36 pb-20 lg:pt-48">
        <div className="max-w-2xl px-6 lg:ml-48 lg:px-16">
          <h1 className="text-[36px] font-bold tracking-tight text-white sm:text-[48px]">
            {lang === "ko" ? "다운로드" : "Download Meld"}
          </h1>
          <p className="mt-3 text-[17px] text-[#666]">
            {lang === "ko"
              ? "데스크톱 앱으로 더 빠르고 편리하게 사용하세요."
              : "Get the desktop app for the best experience."}
          </p>

          {/* OS 선택 탭 */}
          <div className="mt-10 inline-flex items-center gap-0 rounded-t-2xl bg-[#1A1A1A] p-1.5">
            {(["mac", "windows"] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`rounded-xl px-6 py-2.5 text-[14px] font-medium transition-all ${
                  p === platform
                    ? "bg-[#2A2A2A] text-white shadow-sm"
                    : "text-[#666] hover:text-[#999]"
                }`}
              >
                {p === "mac" ? "macOS" : "Windows"}
              </button>
            ))}
          </div>

          {/* 다운로드 카드 */}
          <div className="rounded-3xl rounded-tl-none border border-[#2A2A2A] bg-[#111111] p-8 lg:p-10">
            <a
              href={getUrl(platform)}
              className="group inline-flex items-center gap-3 rounded-2xl bg-white px-10 py-5 text-[17px] font-semibold text-[#0A0A0A] transition-all hover:bg-[#EEE] active:scale-[0.98]"
            >
              <Download className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
              {lang === "ko" ? "다운로드" : "Download"} ({PLATFORMS[platform].ext})
            </a>
            <span className="mt-4 block font-mono text-[13px] text-[#555]">
              v{APP_VERSION} · {PLATFORMS[platform].ext} · {PLATFORMS[platform].size}
            </span>

            {platform === "mac" && (
              <div className="mt-6">
                <p className="mb-3 text-[15px] font-medium text-[#666]">
                  {lang === "ko" ? "설치 후 터미널에서 실행하세요" : "After installing, run in Terminal"}
                </p>
                <CopyCommand command="xattr -cr /Applications/Meld.app" />
              </div>
            )}
          </div>

          <div className="mt-8">
            <Link
              href="/project/workspace"
              className="inline-flex items-center gap-2 text-[15px] text-[#666] transition-colors hover:text-white"
            >
              {lang === "ko" ? "또는 브라우저에서 사용" : "Or use in browser"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
