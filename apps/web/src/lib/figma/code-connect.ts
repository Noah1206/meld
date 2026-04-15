// Figma Code Connect — lightweight scaffolding
//
// Maps Figma component node IDs (or component keys) to real code components in
// this workspace, so the agent can answer "given this Figma URL, which React
// component should I import?"
//
// This is a minimal, dependency-free registry. If/when we adopt the official
// `@figma/code-connect` CLI, this module can be replaced by the generated
// manifest — the resolve API is intentionally aligned with that workflow.

export interface FigmaCodeConnectMapping {
  /** Figma node ID (e.g. "123:456") or component key */
  figmaNodeId?: string;
  figmaComponentKey?: string;
  /** Human-readable label for logging */
  figmaName: string;
  /** Import specifier used in generated code */
  importPath: string;
  /** Exported symbol name */
  component: string;
  /** Optional prop mapping: figmaProp → { codeProp, transform } */
  props?: Record<string, FigmaPropMapping>;
  /** Free-form notes — shown to the agent */
  notes?: string;
}

export interface FigmaPropMapping {
  codeProp: string;
  /** e.g. "boolean", "enum", "string" — used for hints only */
  kind?: "boolean" | "enum" | "string" | "number";
  enumValues?: Record<string, string>;
}

// ─── Registry ─────────────────────────────────────────
// Add entries as you connect Figma components to code.
// Keep this list small and curated — the agent reads it verbatim.
const MAPPINGS: FigmaCodeConnectMapping[] = [
  // Example — remove/replace with real mappings as components are connected.
  // {
  //   figmaName: "Button / Primary",
  //   figmaComponentKey: "REPLACE_ME_KEY",
  //   importPath: "@/components/ui/button",
  //   component: "Button",
  //   props: {
  //     Label: { codeProp: "children", kind: "string" },
  //     Variant: {
  //       codeProp: "variant",
  //       kind: "enum",
  //       enumValues: { Primary: "primary", Secondary: "secondary" },
  //     },
  //     Disabled: { codeProp: "disabled", kind: "boolean" },
  //   },
  //   notes: "Default Meld primary button. Use `variant=\"primary\"` for CTA.",
  // },
];

// ─── Public API ───────────────────────────────────────

export function listCodeConnectMappings(): FigmaCodeConnectMapping[] {
  return [...MAPPINGS];
}

/** Resolve by Figma node ID (most common — nodes inside a file). */
export function resolveByNodeId(nodeId: string): FigmaCodeConnectMapping | null {
  return MAPPINGS.find(m => m.figmaNodeId === nodeId) ?? null;
}

/** Resolve by component key (shared across file instances). */
export function resolveByComponentKey(key: string): FigmaCodeConnectMapping | null {
  return MAPPINGS.find(m => m.figmaComponentKey === key) ?? null;
}

/**
 * Generic resolver — tries nodeId first, then componentKey, then a loose
 * name match (case-insensitive substring).
 */
export function resolveComponent(query: {
  nodeId?: string;
  componentKey?: string;
  name?: string;
}): FigmaCodeConnectMapping | null {
  if (query.nodeId) {
    const hit = resolveByNodeId(query.nodeId);
    if (hit) return hit;
  }
  if (query.componentKey) {
    const hit = resolveByComponentKey(query.componentKey);
    if (hit) return hit;
  }
  if (query.name) {
    const lower = query.name.toLowerCase();
    return MAPPINGS.find(m => m.figmaName.toLowerCase().includes(lower)) ?? null;
  }
  return null;
}

/**
 * Generate an `import` line + a usage stub for a resolved mapping.
 * Used by the agent when it needs to drop a real code component in place of
 * a Figma frame it was handed.
 */
export function generateImportSnippet(mapping: FigmaCodeConnectMapping): string {
  return `import { ${mapping.component} } from "${mapping.importPath}";`;
}

export function generateUsageSnippet(mapping: FigmaCodeConnectMapping): string {
  const propHints = mapping.props
    ? Object.entries(mapping.props)
        .map(([figmaProp, spec]) => `  ${spec.codeProp}={/* from Figma "${figmaProp}" */}`)
        .join("\n")
    : "";
  return `<${mapping.component}${propHints ? `\n${propHints}\n` : " "}/>`;
}
