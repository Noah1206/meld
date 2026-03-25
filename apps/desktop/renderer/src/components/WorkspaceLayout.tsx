import { ArrowLeft } from "lucide-react";

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
    <div className="flex h-screen flex-col bg-[#F7F7F5]">
      {/* Header */}
      <header className="flex h-12 items-center justify-between border-b border-[#E0E0DC] bg-white px-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-[15px] text-[#787774] transition-colors hover:text-[#1A1A1A]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>뒤로</span>
            </button>
          )}
          {onBack && <div className="h-4 w-px bg-[#E0E0DC]" />}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <circle cx="9" cy="12" r="5.5" opacity="0.9"/>
                <circle cx="15" cy="12" r="5.5" opacity="0.9"/>
              </svg>
            </div>
            <h1 className="text-[16px] font-semibold text-[#1A1A1A]">
              {projectName || "Meld"}
            </h1>
            <span className="rounded-md border border-[#E0E0DC] px-1.5 py-0.5 text-[9px] font-medium text-[#B4B4B0]">
              Beta
            </span>
          </div>
        </div>
        {headerActions && (
          <div className="flex items-center gap-2">{headerActions}</div>
        )}
      </header>

      {/* Main Content: 2-Panel */}
      <div className="flex flex-1 gap-2 overflow-hidden p-2 pt-0">
        <main className="animate-fade-in flex-1 overflow-hidden rounded-b-lg bg-white">
          {leftPanel}
        </main>
        <aside className="flex w-[420px] flex-shrink-0 flex-col rounded-b-lg bg-[#F7F7F5]">
          {rightPanel}
        </aside>
      </div>
    </div>
  );
}
