import * as fs from "node:fs";
import * as path from "node:path";
import ignore from "ignore";
import type { FileEntry } from "./protocol.js";

const DEFAULT_IGNORE = [
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
  "*.log",
];

const SUPPORTED_EXTENSIONS = new Set([
  ".tsx", ".jsx", ".vue", ".svelte",
  ".ts", ".js", ".mjs", ".cjs",
  ".css", ".scss", ".less",
  ".html", ".json", ".md",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function scanProject(rootDir: string): FileEntry[] {
  const ig = ignore();

  // 기본 무시 패턴
  ig.add(DEFAULT_IGNORE);

  // .gitignore 로드
  const gitignorePath = path.join(rootDir, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    ig.add(content);
  }

  return scanDir(rootDir, rootDir, ig);
}

function scanDir(
  dir: string,
  rootDir: string,
  ig: ReturnType<typeof ignore>,
): FileEntry[] {
  const entries: FileEntry[] = [];

  let items: fs.Dirent[];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return entries;
  }

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(rootDir, fullPath);

    // .gitignore 체크
    if (ig.ignores(relativePath)) continue;

    if (item.isDirectory()) {
      const children = scanDir(fullPath, rootDir, ig);
      // 빈 디렉토리 제외
      if (children.length > 0) {
        entries.push({
          path: relativePath,
          type: "dir",
          children,
        });
      }
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

      const stat = fs.statSync(fullPath);
      if (stat.size > MAX_FILE_SIZE) continue;

      entries.push({
        path: relativePath,
        type: "file",
        size: stat.size,
      });
    }
  }

  return entries.sort((a, b) => {
    // 디렉토리 먼저
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });
}
