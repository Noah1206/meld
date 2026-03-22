"use client";

import { useFigmaStore } from "@/lib/store/figma-store";

export function FrameSelector() {
  const { frames, activeFrameId, setActiveFrame } = useFigmaStore();

  if (frames.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 border-b border-[#E5E7EB] px-3 py-2 overflow-x-auto">
      {frames.map((frame) => (
        <button
          key={frame.nodeId}
          onClick={() => setActiveFrame(frame.nodeId)}
          className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 ${
            activeFrameId === frame.nodeId
              ? "bg-[#2E86C1] text-white shadow-sm"
              : "text-[#6B7280] hover:bg-[#F3F4F6]"
          }`}
        >
          {frame.name}
        </button>
      ))}
    </div>
  );
}
