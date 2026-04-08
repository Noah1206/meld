import type { DesignSystem } from "./types";
import type { ColorShades } from "./palette";

/**
 * DesignSystem object -> auto-generate DESIGN.md markdown
 * Structured format readable by AI coding agents
 */
export function generateDesignMd(ds: DesignSystem): string {
  const { colors, typography, spacing, radius, mode } = ds;

  const typeSizes = computeTypeScale(typography);

  return `# ${ds.name} Design System

## Theme Mode
- **Mode**: ${mode}
- **Background**: ${mode === "light" ? "#FFFFFF" : "#0A0A0A"}
- **Foreground**: ${mode === "light" ? "#0A0A0A" : "#FAFAFA"}

## Color Palette

### Primary
| Step | Hex |
|------|-----|
${colorTable(colors.primary)}

### Secondary
| Step | Hex |
|------|-----|
${colorTable(colors.secondary)}

### Tertiary
| Step | Hex |
|------|-----|
${colorTable(colors.tertiary)}

### Semantic Colors
- **Primary**: \`${colors.seedColor}\`
- **Secondary**: \`${colors.secondarySeed ?? colors.secondary[500]}\`
- **Tertiary**: \`${colors.tertiarySeed ?? colors.tertiary[500]}\`

### Gradient
- **Brand Gradient**: \`linear-gradient(135deg, ${colors.seedColor}, ${colors.secondarySeed ?? colors.secondary[500]}, ${colors.tertiarySeed ?? colors.tertiary[500]})\`
- **Primary Gradient**: \`linear-gradient(135deg, ${colors.primary[400]}, ${colors.primary[600]})\`
- **Background**: \`${mode === "light" ? colors.primary[50] : colors.primary[900]}\`
- **Surface**: \`${mode === "light" ? "#FFFFFF" : colors.primary[800]}\`
- **Error**: \`#DC2626\`
- **Success**: \`#16A34A\`

## Typography

- **Font Family**: \`${typography.fontFamily}\`${typography.headingFamily ? `\n- **Heading Font**: \`${typography.headingFamily}\`` : ""}
- **Base Size**: ${typography.baseFontSize}px
- **Scale Ratio**: ${typography.scale} (${getScaleName(typography.scale)})

### Type Scale
| Level | Size | Usage |
|-------|------|-------|
| xs | ${typeSizes.xs}px | Caption, helper text |
| sm | ${typeSizes.sm}px | Small text, labels |
| base | ${typeSizes.base}px | Body text |
| lg | ${typeSizes.lg}px | Large body, subtitle |
| xl | ${typeSizes.xl}px | Section heading (h4) |
| 2xl | ${typeSizes["2xl"]}px | Sub-heading (h3) |
| 3xl | ${typeSizes["3xl"]}px | Heading (h2) |
| 4xl | ${typeSizes["4xl"]}px | Page title (h1) |

## Spacing

- **Base Unit**: ${spacing.baseUnit}px
- **Scale**: ${spacing.scale.map((s) => `${s * spacing.baseUnit}px`).join(", ")}

## Border Radius

| Token | Value |
|-------|-------|
| none | ${radius.none}px |
| sm | ${radius.sm}px |
| md | ${radius.md}px |
| lg | ${radius.lg}px |
| xl | ${radius.xl}px |
| full | ${radius.full}px |

## Components

### Buttons
- **Filled**: Primary action — use \`primary\` color background
- **Gradient**: Hero/CTA — use \`linear-gradient(135deg, primary, secondary)\`
- **Gradient Alt**: Alternative — use \`linear-gradient(to right, primary, tertiary)\`
- **Secondary**: Less prominent — use \`secondary\` color
- **Soft**: Subtle emphasis — use \`primary/15\` background with \`primary\` text
- **Outlined**: Border only — 2px \`primary\` border
- **Gradient Border**: Outlined with gradient border
- **Ghost**: No background, subtle hover
- **Link/Text**: Inline text actions
- **Pill**: Rounded-full variant, supports gradient fill
- Sizes: LG (py-3.5), MD (py-2.5), SM (py-1.5)

### Badges
- **Filled**: White text on \`primary\` background
- **Soft**: \`primary/15\` background with \`primary\` text
- **Outline**: \`primary\` border
- **Status**: Success (#16A34A), Error (#DC2626), Warning (#D97706), Info (#2563EB)

### Controls
- **Toggle**: ${radius.xl}px radius, \`primary\` when on
- **Checkbox**: ${radius.md}px radius, \`primary\` fill when checked
- **Radio**: Circle, \`primary\` dot when selected

### Inputs
- Background: #F7F7F5
- Focus ring: 2px \`primary\`
- Border radius: ${radius.xl}px

## Elevation & Shadows

| Level | Value | Usage |
|-------|-------|-------|
| none | none | Flat elements |
| sm | 0 1px 2px rgba(0,0,0,0.05) | Subtle lift (cards, buttons) |
| md | 0 4px 6px -1px rgba(0,0,0,0.1) | Floating elements (dropdowns) |
| lg | 0 10px 15px -3px rgba(0,0,0,0.1) | Elevated surfaces (modals) |
| xl | 0 20px 25px -5px rgba(0,0,0,0.1) | High emphasis (dialogs) |
| glow | 0 0 20px ${colors.primary[400]}33 | Brand glow effect |

## Layout Principles

- **Base grid**: ${spacing.baseUnit}px — ALL spacing must be multiples of this
- **Section padding**: ${spacing.baseUnit * 8}px top/bottom, ${spacing.baseUnit * 4}px left/right
- **Card padding**: ${spacing.baseUnit * 3}px
- **Component gap**: ${spacing.baseUnit * 2}px (elements within a group)
- **Section gap**: ${spacing.baseUnit * 8}px (between major sections)
- **Max content width**: 1200px (centered)
- **Whitespace ratio**: Content should occupy ~60-70% of available space

## Visual Atmosphere

- **Design philosophy**: Clean, modern, professional with subtle depth
- **Density**: Comfortable — generous whitespace, not cramped
- **Motion**: Subtle and purposeful — 200ms ease transitions, no bouncy/playful
- **Surface treatment**: ${mode === "dark" ? "Layered dark surfaces (#0A0A0A → #111 → #1A1A1A → #222)" : "White/gray layered surfaces (#FFF → #F8F8F8 → #F0F0F0)"}
- **Accent usage**: Primary color for CTAs and key actions only — avoid overuse
- **Glass effects**: Use \`backdrop-filter: blur(10px)\` with \`rgba(${mode === "dark" ? "255,255,255,0.05" : "0,0,0,0.02"})\` for elevated overlays

## Responsive Behavior

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, bottom nav, stacked cards |
| Tablet | 640-1024px | Two columns, collapsible sidebar |
| Desktop | > 1024px | Full layout, sidebar + main + optional panel |
- Touch targets: minimum 44x44px on mobile
- Font scaling: base size stays same, headings reduce by 1 step on mobile

## Do's and Don'ts

### DO
- Use semantic color tokens (primary, secondary) — never raw hex in components
- Follow the spacing scale — every margin/padding must be a scale value
- Use the type scale — every text size must match a defined level
- Add hover/focus/active states to all interactive elements
- Use consistent border-radius from the radius tokens
- Pair gradients with the defined brand gradient only

### DON'T
- Don't hardcode colors — use CSS variables or design tokens
- Don't use arbitrary spacing (like 13px, 7px) — stick to the scale
- Don't mix font families — only use the defined families
- Don't use more than 3 font weights per page
- Don't create new shadows — use only the defined elevation levels
- Don't ignore dark/light mode — every surface must work in both

${ds.customDesignMd ? `## Custom Guidelines\n\n${ds.customDesignMd}` : ""}`.trim();
}

function colorTable(shades: ColorShades): string {
  return Object.entries(shades)
    .map(([step, hex]) => `| ${step} | \`${hex}\` |`)
    .join("\n");
}

function computeTypeScale(t: { baseFontSize: number; scale: number }): Record<string, number> {
  const base = t.baseFontSize;
  const r = t.scale;
  return {
    xs: Math.round(base / (r * r)),
    sm: Math.round(base / r),
    base: base,
    lg: Math.round(base * r),
    xl: Math.round(base * r * r),
    "2xl": Math.round(base * r * r * r),
    "3xl": Math.round(base * Math.pow(r, 4)),
    "4xl": Math.round(base * Math.pow(r, 5)),
  };
}

function getScaleName(ratio: number): string {
  if (ratio <= 1.125) return "Major Second";
  if (ratio <= 1.2) return "Minor Third";
  if (ratio <= 1.25) return "Major Third";
  if (ratio <= 1.333) return "Perfect Fourth";
  if (ratio <= 1.5) return "Perfect Fifth";
  return "Custom";
}
