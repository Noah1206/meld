"use client";

// Template detail view — shown in the right panel when a template card is
// clicked. Matches the Claude Console "template detail" screen: back arrow,
// name + "Template" badge, "Use this template" CTA, YAML/JSON tab toggle,
// syntax-highlighted code view with line numbers, copy + Generate buttons.

import { useMemo, useState } from "react";
import { ArrowLeft, Copy, CheckCheck } from "lucide-react";
import type { AgentTemplate } from "./agent-templates";
import { serializeTemplate } from "./template-serialize";

export interface TemplateDetailProps {
  template: AgentTemplate;
  isDark: boolean;
  onBack: () => void;
  /**
   * Fired by the "Generate" button in the header. Typically wired to the
   * handler that creates the agent in the DB.
   */
  onGenerate?: (template: AgentTemplate) => void;
}

type Format = "yaml" | "json";

export function TemplateDetail({
  template,
  isDark,
  onBack,
  onGenerate,
}: TemplateDetailProps) {
  const [format, setFormat] = useState<Format>("yaml");
  const [copied, setCopied] = useState(false);

  const serialized = useMemo(() => serializeTemplate(template), [template]);
  const source = format === "yaml" ? serialized.yaml : serialized.json;
  const lines = source.split("\n");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  const title = isDark ? "text-white" : "text-[#1A1A1A]";
  const muted = isDark ? "text-[#888]" : "text-[#787774]";
  const lineNumberColor = isDark ? "text-[#444]" : "text-[#BBB]";

  const tabInactive = isDark
    ? "text-[#666] hover:text-[#ccc]"
    : "text-[#999] hover:text-[#1A1A1A]";
  const tabActive = isDark
    ? "bg-[#1A1A1A] text-white ring-1 ring-white/[0.08]"
    : "bg-white text-[#1A1A1A] ring-1 ring-black/[0.08]";
  const badgeBg = isDark
    ? "bg-white/[0.06] text-[#ccc] ring-1 ring-white/[0.08]"
    : "bg-black/[0.05] text-[#555] ring-1 ring-black/[0.08]";

  const divider = isDark ? "border-white/[0.06]" : "border-black/[0.06]";

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      data-template-detail="v9-flush"
    >
      {/* Header row — same padding scale as BrowseTemplates for visual match */}
      <div
        className={`flex flex-shrink-0 items-center gap-3 border-b ${divider} px-6 py-5 lg:px-8`}
      >
          <button
            onClick={onBack}
            className={`flex-shrink-0 rounded-lg p-1.5 transition-colors ${
              isDark
                ? "text-[#888] hover:bg-white/[0.06] hover:text-white"
                : "text-[#787774] hover:bg-black/[0.05] hover:text-[#1A1A1A]"
            }`}
            aria-label="Back to templates"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1
            className={`min-w-0 truncate text-[18px] font-bold tracking-[-0.02em] ${title}`}
          >
            {template.name}
          </h1>
          <span
            className={`hidden flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${badgeBg} sm:inline`}
          >
            Template
          </span>

          {/* Spacer pushes action buttons to the far right */}
          <div className="flex-1" />

          <button
            onClick={() => onGenerate?.(template)}
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all active:scale-[0.97] ${
              isDark
                ? "bg-white text-[#0A0A0A] hover:bg-[#E8E8E5]"
                : "bg-[#1A1A1A] text-white hover:bg-[#333]"
            }`}
          >
            Generate
          </button>
        </div>

      {/* Upper-layer wrapper — lighter bg + border to lift the code view
          off the panel background (design-only, no functional tabs) */}
      <div className="mx-6 mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] lg:mx-8 lg:mb-8">
        {/* Format toggle + copy */}
        <div className="flex flex-shrink-0 items-center gap-3 px-5 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFormat("yaml")}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-mono transition-all ${
                format === "yaml" ? tabActive : tabInactive
              }`}
            >
              YAML
            </button>
            <button
              onClick={() => setFormat("json")}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-mono transition-all ${
                format === "json" ? tabActive : tabInactive
              }`}
            >
              JSON
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`rounded-lg p-1.5 transition-colors ${
                isDark
                  ? "text-[#666] hover:bg-white/[0.06] hover:text-white"
                  : "text-[#999] hover:bg-black/[0.05] hover:text-[#1A1A1A]"
              }`}
              aria-label="Copy"
            >
              {copied ? (
                <CheckCheck className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Code view */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <pre className="overflow-x-auto font-mono text-[11px] leading-[1.55]">
            <code>
              {lines.map((line, i) => (
                <div key={i} className="flex">
                  <span
                    className={`mr-4 inline-block w-6 flex-shrink-0 select-none text-right tabular-nums ${lineNumberColor}`}
                  >
                    {i + 1}
                  </span>
                  <span className={`whitespace-pre ${muted}`}>
                    {highlightLine(line, format, isDark)}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}

// ─── Tiny syntax highlighter ─────────────────────────
// Just enough to match the screenshot's colors: keys blue, strings warm
// orange, bare values default. Works for both YAML and JSON without a lib.
function highlightLine(
  line: string,
  format: Format,
  isDark: boolean
): React.ReactNode {
  const keyColor = isDark ? "text-[#7BA7FF]" : "text-[#1E40AF]";
  const stringColor = isDark ? "text-[#E89D74]" : "text-[#9A3412]";
  const defaultColor = isDark ? "text-[#E8B98A]" : "text-[#78350F]";

  if (format === "yaml") {
    // Match "  key: value" pattern (key may include letters, digits, underscore, dash, dot)
    const yamlMatch = line.match(/^(\s*-?\s*)([a-zA-Z_][\w.-]*)(:)(\s*)(.*)$/);
    if (yamlMatch) {
      const [, indent, key, colon, space, value] = yamlMatch;
      return (
        <>
          <span>{indent}</span>
          <span className={keyColor}>{key}</span>
          <span className={defaultColor}>{colon}</span>
          <span>{space}</span>
          {value ? <span className={stringColor}>{value}</span> : null}
        </>
      );
    }
    // Plain content line (block scalar body, bullet item continuation)
    return <span className={defaultColor}>{line}</span>;
  }

  // JSON: match "key": value shape
  const jsonMatch = line.match(/^(\s*)("([^"]+)")(\s*:\s*)(.*)$/);
  if (jsonMatch) {
    const [, indent, quotedKey, , separator, rest] = jsonMatch;
    return (
      <>
        <span>{indent}</span>
        <span className={keyColor}>{quotedKey}</span>
        <span className={defaultColor}>{separator}</span>
        <span className={stringColor}>{rest}</span>
      </>
    );
  }
  return <span className={defaultColor}>{line}</span>;
}
