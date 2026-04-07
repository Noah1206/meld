"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronRight, Search } from "lucide-react";
import type { FileEntry } from "@figma-code-bridge/shared";

// File type → icon color + emoji mapping (VSCode-inspired)
const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  ".ts": { icon: "TS", color: "#3178C6" },
  ".tsx": { icon: "TS", color: "#3178C6" },
  ".js": { icon: "JS", color: "#F7DF1E" },
  ".jsx": { icon: "JS", color: "#F7DF1E" },
  ".json": { icon: "{}", color: "#6D9B37" },
  ".css": { icon: "#", color: "#1572B6" },
  ".scss": { icon: "S", color: "#CC6699" },
  ".html": { icon: "<>", color: "#E44D26" },
  ".md": { icon: "M", color: "#FF6B35" },
  ".yml": { icon: "Y", color: "#CB171E" },
  ".yaml": { icon: "Y", color: "#CB171E" },
  ".svg": { icon: "◇", color: "#FFB13B" },
  ".png": { icon: "▣", color: "#A259FF" },
  ".jpg": { icon: "▣", color: "#A259FF" },
  ".gif": { icon: "▣", color: "#A259FF" },
  ".env": { icon: "⚙", color: "#ECD53F" },
  ".gitignore": { icon: "◈", color: "#F05032" },
  ".lock": { icon: "🔒", color: "#888" },
};

const FOLDER_ICONS: Record<string, { icon: string; color: string }> = {
  src: { icon: "📂", color: "#42A5F5" },
  app: { icon: "🌐", color: "#42A5F5" },
  components: { icon: "🧩", color: "#7C4DFF" },
  lib: { icon: "📚", color: "#26A69A" },
  hooks: { icon: "🪝", color: "#FF7043" },
  store: { icon: "🗄️", color: "#78909C" },
  api: { icon: "⚡", color: "#FFB300" },
  public: { icon: "🌍", color: "#66BB6A" },
  node_modules: { icon: "📦", color: "#689F38" },
  ".git": { icon: "◈", color: "#F05032" },
  dist: { icon: "📦", color: "#FF8F00" },
  build: { icon: "📦", color: "#FF8F00" },
  pages: { icon: "📄", color: "#42A5F5" },
  styles: { icon: "🎨", color: "#CE93D8" },
  utils: { icon: "🔧", color: "#78909C" },
  types: { icon: "📐", color: "#3178C6" },
  test: { icon: "🧪", color: "#66BB6A" },
  tests: { icon: "🧪", color: "#66BB6A" },
  "__tests__": { icon: "🧪", color: "#66BB6A" },
};

function getFileIcon(name: string): { icon: string; color: string } {
  const ext = name.includes(".") ? "." + name.split(".").pop()! : "";
  // Special filenames
  if (name === "package.json") return { icon: "{}", color: "#6D9B37" };
  if (name === "tsconfig.json") return { icon: "TS", color: "#3178C6" };
  if (name.startsWith(".env")) return { icon: "⚙", color: "#ECD53F" };
  return FILE_ICONS[ext] || { icon: "📄", color: "#888" };
}

function getFolderIcon(name: string): { icon: string; color: string } {
  return FOLDER_ICONS[name] || { icon: "📁", color: "#90A4AE" };
}

interface FileTreeBrowserProps {
  files: FileEntry[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

export function FileTreeBrowser({ files, selectedPath, onSelectFile }: FileTreeBrowserProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    // Auto-collapse node_modules, .git, dist, build
    const autoCollapse = new Set<string>();
    const walk = (entries: FileEntry[]) => {
      for (const e of entries) {
        const name = getFileName(e.path);
        if (["node_modules", ".git", "dist", "build", ".next", ".turbo", ".cache"].includes(name)) {
          autoCollapse.add(e.path);
        }
        if (e.children) walk(e.children);
      }
    };
    walk(files);
    return autoCollapse;
  });

  const filteredFiles = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return flattenEntries(files).filter((e) => e.path.toLowerCase().includes(q));
  }, [files, search]);

  const toggleCollapse = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  if (files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-[12px] text-[#666]">Loading file tree...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="px-2 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-[#1E1E1E] py-1.5 pl-7 pr-2.5 text-[12px] text-[#E8E8E5] ring-1 ring-white/[0.06] placeholder:text-[#555] focus:ring-white/[0.12] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {filteredFiles
          ? filteredFiles.map((entry) => (
              <FileItem
                key={entry.path}
                entry={entry}
                selectedPath={selectedPath}
                onSelect={onSelectFile}
                indent={0}
              />
            ))
          : files.map((entry) => (
              <TreeEntry
                key={entry.path}
                entry={entry}
                selectedPath={selectedPath}
                collapsed={collapsed}
                onToggle={toggleCollapse}
                onSelect={onSelectFile}
                indent={0}
              />
            ))}
      </div>
    </div>
  );
}

function FileItem({
  entry,
  selectedPath,
  onSelect,
  indent,
}: {
  entry: FileEntry;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  indent: number;
}) {
  const isSelected = selectedPath === entry.path;
  const isDir = entry.type === "dir";
  const name = getFileName(entry.path);
  const iconInfo = isDir ? getFolderIcon(name) : getFileIcon(name);

  return (
    <button
      className={`group relative flex w-full items-center gap-1.5 rounded-md px-1.5 py-[3px] text-left text-[12px] transition-colors ${
        isSelected
          ? "bg-[#37373D] text-[#E8E8E5]"
          : "text-[#CCCCCC] hover:bg-[#2A2D2E]"
      }`}
      style={{ paddingLeft: 6 + indent * 16 }}
      onClick={() => !isDir && onSelect(entry.path)}
    >
      {/* Icon */}
      <span
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[2px] text-[8px] font-bold leading-none"
        style={{ color: iconInfo.color }}
      >
        {iconInfo.icon}
      </span>
      {/* Name */}
      <span className={`truncate ${isDir ? "font-medium" : ""}`} style={isDir ? { color: iconInfo.color } : undefined}>
        {name}
      </span>
    </button>
  );
}

function TreeEntry({
  entry,
  selectedPath,
  collapsed,
  onToggle,
  onSelect,
  indent,
}: {
  entry: FileEntry;
  selectedPath: string | null;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  indent: number;
}) {
  const isCollapsed = collapsed.has(entry.path);
  const isDir = entry.type === "dir";
  const hasChildren = isDir && entry.children && entry.children.length > 0;

  return (
    <>
      <div className="flex items-center">
        {hasChildren && (
          <button
            className="flex-shrink-0 px-0.5 text-[#858585] hover:text-[#CCCCCC] transition-colors"
            style={{ marginLeft: indent * 16 }}
            onClick={() => onToggle(entry.path)}
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform duration-150 ${isCollapsed ? "" : "rotate-90"}`}
            />
          </button>
        )}
        <FileItem
          entry={entry}
          selectedPath={selectedPath}
          onSelect={isDir ? () => onToggle(entry.path) : onSelect}
          indent={hasChildren ? 0 : indent}
        />
      </div>
      {hasChildren &&
        !isCollapsed &&
        entry.children!.map((child) => (
          <TreeEntry
            key={child.path}
            entry={child}
            selectedPath={selectedPath}
            collapsed={collapsed}
            onToggle={onToggle}
            onSelect={onSelect}
            indent={indent + 1}
          />
        ))}
    </>
  );
}

function flattenEntries(entries: FileEntry[]): FileEntry[] {
  const result: FileEntry[] = [];
  for (const entry of entries) {
    if (entry.type === "file") result.push(entry);
    if (entry.children) result.push(...flattenEntries(entry.children));
  }
  return result;
}

function getFileName(filePath: string): string {
  return filePath.split("/").pop() ?? filePath;
}
