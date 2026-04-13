"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#2A2A2A]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="no-hover-fill flex w-full items-center gap-1.5 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#777] transition-colors hover:text-[#ccc]"
      >
        <ChevronRight
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
        />
        {title}
      </button>
      {isOpen && (
        <div className="section-content-enter space-y-2.5 px-3 pb-3">{children}</div>
      )}
    </div>
  );
}
