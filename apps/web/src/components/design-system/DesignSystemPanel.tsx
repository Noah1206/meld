"use client";

import { useState } from "react";
import { Palette, FileText, Plus, Trash2, ChevronDown, X } from "lucide-react";
import { useDesignSystemStore } from "@/lib/store/design-system-store";
import { ThemeEditor } from "./ThemeEditor";
import { DesignMdEditor } from "./DesignMdEditor";

type Tab = "theme" | "designmd";

export function DesignSystemPanel({ embedded = false }: { embedded?: boolean }) {
  const [tab, setTab] = useState<Tab>("theme");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const {
    current,
    systems,
    createSystem,
    selectSystem,
    deleteSystem,
    setPanelOpen,
  } = useDesignSystemStore();
  const [showSelector, setShowSelector] = useState(false);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createSystem(newName.trim());
    setNewName("");
    setCreating(false);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 헤더 — embedded 모드에서는 숨김 */}
      {!embedded && (
        <div className="flex items-center justify-between border-b border-[#EEEEEC] px-4 py-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[#787774]" />
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Design System</h2>
          </div>
          <button
            onClick={() => setPanelOpen(false)}
            className="rounded-lg p-1 text-[#B4B4B0] transition-colors hover:bg-[#F7F7F5] hover:text-[#787774]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 시스템 선택 or 생성 */}
      <div className="border-b border-[#EEEEEC] px-4 py-2.5">
        {creating ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="디자인 시스템 이름..."
              className="flex-1 rounded-lg border border-[#EEEEEC] bg-[#F7F7F5] px-3 py-1.5 text-[12px] text-[#1A1A1A] placeholder:text-[#B4B4B0] focus:border-[#2E86C1] focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-40"
            >
              생성
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded-lg p-1.5 text-[#B4B4B0] hover:bg-[#F7F7F5]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* 현재 시스템 드롭다운 */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowSelector(!showSelector)}
                className="flex w-full items-center gap-2 rounded-lg bg-[#F7F7F5] px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-[#EEEEEC]"
              >
                {current ? (
                  <>
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: current.colors.seedColor }}
                    />
                    <span className="flex-1 truncate font-medium text-[#1A1A1A]">
                      {current.name}
                    </span>
                  </>
                ) : (
                  <span className="flex-1 text-[#B4B4B0]">시스템을 선택하세요</span>
                )}
                <ChevronDown
                  className={`h-3 w-3 text-[#B4B4B0] transition-transform ${showSelector ? "rotate-180" : ""}`}
                />
              </button>

              {showSelector && (
                <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg bg-white shadow-lg ring-1 ring-black/[0.06]">
                  <div className="max-h-48 overflow-y-auto py-1">
                    {systems.length === 0 && (
                      <p className="px-3 py-3 text-center text-[11px] text-[#B4B4B0]">
                        아직 디자인 시스템이 없어요
                      </p>
                    )}
                    {systems.map((sys) => (
                      <button
                        key={sys.id}
                        onClick={() => {
                          selectSystem(sys.id);
                          setShowSelector(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#F7F7F5] ${
                          current?.id === sys.id ? "bg-[#F7F7F5]" : ""
                        }`}
                      >
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: sys.colors.seedColor }}
                        />
                        <span className="flex-1 truncate text-[12px] text-[#1A1A1A]">
                          {sys.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSystem(sys.id);
                          }}
                          className="rounded p-0.5 text-[#D4D4D0] hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 새로 만들기 */}
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1 rounded-lg bg-[#1A1A1A] px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-[#333]"
            >
              <Plus className="h-3 w-3" />
              새로 만들기
            </button>
          </div>
        )}
      </div>

      {/* 탭 */}
      {current && (
        <>
          <div className="flex border-b border-[#EEEEEC]">
            {[
              { id: "theme" as Tab, label: "Theme", icon: <Palette className="h-3.5 w-3.5" /> },
              { id: "designmd" as Tab, label: "DESIGN.md", icon: <FileText className="h-3.5 w-3.5" /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors ${
                  tab === t.id
                    ? "border-b-2 border-[#1A1A1A] text-[#1A1A1A]"
                    : "text-[#787774] hover:text-[#1A1A1A]"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 */}
          <div className="flex-1 overflow-y-auto">
            {tab === "theme" ? <ThemeEditor /> : <DesignMdEditor />}
          </div>
        </>
      )}

      {/* 시스템 없을 때 빈 상태 */}
      {!current && !creating && (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F7F5]">
              <Palette className="h-5 w-5 text-[#B4B4B0]" />
            </div>
            <p className="text-[13px] font-medium text-[#787774]">디자인 시스템을 만들어보세요</p>
            <p className="mt-1 text-[11px] text-[#B4B4B0]">
              컬러, 타이포그래피, 스페이싱을 정의하면
              <br />
              AI가 일관된 코드를 생성합니다
            </p>
            <button
              onClick={() => setCreating(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#1A1A1A] px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#333]"
            >
              <Plus className="h-3.5 w-3.5" />
              새로 만들기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
