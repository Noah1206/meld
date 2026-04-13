"use client";

import { useState, useRef, useEffect } from "react";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const PRESETS = [
  "#000000", "#FFFFFF", "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280", "#1A1A1A", "#F7F7F5",
];

function rgbToHex(rgb: string): string {
  if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return "#FFFFFF";
  if (rgb.startsWith("#")) return rgb.length === 4
    ? `#${rgb[1]}${rgb[1]}${rgb[2]}${rgb[2]}${rgb[3]}${rgb[3]}`
    : rgb;
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return "#000000";
  return "#" + match.slice(0, 3).map((x) => parseInt(x).toString(16).padStart(2, "0")).join("");
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hex, setHex] = useState(rgbToHex(value));
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHex(rgbToHex(value));
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="no-hover-fill flex items-center gap-2 rounded-md border border-[#3A3A3A] bg-[#252525] px-2 py-1.5 transition-all hover:border-[#555]"
      >
        <div
          className="h-4 w-4 rounded-[4px] ring-1 ring-white/10"
          style={{ backgroundColor: value }}
        />
        <span className="font-mono text-[11px] text-[#999]">{hex.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="animate-pop-in absolute right-0 top-full z-50 mt-1.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 shadow-2xl shadow-black/40"
          style={{ width: 224 }}
        >
          {label && (
            <div className="mb-2 text-[10px] font-medium text-[#888]">{label}</div>
          )}
          <input
            type="color"
            value={hex}
            onChange={(e) => {
              setHex(e.target.value);
              onChange(e.target.value);
            }}
            className="no-hover-fill mb-2.5 h-9 w-full cursor-pointer rounded-lg border-none bg-transparent"
          />
          <div className="grid grid-cols-6 gap-1.5">
            {PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  setHex(color);
                  onChange(color);
                }}
                className="no-hover-fill h-7 w-7 rounded-lg ring-1 ring-white/10 transition-all hover:scale-110 hover:ring-white/25"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[10px] text-[#555]">HEX</span>
            <input
              type="text"
              value={hex}
              onChange={(e) => {
                const v = e.target.value;
                setHex(v);
                if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
                  onChange(v);
                }
              }}
              className="no-hover-fill flex-1 rounded-md border border-[#3A3A3A] bg-[#252525] px-2 py-1.5 font-mono text-[11px] text-white outline-none transition-all focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
