"use client";

import { useState, useRef } from "react";
import { RefreshCw, ExternalLink, Globe, Loader2 } from "lucide-react";

interface PreviewFrameProps {
  url: string;
  framework?: string | null;
}

export function PreviewFrame({ url, framework }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = url;
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 툴바 */}
      <div className="flex items-center gap-2 bg-[#F7F7F5] px-3 py-2">
        <Globe className="h-3.5 w-3.5 text-[#787774]" />
        <span className="flex-1 truncate text-[12px] text-[#787774]">{url}</span>
        {framework && (
          <span className="rounded-lg bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#787774]">
            {framework}
          </span>
        )}
        <button
          onClick={handleRefresh}
          className="rounded-lg p-1 text-[#B4B4B0] transition-colors hover:bg-[#EEEEEC] hover:text-[#787774]"
          title="새로고침"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-1 text-[#B4B4B0] transition-colors hover:bg-[#EEEEEC] hover:text-[#787774]"
          title="새 탭에서 열기"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* iframe */}
      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#787774]" />
              <span className="text-[12px] text-[#787774]">로딩 중...</span>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={url}
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => setIsLoading(false)}
          title="Dev Server Preview"
        />
      </div>
    </div>
  );
}
