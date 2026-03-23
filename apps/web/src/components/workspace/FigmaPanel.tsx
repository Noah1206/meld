"use client";

import { useState } from "react";
import { FolderTree, X, Loader2, Link as LinkIcon } from "lucide-react";
import { FigmaCanvas } from "@/components/figma-viewer/FigmaCanvas";
import { FrameSelector } from "@/components/figma-viewer/FrameSelector";
import { NodeTree } from "@/components/figma-viewer/NodeTree";
import { useFigmaStore } from "@/lib/store/figma-store";
import { useAuthStore } from "@/lib/store/auth-store";

export function FigmaPanel() {
  const [showNodeTree, setShowNodeTree] = useState(false);
  const { frames, isLoading, error } = useFigmaStore();
  const { user } = useAuthStore();
  const hasFrames = frames.length > 0;

  // Figma 미연결 상태
  if (user && !user.hasFigmaToken) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="animate-fade-in space-y-4 text-center">
          <LinkIcon className="mx-auto h-6 w-6 text-[#787774]" />
          <div>
            <p className="text-[14px] font-semibold text-[#1A1A1A]">Figma 연결 필요</p>
            <p className="mt-1 text-[13px] text-[#787774]">
              Figma 파일을 불러오려면 먼저 계정을 연결하세요.
            </p>
          </div>
          <a
            href="/api/auth/figma"
            className="inline-block rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98]"
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
      <div className="flex h-full items-center justify-center bg-white">
        <div className="flex items-center gap-2.5">
          <Loader2 className="h-5 w-5 animate-spin text-[#787774]" />
          <span className="text-[13px] text-[#787774]">Figma 파일 로딩 중...</span>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="animate-fade-in text-center">
          <p className="text-[14px] font-semibold text-[#1A1A1A]">로드 실패</p>
          <p className="mt-1 text-[13px] text-[#787774]">{error}</p>
        </div>
      </div>
    );
  }

  // Figma 미연결 (fileKey 없음)
  if (!hasFrames) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-[18px] font-bold text-[#1A1A1A]">Figma Viewer</p>
          <p className="mt-1.5 text-[13px] text-[#787774]">
            프로젝트에 Figma 파일이 연결되지 않았습니다.
          </p>
          <p className="mt-0.5 text-[12px] text-[#B4B4B0]">
            프로젝트 설정에서 Figma URL을 추가하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-white">
      {/* 프레임 탭 */}
      <FrameSelector />

      {/* 캔버스 */}
      <div className="flex-1 overflow-hidden">
        <FigmaCanvas />
      </div>

      {/* 플로팅 노드 트리 토글 */}
      <button
        onClick={() => setShowNodeTree(!showNodeTree)}
        className={`absolute left-3 top-14 z-30 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
          showNodeTree
            ? "bg-[#1A1A1A] text-white"
            : "bg-[#F7F7F5] text-[#787774] hover:bg-[#EEEEEC] hover:text-[#1A1A1A]"
        }`}
      >
        <FolderTree className="h-3.5 w-3.5" />
        노드 트리
      </button>

      {/* 플로팅 노드 트리 패널 */}
      {showNodeTree && (
        <div className="animate-fade-in absolute left-3 top-24 z-30 h-[60%] w-[280px] overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between bg-[#F7F7F5] px-3 py-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#787774]">
              Node Tree
            </h3>
            <button
              onClick={() => setShowNodeTree(false)}
              className="rounded-lg p-0.5 text-[#B4B4B0] transition-colors hover:bg-[#EEEEEC] hover:text-[#787774]"
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
