"use client";

import { useState, useCallback, useRef } from "react";
import type { FileEntry } from "@figma-code-bridge/shared";

// File System Access API — 브라우저에서 로컬 폴더 직접 접근
// Chrome/Edge 지원, Safari/Firefox 미지원

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
  }
}

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".turbo",
  ".cache", ".meld", "coverage", ".DS_Store",
]);

const CODE_EXTENSIONS = new Set([
  ".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs",
  ".css", ".scss", ".less", ".html", ".json", ".md",
  ".vue", ".svelte", ".astro", ".yaml", ".yml",
  ".env", ".gitignore", ".prettierrc", ".eslintrc",
]);

interface UseFileSystemAccessReturn {
  supported: boolean;
  connected: boolean;
  fileTree: FileEntry[];
  projectName: string | null;
  openFolder: () => Promise<boolean>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<boolean>;
  refreshTree: () => Promise<void>;
}

export function useFileSystemAccess(): UseFileSystemAccessReturn {
  const [connected, setConnected] = useState(false);
  const [fileTree, setFileTree] = useState<FileEntry[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const rootHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  const supported = typeof window !== "undefined" && "showDirectoryPicker" in window;

  const scanDir = useCallback(async (
    dirHandle: FileSystemDirectoryHandle,
    basePath: string,
    depth: number,
  ): Promise<FileEntry[]> => {
    if (depth > 5) return [];
    const entries: FileEntry[] = [];

    const iter = dirHandle as unknown as AsyncIterable<[string, FileSystemHandle]>;
    for await (const [name, handle] of iter) {
      if (IGNORE_DIRS.has(name)) continue;
      if (name.startsWith(".") && name !== ".env") continue;

      const fullPath = basePath ? `${basePath}/${name}` : name;

      if (handle.kind === "directory") {
        const children = await scanDir(handle as FileSystemDirectoryHandle, fullPath, depth + 1);
        entries.push({ path: fullPath, type: "dir", children });
      } else {
        const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";
        if (CODE_EXTENSIONS.has(ext) || !ext) {
          entries.push({ path: fullPath, type: "file" });
        }
      }
    }

    return entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.path.localeCompare(b.path);
    });
  }, []);

  const resolveFileHandle = useCallback(async (
    rootHandle: FileSystemDirectoryHandle,
    filePath: string,
  ): Promise<FileSystemFileHandle> => {
    const parts = filePath.split("/");
    let current: FileSystemDirectoryHandle = rootHandle;

    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i]);
    }

    return current.getFileHandle(parts[parts.length - 1]);
  }, []);

  const resolveDirHandle = useCallback(async (
    rootHandle: FileSystemDirectoryHandle,
    dirPath: string,
  ): Promise<FileSystemDirectoryHandle> => {
    const parts = dirPath.split("/");
    let current: FileSystemDirectoryHandle = rootHandle;

    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true });
    }

    return current;
  }, []);

  const openFolder = useCallback(async (): Promise<boolean> => {
    if (!supported || !window.showDirectoryPicker) return false;

    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      rootHandleRef.current = handle;
      setProjectName(handle.name);
      setConnected(true);

      const tree = await scanDir(handle, "", 0);
      setFileTree(tree);
      return true;
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Failed to open folder:", err);
      }
      return false;
    }
  }, [supported, scanDir]);

  const readFile = useCallback(async (path: string): Promise<string> => {
    const root = rootHandleRef.current;
    if (!root) throw new Error("No folder opened");

    const fileHandle = await resolveFileHandle(root, path);
    const file = await fileHandle.getFile();
    return file.text();
  }, [resolveFileHandle]);

  const writeFile = useCallback(async (path: string, content: string): Promise<boolean> => {
    const root = rootHandleRef.current;
    if (!root) return false;

    try {
      const parts = path.split("/");
      let dirHandle = root;
      if (parts.length > 1) {
        dirHandle = await resolveDirHandle(root, parts.slice(0, -1).join("/"));
      }

      const fileHandle = await dirHandle.getFileHandle(parts[parts.length - 1], { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (err) {
      console.error("Failed to write file:", err);
      return false;
    }
  }, [resolveDirHandle]);

  const refreshTree = useCallback(async () => {
    const root = rootHandleRef.current;
    if (!root) return;

    const tree = await scanDir(root, "", 0);
    setFileTree(tree);
  }, [scanDir]);

  return {
    supported,
    connected,
    fileTree,
    projectName,
    openFolder,
    readFile,
    writeFile,
    refreshTree,
  };
}
