"use client";

import { useCallback, useMemo } from "react";
import { X, FileCode, MousePointerClick } from "lucide-react";
import type { InspectedElement } from "@/lib/store/agent-store";
import {
  NumberInput,
  ColorPicker,
  SegmentedControl,
  AlignButtons,
  BoxModelVisual,
  Section,
  PropertyRow,
} from "./property-controls";

interface VisualEdit {
  editType: string;
  property?: string;
  value?: string;
  element: { selector: string; componentName: string | null; className: string; tagName: string };
}

interface PropertyPanelProps {
  element: InspectedElement | null;
  onPropertyChange: (edit: VisualEdit) => void;
  onApplyStyle: (property: string, value: string) => void;
  onFileClick?: (filePath: string) => void;
  mappedFilePath?: string | null;
}

function parseNum(val: string | undefined): number {
  if (!val) return 0;
  return parseInt(val) || 0;
}

export function PropertyPanel({
  element,
  onPropertyChange,
  onApplyStyle,
  onFileClick,
  mappedFilePath,
}: PropertyPanelProps) {
  const styles = element?.computedStyle as Record<string, string> | undefined;

  const makeEdit = useCallback(
    (editType: string, property: string, value: string) => {
      if (!element) return;
      // Apply instantly to iframe
      onApplyStyle(property, value);
      // Queue for code sync
      onPropertyChange({
        editType,
        property,
        value,
        element: {
          selector: element.selector,
          componentName: element.componentName,
          className: element.className,
          tagName: element.tagName,
        },
      });
    },
    [element, onPropertyChange, onApplyStyle],
  );

  const isFlex = useMemo(
    () => styles?.display === "flex" || styles?.display === "inline-flex",
    [styles?.display],
  );

  const isGrid = useMemo(
    () => styles?.display === "grid" || styles?.display === "inline-grid",
    [styles?.display],
  );

  if (!element) {
    return (
      <div className="flex h-full w-[280px] flex-col items-center justify-center border-l border-[#2A2A2A] bg-[#181818]">
        <MousePointerClick className="mb-3 h-8 w-8 text-[#3A3A3A]" />
        <p className="text-[12px] font-medium text-[#555]">Select an element</p>
        <p className="mt-1 text-[10px] text-[#444]">Click any element in the preview</p>
      </div>
    );
  }

  return (
    <div className="panel-enter-right flex h-full w-[280px] flex-col border-l border-[#2A2A2A] bg-[#181818]">
      {/* Header */}
      <div className="animate-content-reveal border-b border-[#2A2A2A] px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/15 text-[10px] font-bold text-blue-400">
            {element.tagName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold text-[#E8E8E5]">
              {element.componentName || element.tagName}
            </div>
            {mappedFilePath && (
              <button
                onClick={() => onFileClick?.(mappedFilePath)}
                className="no-hover-fill flex items-center gap-1 truncate text-[10px] text-blue-400/80 transition-colors hover:text-blue-400"
              >
                <FileCode className="h-2.5 w-2.5" />
                {mappedFilePath.split("/").slice(-2).join("/")}
              </button>
            )}
          </div>
        </div>
        {element.className && (
          <div className="mt-2 truncate rounded-md bg-[#1E1E1E] px-2 py-1 font-mono text-[9px] text-[#666]">
            .{element.className.split(" ").slice(0, 4).join(" .")}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="scrollbar-hidden flex-1 overflow-y-auto">
        {/* Layout */}
        <Section title="Layout" defaultOpen={true}>
          <PropertyRow label="Display">
            <SegmentedControl
              options={[
                { value: "block" },
                { value: "flex" },
                { value: "grid" },
                { value: "inline" },
                { value: "none" },
              ]}
              value={styles?.display || "block"}
              onChange={(v) => makeEdit("style", "display", v)}
            />
          </PropertyRow>

          {isFlex && (
            <>
              <PropertyRow label="Direction">
                <SegmentedControl
                  options={[{ value: "row" }, { value: "column" }, { value: "row-reverse", label: "row-r" }, { value: "column-reverse", label: "col-r" }]}
                  value={styles?.flexDirection || "row"}
                  onChange={(v) => makeEdit("style", "flex-direction", v)}
                />
              </PropertyRow>
              <PropertyRow label="Justify">
                <AlignButtons
                  axis="horizontal"
                  value={styles?.justifyContent || "flex-start"}
                  onChange={(v) => makeEdit("align", "justify-content", v)}
                />
              </PropertyRow>
              <PropertyRow label="Align">
                <AlignButtons
                  axis="vertical"
                  value={styles?.alignItems || "stretch"}
                  onChange={(v) => makeEdit("align", "align-items", v)}
                />
              </PropertyRow>
              <PropertyRow label="Gap">
                <NumberInput
                  value={parseNum(styles?.gap)}
                  unit="px"
                  onChange={(v) => makeEdit("gap", "gap", `${v}px`)}
                />
              </PropertyRow>
            </>
          )}

          {isGrid && (
            <PropertyRow label="Gap">
              <NumberInput
                value={parseNum(styles?.gap)}
                unit="px"
                onChange={(v) => makeEdit("gap", "gap", `${v}px`)}
              />
            </PropertyRow>
          )}
        </Section>

        {/* Size */}
        <Section title="Size">
          <div className="grid grid-cols-2 gap-2">
            <PropertyRow label="W">
              <NumberInput
                value={parseNum(styles?.width)}
                unit="px"
                onChange={(v) => makeEdit("resize", "width", `${v}px`)}
              />
            </PropertyRow>
            <PropertyRow label="H">
              <NumberInput
                value={parseNum(styles?.height)}
                unit="px"
                onChange={(v) => makeEdit("resize", "height", `${v}px`)}
              />
            </PropertyRow>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PropertyRow label="Min W">
              <NumberInput
                value={parseNum(styles?.minWidth)}
                unit="px"
                onChange={(v) => makeEdit("style", "min-width", `${v}px`)}
              />
            </PropertyRow>
            <PropertyRow label="Max W">
              <NumberInput
                value={parseNum(styles?.maxWidth)}
                unit="px"
                max={99999}
                onChange={(v) => makeEdit("style", "max-width", `${v}px`)}
              />
            </PropertyRow>
          </div>
        </Section>

        {/* Spacing */}
        <Section title="Spacing">
          <BoxModelVisual
            padding={{
              top: parseNum(styles?.paddingTop),
              right: parseNum(styles?.paddingRight),
              bottom: parseNum(styles?.paddingBottom),
              left: parseNum(styles?.paddingLeft),
            }}
            margin={{
              top: parseNum(styles?.marginTop),
              right: parseNum(styles?.marginRight),
              bottom: parseNum(styles?.marginBottom),
              left: parseNum(styles?.marginLeft),
            }}
            onPaddingChange={(side, value) =>
              makeEdit("spacing", `padding-${side}`, `${value}px`)
            }
            onMarginChange={(side, value) =>
              makeEdit("spacing", `margin-${side}`, `${value}px`)
            }
          />
        </Section>

        {/* Fill & Border */}
        <Section title="Fill & Border">
          <PropertyRow label="Background">
            <ColorPicker
              value={styles?.backgroundColor || "transparent"}
              onChange={(v) => makeEdit("color", "background-color", v)}
            />
          </PropertyRow>
          <PropertyRow label="Text">
            <ColorPicker
              value={styles?.color || "#000000"}
              onChange={(v) => makeEdit("color", "color", v)}
            />
          </PropertyRow>
          <PropertyRow label="Border W">
            <NumberInput
              value={parseNum(styles?.borderWidth)}
              unit="px"
              onChange={(v) => makeEdit("style", "border-width", `${v}px`)}
            />
          </PropertyRow>
          <PropertyRow label="Border C">
            <ColorPicker
              value={styles?.borderColor || "transparent"}
              onChange={(v) => makeEdit("color", "border-color", v)}
            />
          </PropertyRow>
          <PropertyRow label="Radius">
            <NumberInput
              value={parseNum(styles?.borderRadius)}
              unit="px"
              onChange={(v) => makeEdit("borderRadius", "border-radius", `${v}px`)}
            />
          </PropertyRow>
        </Section>

        {/* Typography */}
        <Section title="Typography" defaultOpen={false}>
          <PropertyRow label="Size">
            <NumberInput
              value={parseNum(styles?.fontSize)}
              unit="px"
              min={1}
              max={200}
              onChange={(v) => makeEdit("fontSize", "font-size", `${v}px`)}
            />
          </PropertyRow>
          <PropertyRow label="Weight">
            <SegmentedControl
              options={[
                { value: "300", label: "Light" },
                { value: "400", label: "Regular" },
                { value: "500", label: "Medium" },
                { value: "600", label: "Semi" },
                { value: "700", label: "Bold" },
              ]}
              value={styles?.fontWeight || "400"}
              onChange={(v) => makeEdit("style", "font-weight", v)}
            />
          </PropertyRow>
          <PropertyRow label="Line H">
            <NumberInput
              value={parseFloat(styles?.lineHeight || "1.5") || 1.5}
              unit=""
              min={0.5}
              max={5}
              step={0.1}
              onChange={(v) => makeEdit("style", "line-height", String(v))}
            />
          </PropertyRow>
          <PropertyRow label="Spacing">
            <NumberInput
              value={parseNum(styles?.letterSpacing)}
              unit="px"
              min={-10}
              max={50}
              onChange={(v) => makeEdit("style", "letter-spacing", `${v}px`)}
            />
          </PropertyRow>
          <PropertyRow label="Align">
            <SegmentedControl
              options={[
                { value: "left", label: "L" },
                { value: "center", label: "C" },
                { value: "right", label: "R" },
                { value: "justify", label: "J" },
              ]}
              value={styles?.textAlign || "left"}
              onChange={(v) => makeEdit("style", "text-align", v)}
            />
          </PropertyRow>
        </Section>

        {/* Effects */}
        <Section title="Effects" defaultOpen={false}>
          <PropertyRow label="Opacity">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((parseFloat(styles?.opacity || "1") || 1) * 100)}
                onChange={(e) => {
                  const v = (parseInt(e.target.value) / 100).toFixed(2);
                  makeEdit("opacity", "opacity", v);
                }}
                className="h-1 flex-1 cursor-pointer accent-blue-500"
              />
              <span className="w-8 text-right font-mono text-[10px] text-[#999]">
                {Math.round((parseFloat(styles?.opacity || "1") || 1) * 100)}%
              </span>
            </div>
          </PropertyRow>
          <PropertyRow label="Shadow">
            <SegmentedControl
              options={[
                { value: "none" },
                { value: "0 1px 2px 0 rgba(0,0,0,0.05)", label: "sm" },
                { value: "0 4px 6px -1px rgba(0,0,0,0.1)", label: "md" },
                { value: "0 10px 15px -3px rgba(0,0,0,0.1)", label: "lg" },
                { value: "0 20px 25px -5px rgba(0,0,0,0.1)", label: "xl" },
              ]}
              value={styles?.boxShadow || "none"}
              onChange={(v) => makeEdit("shadow", "box-shadow", v)}
            />
          </PropertyRow>
          <PropertyRow label="Overflow">
            <SegmentedControl
              options={[
                { value: "visible" },
                { value: "hidden" },
                { value: "scroll" },
                { value: "auto" },
              ]}
              value={styles?.overflow || "visible"}
              onChange={(v) => makeEdit("style", "overflow", v)}
            />
          </PropertyRow>
        </Section>

        {/* Position */}
        <Section title="Position" defaultOpen={false}>
          <PropertyRow label="Position">
            <SegmentedControl
              options={[
                { value: "static" },
                { value: "relative", label: "rel" },
                { value: "absolute", label: "abs" },
                { value: "fixed" },
                { value: "sticky" },
              ]}
              value={styles?.position || "static"}
              onChange={(v) => makeEdit("style", "position", v)}
            />
          </PropertyRow>
          <PropertyRow label="Z-index">
            <NumberInput
              value={parseNum(styles?.zIndex)}
              unit=""
              min={-9999}
              max={9999}
              onChange={(v) => makeEdit("style", "z-index", String(v))}
            />
          </PropertyRow>
        </Section>
      </div>
    </div>
  );
}
