import type { ColorShades } from "./palette";

export type ThemeMode = "light" | "dark";

export interface DesignTypography {
  fontFamily: string;
  headingFamily?: string; // 제목 전용 폰트 (없으면 fontFamily 사용)
  baseFontSize: number; // px
  scale: number; // 타이포그래피 스케일 비율 (1.2 = minor third, 1.25 = major third)
}

export interface DesignColors {
  seedColor: string; // hex
  primary: ColorShades;
  secondary: ColorShades;
  tertiary: ColorShades;
}

export interface DesignSpacing {
  baseUnit: number; // px (기본 4)
  scale: number[]; // 배수 [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16]
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
  customDesignMd: string; // 유저가 직접 작성한 DESIGN.md 내용
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
