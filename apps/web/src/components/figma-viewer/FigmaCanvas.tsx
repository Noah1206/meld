"use client";

import { useRef, useCallback, useState } from "react";
import { useFigmaStore } from "@/lib/store/figma-store";
import type { FigmaViewerNode } from "@/lib/figma/types";

/**
 * 프레임 이미지 위에 투명 오버레이로 노드 클릭 영역을 렌더링하는 핵심 뷰어
 */
export function FigmaCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  // activeFrameId를 키로 사용해 프레임 변경 시 imageLoaded 자동 리셋
  const [imageLoadedFor, setImageLoadedFor] = useState<string | null>(null);
  const {
    frames,
    activeFrameId,
    selectedNode,
    hoveredNodeId,
    zoom,
    selectNode,
    setHoveredNode,
    setZoom,
  } = useFigmaStore();

  const activeFrame = frames.find((f) => f.nodeId === activeFrameId);
  const imageLoaded = imageLoadedFor === activeFrameId;

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(zoom + delta);
      }
    },
    [zoom, setZoom]
  );

  if (!activeFrame) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
        프레임을 선택해주세요
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-auto bg-[#E8E8E8]"
      onWheel={handleWheel}
    >
      <div
        className="relative mx-auto my-8 transition-[width,height] duration-200"
        style={{
          width: activeFrame.width * zoom,
          height: activeFrame.height * zoom,
        }}
      >
        {/* 이미지 로딩 shimmer */}
        {!imageLoaded && (
          <div className="animate-shimmer absolute inset-0 rounded-lg" />
        )}

        {/* 프레임 이미지 */}
        <img
          src={activeFrame.imageUrl}
          alt={activeFrame.name}
          className="block h-full w-full transition-opacity duration-300"
          style={{
            imageRendering: zoom > 2 ? "pixelated" : "auto",
            opacity: imageLoaded ? 1 : 0,
          }}
          draggable={false}
          onLoad={() => setImageLoadedFor(activeFrameId)}
        />

        {/* 노드 클릭 오버레이 */}
        {renderOverlays(activeFrame.nodes, zoom, selectedNode, hoveredNodeId, selectNode, setHoveredNode)}
      </div>

      {/* 줌 표시 */}
      <div className="absolute bottom-3 right-3 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-[#6B7280] shadow-sm">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

function renderOverlays(
  nodes: FigmaViewerNode[],
  zoom: number,
  selectedNode: FigmaViewerNode | null,
  hoveredNodeId: string | null,
  selectNode: (node: FigmaViewerNode | null) => void,
  setHoveredNode: (id: string | null) => void
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];

  function walk(nodeList: FigmaViewerNode[]) {
    for (const node of nodeList) {
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNodeId === node.id;
      const { x, y, width, height } = node.relativeBox;

      elements.push(
        <div
          key={node.id}
          className="absolute cursor-pointer transition-all duration-150"
          style={{
            left: x * zoom,
            top: y * zoom,
            width: width * zoom,
            height: height * zoom,
            border: isSelected
              ? "2px solid #2E86C1"
              : isHovered
                ? "1px solid rgba(46,134,193,0.6)"
                : "1px solid transparent",
            backgroundColor: isSelected
              ? "rgba(46,134,193,0.08)"
              : isHovered
                ? "rgba(46,134,193,0.04)"
                : "transparent",
            zIndex: node.depth + (isSelected ? 100 : isHovered ? 50 : 0),
            pointerEvents: "auto",
          }}
          onClick={(e) => {
            e.stopPropagation();
            selectNode(node);
          }}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
        />
      );

      // 선택된 노드에 이름 라벨
      if (isSelected) {
        elements.push(
          <div
            key={`${node.id}-label`}
            className="animate-fade-in absolute z-[200] rounded-sm bg-[#2E86C1] px-1.5 py-0.5 text-[10px] font-medium text-white whitespace-nowrap"
            style={{
              left: x * zoom,
              top: y * zoom - 18,
            }}
          >
            {node.name}
          </div>
        );
      }

      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  }

  walk(nodes);
  return elements;
}
