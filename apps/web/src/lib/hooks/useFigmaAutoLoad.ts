"use client";

import { useEffect, useCallback, useRef } from "react";
import { useFigmaStore } from "@/lib/store/figma-store";
import { extractFrames, buildFrameData } from "@/lib/figma/parser";
import { trpc } from "@/lib/trpc/client";

/**
 * 저장된 fileKey로 Figma 데이터를 자동 로드하는 훅
 * - 마운트 시 자동 로드
 * - sync() 함수로 수동 재동기화
 */
export function useFigmaAutoLoad(figmaFileKey: string | null | undefined) {
  const { setFileData, setFrames, setLoading, setError } = useFigmaStore();
  const loadByKeyMutation = trpc.figma.loadByKey.useMutation();
  const getImagesMutation = trpc.figma.getImages.useMutation();
  const hasLoaded = useRef(false);

  const load = useCallback(async (fileKey: string) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Figma 파일 로드
      const fileData = await loadByKeyMutation.mutateAsync({ fileKey });
      setFileData(fileData.fileKey, fileData.fileName, fileData.document.children);

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
      setError(err instanceof Error ? err.message : "Figma 파일 로드 실패");
    }
  }, [setFileData, setFrames, setLoading, setError, loadByKeyMutation, getImagesMutation]);

  // 마운트 시 자동 로드
  useEffect(() => {
    if (figmaFileKey && !hasLoaded.current) {
      hasLoaded.current = true;
      load(figmaFileKey);
    }
  }, [figmaFileKey, load]);

  // 동기화 함수
  const sync = useCallback(() => {
    if (figmaFileKey) {
      load(figmaFileKey);
    }
  }, [figmaFileKey, load]);

  return { sync, isLoading: loadByKeyMutation.isPending || getImagesMutation.isPending };
}
