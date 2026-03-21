"use client";

import { useState } from "react";
import { useFigmaStore } from "@/lib/store/figma-store";
import { FigmaClient } from "@/lib/figma/client";
import { extractFrames, buildFrameData } from "@/lib/figma/parser";
import { trpc } from "@/lib/trpc/client";

export function FigmaUrlInput() {
  const [url, setUrl] = useState("");
  const { isLoading, setLoading, setError, setFileData, setFrames, error } =
    useFigmaStore();

  const loadFileMutation = trpc.figma.loadFile.useMutation();
  const getImagesMutation = trpc.figma.getImages.useMutation();

  const handleLoad = async () => {
    const parsed = FigmaClient.extractFileKey(url);
    if (!parsed) {
      setError("유효하지 않은 Figma URL입니다.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Figma 파일 로드
      const fileData = await loadFileMutation.mutateAsync({
        figmaUrl: url,
      });

      setFileData(
        fileData.fileKey,
        fileData.fileName,
        fileData.document.children
      );

      // 2. 프레임 추출
      const frameNodes = extractFrames(fileData.document);
      if (frameNodes.length === 0) {
        setError("프레임을 찾을 수 없습니다.");
        return;
      }

      // 3. 프레임 이미지 가져오기
      const nodeIds = frameNodes.map((f) => f.id);
      const { images } = await getImagesMutation.mutateAsync({
        fileKey: fileData.fileKey,
        nodeIds,
      });

      // 4. 프레임 데이터 생성
      const frameDataList = frameNodes
        .filter((frame) => images[frame.id])
        .map((frame) => buildFrameData(frame, images[frame.id]));

      setFrames(frameDataList);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일 로드 실패");
    }
  };

  return (
    <div className="space-y-2 p-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Figma URL을 붙여넣으세요"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm placeholder:text-[#9CA3AF] focus:border-[#2E86C1] focus:outline-none focus:ring-1 focus:ring-[#2E86C1]"
          disabled={isLoading}
        />
        <button
          onClick={handleLoad}
          disabled={isLoading || !url.trim()}
          className="rounded-lg bg-[#2E86C1] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2573A8] disabled:opacity-50"
        >
          {isLoading ? "로딩..." : "Load"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
