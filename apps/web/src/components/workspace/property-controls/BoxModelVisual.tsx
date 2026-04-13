"use client";

import { useCallback } from "react";

interface BoxModelVisualProps {
  padding: { top: number; right: number; bottom: number; left: number };
  margin: { top: number; right: number; bottom: number; left: number };
  onPaddingChange: (side: "top" | "right" | "bottom" | "left", value: number) => void;
  onMarginChange: (side: "top" | "right" | "bottom" | "left", value: number) => void;
}

function InlineNumberInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value) || 0;
      onChange(Math.max(0, v));
    },
    [onChange],
  );

  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={handleChange}
      className={`no-hover-fill w-8 bg-transparent text-center font-mono text-[10px] outline-none transition-colors focus:text-white ${className}`}
    />
  );
}

export function BoxModelVisual({
  padding,
  margin,
  onPaddingChange,
  onMarginChange,
}: BoxModelVisualProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Margin label */}
      <div className="text-[9px] font-medium uppercase tracking-wider text-[#666]">Margin</div>

      {/* Outer box (margin) */}
      <div className="relative flex flex-col items-center rounded-lg border border-dashed border-[#F97316]/30 bg-[#F97316]/5 px-2 py-1">
        {/* Margin top */}
        <InlineNumberInput
          value={margin.top}
          onChange={(v) => onMarginChange("top", v)}
          className="text-[#F97316]/70"
        />

        <div className="flex items-center gap-1">
          {/* Margin left */}
          <InlineNumberInput
            value={margin.left}
            onChange={(v) => onMarginChange("left", v)}
            className="text-[#F97316]/70"
          />

          {/* Inner box (padding) */}
          <div className="relative flex flex-col items-center rounded border border-dashed border-[#22C55E]/40 bg-[#22C55E]/5 px-2 py-1">
            {/* Padding label */}
            <div className="absolute -top-2 left-1 text-[8px] font-medium text-[#22C55E]/60">pad</div>

            {/* Padding top */}
            <InlineNumberInput
              value={padding.top}
              onChange={(v) => onPaddingChange("top", v)}
              className="text-[#22C55E]/70"
            />

            <div className="flex items-center gap-1">
              {/* Padding left */}
              <InlineNumberInput
                value={padding.left}
                onChange={(v) => onPaddingChange("left", v)}
                className="text-[#22C55E]/70"
              />

              {/* Content box */}
              <div className="flex h-6 w-10 items-center justify-center rounded bg-[#3B82F6]/10 text-[8px] text-[#3B82F6]/60">
                content
              </div>

              {/* Padding right */}
              <InlineNumberInput
                value={padding.right}
                onChange={(v) => onPaddingChange("right", v)}
                className="text-[#22C55E]/70"
              />
            </div>

            {/* Padding bottom */}
            <InlineNumberInput
              value={padding.bottom}
              onChange={(v) => onPaddingChange("bottom", v)}
              className="text-[#22C55E]/70"
            />
          </div>

          {/* Margin right */}
          <InlineNumberInput
            value={margin.right}
            onChange={(v) => onMarginChange("right", v)}
            className="text-[#F97316]/70"
          />
        </div>

        {/* Margin bottom */}
        <InlineNumberInput
          value={margin.bottom}
          onChange={(v) => onMarginChange("bottom", v)}
          className="text-[#F97316]/70"
        />
      </div>
    </div>
  );
}
