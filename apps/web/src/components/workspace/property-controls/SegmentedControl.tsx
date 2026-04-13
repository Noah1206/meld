"use client";

interface SegmentedControlProps {
  options: { value: string; label?: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="flex rounded-lg border border-[#3A3A3A] bg-[#1E1E1E] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`no-hover-fill flex-1 rounded-md px-2 py-1 text-center text-[10px] font-medium transition-all ${
            value === opt.value
              ? "bg-[#353535] text-white shadow-sm"
              : "text-[#777] hover:text-[#ccc]"
          }`}
          title={opt.value}
        >
          {opt.icon || opt.label || opt.value}
        </button>
      ))}
    </div>
  );
}
