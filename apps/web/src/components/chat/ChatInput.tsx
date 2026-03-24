"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Loader2, Send, FileCode, ArrowLeft, MousePointerClick, ChevronDown } from "lucide-react";
import { useFigmaStore } from "@/lib/store/figma-store";
import { useChatStore } from "@/lib/store/chat-store";
import { useAgentStore } from "@/lib/store/agent-store";
import type { LLMProviderType } from "@/lib/store/chat-store";
import { trpc } from "@/lib/trpc/client";
import { matchByNaming } from "@/lib/mapping/engine";
import { useDesignSystemStore } from "@/lib/store/design-system-store";

const LLM_OPTIONS: {
  value: LLMProviderType;
  label: string;
  sub: string;
  color: string;
}[] = [
  { value: "claude", label: "Claude", sub: "Sonnet 4.6", color: "#D97757" },
  { value: "chatgpt", label: "ChatGPT", sub: "GPT-4o", color: "#10A37F" },
  { value: "gemini", label: "Gemini", sub: "2.5 Flash", color: "#4285F4" },
];

interface ChatInputProps {
  projectId: string;
  mode?: "cloud" | "local";
}

// FileEntry에서 파일 경로 목록 추출 (재귀)
function flattenFilePaths(entries: { name: string; path: string; type: "file" | "directory"; children?: unknown[] }[]): string[] {
  const paths: string[] = [];
  for (const entry of entries) {
    if (entry.type === "file") {
      paths.push(entry.path);
    }
    if (entry.children) {
      paths.push(...flattenFilePaths(entry.children as typeof entries));
    }
  }
  return paths;
}

export function ChatInput({ projectId, mode = "cloud" }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { selectedNode } = useFigmaStore();
  const { isProcessing, provider, addMessage, setProcessing, setError, setProvider } =
    useChatStore();

  const {
    selectedFilePath,
    readFileFn,
    writeFileFn,
    setLastWrite,
    fileTree,
    devServerFramework,
    dependencies,
    setSelectedFilePath,
    connected,
  } = useAgentStore();
  const editCodeMutation = trpc.ai.editCode.useMutation();
  const getDesignMd = useDesignSystemStore((s) => s.getDesignMd);

  const isLocal = mode === "local";

  // Phase 3: 매핑 추천 — Figma 노드 선택 시 자동 매칭
  const [mappingSuggestion, setMappingSuggestion] = useState<{ filePath: string; confidence: number } | null>(null);

  const filePaths = useMemo(() => flattenFilePaths(fileTree as never[]), [fileTree]);

  useEffect(() => {
    if (!selectedNode || isLocal || filePaths.length === 0) {
      setMappingSuggestion(null);
      return;
    }
    const result = matchByNaming(selectedNode.name, filePaths);
    setMappingSuggestion(result);
  }, [selectedNode, isLocal, filePaths]);

  const handleSuggestionClick = useCallback((path: string) => {
    setSelectedFilePath(path);
    setMappingSuggestion(null);
  }, [setSelectedFilePath]);

  const canSend = isLocal
    ? !!input.trim() && !!selectedFilePath
    : !!input.trim() && !!selectedNode;

  const handleSend = useCallback(async () => {
    if (!canSend || isProcessing) return;

    const command = input.trim();
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    addMessage({ role: "user", content: command });
    setProcessing(true);

    try {
      if (isLocal && selectedFilePath && readFileFn && writeFileFn) {
        // 로컬 모드: 에이전트에서 읽기 → AI → 에이전트에 쓰기
        const currentCode = await readFileFn(selectedFilePath);

        // Phase 4: 프레임워크/의존성 컨텍스트 전달
        const result = await editCodeMutation.mutateAsync({
          projectId,
          figmaNodeId: "local",
          figmaNodeName: selectedFilePath.split("/").pop(),
          command,
          filePath: selectedFilePath,
          currentCode,
          provider,
          framework: devServerFramework ?? undefined,
          dependencies: dependencies.length > 0 ? dependencies : undefined,
          designSystemMd: getDesignMd() || undefined,
        });

        // AI 결과를 로컬 파일에 쓰기
        if (result.modified) {
          const success = await writeFileFn(selectedFilePath, result.modified);
          if (success) setLastWrite();
          addMessage({
            role: "assistant",
            content: `${result.explanation}\n\n${success ? "✅" : "❌"} ${selectedFilePath}`,
            codeEdit: result,
          });
        } else {
          addMessage({
            role: "assistant",
            content: result.explanation,
            codeEdit: result,
          });
        }
      } else {
        // 클라우드 모드: 기존 흐름
        const result = await editCodeMutation.mutateAsync({
          projectId,
          figmaNodeId: selectedNode?.id ?? "local",
          figmaNodeName: selectedNode?.name,
          command,
          provider,
          filePath: selectedFilePath ?? undefined,
          designSystemMd: getDesignMd() || undefined,
        });

        addMessage({
          role: "assistant",
          content: result.explanation,
          codeEdit: result,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 처리 실패");
      addMessage({
        role: "assistant",
        content: `오류: ${err instanceof Error ? err.message : "처리 실패"}`,
      });
    } finally {
      setProcessing(false);
    }
  }, [canSend, input, isProcessing, isLocal, selectedFilePath, readFileFn, writeFileFn, projectId, selectedNode, provider, addMessage, setProcessing, setError, editCodeMutation, devServerFramework, dependencies, setLastWrite, getDesignMd]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // textarea 자동 높이 조절
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  // Phase 6: 빈 상태 가이드
  const showGuide = isLocal ? !selectedFilePath : !selectedNode;
  const isDisabled = showGuide || isProcessing;

  // Cursor-style model selector
  const [modelOpen, setModelOpen] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);
  const selectedModel = LLM_OPTIONS.find((o) => o.value === provider) ?? LLM_OPTIONS[0];

  // 외부 클릭 + Esc 닫기
  useEffect(() => {
    if (!modelOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModelOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [modelOpen]);

  return (
    <div className="space-y-2 px-3 py-3">
      {/* Phase 3: 매핑 추천 칩 */}
      {mappingSuggestion && !isLocal && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2">
          <FileCode className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-[11px] text-blue-600">추천 파일:</span>
          <button
            onClick={() => handleSuggestionClick(mappingSuggestion.filePath)}
            className="flex items-center gap-1 rounded-md bg-blue-100/70 px-2 py-0.5 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-200/70"
          >
            {mappingSuggestion.filePath.split("/").pop()}
            <span className="text-blue-400">({Math.round(mappingSuggestion.confidence * 100)}%)</span>
          </button>
        </div>
      )}

      {/* 상단: 선택된 노드/파일 + 모델 셀렉터 */}
      <div className="flex items-center gap-2">
        {isLocal ? (
          <span className="truncate rounded-md border border-[#E0E0DC] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1A1A1A]">
            {selectedFilePath ?? "파일을 선택하세요"}
          </span>
        ) : selectedNode ? (
          <span className="animate-fade-in truncate rounded-md border border-[#E0E0DC] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1A1A1A]">
            {selectedNode.name}
          </span>
        ) : (
          <span className="text-[11px] text-[#B4B4B0]">노드를 선택하세요</span>
        )}
        <div className="flex-1" />

        {/* Cursor-style 모델 셀렉터 */}
        <div ref={modelRef} className="relative">
          <button
            onClick={() => !isProcessing && setModelOpen((v) => !v)}
            disabled={isProcessing}
            className="flex items-center gap-1.5 rounded-md border border-[#E0E0DC] bg-white px-2.5 py-1 text-[11px] transition-colors hover:border-[#C0C0BC] disabled:opacity-50"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: selectedModel.color }}
            />
            <span className="font-medium text-[#1A1A1A]">{selectedModel.label}</span>
            <ChevronDown className="h-3 w-3 text-[#B4B4B0]" />
          </button>

          {modelOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-[#E0E0DC] bg-white py-1 shadow-sm">
              {LLM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setProvider(opt.value);
                    setModelOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#F7F7F5] ${
                    provider === opt.value ? "bg-[#F7F7F5]" : ""
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: opt.color }}
                  />
                  <div className="flex-1">
                    <p className="text-[12px] font-medium text-[#1A1A1A]">{opt.label}</p>
                    <p className="text-[10px] text-[#B4B4B0]">{opt.sub}</p>
                  </div>
                  {provider === opt.value && (
                    <span className="text-[10px] text-[#787774]">&#10003;</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Phase 6: 빈 상태 가이드 메시지 */}
      {showGuide && !isProcessing && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-[#E0E0DC] px-4 py-4">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#F7F7F5]">
            {isLocal ? (
              <ArrowLeft className="h-4 w-4 animate-pulse text-[#787774]" />
            ) : (
              <MousePointerClick className="h-4 w-4 animate-pulse text-[#787774]" />
            )}
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#1A1A1A]">
              {isLocal ? "프리뷰에서 엘리먼트를 클릭하거나, 파일 트리에서 파일을 선택하세요" : "Figma 뷰어에서 수정할 엘리먼트를 클릭하세요"}
            </p>
            <p className="text-[11px] text-[#B4B4B0]">
              {isLocal ? "인스펙터로 엘리먼트를 선택하면 자동으로 파일이 매핑돼요" : "엘리먼트를 선택하면 AI가 해당 컴포넌트를 수정해요"}
            </p>
          </div>
        </div>
      )}

      {/* 하단: textarea + Send */}
      {!showGuide && (
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={
              isLocal
                ? "코드 수정 명령을 입력하세요... (Enter 전송)"
                : "명령을 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
            }
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none rounded-xl border border-[#E0E0DC] bg-white px-4 py-2.5 text-sm placeholder:text-[#B4B4B0] focus:border-[#1A1A1A]/20 focus:outline-none disabled:opacity-50"
            style={{ maxHeight: 120 }}
            disabled={isDisabled}
          />
          <button
            onClick={handleSend}
            disabled={!canSend || isProcessing}
            className="flex-shrink-0 rounded-xl bg-[#1A1A1A] p-2.5 text-white transition-colors hover:bg-[#333] active:bg-[#000] disabled:opacity-30"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
