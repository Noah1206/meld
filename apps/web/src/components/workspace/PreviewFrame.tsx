"use client";

import { useState, useRef } from "react";
import { RefreshCw, ExternalLink, Globe } from "lucide-react";

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
    <div className="flex h-full flex-col">
      {/* 툴바 */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-3 py-2">
        <Globe className="h-3.5 w-3.5 text-[#6B7280]" />
        <span className="flex-1 truncate text-xs text-[#6B7280]">{url}</span>
        {framework && (
          <span className="rounded bg-[#F3F4F6] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">
            {framework}
          </span>
        )}
        <button
          onClick={handleRefresh}
          className="rounded p-1 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#6B7280]"
          title="새로고침"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded p-1 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#6B7280]"
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
              <RefreshCw className="h-4 w-4 animate-spin text-[#2E86C1]" />
              <span className="text-xs text-[#6B7280]">로딩 중...</span>
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
