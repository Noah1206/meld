/**
 * Seed Color → auto-generate 10-step palette (50, 100, 200 ... 900)
 * Adjusts lightness/saturation via HSL to produce Material-style palettes
 */

export interface ColorShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string; // seed color baseline
  600: string;
  700: string;
  800: string;
  900: string;
}

// Hex → HSL
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l * 100];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [h * 360, s * 100, l * 100];
}

// HSL → Hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Lightness mapping table (50 → 900)
const LIGHTNESS_MAP: Record<keyof ColorShades, number> = {
  50: 95,
  100: 90,
  200: 80,
  300: 70,
  400: 60,
  500: 50, // base
  600: 40,
  700: 30,
  800: 20,
  900: 10,
};

// Saturation adjustment (slightly reduce saturation at extreme lightness for natural look)
const SATURATION_ADJUST: Record<keyof ColorShades, number> = {
  50: -20,
  100: -15,
  200: -10,
  300: -5,
  400: 0,
  500: 0,
  600: 0,
  700: -5,
  800: -10,
  900: -15,
};

/**
 * Seed hex color → generate 10-step color palette
 */
export function generatePalette(seedHex: string): ColorShades {
  const [h, s] = hexToHsl(seedHex);

  const shades = {} as ColorShades;
  for (const [key, targetL] of Object.entries(LIGHTNESS_MAP)) {
    const step = Number(key) as keyof ColorShades;
    const adjS = Math.max(0, Math.min(100, s + SATURATION_ADJUST[step]));
    shades[step] = hslToHex(h, adjS, targetL);
  }

  return shades;
}

/**
 * Determine whether a hex color is light or dark (for text color selection)
 */
export function isLightColor(hex: string): boolean {
  const [, , l] = hexToHsl(hex);
  return l > 55;
}

/**
 * Default preset themes
 */
export const COLOR_PRESETS = {
  fidelity: { primary: "#EC1313", secondary: "#1A73E8", tertiary: "#7B1FA2" },
  ocean: { primary: "#0066CC", secondary: "#00838F", tertiary: "#1565C0" },
  forest: { primary: "#2E7D32", secondary: "#558B2F", tertiary: "#00695C" },
  sunset: { primary: "#E65100", secondary: "#F57C00", tertiary: "#BF360C" },
  midnight: { primary: "#1A1A2E", secondary: "#16213E", tertiary: "#0F3460" },
  candy: { primary: "#E91E63", secondary: "#9C27B0", tertiary: "#FF5722" },
} as const;

export type PresetName = keyof typeof COLOR_PRESETS;
