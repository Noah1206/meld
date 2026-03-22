"use client";

import { ArrowLeft, Save } from "lucide-react";

/**
 * 메인 3-Panel 워크스페이스 레이아웃
 *
 * ┌──────────┬───────────────────────┬──────────┐
 * │ 좌측패널  │      중앙 메인영역     │ 우측패널  │
 * │ (280px)  │    (flex-1, 가변)      │ (320px)  │
 * │          │                       │          │
 * │ NodeTree │   FigmaViewer         │ 속성패널  │
 * │          │                       │ Diff/Git │
 * ├──────────┴───────────────────────┴──────────┤
 * │ ChatInput (하단 고정, 전체 너비)              │
 * └─────────────────────────────────────────────┘
 */

interface WorkspaceLayoutProps {
  leftPanel: React.ReactNode;
  mainContent: React.ReactNode;
  rightPanel: React.ReactNode;
  bottomBar: React.ReactNode;
  onBack?: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  projectName?: string;
}

export function WorkspaceLayout({
  leftPanel,
  mainContent,
  rightPanel,
  bottomBar,
  onBack,
  onSave,
  saveDisabled,
  projectName,
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

        {onSave && (
          <button
            onClick={onSave}
            disabled={saveDisabled}
            className="flex items-center gap-1.5 rounded-lg bg-[#059669] px-3.5 py-1.5 text-sm font-medium text-white transition-all hover:bg-[#047857] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            저장
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Node Tree */}
        <aside className="animate-slide-in-left w-[280px] flex-shrink-0 overflow-y-auto border-r border-[#E5E7EB] bg-white">
          {leftPanel}
        </aside>

        {/* Center - Figma Viewer */}
        <main className="animate-fade-in animation-delay-75 flex-1 overflow-auto">
          {mainContent}
        </main>

        {/* Right Panel - Properties + Diff + Git */}
        <aside className="animate-slide-in-right w-[320px] flex-shrink-0 overflow-y-auto border-l border-[#E5E7EB] bg-white">
          {rightPanel}
        </aside>
      </div>

      {/* Bottom Bar - Chat Input */}
      <div className="border-t border-[#E5E7EB] bg-white">
        {bottomBar}
      </div>
    </div>
  );
}
