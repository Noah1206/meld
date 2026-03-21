"use client";

import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Sidebar } from "@/components/layout/Sidebar";

export default function ProjectPage() {
  return (
    <WorkspaceLayout
      leftPanel={
        <Sidebar title="Node Tree">
          <div className="p-3 text-sm text-[#6B7280]">
            Figma 파일을 로드하면 노드 트리가 여기에 표시됩니다.
          </div>
        </Sidebar>
      }
      mainContent={
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-[#1C1C1C]">Figma Viewer</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Figma URL을 입력하여 디자인을 불러오세요
            </p>
          </div>
        </div>
      }
      rightPanel={
        <Sidebar title="Properties">
          <div className="p-3 text-sm text-[#6B7280]">
            노드를 선택하면 속성이 여기에 표시됩니다.
          </div>
        </Sidebar>
      }
      bottomBar={
        <div className="flex items-center gap-3 px-4 py-3">
          <input
            type="text"
            placeholder="먼저 Figma 뷰어에서 엘리먼트를 선택하세요"
            className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm placeholder:text-[#6B7280] focus:border-[#2E86C1] focus:outline-none focus:ring-1 focus:ring-[#2E86C1]"
            disabled
          />
          <button
            className="rounded-lg bg-[#2E86C1] px-4 py-2 text-sm font-medium text-white opacity-50"
            disabled
          >
            Send
          </button>
        </div>
      }
    />
  );
}
