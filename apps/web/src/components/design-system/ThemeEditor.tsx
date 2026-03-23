"use client";

import { useState } from "react";
import { Sun, Moon, Type, ChevronDown } from "lucide-react";
import { useDesignSystemStore } from "@/lib/store/design-system-store";
import { COLOR_PRESETS, isLightColor } from "@/lib/design-system/palette";
import type { PresetName } from "@/lib/design-system/palette";
import type { ColorShades } from "@/lib/design-system/palette";

const FONT_OPTIONS = [
  "Inter", "Pretendard", "Noto Sans KR", "Roboto", "Poppins",
  "IBM Plex Sans", "Geist", "Plus Jakarta Sans", "DM Sans",
  "Spoqa Han Sans Neo", "Montserrat", "Lato", "Source Sans 3",
];

const SCALE_OPTIONS = [
  { value: 1.125, label: "1.125 — Major Second" },
  { value: 1.2, label: "1.200 — Minor Third" },
  { value: 1.25, label: "1.250 — Major Third" },
  { value: 1.333, label: "1.333 — Perfect Fourth" },
  { value: 1.5, label: "1.500 — Perfect Fifth" },
];

function ColorSwatchRow({ label, shades, seedHex, onChangeSeed }: {
  label: string;
  shades: ColorShades;
  seedHex: string;
  onChangeSeed: (hex: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(seedHex);

  const handleSubmit = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(inputVal)) {
      onChangeSeed(inputVal);
    }
    setEditing(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-[#1A1A1A]">{label}</span>
        {editing ? (
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-24 rounded border border-[#EEEEEC] bg-[#F7F7F5] px-2 py-0.5 text-center font-mono text-[11px] text-[#1A1A1A] focus:border-[#2E86C1] focus:outline-none"
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setInputVal(seedHex); setEditing(true); }}
            className="flex items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-2 py-1 transition-colors hover:bg-[#EEEEEC]"
          >
            <div
              className="h-4 w-4 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: seedHex }}
            />
            <span className="font-mono text-[11px] text-[#787774]">{seedHex.toUpperCase()}</span>
          </button>
        )}
      </div>

      {/* 10단계 팔레트 미리보기 */}
      <div className="flex gap-0.5 overflow-hidden rounded-lg">
        {(Object.entries(shades) as [string, string][]).map(([step, hex]) => (
          <div
            key={step}
            className="group relative flex-1 cursor-default"
            style={{ backgroundColor: hex, height: 32 }}
            title={`${step}: ${hex}`}
          >
            <span
              className={`absolute inset-0 flex items-center justify-center text-[8px] font-medium opacity-0 transition-opacity group-hover:opacity-100 ${
                isLightColor(hex) ? "text-black/60" : "text-white/80"
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThemeEditor() {
  const {
    current,
    updateMode,
    updateSeedColor,
    updateSecondaryColor,
    updateTertiaryColor,
    updateTypography,
  } = useDesignSystemStore();
  const [showFonts, setShowFonts] = useState(false);

  if (!current) return null;

  const { mode, colors, typography } = current;

  return (
    <div className="space-y-6 p-4">
      {/* Mode */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#B4B4B0]">
          Mode
        </label>
        <div className="flex gap-2">
          {[
            { value: "light" as const, icon: Sun, label: "Light" },
            { value: "dark" as const, icon: Moon, label: "Dark" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateMode(opt.value)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-medium transition-all ${
                mode === opt.value
                  ? "bg-[#1A1A1A] text-white shadow-sm"
                  : "bg-[#F7F7F5] text-[#787774] hover:bg-[#EEEEEC]"
              }`}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seed Color */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#B4B4B0]">
          Seed Color
        </label>
        <div className="flex items-center gap-3">
          <label className="relative cursor-pointer">
            <div
              className="h-10 w-10 rounded-xl ring-2 ring-black/10 transition-shadow hover:ring-black/20"
              style={{ backgroundColor: colors.seedColor }}
            />
            <input
              type="color"
              value={colors.seedColor}
              onChange={(e) => updateSeedColor(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <span className="font-mono text-[13px] font-medium text-[#1A1A1A]">
            {colors.seedColor.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Color Theme 프리셋 */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#B4B4B0]">
          Color Theme
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(COLOR_PRESETS) as [PresetName, typeof COLOR_PRESETS[PresetName]][]).map(
            ([name, preset]) => (
              <button
                key={name}
                onClick={() => {
                  updateSeedColor(preset.primary);
                  updateSecondaryColor(preset.secondary);
                  updateTertiaryColor(preset.tertiary);
                }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-[#F7F7F5] p-2.5 transition-all hover:bg-[#EEEEEC] hover:ring-1 hover:ring-black/[0.06]"
              >
                <div className="flex gap-0.5">
                  {[preset.primary, preset.secondary, preset.tertiary].map((c, i) => (
                    <div
                      key={i}
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-medium capitalize text-[#787774]">{name}</span>
              </button>
            ),
          )}
        </div>
      </div>

      {/* Color Palette */}
      <div className="space-y-4">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#B4B4B0]">
          Color Palette
        </label>

        <ColorSwatchRow
          label="Primary"
          shades={colors.primary}
          seedHex={colors.seedColor}
          onChangeSeed={updateSeedColor}
        />
        <ColorSwatchRow
          label="Secondary"
          shades={colors.secondary}
          seedHex={colors.secondary[500]}
          onChangeSeed={updateSecondaryColor}
        />
        <ColorSwatchRow
          label="Tertiary"
          shades={colors.tertiary}
          seedHex={colors.tertiary[500]}
          onChangeSeed={updateTertiaryColor}
        />
      </div>

      {/* Typography */}
      <div className="space-y-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#B4B4B0]">
          Typography
        </label>

        {/* Font Family */}
        <div className="relative">
          <button
            onClick={() => setShowFonts(!showFonts)}
            className="flex w-full items-center gap-2 rounded-xl bg-[#F7F7F5] px-3 py-2.5 text-left transition-colors hover:bg-[#EEEEEC]"
          >
            <Type className="h-3.5 w-3.5 text-[#787774]" />
            <span className="flex-1 text-[12px] font-medium text-[#1A1A1A]">
              {typography.fontFamily}
            </span>
            <ChevronDown
              className={`h-3 w-3 text-[#B4B4B0] transition-transform ${showFonts ? "rotate-180" : ""}`}
            />
          </button>
          {showFonts && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-black/[0.06]">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font}
                  onClick={() => {
                    updateTypography({ fontFamily: font });
                    setShowFonts(false);
                  }}
                  className={`flex w-full items-center px-3 py-2 text-left text-[12px] transition-colors hover:bg-[#F7F7F5] ${
                    typography.fontFamily === font ? "bg-[#F7F7F5] font-medium" : ""
                  }`}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font Size + Scale */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="mb-1 block text-[10px] text-[#B4B4B0]">Base Size</span>
            <div className="flex items-center gap-1 rounded-lg bg-[#F7F7F5] px-3 py-2">
              <input
                type="number"
                value={typography.baseFontSize}
                onChange={(e) => updateTypography({ baseFontSize: Number(e.target.value) || 16 })}
                min={10}
                max={24}
                className="w-full bg-transparent text-[12px] font-medium text-[#1A1A1A] focus:outline-none"
              />
              <span className="text-[10px] text-[#B4B4B0]">px</span>
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[10px] text-[#B4B4B0]">Scale</span>
            <select
              value={typography.scale}
              onChange={(e) => updateTypography({ scale: Number(e.target.value) })}
              className="w-full rounded-lg bg-[#F7F7F5] px-3 py-2 text-[12px] font-medium text-[#1A1A1A] focus:outline-none"
            >
              {SCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 타이포그래피 프리뷰 */}
        <div className="space-y-1.5 rounded-xl bg-[#F7F7F5] p-3">
          {[
            { label: "H1", size: Math.round(typography.baseFontSize * Math.pow(typography.scale, 5)), weight: 700 },
            { label: "H2", size: Math.round(typography.baseFontSize * Math.pow(typography.scale, 3)), weight: 700 },
            { label: "H3", size: Math.round(typography.baseFontSize * Math.pow(typography.scale, 2)), weight: 600 },
            { label: "Body", size: typography.baseFontSize, weight: 400 },
            { label: "Small", size: Math.round(typography.baseFontSize / typography.scale), weight: 400 },
          ].map((t) => (
            <div key={t.label} className="flex items-baseline gap-3">
              <span className="w-10 text-right text-[9px] text-[#B4B4B0]">{t.label}</span>
              <span
                className="text-[#1A1A1A]"
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: Math.min(t.size, 28),
                  fontWeight: t.weight,
                  lineHeight: 1.3,
                }}
              >
                Aa
              </span>
              <span className="text-[9px] text-[#D4D4D0]">{t.size}px</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
