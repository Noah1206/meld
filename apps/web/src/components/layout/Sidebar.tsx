"use client";

interface SidebarProps {
  children: React.ReactNode;
  title?: string;
}

export function Sidebar({ children, title }: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      {title && (
        <div className="border-b border-[#E5E7EB] px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
            {title}
          </h2>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
