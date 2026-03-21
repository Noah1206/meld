import type { FigmaNodeData, BoundingBox } from "./types";
import type { FigmaViewerNode, FrameData } from "./types";

/**
 * Figma 노드 트리에서 프레임 노드들을 추출
 */
export function extractFrames(document: { children: FigmaNodeData[] }): FigmaNodeData[] {
  const frames: FigmaNodeData[] = [];

  function walk(nodes: FigmaNodeData[]) {
    for (const node of nodes) {
      if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
        frames.push(node);
      }
      if (node.children) {
        walk(node.children);
      }
    }
  }

  // 첫 번째 페이지의 최상위 프레임들만 추출
  const firstPage = document.children[0];
  if (firstPage?.children) {
    for (const child of firstPage.children) {
      if (
        child.type === "FRAME" ||
        child.type === "COMPONENT" ||
        child.type === "COMPONENT_SET" ||
        child.type === "SECTION"
      ) {
        frames.push(child);
      }
    }
  }

  return frames;
}

/**
 * Figma 노드 트리를 뷰어용 상대 좌표 노드로 변환
 * absoluteBoundingBox → 프레임 내 상대 좌표
 */
export function buildViewerNodes(
  nodes: FigmaNodeData[],
  frameBox: BoundingBox,
  depth: number = 0
): FigmaViewerNode[] {
  return nodes
    .filter((node) => node.visible !== false && node.absoluteBoundingBox)
    .map((node) => {
      const box = node.absoluteBoundingBox!;
      const relativeBox = {
        x: box.x - frameBox.x,
        y: box.y - frameBox.y,
        width: box.width,
        height: box.height,
      };

      return {
        id: node.id,
        name: node.name,
        type: node.type,
        relativeBox,
        depth,
        children: node.children
          ? buildViewerNodes(node.children, frameBox, depth + 1)
          : [],
      };
    });
}

/**
 * 프레임 데이터를 뷰어용 구조로 변환
 */
export function buildFrameData(
  frame: FigmaNodeData,
  imageUrl: string
): FrameData {
  const box = frame.absoluteBoundingBox!;
  return {
    nodeId: frame.id,
    name: frame.name,
    imageUrl,
    width: box.width,
    height: box.height,
    nodes: frame.children
      ? buildViewerNodes(frame.children, box, 0)
      : [],
  };
}

/**
 * 노드 트리를 flat 리스트로 변환 (검색용)
 */
export function flattenNodes(nodes: FigmaViewerNode[]): FigmaViewerNode[] {
  const result: FigmaViewerNode[] = [];

  function walk(nodeList: FigmaViewerNode[]) {
    for (const node of nodeList) {
      result.push(node);
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  }

  walk(nodes);
  return result;
}
