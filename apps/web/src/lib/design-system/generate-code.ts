import type { DesignSystem } from "./types";
import type { ColorShades } from "./palette";

/**
 * DesignSystem -> code artifact generation
 * Tailwind config, CSS variables, W3C Design Tokens JSON
 */

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

/** Compute typography scale (same logic as generate-md.ts) */
function computeTypeScale(baseFontSize: number, scale: number): Record<string, number> {
  const base = baseFontSize;
  const r = scale;
  return {
    xs: Math.round(base / (r * r)),
    sm: Math.round(base / r),
    base,
    lg: Math.round(base * r),
    xl: Math.round(base * r * r),
    "2xl": Math.round(base * r * r * r),
    "3xl": Math.round(base * Math.pow(r, 4)),
    "4xl": Math.round(base * Math.pow(r, 5)),
  };
}

/** Compute line-height: more generous for smaller sizes */
function computeLineHeight(fontSize: number): number {
  if (fontSize <= 14) return 1.7;
  if (fontSize <= 18) return 1.6;
  if (fontSize <= 24) return 1.4;
  if (fontSize <= 32) return 1.3;
  return 1.2;
}

/** spacing scale → { "0": "0px", "1": "4px", ... } */
function computeSpacingMap(baseUnit: number, scale: number[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const multiplier of scale) {
    map[String(multiplier)] = `${multiplier * baseUnit}px`;
  }
  return map;
}

/** ColorShades key list (type-safe) */
const SHADE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

// ─────────────────────────────────────────────
// 1. Tailwind Config Generation
// ─────────────────────────────────────────────

/**
 * DesignSystem -> tailwind.config.ts content generation
 *
 * Includes primary/secondary/tertiary palette in extend.colors,
 * typography scale in extend.fontSize,
 * extend.spacing and extend.borderRadius
 */
export function generateTailwindConfig(system: DesignSystem): string {
  const { colors, typography, spacing, radius } = system;

  const typeSizes = computeTypeScale(typography.baseFontSize, typography.scale);
  const spacingMap = computeSpacingMap(spacing.baseUnit, spacing.scale);

  const colorBlock = (shades: ColorShades): string =>
    SHADE_STEPS.map((step) => `          ${step}: "${shades[step]}",`).join("\n");

  const fontSizeBlock = Object.entries(typeSizes)
    .map(([key, size]) => {
      const lh = computeLineHeight(size);
      return `        "${key}": ["${size}px", { lineHeight: "${lh}" }],`;
    })
    .join("\n");

  const spacingBlock = Object.entries(spacingMap)
    .map(([key, value]) => `        "${key}": "${value}",`)
    .join("\n");

  const fontFamilyEntries = [`        sans: ["${typography.fontFamily}", "system-ui", "sans-serif"],`];
  if (typography.headingFamily) {
    fontFamilyEntries.push(
      `        heading: ["${typography.headingFamily}", "${typography.fontFamily}", "sans-serif"],`,
    );
  }

  return `import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
${colorBlock(colors.primary)}
          DEFAULT: "${colors.seedColor}",
        },
        secondary: {
${colorBlock(colors.secondary)}
          DEFAULT: "${colors.secondarySeed}",
        },
        tertiary: {
${colorBlock(colors.tertiary)}
          DEFAULT: "${colors.tertiarySeed}",
        },
      },
      fontFamily: {
${fontFamilyEntries.join("\n")}
      },
      fontSize: {
${fontSizeBlock}
      },
      spacing: {
${spacingBlock}
      },
      borderRadius: {
        none: "${radius.none}px",
        sm: "${radius.sm}px",
        md: "${radius.md}px",
        lg: "${radius.lg}px",
        xl: "${radius.xl}px",
        full: "${radius.full}px",
      },
    },
  },
  plugins: [],
};

export default config;
`;
}

// ─────────────────────────────────────────────
// 2. CSS Custom Properties Generation
// ─────────────────────────────────────────────

/**
 * DesignSystem -> CSS custom properties (:root block)
 *
 * Variable naming: --color-primary-500, --font-size-base, --spacing-4, --radius-md
 */
export function generateCSSVariables(system: DesignSystem): string {
  const { colors, typography, spacing, radius, mode } = system;

  const lines: string[] = [];

  lines.push("/* ─── Generated Design Tokens (CSS Custom Properties) ─── */");
  lines.push("");
  lines.push(":root {");

  // Theme mode
  lines.push("  /* Theme */");
  lines.push(`  --theme-mode: ${mode};`);
  lines.push(`  --color-background: ${mode === "light" ? "#FFFFFF" : "#0A0A0A"};`);
  lines.push(`  --color-foreground: ${mode === "light" ? "#0A0A0A" : "#FAFAFA"};`);
  lines.push("");

  // Color palette
  const colorGroups: [string, ColorShades, string][] = [
    ["primary", colors.primary, colors.seedColor],
    ["secondary", colors.secondary, colors.secondarySeed],
    ["tertiary", colors.tertiary, colors.tertiarySeed],
  ];

  for (const [name, shades, seed] of colorGroups) {
    lines.push(`  /* ${name.charAt(0).toUpperCase() + name.slice(1)} */`);
    lines.push(`  --color-${name}: ${seed};`);
    for (const step of SHADE_STEPS) {
      lines.push(`  --color-${name}-${step}: ${shades[step]};`);
    }
    lines.push("");
  }

  // Semantic colors
  lines.push("  /* Semantic */");
  lines.push("  --color-error: #DC2626;");
  lines.push("  --color-success: #16A34A;");
  lines.push("  --color-warning: #D97706;");
  lines.push("  --color-info: #2563EB;");
  lines.push("");

  // Typography
  lines.push("  /* Typography */");
  lines.push(`  --font-family: "${typography.fontFamily}", system-ui, sans-serif;`);
  if (typography.headingFamily) {
    lines.push(
      `  --font-family-heading: "${typography.headingFamily}", "${typography.fontFamily}", sans-serif;`,
    );
  }

  const typeSizes = computeTypeScale(typography.baseFontSize, typography.scale);
  for (const [key, size] of Object.entries(typeSizes)) {
    const lh = computeLineHeight(size);
    lines.push(`  --font-size-${key}: ${size}px;`);
    lines.push(`  --line-height-${key}: ${lh};`);
  }
  lines.push("");

  // Spacing
  lines.push("  /* Spacing */");
  lines.push(`  --spacing-unit: ${spacing.baseUnit}px;`);
  for (const multiplier of spacing.scale) {
    lines.push(`  --spacing-${multiplier}: ${multiplier * spacing.baseUnit}px;`);
  }
  lines.push("");

  // Border radius
  lines.push("  /* Border Radius */");
  const radiusEntries: [string, number][] = [
    ["none", radius.none],
    ["sm", radius.sm],
    ["md", radius.md],
    ["lg", radius.lg],
    ["xl", radius.xl],
    ["full", radius.full],
  ];
  for (const [name, value] of radiusEntries) {
    lines.push(`  --radius-${name}: ${value}px;`);
  }

  lines.push("}");

  return lines.join("\n") + "\n";
}

// ─────────────────────────────────────────────
// 3. W3C Design Tokens JSON Generation
// ─────────────────────────────────────────────

/** W3C Design Tokens Community Group format token value */
interface DesignToken {
  $type: string;
  $value: string | number;
  $description?: string;
}

/** Token group (recursive) */
interface TokenGroup {
  [key: string]: DesignToken | TokenGroup;
}

/**
 * DesignSystem → W3C Design Tokens Format (Community Group Draft)
 * https://tr.designtokens.org/format/
 *
 * Top-level: color, typography, spacing, borderRadius
 */
export function generateTokensJSON(system: DesignSystem): string {
  const { colors, typography, spacing, radius } = system;

  const tokens: TokenGroup = {};

  // Color tokens
  const colorTokens: TokenGroup = {};

  const addColorGroup = (name: string, shades: ColorShades, seed: string) => {
    const group: TokenGroup = {};
    group["DEFAULT"] = {
      $type: "color",
      $value: seed,
      $description: `${name} seed color`,
    };
    for (const step of SHADE_STEPS) {
      group[String(step)] = {
        $type: "color",
        $value: shades[step],
      };
    }
    colorTokens[name] = group;
  };

  addColorGroup("primary", colors.primary, colors.seedColor);
  addColorGroup("secondary", colors.secondary, colors.secondarySeed);
  addColorGroup("tertiary", colors.tertiary, colors.tertiarySeed);

  colorTokens["semantic"] = {
    error: { $type: "color", $value: "#DC2626" },
    success: { $type: "color", $value: "#16A34A" },
    warning: { $type: "color", $value: "#D97706" },
    info: { $type: "color", $value: "#2563EB" },
  };

  tokens["color"] = colorTokens;

  // Typography tokens
  const typographyTokens: TokenGroup = {};

  typographyTokens["fontFamily"] = {
    base: {
      $type: "fontFamily",
      $value: typography.fontFamily,
      $description: "Default body font",
    },
  };

  if (typography.headingFamily) {
    (typographyTokens["fontFamily"] as TokenGroup)["heading"] = {
      $type: "fontFamily",
      $value: typography.headingFamily,
      $description: "Heading font",
    };
  }

  const typeSizes = computeTypeScale(typography.baseFontSize, typography.scale);
  const fontSizeGroup: TokenGroup = {};
  const lineHeightGroup: TokenGroup = {};

  for (const [key, size] of Object.entries(typeSizes)) {
    fontSizeGroup[key] = {
      $type: "dimension",
      $value: `${size}px`,
    };
    lineHeightGroup[key] = {
      $type: "number",
      $value: computeLineHeight(size),
    };
  }

  typographyTokens["fontSize"] = fontSizeGroup;
  typographyTokens["lineHeight"] = lineHeightGroup;

  tokens["typography"] = typographyTokens;

  // Spacing tokens
  const spacingTokens: TokenGroup = {};
  spacingTokens["unit"] = {
    $type: "dimension",
    $value: `${spacing.baseUnit}px`,
    $description: "Base spacing unit",
  };

  const spacingScale: TokenGroup = {};
  for (const multiplier of spacing.scale) {
    spacingScale[String(multiplier)] = {
      $type: "dimension",
      $value: `${multiplier * spacing.baseUnit}px`,
    };
  }
  spacingTokens["scale"] = spacingScale;

  tokens["spacing"] = spacingTokens;

  // Border radius tokens
  const radiusTokens: TokenGroup = {};
  const radiusEntries: [string, number, string][] = [
    ["none", radius.none, "No rounding"],
    ["sm", radius.sm, "Small rounding"],
    ["md", radius.md, "Default rounding"],
    ["lg", radius.lg, "Large rounding"],
    ["xl", radius.xl, "Extra large rounding"],
    ["full", radius.full, "Full circle"],
  ];

  for (const [name, value, desc] of radiusEntries) {
    radiusTokens[name] = {
      $type: "dimension",
      $value: `${value}px`,
      $description: desc,
    };
  }

  tokens["borderRadius"] = radiusTokens;

  return JSON.stringify(tokens, null, 2) + "\n";
}
