"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, Download } from "lucide-react";
import { useDesignSystemStore } from "@/lib/store/design-system-store";

export function DesignMdEditor() {
  const { current, updateCustomMd, getDesignMd } = useDesignSystemStore();
  const [tab, setTab] = useState<"preview" | "custom">("preview");
  const [copied, setCopied] = useState(false);

  if (!current) return null;

  const generatedMd = getDesignMd();

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "DESIGN.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      {/* 서브 탭 */}
      <div className="flex items-center justify-between border-b border-[#EEEEEC] px-4 py-2">
        <div className="flex gap-1">
          {[
            { id: "preview" as const, label: "자동 생성" },
            { id: "custom" as const, label: "커스텀 지침" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                tab === t.id
                  ? "bg-[#1A1A1A] text-white"
                  : "text-[#787774] hover:bg-[#F7F7F5]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-[#787774] transition-colors hover:bg-[#F7F7F5]"
            title="DESIGN.md 복사"
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            {copied ? "복사됨" : "복사"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-[#787774] transition-colors hover:bg-[#F7F7F5]"
            title="DESIGN.md 다운로드"
          >
            <Download className="h-3 w-3" />
            내보내기
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      {tab === "preview" ? (
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[#1A1A1A]">
            {generatedMd}
          </pre>
        </div>
      ) : (
        <div className="flex flex-1 flex-col p-4">
          <p className="mb-2 text-[11px] text-[#787774]">
            AI에게 전달할 추가 디자인 지침을 작성하세요.
            자동 생성된 DESIGN.md 하단에 추가됩니다.
          </p>
          <textarea
            value={current.customDesignMd}
            onChange={(e) => updateCustomMd(e.target.value)}
            placeholder={`예시:\n- 버튼은 항상 pill 모양 (border-radius: 9999px)\n- 카드 그림자: 0 2px 8px rgba(0,0,0,0.08)\n- 애니메이션: ease-out 200ms\n- 아이콘: lucide-react 사용`}
            className="flex-1 resize-none rounded-xl border border-[#EEEEEC] bg-[#F7F7F5] p-3 font-mono text-[11px] leading-relaxed text-[#1A1A1A] placeholder:text-[#D4D4D0] focus:border-[#2E86C1] focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
