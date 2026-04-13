"use client";

interface AlignButtonsProps {
  axis: "horizontal" | "vertical";
  value: string;
  onChange: (value: string) => void;
}

const HORIZONTAL_OPTIONS = [
  { value: "flex-start", label: "Left", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="4" x2="4" y2="20" /><rect x="8" y="6" width="12" height="4" /><rect x="8" y="14" width="8" height="4" />
    </svg>
  )},
  { value: "center", label: "Center", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="4" x2="12" y2="20" /><rect x="4" y="6" width="16" height="4" /><rect x="6" y="14" width="12" height="4" />
    </svg>
  )},
  { value: "flex-end", label: "Right", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="20" y1="4" x2="20" y2="20" /><rect x="4" y="6" width="12" height="4" /><rect x="8" y="14" width="8" height="4" />
    </svg>
  )},
  { value: "space-between", label: "Between", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="4" x2="4" y2="20" /><line x1="20" y1="4" x2="20" y2="20" /><rect x="8" y="8" width="3" height="8" /><rect x="13" y="8" width="3" height="8" />
    </svg>
  )},
  { value: "space-around", label: "Around", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="8" width="3" height="8" /><rect x="15" y="8" width="3" height="8" />
    </svg>
  )},
];

const VERTICAL_OPTIONS = [
  { value: "flex-start", label: "Top", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="4" x2="20" y2="4" /><rect x="6" y="8" width="4" height="12" /><rect x="14" y="8" width="4" height="8" />
    </svg>
  )},
  { value: "center", label: "Middle", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="12" x2="20" y2="12" /><rect x="6" y="4" width="4" height="16" /><rect x="14" y="6" width="4" height="12" />
    </svg>
  )},
  { value: "flex-end", label: "Bottom", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="20" x2="20" y2="20" /><rect x="6" y="4" width="4" height="12" /><rect x="14" y="8" width="4" height="8" />
    </svg>
  )},
  { value: "stretch", label: "Stretch", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="4" x2="20" y2="4" /><line x1="4" y1="20" x2="20" y2="20" /><rect x="8" y="4" width="3" height="16" /><rect x="13" y="4" width="3" height="16" />
    </svg>
  )},
];

export function AlignButtons({ axis, value, onChange }: AlignButtonsProps) {
  const options = axis === "horizontal" ? HORIZONTAL_OPTIONS : VERTICAL_OPTIONS;

  return (
    <div className="flex rounded-lg border border-[#3A3A3A] bg-[#1E1E1E] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.label}
          className={`no-hover-fill flex items-center justify-center rounded-md p-1.5 transition-all ${
            value === opt.value
              ? "bg-[#353535] text-white shadow-sm"
              : "text-[#666] hover:text-[#ccc]"
          }`}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
