import type { DesignSystem } from "./types";
import type { ColorShades } from "./palette";

/**
 * DesignSystem 객체 → DESIGN.md 마크다운 자동 생성
 * AI 코딩 에이전트가 읽을 수 있는 구조화된 형식
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
- **Primary**: \`${colors.primary[500]}\`
- **Secondary**: \`${colors.secondary[500]}\`
- **Tertiary**: \`${colors.tertiary[500]}\`
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

## Guidelines

이 디자인 시스템을 따라 코드를 작성하세요:
- 색상은 반드시 위 팔레트에서 선택
- 폰트 사이즈는 Type Scale 사용
- 여백은 Spacing 스케일 사용
- ${mode === "dark" ? "다크 모드 기준으로 배경/전경 색상 적용" : "라이트 모드 기준으로 배경/전경 색상 적용"}

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
