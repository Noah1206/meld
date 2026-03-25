import { defineConfig } from "tsup";

export default defineConfig([
  // Main process
  {
    entry: { "main/index": "main/index.ts" },
    format: ["cjs"],
    platform: "node",
    target: "node20",
    outDir: "dist",
    clean: true,
    external: ["electron", "chokidar", "fsevents"],
    noExternal: ["@figma-code-bridge/agent", "@figma-code-bridge/shared"],
    splitting: false,
    sourcemap: true,
  },
  // Preload script
  {
    entry: { "preload/index": "preload/index.ts" },
    format: ["cjs"], // preload은 CJS 필수 (Electron 제약)
    platform: "node",
    target: "node20",
    outDir: "dist",
    external: ["electron"],
    splitting: false,
    sourcemap: true,
  },
]);
