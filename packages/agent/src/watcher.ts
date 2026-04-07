import * as path from "node:path";
import { watch, type FSWatcher } from "chokidar";

export interface FileChangeEvent {
  path: string; // Relative path
  changeType: "add" | "change" | "unlink";
}

export type ChangeHandler = (event: FileChangeEvent) => void;

// Directory names to exclude from watching entirely
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".output",
  ".cache",
  ".turbo",
  "coverage",
  ".DS_Store",
]);

export function createWatcher(
  rootDir: string,
  onChange: ChangeHandler,
): FSWatcher {
  const watcher = watch(rootDir, {
    ignored: (filePath: string) => {
      // Block if any path segment is in the ignore list
      const segments = filePath.split(path.sep);
      return segments.some((seg) => IGNORED_DIRS.has(seg));
    },
    persistent: true,
    ignoreInitial: true,
    depth: 10,
    usePolling: false,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  // Ignore EMFILE errors (graceful degradation)
  watcher.on("error", (err: unknown) => {
    const e = err as { code?: string; message?: string };
    if (e.code === "EMFILE" || e.code === "ENFILE") return;
    console.error("[watcher] error:", e.message);
  });

  const emit = (changeType: FileChangeEvent["changeType"], filePath: string) => {
    const relativePath = path.relative(rootDir, filePath);
    // Ignore hidden files
    if (relativePath.startsWith(".")) return;
    onChange({ path: relativePath, changeType });
  };

  watcher.on("add", (p) => emit("add", p));
  watcher.on("change", (p) => emit("change", p));
  watcher.on("unlink", (p) => emit("unlink", p));

  return watcher;
}
