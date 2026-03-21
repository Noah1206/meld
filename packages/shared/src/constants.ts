export const FIGMA_API_BASE = "https://api.figma.com/v1";

export const COLORS = {
  primary: "#2E86C1",
  background: "#FFFFFF",
  surface: "#F8F9FA",
  textPrimary: "#1C1C1C",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  success: "#059669",
  error: "#DC2626",
  hoverOverlay: "rgba(46, 134, 193, 0.1)",
  selectedBorder: "#2E86C1",
} as const;

export const SUPPORTED_CODE_EXTENSIONS = [
  ".tsx",
  ".jsx",
  ".vue",
  ".svelte",
  ".ts",
  ".js",
  ".css",
  ".scss",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const FIGMA_IMAGE_SCALE = 2;
export const FIGMA_RATE_LIMIT_RETRY_MS = 30_000;
