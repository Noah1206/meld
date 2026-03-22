"use client";

import { useState } from "react";
import { FolderTree, X, Loader2, Link as LinkIcon } from "lucide-react";
import { FigmaCanvas } from "@/components/figma-viewer/FigmaCanvas";
import { FrameSelector } from "@/components/figma-viewer/FrameSelector";
import { NodeTree } from "@/components/figma-viewer/NodeTree";
import { useFigmaStore } from "@/lib/store/figma-store";
import { useAuthStore } from "@/lib/store/auth-store";

/**
 * 좌측 패널: Figma 뷰어 + 플로팅 노드 트리
 */
export function FigmaPanel() {
  const [showNodeTree, setShowNodeTree] = useState(false);
  const { frames, isLoading, error } = useFigmaStore();
  const { user } = useAuthStore();
  const hasFrames = frames.length > 0;

  // Figma 미연결 상태
  if (user && !user.hasFigmaToken) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-fade-in space-y-3 text-center">
          <LinkIcon className="mx-auto h-8 w-8 text-amber-500" />
          <p className="text-sm font-medium text-[#1C1C1C]">Figma 연결 필요</p>
          <p className="text-xs text-[#6B7280]">
            Figma 파일을 불러오려면 먼저 계정을 연결하세요.
          </p>
          <a
            href="/api/auth/figma"
            className="inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-amber-700"
          >
            Figma 연결
          </a>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#2E86C1]" />
          <span className="text-sm text-[#6B7280]">Figma 파일 로딩 중...</span>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-fade-in text-center">
          <p className="text-sm font-medium text-red-500">로드 실패</p>
          <p className="mt-1 text-xs text-[#6B7280]">{error}</p>
        </div>
      </div>
    );
  }

  // Figma 미연결 (fileKey 없음)
  if (!hasFrames) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-[#1C1C1C]">Figma Viewer</p>
          <p className="mt-1 text-sm text-[#6B7280]">
            프로젝트에 Figma 파일이 연결되지 않았습니다.
          </p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">
            프로젝트 설정에서 Figma URL을 추가하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* 프레임 탭 */}
      <FrameSelector />

      {/* 캔버스 */}
      <div className="flex-1 overflow-hidden">
        <FigmaCanvas />
      </div>

      {/* 플로팅 노드 트리 토글 */}
      <button
        onClick={() => setShowNodeTree(!showNodeTree)}
        className={`absolute left-3 top-14 z-30 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] ${
          showNodeTree
            ? "bg-[#2E86C1] text-white"
            : "bg-white text-[#374151] hover:bg-[#F3F4F6]"
        }`}
      >
        <FolderTree className="h-3.5 w-3.5" />
        노드 트리
      </button>

      {/* 플로팅 노드 트리 패널 */}
      {showNodeTree && (
        <div className="animate-fade-in absolute left-3 top-24 z-30 h-[60%] w-[280px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-3 py-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Node Tree
            </h3>
            <button
              onClick={() => setShowNodeTree(false)}
              className="rounded-md p-0.5 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#6B7280]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="h-[calc(100%-33px)] overflow-y-auto">
            <NodeTree />
          </div>
        </div>
      )}
    </div>
  );
}
