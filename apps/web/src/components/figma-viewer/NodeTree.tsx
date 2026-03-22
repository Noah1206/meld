"use client";

import { useState, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { useFigmaStore } from "@/lib/store/figma-store";
import type { FigmaViewerNode } from "@/lib/figma/types";
import { flattenNodes } from "@/lib/figma/parser";

export function NodeTree() {
  const { frames, activeFrameId, selectedNode, selectNode, setHoveredNode } =
    useFigmaStore();
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const activeFrame = frames.find((f) => f.nodeId === activeFrameId);
  const nodes = useMemo(() => activeFrame?.nodes ?? [], [activeFrame]);

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return null;
    const flat = flattenNodes(nodes);
    const q = search.toLowerCase();
    return flat.filter(
      (n) =>
        n.name.toLowerCase().includes(q) || n.type.toLowerCase().includes(q)
    );
  }, [nodes, search]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!activeFrame) {
    return (
      <div className="p-3 text-sm text-[#6B7280]">
        Figma 파일을 로드하면 노드 트리가 표시됩니다.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 검색 */}
      <div className="border-b border-[#E5E7EB] p-2">
        <input
          type="text"
          placeholder="노드 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs placeholder:text-[#9CA3AF] focus:border-[#2E86C1] focus:outline-none"
        />
      </div>

      {/* 노드 리스트 */}
      <div className="flex-1 overflow-y-auto py-1">
        {filteredNodes
          ? filteredNodes.map((node) => (
              <NodeItem
                key={node.id}
                node={node}
                selectedId={selectedNode?.id ?? null}
                onSelect={selectNode}
                onHover={setHoveredNode}
                indent={0}
              />
            ))
          : nodes.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                selectedId={selectedNode?.id ?? null}
                collapsed={collapsed}
                onToggle={toggleCollapse}
                onSelect={selectNode}
                onHover={setHoveredNode}
                indent={0}
              />
            ))}
      </div>
    </div>
  );
}

// 단일 아이템 (검색 결과)
function NodeItem({
  node,
  selectedId,
  onSelect,
  onHover,
  indent,
}: {
  node: FigmaViewerNode;
  selectedId: string | null;
  onSelect: (n: FigmaViewerNode) => void;
  onHover: (id: string | null) => void;
  indent: number;
}) {
  const isSelected = selectedId === node.id;
  return (
    <button
      className={`flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs transition-colors ${
        isSelected
          ? "bg-blue-50 text-[#2E86C1]"
          : "text-[#374151] hover:bg-[#F3F4F6]"
      }`}
      style={{ paddingLeft: 8 + indent * 12 }}
      onClick={() => onSelect(node)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      <span className="text-[10px] text-[#9CA3AF]">{nodeIcon(node.type)}</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// 트리 노드 (재귀)
function TreeNode({
  node,
  selectedId,
  collapsed,
  onToggle,
  onSelect,
  onHover,
  indent,
}: {
  node: FigmaViewerNode;
  selectedId: string | null;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (n: FigmaViewerNode) => void;
  onHover: (id: string | null) => void;
  indent: number;
}) {
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <>
      <div className="flex items-center">
        {hasChildren && (
          <button
            className="flex-shrink-0 px-1 text-[#9CA3AF] hover:text-[#6B7280]"
            style={{ marginLeft: indent * 12 }}
            onClick={() => onToggle(node.id)}
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform duration-150 ${
                isCollapsed ? "" : "rotate-90"
              }`}
            />
          </button>
        )}
        <NodeItem
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
          onHover={onHover}
          indent={hasChildren ? 0 : indent}
        />
      </div>
      {hasChildren &&
        !isCollapsed &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            selectedId={selectedId}
            collapsed={collapsed}
            onToggle={onToggle}
            onSelect={onSelect}
            onHover={onHover}
            indent={indent + 1}
          />
        ))}
    </>
  );
}

function nodeIcon(type: string) {
  switch (type) {
    case "FRAME":
      return "◻";
    case "GROUP":
      return "◫";
    case "TEXT":
      return "T";
    case "RECTANGLE":
      return "□";
    case "ELLIPSE":
      return "○";
    case "VECTOR":
      return "✦";
    case "COMPONENT":
      return "◆";
    case "INSTANCE":
      return "◇";
    default:
      return "·";
  }
}
