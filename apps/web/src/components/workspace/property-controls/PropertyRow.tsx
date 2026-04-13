"use client";

interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
}

export function PropertyRow({ label, children }: PropertyRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-[52px] text-[10px] text-[#777]">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
