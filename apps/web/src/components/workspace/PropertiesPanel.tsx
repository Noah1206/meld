"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { InspectedElement } from "@/lib/store/agent-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PropertiesPanelProps {
  element: InspectedElement | null;
  isDark?: boolean;
  /** Callback to send visual-edit message to the preview iframe */
  onVisualEdit?: (payload: {
    editType: string;
    property: string;
    value: string;
    element: InspectedElement;
  }) => void;
  /** Simpler callback: (property, value) → used from workspace page */
  onApplyStyle?: (property: string, value: string) => void;
}

// ---------------------------------------------------------------------------
// Collapsible section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/50 hover:text-white/70 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        {title}
      </button>
      {open && <div className="px-3 pb-3 space-y-1.5">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual property input row
// ---------------------------------------------------------------------------

function PropRow({
  label,
  value,
  onChange,
  type = "text",
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number" | "select" | "color";
  options?: string[];
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const [localVal, setLocalVal] = useState(value);

  // Sync local state when external value changes
  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const commit = useCallback(
    (v: string) => {
      if (v !== value) onChange(v);
    },
    [value, onChange],
  );

  if (type === "select" && options) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-[72px] shrink-0 text-[11px] text-white/40 font-mono truncate">
          {label}
        </span>
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={localVal}
          onChange={(e) => {
            setLocalVal(e.target.value);
            commit(e.target.value);
          }}
          className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-0.5 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50 transition-colors"
        >
          {options.map((o) => (
            <option key={o} value={o} className="bg-[#232323]">
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (type === "color") {
    return (
      <div className="flex items-center gap-2">
        <span className="w-[72px] shrink-0 text-[11px] text-white/40 font-mono truncate">
          {label}
        </span>
        <div className="flex flex-1 items-center gap-1.5 min-w-0">
          <input
            type="color"
            value={rgbToHex(localVal)}
            onChange={(e) => {
              setLocalVal(e.target.value);
              commit(e.target.value);
            }}
            className="h-5 w-5 shrink-0 cursor-pointer rounded border border-white/10 bg-transparent p-0"
          />
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={() => commit(localVal)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(localVal);
            }}
            className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-0.5 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-[72px] shrink-0 text-[11px] text-white/40 font-mono truncate">
        {label}
      </span>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={localVal}
        placeholder={placeholder}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={() => commit(localVal)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(localVal);
        }}
        className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-0.5 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50 transition-colors"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2x2 compact grid for related properties (e.g. padding, margin)
// ---------------------------------------------------------------------------

function QuadRow({
  labels,
  values,
  onChange,
}: {
  labels: [string, string, string, string];
  values: [string, string, string, string];
  onChange: (idx: number, v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
      {labels.map((label, i) => (
        <SmallPropInput
          key={label}
          label={label}
          value={values[i]}
          onChange={(v) => onChange(i, v)}
        />
      ))}
    </div>
  );
}

function SmallPropInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const local = draft ?? value;

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-4 shrink-0 text-[10px] text-white/30 font-mono text-center uppercase">
        {label.charAt(0).toUpperCase()}
      </span>
      <input
        type="text"
        value={local}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (local !== value) onChange(local);
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && local !== value) onChange(local);
        }}
        className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-0.5 text-[10px] font-mono text-white/70 outline-none focus:border-blue-500/50 transition-colors"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visual Box Model Diagram
// ---------------------------------------------------------------------------

function BoxModelDiagram({ style }: { style: Record<string, string> }) {
  const mt = style.marginTop || "0px";
  const mr = style.marginRight || "0px";
  const mb = style.marginBottom || "0px";
  const ml = style.marginLeft || "0px";
  const pt = style.paddingTop || "0px";
  const pr = style.paddingRight || "0px";
  const pb = style.paddingBottom || "0px";
  const pl = style.paddingLeft || "0px";
  const bw = style.borderWidth || "0px";
  const w = style.width || "auto";
  const h = style.height || "auto";

  const short = (v: string) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? "-" : String(n);
  };

  return (
    <div className="flex items-center justify-center py-2">
      <div className="relative w-[200px] text-center text-[9px] font-mono">
        {/* Margin layer */}
        <div className="border border-dashed border-orange-400/40 bg-orange-400/[0.04] rounded p-1">
          <div className="text-orange-300/50 text-[8px] absolute top-0.5 left-1.5">
            margin
          </div>
          <div className="text-orange-300/60 text-center mb-0.5">{short(mt)}</div>
          <div className="flex items-center">
            <div className="text-orange-300/60 w-6 text-center">{short(ml)}</div>
            {/* Border layer */}
            <div className="flex-1 border border-yellow-400/40 bg-yellow-400/[0.04] rounded p-1">
              <div className="text-yellow-300/50 text-[8px] text-left">
                border {short(bw)}
              </div>
              {/* Padding layer */}
              <div className="border border-green-400/40 bg-green-400/[0.04] rounded p-1 mt-0.5">
                <div className="text-green-300/50 text-[8px] text-left">
                  padding
                </div>
                <div className="text-green-300/60 text-center mb-0.5">
                  {short(pt)}
                </div>
                <div className="flex items-center">
                  <div className="text-green-300/60 w-5 text-center">
                    {short(pl)}
                  </div>
                  {/* Content */}
                  <div className="flex-1 bg-blue-400/[0.08] border border-blue-400/30 rounded py-1.5 text-blue-300/60 text-[9px]">
                    {short(w)} x {short(h)}
                  </div>
                  <div className="text-green-300/60 w-5 text-center">
                    {short(pr)}
                  </div>
                </div>
                <div className="text-green-300/60 text-center mt-0.5">
                  {short(pb)}
                </div>
              </div>
            </div>
            <div className="text-orange-300/60 w-6 text-center">{short(mr)}</div>
          </div>
          <div className="text-orange-300/60 text-center mt-0.5">{short(mb)}</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: rgb(r,g,b) -> #hex
// ---------------------------------------------------------------------------

function rgbToHex(rgb: string): string {
  if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return "#ffffff";
  if (rgb.startsWith("#")) return rgb.length === 4 || rgb.length === 7 ? rgb : rgb.slice(0, 7);
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return "#000000";
  return (
    "#" +
    match
      .slice(0, 3)
      .map((x) => parseInt(x, 10).toString(16).padStart(2, "0"))
      .join("")
  );
}

// ---------------------------------------------------------------------------
// Shadow presets for the shadow select
// ---------------------------------------------------------------------------

const SHADOW_PRESETS: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
  md: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  lg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
  xl: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PropertiesPanel({ element, isDark, onVisualEdit, onApplyStyle }: PropertiesPanelProps) {
  // Helper: style change → postMessage to iframe or apply via callback.
  // Declared before the early return so hook order stays stable.
  const edit = useCallback(
    (editType: string, property: string, value: string) => {
      if (!element) return;
      if (onApplyStyle) {
        onApplyStyle(property, value);
      } else if (onVisualEdit) {
        onVisualEdit({ editType, property, value, element });
      }
    },
    [onVisualEdit, onApplyStyle, element],
  );

  if (!element) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#232323] text-white/30 text-xs select-none p-4 text-center">
        <div className="text-2xl mb-2 opacity-40">&#x1F50D;</div>
        <p>No element selected.</p>
        <p className="mt-1 text-[10px] text-white/20">
          Click an element in the preview to inspect its properties.
        </p>
      </div>
    );
  }

  const cs = element.computedStyle ?? {};

  // CSS property -> kebab-case
  const kebab = (key: string) =>
    key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#232323] text-white text-xs scrollbar-thin scrollbar-thumb-white/10">
      {/* Element header */}
      <div className="sticky top-0 z-10 bg-[#232323] border-b border-white/[0.06] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-mono text-blue-400">
            {element.componentName || element.tagName}
          </span>
          {element.id && (
            <span className="text-[10px] text-white/30 font-mono">#{element.id}</span>
          )}
        </div>
        {element.className && (
          <p className="mt-1 text-[10px] text-white/20 font-mono truncate">
            .{element.className.split(" ").slice(0, 3).join(" .")}
          </p>
        )}
        <p className="mt-0.5 text-[10px] text-white/15 font-mono truncate">
          {Math.round(element.rect.width)} x {Math.round(element.rect.height)}
        </p>
      </div>

      {/* Layout */}
      <Section title="Layout">
        <PropRow
          label="display"
          value={cs.display || "block"}
          type="select"
          options={["block", "flex", "inline-flex", "grid", "inline-grid", "inline", "inline-block", "none"]}
          onChange={(v) => edit("layout", "display", v)}
        />
        <PropRow
          label="position"
          value={cs.position || "static"}
          type="select"
          options={["static", "relative", "absolute", "fixed", "sticky"]}
          onChange={(v) => edit("layout", "position", v)}
        />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <PropRow label="width" value={cs.width || "auto"} onChange={(v) => edit("layout", "width", v)} />
          <PropRow label="height" value={cs.height || "auto"} onChange={(v) => edit("layout", "height", v)} />
        </div>
        {(cs.display === "flex" || cs.display === "inline-flex") && (
          <>
            <PropRow
              label="direction"
              value={cs.flexDirection || "row"}
              type="select"
              options={["row", "column", "row-reverse", "column-reverse"]}
              onChange={(v) => edit("layout", "flex-direction", v)}
            />
            <PropRow
              label="justify"
              value={cs.justifyContent || "flex-start"}
              type="select"
              options={["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"]}
              onChange={(v) => edit("layout", "justify-content", v)}
            />
            <PropRow
              label="align"
              value={cs.alignItems || "stretch"}
              type="select"
              options={["stretch", "flex-start", "center", "flex-end", "baseline"]}
              onChange={(v) => edit("layout", "align-items", v)}
            />
            <PropRow label="gap" value={cs.gap || "0px"} onChange={(v) => edit("gap", "gap", v)} />
          </>
        )}
        {/* Padding */}
        <div className="mt-1.5">
          <div className="text-[10px] text-white/25 mb-1">Padding</div>
          <QuadRow
            labels={["top", "right", "bottom", "left"]}
            values={[
              cs.paddingTop || "0px",
              cs.paddingRight || "0px",
              cs.paddingBottom || "0px",
              cs.paddingLeft || "0px",
            ]}
            onChange={(i, v) => {
              const sides = ["top", "right", "bottom", "left"];
              edit("spacing", `padding-${sides[i]}`, v);
            }}
          />
        </div>
        {/* Margin */}
        <div className="mt-1.5">
          <div className="text-[10px] text-white/25 mb-1">Margin</div>
          <QuadRow
            labels={["top", "right", "bottom", "left"]}
            values={[
              cs.marginTop || "0px",
              cs.marginRight || "0px",
              cs.marginBottom || "0px",
              cs.marginLeft || "0px",
            ]}
            onChange={(i, v) => {
              const sides = ["top", "right", "bottom", "left"];
              edit("spacing", `margin-${sides[i]}`, v);
            }}
          />
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography">
        <PropRow
          label="font"
          value={cs.fontFamily || "inherit"}
          onChange={(v) => edit("typography", "font-family", v)}
        />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <PropRow
            label="size"
            value={cs.fontSize || "16px"}
            onChange={(v) => edit("fontSize", "font-size", v)}
          />
          <PropRow
            label="weight"
            value={cs.fontWeight || "400"}
            type="select"
            options={["100", "200", "300", "400", "500", "600", "700", "800", "900"]}
            onChange={(v) => edit("typography", "font-weight", v)}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <PropRow
            label="line-h"
            value={cs.lineHeight || "normal"}
            onChange={(v) => edit("typography", "line-height", v)}
          />
          <PropRow
            label="spacing"
            value={cs.letterSpacing || "normal"}
            onChange={(v) => edit("typography", "letter-spacing", v)}
          />
        </div>
        <PropRow
          label="align"
          value={cs.textAlign || "left"}
          type="select"
          options={["left", "center", "right", "justify"]}
          onChange={(v) => edit("typography", "text-align", v)}
        />
        <PropRow
          label="color"
          value={cs.color || "#000000"}
          type="color"
          onChange={(v) => edit("color", "color", v)}
        />
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <PropRow
          label="bg"
          value={cs.backgroundColor || "transparent"}
          type="color"
          onChange={(v) => edit("color", "background-color", v)}
        />
        <PropRow
          label="radius"
          value={cs.borderRadius || "0px"}
          onChange={(v) => edit("borderRadius", "border-radius", v)}
        />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <PropRow
            label="b-width"
            value={cs.borderWidth || "0px"}
            onChange={(v) => edit("border", "border-width", v)}
          />
          <PropRow
            label="b-style"
            value={cs.borderStyle || "none"}
            type="select"
            options={["none", "solid", "dashed", "dotted", "double"]}
            onChange={(v) => edit("border", "border-style", v)}
          />
        </div>
        <PropRow
          label="b-color"
          value={cs.borderColor || "transparent"}
          type="color"
          onChange={(v) => edit("border", "border-color", v)}
        />
        <PropRow
          label="opacity"
          value={cs.opacity || "1"}
          onChange={(v) => edit("opacity", "opacity", v)}
        />
        {/* Shadow presets */}
        <div>
          <span className="text-[10px] text-white/25">box-shadow</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(SHADOW_PRESETS).map(([label, val]) => {
              const currentShadow = cs.boxShadow || "none";
              const isActive =
                label === "none"
                  ? currentShadow === "none"
                  : currentShadow.includes(val.slice(0, 12));
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => edit("shadow", "box-shadow", val)}
                  className={`rounded px-2 py-0.5 text-[10px] font-mono transition-colors ${
                    isActive
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                      : "bg-white/[0.04] text-white/50 border border-white/[0.06] hover:border-blue-500/30"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Spacing (Box Model Diagram) */}
      <Section title="Box Model" defaultOpen={false}>
        <BoxModelDiagram style={cs} />
      </Section>
    </div>
  );
}
