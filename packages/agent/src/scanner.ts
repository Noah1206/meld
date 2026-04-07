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

  // Default ignore patterns
  ig.add(DEFAULT_IGNORE);

  // Load .gitignore
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

    // Check .gitignore
    if (ig.ignores(relativePath)) continue;

    if (item.isDirectory()) {
      const children = scanDir(fullPath, rootDir, ig);
      // Skip empty directories
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

      // Size check with try-catch (prevents EMFILE errors)
      let size: number | undefined;
      try {
        size = fs.statSync(fullPath).size;
        if (size > MAX_FILE_SIZE) continue;
      } catch {
        // On EMFILE or other errors, add without size
      }

      entries.push({
        path: relativePath,
        type: "file",
        size,
      });
    }
  }

  return entries.sort((a, b) => {
    // Directories first
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });
}
