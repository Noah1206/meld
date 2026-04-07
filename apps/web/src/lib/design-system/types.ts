import type { ColorShades } from "./palette";

export type ThemeMode = "light" | "dark";

export interface DesignTypography {
  fontFamily: string;
  headingFamily?: string; // Heading font (falls back to fontFamily if absent)
  baseFontSize: number; // px
  scale: number; // Typography scale ratio (1.2 = minor third, 1.25 = major third)
}

export interface DesignColors {
  seedColor: string; // hex (primary seed)
  secondarySeed: string; // hex (secondary seed)
  tertiarySeed: string; // hex (tertiary seed)
  primary: ColorShades;
  secondary: ColorShades;
  tertiary: ColorShades;
}

export interface DesignSpacing {
  baseUnit: number; // px (default 4)
  scale: number[]; // multipliers [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16]
}

export interface DesignRadius {
  none: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface DesignSystem {
  id: string;
  name: string;
  mode: ThemeMode;
  colors: DesignColors;
  typography: DesignTypography;
  spacing: DesignSpacing;
  radius: DesignRadius;
  customDesignMd: string; // User-written DESIGN.md content
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_TYPOGRAPHY: DesignTypography = {
  fontFamily: "Inter",
  baseFontSize: 16,
  scale: 1.25,
};

export const DEFAULT_SPACING: DesignSpacing = {
  baseUnit: 4,
  scale: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16],
};

export const DEFAULT_RADIUS: DesignRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
