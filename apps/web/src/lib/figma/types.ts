// Re-export shared types and add Figma-specific viewer types
export type {
  FigmaNodeData,
  FigmaFileResponse,
  FigmaImagesResponse,
  BoundingBox,
  Color,
  Paint,
  Effect,
  TextStyle,
} from "@figma-code-bridge/shared";

// Viewer-specific types
export interface FigmaViewerNode {
  id: string;
  name: string;
  type: string;
  // 프레임 내 상대 좌표 (이미 변환된 좌표)
  relativeBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children: FigmaViewerNode[];
  depth: number;
}

export interface FrameData {
  nodeId: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  nodes: FigmaViewerNode[];
}
