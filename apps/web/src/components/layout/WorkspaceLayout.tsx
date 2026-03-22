"use client";

import { ArrowLeft } from "lucide-react";

/**
 * 2-Panel 워크스페이스 레이아웃
 *
 * ┌────────────────────────────────────────────────────┐
 * │ Header: [← 뒤로] ProjectName [Beta]  [headerActions] │
 * ├────────────────────────────┬───────────────────────┤
 * │ 좌측 (flex-1)              │ 우측 (w-[420px])      │
 * │ FigmaPanel                │ ChatPanel             │
 * └────────────────────────────┴───────────────────────┘
 */

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
    <div className="flex h-screen flex-col bg-[#F8F9FA]">
      {/* Header */}
      <header className="flex h-12 items-center justify-between border-b border-[#E5E7EB] bg-white px-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-[#6B7280] transition-colors hover:text-[#1C1C1C]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">뒤로</span>
            </button>
          )}
          {onBack && <div className="h-4 w-px bg-[#E5E7EB]" />}
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-[#1C1C1C]">
              {projectName || "FigmaCodeBridge"}
            </h1>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-[#2E86C1]">
              Beta
            </span>
          </div>
        </div>

        {headerActions && (
          <div className="flex items-center gap-2">{headerActions}</div>
        )}
      </header>

      {/* Main Content: 2-Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Figma Viewer */}
        <main className="animate-fade-in flex-1 overflow-hidden">
          {leftPanel}
        </main>

        {/* Right Panel - Chat + Tabs */}
        <aside className="animate-slide-in-right flex w-[420px] flex-shrink-0 flex-col border-l border-[#E5E7EB] bg-white">
          {rightPanel}
        </aside>
      </div>
    </div>
  );
}
