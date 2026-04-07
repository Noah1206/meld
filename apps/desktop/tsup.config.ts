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
    external: ["electron", "fsevents", "node-pty"],
    noExternal: ["@figma-code-bridge/agent", "@figma-code-bridge/shared", "chokidar"],
    splitting: false,
    sourcemap: true,
  },
  // Preload script
  {
    entry: { "preload/index": "preload/index.ts" },
    format: ["cjs"], // preload must be CJS (Electron requirement)
    platform: "node",
    target: "node20",
    outDir: "dist",
    external: ["electron"],
    splitting: false,
    sourcemap: true,
  },
]);
