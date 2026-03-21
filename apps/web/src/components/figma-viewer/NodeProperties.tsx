"use client";

import { useFigmaStore } from "@/lib/store/figma-store";

export function NodeProperties() {
  const { selectedNode } = useFigmaStore();

  if (!selectedNode) {
    return (
      <div className="p-3 text-sm text-[#6B7280]">
        노드를 선택하면 속성이 표시됩니다.
      </div>
    );
  }

  const { relativeBox } = selectedNode;

  return (
    <div className="space-y-4 p-3">
      {/* 노드 기본 정보 */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
          Node
        </h3>
        <div className="space-y-1.5">
          <PropRow label="Name" value={selectedNode.name} />
          <PropRow label="Type" value={selectedNode.type} />
          <PropRow label="ID" value={selectedNode.id} mono />
        </div>
      </section>

      {/* 위치 & 크기 */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
          Position & Size
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          <PropRow label="X" value={`${Math.round(relativeBox.x)}px`} />
          <PropRow label="Y" value={`${Math.round(relativeBox.y)}px`} />
          <PropRow label="W" value={`${Math.round(relativeBox.width)}px`} />
          <PropRow label="H" value={`${Math.round(relativeBox.height)}px`} />
        </div>
      </section>

      {/* 자식 노드 수 */}
      {selectedNode.children.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
            Children
          </h3>
          <PropRow
            label="Count"
            value={`${selectedNode.children.length} nodes`}
          />
        </section>
      )}
    </div>
  );
}

function PropRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#6B7280]">{label}</span>
      <span
        className={`max-w-[180px] truncate text-[#1C1C1C] ${mono ? "font-mono text-[10px]" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
