"use client";

import Link from "next/link";
import { ArrowLeft, Blend } from "lucide-react";
import { usePlatform } from "@/lib/hooks/usePlatform";

interface WorkspaceLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  onBack?: () => void;
  projectName?: string;
  headerActions?: React.ReactNode;
  sidebarSide?: "left" | "right";
}

export function WorkspaceLayout({
  leftPanel,
  rightPanel,
  onBack,
  projectName,
  headerActions,
  sidebarSide = "right",
}: WorkspaceLayoutProps) {
  const platform = usePlatform();
  return (
    <div className="flex h-screen flex-col bg-[#F7F7F5]">
      {/* Header */}
      <header
        className={`flex h-12 items-center justify-between border-b border-[#E0E0DC] bg-white px-4 ${platform === "desktop" ? "pl-20" : ""}`}
        style={platform === "desktop" ? { WebkitAppRegion: "drag" } as React.CSSProperties : undefined}
      >
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-[15px] text-[#787774] transition-colors hover:text-[#1A1A1A]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">뒤로</span>
            </button>
          )}
          {onBack && <div className="h-4 w-px bg-[#E0E0DC]" />}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
                <Blend className="h-3.5 w-3.5 text-white" />
              </div>
            </Link>
            <h1 className="text-[16px] font-semibold text-[#1A1A1A]">
              {projectName || "Meld"}
            </h1>
            <span className="rounded-md border border-[#E0E0DC] px-1.5 py-0.5 text-[9px] font-medium text-[#B4B4B0]">
              Beta
            </span>
          </div>
        </div>

        {headerActions && (
          <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>{headerActions}</div>
        )}
      </header>

      {/* Main Content: 2-Panel */}
      <div className="flex flex-1 gap-2 overflow-hidden p-2 pt-0">
        {sidebarSide === "left" ? (
          <>
            {/* Sidebar (left) */}
            <aside className="animate-fade-in flex w-[400px] flex-shrink-0 flex-col rounded-b-lg bg-[#F7F7F5]">
              {leftPanel}
            </aside>
            {/* Main (right) */}
            <main className="animate-slide-in-right flex-1 overflow-hidden rounded-b-lg bg-white">
              {rightPanel}
            </main>
          </>
        ) : (
          <>
            {/* Main (left) */}
            <main className="animate-fade-in flex-1 overflow-hidden rounded-b-lg bg-white">
              {leftPanel}
            </main>
            {/* Sidebar (right) */}
            <aside className="animate-slide-in-right flex w-[420px] flex-shrink-0 flex-col rounded-b-lg bg-[#F7F7F5]">
              {rightPanel}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
