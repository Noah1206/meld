"use client";

import { create } from "zustand";
import type { FigmaNodeData } from "@figma-code-bridge/shared";
import type { FigmaViewerNode, FrameData } from "@/lib/figma/types";

interface FigmaState {
  // 파일 데이터
  fileKey: string | null;
  fileName: string | null;
  nodeTree: FigmaNodeData[];

  // 프레임 뷰어
  frames: FrameData[];
  activeFrameId: string | null;

  // 선택
  selectedNode: FigmaViewerNode | null;
  hoveredNodeId: string | null;

  // 줌
  zoom: number;

  // 로딩
  isLoading: boolean;
  error: string | null;

  // Actions
  setFileData: (fileKey: string, fileName: string, nodeTree: FigmaNodeData[]) => void;
  setFrames: (frames: FrameData[]) => void;
  setActiveFrame: (frameId: string) => void;
  selectNode: (node: FigmaViewerNode | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  setZoom: (zoom: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  fileKey: null,
  fileName: null,
  nodeTree: [],
  frames: [],
  activeFrameId: null,
  selectedNode: null,
  hoveredNodeId: null,
  zoom: 1,
  isLoading: false,
  error: null,
};

export const useFigmaStore = create<FigmaState>((set) => ({
  ...initialState,

  setFileData: (fileKey, fileName, nodeTree) =>
    set({ fileKey, fileName, nodeTree, error: null }),

  setFrames: (frames) =>
    set({ frames, activeFrameId: frames[0]?.nodeId ?? null }),

  setActiveFrame: (frameId) =>
    set({ activeFrameId: frameId, selectedNode: null }),

  selectNode: (node) => set({ selectedNode: node }),

  setHoveredNode: (nodeId) => set({ hoveredNodeId: nodeId }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  reset: () => set(initialState),
}));
