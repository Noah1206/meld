"use client";

import Link from "next/link";
import { ArrowLeft, Blend } from "lucide-react";

interface WorkspaceLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  onBack?: () => void;
  projectName?: string;
  headerActions?: React.ReactNode;
}

export function WorkspaceLayout({
  leftPanel,
  rightPanel,
  onBack,
  projectName,
  headerActions,
}: WorkspaceLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-[#EEEEEC]">
      {/* Header */}
      <header className="flex h-11 items-center justify-between bg-white px-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-[13px] text-[#787774] transition-colors hover:text-[#1A1A1A]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">뒤로</span>
            </button>
          )}
          {onBack && <div className="h-4 w-px bg-[#E0E0DC]" />}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1A1A1A]">
                <Blend className="h-3 w-3 text-white" />
              </div>
            </Link>
            <h1 className="text-[14px] font-semibold text-[#1A1A1A]">
              {projectName || "FigmaCodeBridge"}
            </h1>
            <span className="rounded-md bg-[#F7F7F5] px-2 py-0.5 text-[10px] font-medium text-[#B4B4B0]">
              Beta
            </span>
          </div>
        </div>

        {headerActions && (
          <div className="flex items-center gap-2">{headerActions}</div>
        )}
      </header>

      {/* Main Content: 2-Panel */}
      <div className="flex flex-1 gap-[3px] overflow-hidden p-[3px] pt-0">
        {/* Left Panel */}
        <main className="animate-fade-in flex-1 overflow-hidden rounded-b-lg bg-white">
          {leftPanel}
        </main>

        {/* Right Panel */}
        <aside className="animate-slide-in-right flex w-[380px] flex-shrink-0 flex-col rounded-b-lg bg-[#F7F7F5]">
          {rightPanel}
        </aside>
      </div>
    </div>
  );
}
