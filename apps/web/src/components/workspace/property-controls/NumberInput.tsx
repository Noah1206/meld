"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface NumberInputProps {
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  placeholder?: string;
}

export function NumberInput({
  value,
  unit = "px",
  min = 0,
  max = 9999,
  step = 1,
  onChange,
  placeholder,
}: NumberInputProps) {
  // `draftValue` holds the in-flight text while the user drags or types.
  // When idle (no drag, no focus) we show the prop directly so external
  // updates always win without needing a setState-in-effect reset.
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const localValue = draftValue ?? String(value);
  const setLocalValue = setDraftValue;

  const clamp = useCallback(
    (v: number) => Math.max(min, Math.min(max, Math.round(v / step) * step)),
    [min, max, step],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isFocused) return;
      e.preventDefault();
      setIsDragging(true);
      startY.current = e.clientY;
      startValue.current = value;
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    },
    [value, isFocused],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      const delta = startY.current - e.clientY;
      const sensitivity = e.shiftKey ? 0.1 : e.altKey ? 10 : 1;
      const newValue = clamp(startValue.current + delta * sensitivity);
      setLocalValue(String(newValue));
      onChange(newValue);
    };

    const handleUp = () => {
      setIsDragging(false);
      setDraftValue(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, clamp, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed)) {
      onChange(clamp(parsed));
    }
    setDraftValue(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newVal = clamp(value + step);
      onChange(newVal);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newVal = clamp(value - step);
      onChange(newVal);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={localValue}
        placeholder={placeholder}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        className={`no-hover-fill w-[56px] rounded-md border border-[#3A3A3A] bg-[#252525] px-2 py-1.5 text-right font-mono text-[11px] text-[#E8E8E5] outline-none transition-all focus:border-blue-500/50 focus:bg-[#2A2A2A] focus:ring-1 focus:ring-blue-500/20 ${
          !isFocused ? "cursor-ns-resize hover:border-[#555]" : ""
        }`}
      />
      {unit && <span className="min-w-[16px] text-[10px] text-[#666]">{unit}</span>}
    </div>
  );
}
