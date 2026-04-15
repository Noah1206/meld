"use client";

// BrowseTemplates — right-side panel shown while the New Agent drawer is
// open. Large title + search + category filter chips + two-column grid of
// cards. Clicking a card pre-seeds the drawer's chat with that template.

import { useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import {
  AGENT_TEMPLATES,
  type AgentTemplate,
  type TemplateCategory,
} from "./agent-templates";

export interface BrowseTemplatesProps {
  isDark: boolean;
  onSelect: (template: AgentTemplate) => void;
}

const MCP_ICON_PATHS: Record<string, string> = {
  github: "/mcp-icons/github.svg",
  figma: "/mcp-icons/figma.svg",
  vercel: "/mcp-icons/vercel.svg",
  supabase: "/mcp-icons/supabase.svg",
  sentry: "/mcp-icons/sentry.svg",
  linear: "/mcp-icons/linear.svg",
  notion: "/mcp-icons/notion.svg",
  slack: "/mcp-icons/slack.svg",
  gmail: "/mcp-icons/gmail.svg",
  canva: "/mcp-icons/canva.svg",
};

const CATEGORIES: { id: TemplateCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "knowledge", label: "Knowledge" },
  { id: "code", label: "Code" },
  { id: "support", label: "Support" },
  { id: "ops", label: "Ops" },
  { id: "research", label: "Research" },
  { id: "data", label: "Data" },
];

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  knowledge: "Knowledge",
  code: "Code",
  support: "Support",
  ops: "Ops",
  research: "Research",
  data: "Data",
};

export function BrowseTemplates({ isDark, onSelect }: BrowseTemplatesProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");

  const filtered = AGENT_TEMPLATES.filter(t => {
    if (activeCategory !== "all" && t.category !== activeCategory) return false;
    if (query) {
      const q = query.toLowerCase();
      if (
        !t.name.toLowerCase().includes(q) &&
        !t.description.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const title = isDark ? "text-white" : "text-[#1A1A1A]";
  const muted = isDark ? "text-[#888]" : "text-[#787774]";
  // Flush black background, outlined with a single border for separation.
  const cardBg = isDark ? "bg-transparent" : "bg-transparent";
  const cardRing = isDark
    ? "border border-white/[0.12] hover:border-white/[0.22]"
    : "border border-black/[0.08] hover:border-black/[0.18]";
  const searchBg = isDark ? "bg-transparent" : "bg-transparent";
  const searchRing = isDark
    ? "border border-white/[0.12] focus-within:border-white/[0.25]"
    : "border border-black/[0.08] focus-within:border-black/[0.2]";
  // Icon chips keep a solid dark fill so they stand out from the transparent card.
  const iconChipBg = isDark ? "bg-[#1C1C1C]" : "bg-white";
  const iconChipRing = isDark ? "ring-2 ring-[#1C1C1C]" : "ring-2 ring-white";
  const chipInactive = isDark
    ? "border border-white/[0.12] text-[#888] hover:text-white hover:border-white/[0.22]"
    : "border border-black/[0.08] text-[#787774] hover:text-[#1A1A1A] hover:border-black/[0.18]";
  const chipActive = isDark
    ? "bg-white text-[#0A0A0A]"
    : "bg-[#1A1A1A] text-white";
  const categoryLabel = isDark ? "text-[#666]" : "text-[#999]";

  return (
    <div className="flex h-full flex-col px-10 py-12 lg:px-16 lg:py-14">
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className={`text-[28px] font-bold tracking-[-0.02em] ${title}`}>
          Browse templates
        </h1>
        <span className={`font-mono text-[11px] ${muted}`}>
          {filtered.length} / {AGENT_TEMPLATES.length}
        </span>
      </div>
      <p className={`mb-6 text-[13px] ${muted}`}>
        Real-world MCP + RAG agent patterns teams ship in production.
      </p>

      {/* Search */}
      <div
        className={`mb-4 flex items-center gap-3 rounded-xl px-4 py-3 ${searchBg} ${searchRing}`}
      >
        <Search className={`h-4 w-4 ${muted}`} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search templates"
          className={`flex-1 bg-transparent text-[14px] outline-none ${
            isDark
              ? "text-white placeholder:text-[#666]"
              : "text-[#1A1A1A] placeholder:text-[#AAA]"
          }`}
        />
      </div>

      {/* Category chips */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all active:scale-[0.97] ${
              activeCategory === cat.id ? chipActive : chipInactive
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto px-1 pb-1 pt-1 md:grid-cols-2">
        {filtered.map(template => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={`group flex h-[156px] flex-col rounded-xl px-5 pb-3.5 pt-3.5 text-left transition-all hover:-translate-y-0.5 ${cardBg} ${cardRing}`}
          >
            <span
              className={`mb-1 font-mono text-[10px] uppercase tracking-[0.12em] ${categoryLabel}`}
            >
              {CATEGORY_LABELS[template.category]}
            </span>
            <h3
              className={`mb-1.5 truncate text-[15px] font-semibold tracking-[-0.01em] ${title}`}
            >
              {template.name}
            </h3>
            <p className={`line-clamp-2 text-[13px] leading-relaxed ${muted}`}>
              {template.description}
            </p>
            <div className="mt-auto flex h-8 items-center pt-2">
              {template.mcpBadges && template.mcpBadges.length > 0 ? (
                <>
                  <div className="flex -space-x-2">
                    {template.mcpBadges.slice(0, 5).map(id => {
                      const src = MCP_ICON_PATHS[id];
                      if (!src) return null;
                      return (
                        <div
                          key={id}
                          className={`flex h-7 w-7 items-center justify-center rounded-full ${iconChipBg} ${iconChipRing}`}
                        >
                          <Image
                            src={src}
                            alt={id}
                            width={14}
                            height={14}
                            className="h-3.5 w-3.5"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {template.mcpBadges.length > 5 && (
                    <span className={`ml-2 font-mono text-[10px] ${muted}`}>
                      +{template.mcpBadges.length - 5}
                    </span>
                  )}
                </>
              ) : null}
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div
            className={`col-span-2 rounded-xl px-6 py-10 text-center text-[13px] ${cardBg} ${cardRing} ${muted}`}
          >
            No templates match{" "}
            {query ? <>&ldquo;{query}&rdquo;</> : "this filter"}.
          </div>
        )}
      </div>
    </div>
  );
}
