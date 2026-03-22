import * as path from "node:path";
import { watch, type FSWatcher } from "chokidar";

export interface FileChangeEvent {
  path: string; // 상대 경로
  changeType: "add" | "change" | "unlink";
}

export type ChangeHandler = (event: FileChangeEvent) => void;

const IGNORED_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/.cache/**",
  "**/.turbo/**",
  "**/coverage/**",
];

export function createWatcher(
  rootDir: string,
  onChange: ChangeHandler,
): FSWatcher {
  const watcher = watch(rootDir, {
    ignored: IGNORED_PATTERNS,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 50,
    },
  });

  const emit = (changeType: FileChangeEvent["changeType"], filePath: string) => {
    const relativePath = path.relative(rootDir, filePath);
    // 숨김 파일 무시
    if (relativePath.startsWith(".")) return;
    onChange({ path: relativePath, changeType });
  };

  watcher.on("add", (p) => emit("add", p));
  watcher.on("change", (p) => emit("change", p));
  watcher.on("unlink", (p) => emit("unlink", p));

  return watcher;
}
