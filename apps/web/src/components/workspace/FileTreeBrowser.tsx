"use client";

import { useState, useMemo } from "react";
import { ChevronRight, File, Folder, Search } from "lucide-react";
import type { FileEntry } from "@figma-code-bridge/shared";

interface FileTreeBrowserProps {
  files: FileEntry[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

export function FileTreeBrowser({ files, selectedPath, onSelectFile }: FileTreeBrowserProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filteredFiles = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return flattenEntries(files).filter((e) =>
      e.path.toLowerCase().includes(q),
    );
  }, [files, search]);

  const toggleCollapse = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  if (files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-[12px] text-[#B4B4B0]">파일 트리를 로드 중...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 검색 */}
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#B4B4B0]" />
          <input
            type="text"
            placeholder="파일 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#E0E0DC] bg-white py-1.5 pl-7 pr-2.5 text-[12px] text-[#1A1A1A] placeholder:text-[#B4B4B0] focus:border-[#C0C0BC] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* 파일 리스트 */}
      <div className="flex-1 overflow-y-auto py-2">
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

  return (
    <button
      className={`relative flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[12px] transition-colors ${
        isSelected
          ? "text-[#1A1A1A]"
          : "text-[#787774] hover:text-[#1A1A1A]"
      }`}
      style={{ paddingLeft: 8 + indent * 16 }}
      onClick={() => !isDir && onSelect(entry.path)}
    >
      {isSelected && (
        <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-[#1A1A1A]" />
      )}
      {isDir ? (
        <Folder className="h-3.5 w-3.5 flex-shrink-0 text-[#787774]" />
      ) : (
        <File className="h-3.5 w-3.5 flex-shrink-0 text-[#B4B4B0]" />
      )}
      <span className="truncate">{getFileName(entry.path)}</span>
      {!isDir && entry.size != null && (
        <span className="ml-auto flex-shrink-0 text-[10px] text-[#B4B4B0]">
          {formatSize(entry.size)}
        </span>
      )}
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
            className="flex-shrink-0 px-1 text-[#B4B4B0] hover:text-[#787774]"
            style={{ marginLeft: indent * 16 }}
            onClick={() => onToggle(entry.path)}
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform duration-150 ${
                isCollapsed ? "" : "rotate-90"
              }`}
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
    if (entry.type === "file") {
      result.push(entry);
    }
    if (entry.children) {
      result.push(...flattenEntries(entry.children));
    }
  }
  return result;
}

function getFileName(filePath: string): string {
  return filePath.split("/").pop() ?? filePath;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
