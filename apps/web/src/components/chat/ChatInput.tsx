"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Loader2, Send, FileCode, ArrowLeft, MousePointerClick, Sparkles, ArrowUpDown } from "lucide-react";
import { useFigmaStore } from "@/lib/store/figma-store";
import { useChatStore } from "@/lib/store/chat-store";
import { useAgentStore } from "@/lib/store/agent-store";
import { useCategoryStore } from "@/lib/store/category-store";
import { useMCPStore } from "@/lib/store/mcp-store";
import { trpc } from "@/lib/trpc/client";
import { matchByNaming } from "@/lib/mapping/engine";
import { useDesignSystemStore } from "@/lib/store/design-system-store";

interface AgentConnectionLike {
  startAgent: (input: { command: string; context?: Record<string, unknown> }) => void;
  cancelAgent: () => void;
  approveEdit: (toolCallId: string, approved: boolean) => void;
  getTerminalBuffer?: () => Promise<string[]>;
}

interface ChatInputProps {
  projectId: string;
  mode?: "cloud" | "local";
  agentConnection?: AgentConnectionLike;
}

function flattenFilePaths(entries: { name: string; path: string; type: "file" | "directory"; children?: unknown[] }[]): string[] {
  const paths: string[] = [];
  for (const entry of entries) {
    if (entry.type === "file") paths.push(entry.path);
    if (entry.children) paths.push(...flattenFilePaths(entry.children as typeof entries));
  }
  return paths;
}

export function ChatInput({ projectId, mode = "cloud", agentConnection }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { selectedNode } = useFigmaStore();
  const { isProcessing, provider, addMessage, setProcessing, setError, inputPosition, setInputPosition } = useChatStore();

  const {
    selectedFilePath, readFileFn, writeFileFn, setLastWrite,
    fileTree, devServerFramework, dependencies, setSelectedFilePath,
    inspectedElement, elementHistory,
    inspectorEnabled, setInspectorEnabled, setInspectedElement,
  } = useAgentStore();

  const editCodeMutation = trpc.ai.editCode.useMutation();
  const getDesignMd = useDesignSystemStore((s) => s.getDesignMd);
  const currentCategory = useCategoryStore((s) => s.currentCategory);
  const mcpServers = useMCPStore((s) => s.servers);
  const isLocal = mode === "local";

  // Load customInstructions from API (cached in state)
  const [customInstructions, setCustomInstructions] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/user-settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.custom_instructions) setCustomInstructions(data.custom_instructions);
      })
      .catch(() => {});
  }, []);

  // Mapping suggestion (cloud mode)
  const [mappingSuggestion, setMappingSuggestion] = useState<{ filePath: string; confidence: number } | null>(null);
  const filePaths = useMemo(() => flattenFilePaths(fileTree as never[]), [fileTree]);

  useEffect(() => {
    if (!selectedNode || isLocal || filePaths.length === 0) { setMappingSuggestion(null); return; }
    setMappingSuggestion(matchByNaming(selectedNode.name, filePaths));
  }, [selectedNode, isLocal, filePaths]);

  // Element history → AI context
  const buildElementContext = useCallback(() => {
    if (!elementHistory?.length) return undefined;
    return elementHistory.map((entry, i) => {
      const el = entry.element;
      const parts = [`[${i + 1}] <${el.tagName}>`];
      if (el.componentName) parts.push(`component: ${el.componentName}`);
      if (el.className) parts.push(`class: "${el.className.slice(0, 80)}"`);
      if (entry.filePath) parts.push(`file: ${entry.filePath}`);
      if (el.sourceLoc) parts.push(`source: ${el.sourceLoc}`);
      if (el.computedStyle) {
        const styles = Object.entries(el.computedStyle).slice(0, 8).map(([k, v]) => `${k}:${v}`).join("; ");
        if (styles) parts.push(`style: ${styles}`);
      }
      return parts.join(" | ");
    }).join("\n");
  }, [elementHistory]);

  const toggleInspector = useCallback(() => {
    const next = !inspectorEnabled;
    setInspectorEnabled(next);
    if (!next) setInspectedElement(null);
    const iframe = document.querySelector<HTMLIFrameElement>("iframe[title='Dev Server Preview']");
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "meld:toggle-inspector", enabled: next }, "*");
    }
  }, [inspectorEnabled, setInspectorEnabled, setInspectedElement]);

  // 단축키: Cmd+Shift+I (macOS) / Ctrl+Shift+I (Windows/Linux)
  useEffect(() => {
    if (!isLocal) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "i") {
        e.preventDefault();
        toggleInspector();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isLocal, toggleInspector]);

  const hasSelection = isLocal ? !!(selectedFilePath || inspectedElement) : !!selectedNode;
  const canSend = !!input.trim() && hasSelection;
  const isDisabled = !hasSelection || isProcessing;

  const handleSend = useCallback(async () => {
    if (!canSend || isProcessing) return;
    const command = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    addMessage({ role: "user", content: command });
    setProcessing(true);

    try {
      // Agent loop mode: use WebSocket agent for autonomous multi-round coding
      if (isLocal && agentConnection) {
        const targetFile = selectedFilePath ?? "";
        const currentCode = targetFile && readFileFn ? await readFileFn(targetFile) : "";
        const elementContext = buildElementContext();

        // Build file tree paths for agent context
        const fileTreePaths = flattenFilePaths(fileTree as never[]);

        // Build skills content from localStorage
        let skillsContent: string | undefined;
        try {
          const installed = JSON.parse(localStorage.getItem("meld-installed-skills") || "[]") as string[];
          const cached = JSON.parse(localStorage.getItem("meld-skill-contents") || "{}") as Record<string, string>;
          if (installed.length > 0) {
            const parts = installed.map((name) => cached[name] ? `### ${name}\n${cached[name]}` : null).filter(Boolean);
            if (parts.length > 0) skillsContent = parts.join("\n\n");
          }
        } catch { /* ignore */ }

        // Build connected MCP services summary
        let connectedServices: string | undefined;
        const connected = mcpServers.filter((s) => s.connected);
        if (connected.length > 0) {
          connectedServices = connected.map((s) => `- ${s.name} (${s.category}, ${s.toolCount} tools)`).join("\n");
        }

        // Get recent terminal logs for error context
        let terminalLogs: string | undefined;
        if (agentConnection.getTerminalBuffer) {
          try {
            const logs = await agentConnection.getTerminalBuffer();
            if (logs.length > 0) {
              terminalLogs = logs.slice(-30).join("")
                .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
                .slice(-2000) || undefined;
            }
          } catch { /* ignore */ }
        }

        agentConnection.startAgent({
          command,
          context: {
            selectedFile: targetFile || undefined,
            currentCode: currentCode || undefined,
            framework: devServerFramework ?? undefined,
            dependencies: dependencies.length > 0 ? dependencies : undefined,
            designSystemMd: getDesignMd() || undefined,
            elementHistory: elementContext ? [elementContext] : undefined,
            fileTree: fileTreePaths.length > 0 ? fileTreePaths : undefined,
            category: currentCategory ?? undefined,
            skillsContent,
            connectedServices,
            customInstructions: customInstructions || undefined,
            terminalLogs,
          },
        });

        addMessage({ role: "assistant", content: "Agent started..." });
        setProcessing(false);
        return;
      }

      if (isLocal && (selectedFilePath || inspectedElement)) {
        const targetFile = selectedFilePath ?? "";
        const currentCode = targetFile && readFileFn ? await readFileFn(targetFile) : "";
        const elementContext = buildElementContext();

        let result: { filePath: string; original: string; modified: string; explanation: string };

        if (window.electronAgent?.ai) {
          result = await window.electronAgent.ai.editCode({
            filePath: targetFile,
            command,
            currentCode,
            framework: devServerFramework ?? undefined,
            dependencies: dependencies.length > 0 ? dependencies : undefined,
            designSystemMd: getDesignMd() || undefined,
            elementContext,
          });
        } else {
          const res = await fetch("/api/ai/edit-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filePath: targetFile, command, currentCode,
              framework: devServerFramework ?? undefined,
              dependencies: dependencies.length > 0 ? dependencies : undefined,
              designSystemMd: getDesignMd() || undefined,
              elementHistory: elementHistory?.map((e) => e.element) ?? [],
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "AI request failed");
          if (data.type === "chat") {
            result = { filePath: targetFile, original: "", modified: "", explanation: data.text };
          } else {
            result = { filePath: data.filePath, original: data.original, modified: data.modified, explanation: data.explanation };
          }
        }

        if (result.modified && targetFile && writeFileFn) {
          const success = await writeFileFn(targetFile, result.modified);
          if (success) setLastWrite();
          addMessage({ role: "assistant", content: `${result.explanation}\n\n${success ? "✅" : "❌"} ${targetFile}`, codeEdit: result });
        } else {
          addMessage({ role: "assistant", content: result.explanation, codeEdit: result });
        }
      } else {
        const result = await editCodeMutation.mutateAsync({
          projectId,
          figmaNodeId: selectedNode?.id ?? "local",
          figmaNodeName: selectedNode?.name,
          command,
          provider,
          filePath: selectedFilePath ?? undefined,
          designSystemMd: getDesignMd() || undefined,
        });
        addMessage({ role: "assistant", content: result.explanation, codeEdit: result });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI processing failed";
      setError(msg);
      addMessage({ role: "assistant", content: `Error: ${msg}` });
    } finally {
      setProcessing(false);
    }
  }, [canSend, input, isProcessing, isLocal, selectedFilePath, inspectedElement, readFileFn, writeFileFn, projectId, selectedNode, provider, addMessage, setProcessing, setError, editCodeMutation, devServerFramework, dependencies, setLastWrite, getDesignMd, buildElementContext, elementHistory]);

  const togglePosition = () => {
    setInputPosition(inputPosition === "top" ? "bottom" : "top");
  };

  return (
    <div className="space-y-2 px-3 py-3">
      {/* Mapping suggestion (cloud mode) */}
      {mappingSuggestion && !isLocal && (
        <div className="animate-fade-in flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2">
          <FileCode className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-[11px] text-blue-600">Suggested file:</span>
          <button
            onClick={() => { setSelectedFilePath(mappingSuggestion.filePath); setMappingSuggestion(null); }}
            className="flex items-center gap-1 rounded-md bg-blue-100/70 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-200/70 transition-colors"
          >
            {mappingSuggestion.filePath.split("/").pop()}
            <span className="text-blue-400">({Math.round(mappingSuggestion.confidence * 100)}%)</span>
          </button>
        </div>
      )}

      {/* Selection state + badges */}
      <div className="flex items-center gap-2">
        {isLocal ? (
          <span className={`max-w-[180px] truncate rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${
            selectedFilePath || inspectedElement
              ? "border-[#E0E0DC] bg-white text-[#1A1A1A] shadow-sm"
              : "border-dashed border-[#E0E0DC] text-[#B4B4B0]"
          }`}>
            {selectedFilePath
              ? selectedFilePath.split("/").pop()
              : inspectedElement
                ? (inspectedElement.componentName || `<${inspectedElement.tagName}>`)
                : "Select a file"}
          </span>
        ) : selectedNode ? (
          <span className="max-w-[180px] truncate rounded-lg border border-[#E0E0DC] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1A1A1A] shadow-sm">
            {selectedNode.name}
          </span>
        ) : (
          <span className="text-[11px] text-[#B4B4B0]">Select a node</span>
        )}

        <div className="flex-1" />

        {/* Inspector toggle (local mode only) */}
        {isLocal && (
          <button
            onClick={toggleInspector}
            className={`flex items-center gap-1 rounded-lg p-1.5 transition-colors ${
              inspectorEnabled
                ? "bg-blue-50 text-blue-600"
                : "text-[#B4B4B0] hover:text-[#787774] hover:bg-[#F7F7F5]"
            }`}
            title={`${inspectorEnabled ? "인스펙터 끄기" : "엘리먼트 인스펙터"} (⌘⇧I)`}
          >
            <MousePointerClick className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Input position toggle */}
        <button
          onClick={togglePosition}
          className="flex items-center gap-1 rounded-lg p-1.5 text-[#B4B4B0] hover:text-[#787774] hover:bg-[#F7F7F5] transition-colors"
          title={inputPosition === "top" ? "Move input to bottom" : "Move input to top"}
        >
          <ArrowUpDown className="h-3 w-3" />
        </button>

        {/* Meld AI badge */}
        <div className="flex items-center gap-1.5 rounded-lg border border-[#E0E0DC] bg-white px-2.5 py-1.5 text-[11px] shadow-sm">
          <Sparkles className="h-3 w-3 text-[#787774]" />
          <span className="font-medium text-[#787774]">Meld AI</span>
        </div>
      </div>

      {/* Guide message */}
      {!hasSelection && !isProcessing && (
        <div className="animate-fade-in flex items-center gap-3 rounded-xl border border-dashed border-[#E0E0DC] px-4 py-4">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#F7F7F5]">
            {isLocal ? (
              <ArrowLeft className="h-4 w-4 animate-pulse text-[#787774]" />
            ) : (
              <MousePointerClick className="h-4 w-4 animate-pulse text-[#787774]" />
            )}
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#1A1A1A]">
              {isLocal ? "Click an element in preview or select a file" : "Click an element in Figma viewer to edit"}
            </p>
            <p className="text-[11px] text-[#B4B4B0]">
              {isLocal ? "Inspector auto-maps elements to files" : "Select an element and Meld AI will modify the component"}
            </p>
          </div>
        </div>
      )}

      {/* Input area */}
      {hasSelection && (
        <div className="relative">
          <div className="flex items-end gap-2 rounded-2xl border border-[#E0E0DC] bg-white p-1.5 shadow-sm transition-all focus-within:border-[#1A1A1A]/20 focus-within:shadow-md">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Describe your changes... (Enter to send)"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="flex-1 resize-none bg-transparent px-3 py-2 text-[13px] placeholder:text-[#B4B4B0] focus:outline-none disabled:opacity-50"
              style={{ maxHeight: 120 }}
              disabled={isDisabled}
            />
            <button
              onClick={handleSend}
              disabled={!canSend || isProcessing}
              className="flex-shrink-0 rounded-xl bg-[#1A1A1A] p-2.5 text-white transition-all hover:bg-[#333] active:scale-[0.95] disabled:opacity-30"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          {/* Processing status message */}
          {isProcessing && (
            <div className="animate-fade-in mt-2 flex items-center justify-center gap-2">
              <div className="h-1 w-1 animate-pulse rounded-full bg-violet-400" />
              <span className="text-[10px] text-[#B4B4B0]">AI is analyzing and modifying the code. Please wait.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
