"use client";

import { useChatStore } from "@/lib/store/chat-store";

export function DiffViewer() {
  const { messages } = useChatStore();

  // 마지막 코드 편집 결과 찾기
  const lastEdit = [...messages]
    .reverse()
    .find((m) => m.codeEdit?.filePath)?.codeEdit;

  if (!lastEdit || !lastEdit.filePath) {
    return (
      <div className="p-3 text-sm text-[#6B7280]">
        AI가 코드를 수정하면 diff가 여기에 표시됩니다.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#E5E7EB] px-3 py-2">
        <span className="text-xs font-mono text-[#6B7280]">
          {lastEdit.filePath}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Original */}
        {lastEdit.original && (
          <section>
            <h4 className="mb-1 text-[10px] font-semibold uppercase text-red-500">
              Before
            </h4>
            <pre className="overflow-x-auto rounded-md bg-red-50 p-2 text-xs font-mono text-red-800 leading-relaxed">
              {lastEdit.original}
            </pre>
          </section>
        )}

        {/* Modified */}
        {lastEdit.modified && (
          <section>
            <h4 className="mb-1 text-[10px] font-semibold uppercase text-green-600">
              After
            </h4>
            <pre className="overflow-x-auto rounded-md bg-green-50 p-2 text-xs font-mono text-green-800 leading-relaxed">
              {lastEdit.modified}
            </pre>
          </section>
        )}

        {/* 설명 */}
        {lastEdit.explanation && (
          <section>
            <h4 className="mb-1 text-[10px] font-semibold uppercase text-[#6B7280]">
              Explanation
            </h4>
            <p className="text-xs text-[#374151]">{lastEdit.explanation}</p>
          </section>
        )}
      </div>
    </div>
  );
}
