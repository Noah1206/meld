"use client";

import { useRef } from "react";
import { Monitor, Loader2, MousePointer2, Keyboard, ScrollText, Eye } from "lucide-react";

interface ScreenFrame {
  timestamp: number;
  screenshot: string; // base64 JPEG
  url: string;
  title: string;
  cursor?: { x: number; y: number };
  action?: string;
}

interface VMScreenViewerProps {
  /** WebSocket connection to receive frames */
  onMessage?: (handler: (frame: ScreenFrame) => void) => () => void;
  /** Latest frame from parent */
  latestFrame?: ScreenFrame | null;
  /** Whether VM is running */
  isRunning?: boolean;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  clicking: <MousePointer2 className="h-3 w-3" />,
  typing: <Keyboard className="h-3 w-3" />,
  scrolled: <ScrollText className="h-3 w-3" />,
  navigated: <Eye className="h-3 w-3" />,
};

export function VMScreenViewer({ latestFrame, isRunning = false }: VMScreenViewerProps) {
  // Derive both values directly from the prop — no reducer state needed.
  const frame: ScreenFrame | null =
    latestFrame && latestFrame.screenshot ? latestFrame : null;
  const cursorPos = latestFrame?.cursor ?? null;
  const canvasRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!isRunning) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#0B0B0B]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A1A1A] ring-1 ring-white/[0.06]">
          <Monitor className="h-7 w-7 text-[#444]" />
        </div>
        <p className="mt-4 text-[13px] font-medium text-[#666]">AI Computer</p>
        <p className="mt-1 text-[11px] text-[#444]">AI&apos;s virtual computer is not running</p>
        <p className="mt-3 text-[10px] text-[#333]">Start a task to activate</p>
      </div>
    );
  }

  if (!frame) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#0B0B0B]">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-[#1A1A1A] ring-1 ring-blue-500/20" />
          <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-blue-500" />
        </div>
        <p className="mt-4 text-[12px] text-[#666]">Connecting to VM...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="animate-content-reveal relative h-full bg-[#0A0A0A]">
      {/* Screen content */}
      <div className="relative h-full overflow-hidden">
        {/* The actual screen */}
        <img
          ref={canvasRef}
          src={`data:image/jpeg;base64,${frame.screenshot}`}
          alt="VM Screen"
          className="h-full w-full object-contain"
          draggable={false}
        />

        {/* AI Cursor overlay */}
        {cursorPos && (
          <div
            className="pointer-events-none absolute z-10 transition-all duration-150"
            style={{
              left: `${(cursorPos.x / 1280) * 100}%`,
              top: `${(cursorPos.y / 720) * 100}%`,
              transform: "translate(-2px, -2px)",
            }}
          >
            {/* Cursor icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" className="drop-shadow-lg">
              <path
                d="M5 3l14 14-6.5-1.5L9 22l-2-7L3 17z"
                fill="#3B82F6"
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            {/* Click ripple effect */}
            {frame.action === "clicking" && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="h-6 w-6 animate-ping rounded-full bg-blue-500/40" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/80 px-3 py-1.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-[10px] font-medium text-red-400">LIVE</span>
          </div>

          {/* Current action */}
          {frame.action && (
            <div className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
              {ACTION_ICONS[frame.action] || null}
              {frame.action}
            </div>
          )}
        </div>

        {/* URL */}
        <div className="flex items-center gap-2">
          <span className="max-w-[300px] truncate font-mono text-[10px] text-white/50">
            {frame.url !== "about:blank" ? frame.url : ""}
          </span>
          {frame.title && (
            <span className="text-[10px] text-white/30">
              {frame.title}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
