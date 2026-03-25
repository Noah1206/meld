"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, ExternalLink, Loader2, MousePointerClick, FileCode, AlertTriangle } from "lucide-react";
import { useAgentStore, type InspectedElement } from "@/lib/store/agent-store";
import { matchByNaming } from "@/lib/mapping/engine";
import type { FileEntry } from "@figma-code-bridge/shared";

interface PreviewFrameProps {
  url: string;
  framework?: string | null;
}

// FileEntry 트리에서 플랫 파일 경로 추출
function flattenPaths(entries: FileEntry[]): string[] {
  const paths: string[] = [];
  for (const e of entries) {
    if (e.type === "file") paths.push(e.path);
    if (e.children) paths.push(...flattenPaths(e.children as FileEntry[]));
  }
  return paths;
}

export function PreviewFrame({ url, framework }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const retryCountRef = useRef(0);
  const lastWriteTimestamp = useAgentStore((s) => s.lastWriteTimestamp);
  const inspectorEnabled = useAgentStore((s) => s.inspectorEnabled);
  const inspectedElement = useAgentStore((s) => s.inspectedElement);
  const setInspectorEnabled = useAgentStore((s) => s.setInspectorEnabled);
  const setInspectedElement = useAgentStore((s) => s.setInspectedElement);
  const setSelectedFilePath = useAgentStore((s) => s.setSelectedFilePath);
  const fileTree = useAgentStore((s) => s.fileTree);

  const filePaths = useMemo(() => flattenPaths(fileTree as FileEntry[]), [fileTree]);

  // 파일 쓰기 후 자동 리프레시 (HMR이 안 될 경우 대비)
  useEffect(() => {
    if (lastWriteTimestamp === 0) return;
    const timer = setTimeout(() => {
      if (iframeRef.current) {
        setIsLoading(true);
        const separator = url.includes("?") ? "&" : "?";
        iframeRef.current.src = `${url}${separator}_t=${lastWriteTimestamp}`;
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [lastWriteTimestamp, url]);

  // postMessage 리스너: iframe에서 엘리먼트 선택 이벤트 수신
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "meld:element-selected") {
        const payload = e.data.payload as InspectedElement;
        setInspectedElement(payload);

        // React 컴포넌트명으로 파일 매핑 시도
        if (payload.componentName && filePaths.length > 0) {
          const match = matchByNaming(payload.componentName, filePaths);
          if (match) {
            setSelectedFilePath(match.filePath);
          }
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [filePaths, setInspectedElement, setSelectedFilePath]);

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      setHasError(false);
      iframeRef.current.src = url;
    }
  };

  // dev server 준비 안 됐을 때 자동 재시도 (최대 10회, 3초 간격)
  useEffect(() => {
    if (!hasError || retryCountRef.current >= 10) return;
    const timer = setTimeout(() => {
      retryCountRef.current += 1;
      handleRefresh();
    }, 3000);
    return () => clearTimeout(timer);
  }, [hasError]);

  const toggleInspector = useCallback(() => {
    const next = !inspectorEnabled;
    setInspectorEnabled(next);
    if (!next) setInspectedElement(null);

    // iframe에 토글 메시지 전송
    iframeRef.current?.contentWindow?.postMessage(
      { type: "meld:toggle-inspector", enabled: next },
      "*",
    );
  }, [inspectorEnabled, setInspectorEnabled, setInspectedElement]);

  // 매핑된 파일 경로
  const mappedFilePath = useMemo(() => {
    if (!inspectedElement?.componentName || filePaths.length === 0) return null;
    return matchByNaming(inspectedElement.componentName, filePaths)?.filePath ?? null;
  }, [inspectedElement, filePaths]);

  const handleFileClick = useCallback(() => {
    if (mappedFilePath) setSelectedFilePath(mappedFilePath);
  }, [mappedFilePath, setSelectedFilePath]);

  return (
    <div className="flex h-full flex-col bg-[#F7F7F5]">
      {/* 미니멀 툴바 */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        {framework && (
          <span className="rounded-md bg-[#EEEEEC] px-1.5 py-0.5 text-[10px] font-medium text-[#787774]">
            {framework}
          </span>
        )}
        <div className="flex-1" />

        {/* 인스펙터 토글 */}
        <button
          onClick={toggleInspector}
          className={`rounded-lg p-1.5 transition-colors ${
            inspectorEnabled
              ? "bg-blue-100 text-blue-600"
              : "text-[#B4B4B0] hover:bg-[#EEEEEC] hover:text-[#787774]"
          }`}
          title={inspectorEnabled ? "인스펙터 끄기" : "엘리먼트 인스펙터"}
        >
          <MousePointerClick className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={handleRefresh}
          className="rounded-lg p-1.5 text-[#B4B4B0] transition-colors hover:bg-[#EEEEEC] hover:text-[#787774]"
          title="새로고침"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-1.5 text-[#B4B4B0] transition-colors hover:bg-[#EEEEEC] hover:text-[#787774]"
          title="새 탭에서 열기"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* iframe */}
      <div className={`relative flex-1 ${inspectorEnabled ? "ring-2 ring-blue-400 ring-inset rounded-sm" : ""}`}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#787774]" />
              <span className="text-[13px] text-[#787774]">
                {hasError ? "Dev server 시작 대기 중..." : "로딩 중..."}
              </span>
              {hasError && retryCountRef.current > 0 && (
                <span className="text-[11px] text-[#B4B4B0]">
                  자동 재시도 {retryCountRef.current}/10
                </span>
              )}
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={url}
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => {
            // iframe 내부에서 에러 페이지인지 체크
            try {
              const doc = iframeRef.current?.contentDocument;
              const bodyText = doc?.body?.innerText || "";
              if (bodyText.includes("Internal Server Error") || bodyText.includes("502") || bodyText.includes("ECONNREFUSED")) {
                setHasError(true);
                return;
              }
            } catch {
              // cross-origin이면 정상 로드된 것
            }
            setIsLoading(false);
            setHasError(false);
            retryCountRef.current = 0;
            if (inspectorEnabled) {
              iframeRef.current?.contentWindow?.postMessage(
                { type: "meld:toggle-inspector", enabled: true },
                "*",
              );
            }
          }}
          onError={() => {
            setHasError(true);
          }}
          title="Dev Server Preview"
        />
      </div>

      {/* 엘리먼트 인포 바 */}
      {inspectedElement && inspectorEnabled && (
        <div className="flex items-center gap-2 border-t border-[#EEEEEC] bg-white px-3 py-2">
          <FileCode className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {inspectedElement.componentName && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
                {inspectedElement.componentName}
              </span>
            )}
            <span className="text-[11px] text-[#787774]">
              &lt;{inspectedElement.tagName}&gt;
            </span>
            {inspectedElement.className && (
              <span className="truncate text-[10px] text-[#B4B4B0]">
                .{inspectedElement.className.split(" ")[0]}
              </span>
            )}
          </div>
          {mappedFilePath ? (
            <button
              onClick={handleFileClick}
              className="flex-shrink-0 rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100"
            >
              {mappedFilePath.split("/").pop()}
            </button>
          ) : (
            <span className="flex-shrink-0 text-[10px] text-[#B4B4B0]">
              파일 트리에서 선택
            </span>
          )}
        </div>
      )}
    </div>
  );
}
