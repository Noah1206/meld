import { useState, useRef, useEffect } from "react";
import { RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { useAgentStore } from "../store/agent-store";

interface PreviewFrameProps {
  url: string;
  framework?: string | null;
}

export function PreviewFrame({ url, framework }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const retryCountRef = useRef(0);
  const lastWriteTimestamp = useAgentStore((s) => s.lastWriteTimestamp);

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
      <div className="relative flex-1">
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
          }}
          onError={() => {
            setHasError(true);
          }}
          title="Dev Server Preview"
        />
      </div>
    </div>
  );
}
