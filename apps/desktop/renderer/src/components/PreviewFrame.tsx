import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  ExternalLink,
  Loader2,
  Terminal,
  AlertTriangle,
  MousePointerClick,
  X,
  Trash2,
  Monitor,
  Columns2,
} from "lucide-react";
import { useAgentStore, type InspectedElement } from "../store/agent-store";
import type { FileEntry } from "../types";
import { XTerminal } from "./XTerminal";

interface PreviewFrameProps {
  url: string;
  framework?: string | null;
}

type ViewMode = "preview" | "terminal" | "split";

function flattenPaths(entries: FileEntry[]): string[] {
  const paths: string[] = [];
  for (const e of entries) {
    if (e.type === "file") paths.push(e.path);
    if (e.children) paths.push(...flattenPaths(e.children));
  }
  return paths;
}

function matchByNaming(
  componentName: string,
  filePaths: string[],
): { filePath: string; confidence: number } | null {
  const lower = componentName.toLowerCase();
  const kebab = componentName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  let best: { filePath: string; confidence: number } | null = null;
  for (const fp of filePaths) {
    const fileName = fp.split("/").pop()?.replace(/\.(tsx?|jsx?|vue|svelte)$/, "") ?? "";
    const fLower = fileName.toLowerCase();
    if (fLower === lower || fLower === kebab) return { filePath: fp, confidence: 1.0 };
    if (fLower.includes(lower) || lower.includes(fLower)) {
      const c = Math.min(lower.length, fLower.length) / Math.max(lower.length, fLower.length);
      if (!best || c > best.confidence) best = { filePath: fp, confidence: c };
    }
  }
  return best && best.confidence >= 0.5 ? best : null;
}

export function PreviewFrame({ url, framework }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const retryCountRef = useRef(0);
  const lastWriteTimestamp = useAgentStore((s) => s.lastWriteTimestamp);
  const inspectorEnabled = useAgentStore((s) => s.inspectorEnabled);
  const inspectedElement = useAgentStore((s) => s.inspectedElement);
  const setInspectorEnabled = useAgentStore((s) => s.setInspectorEnabled);
  const setInspectedElement = useAgentStore((s) => s.setInspectedElement);
  const setSelectedFilePath = useAgentStore((s) => s.setSelectedFilePath);
  const addElementToHistory = useAgentStore((s) => s.addElementToHistory);
  const elementHistory = useAgentStore((s) => s.elementHistory);
  const removeElementFromHistory = useAgentStore((s) => s.removeElementFromHistory);
  const clearElementHistory = useAgentStore((s) => s.clearElementHistory);
  const fileTree = useAgentStore((s) => s.fileTree);
  const filePaths = useMemo(() => flattenPaths(fileTree), [fileTree]);

  // Preview area size → Electron WebContentsView
  useEffect(() => {
    const el = previewRef.current;
    if (!el || !window.electronAgent?.previewView) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      window.electronAgent?.previewView?.setBounds(
        Math.round(r.x), Math.round(r.y),
        Math.round(r.width), Math.round(r.height),
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); window.removeEventListener("resize", update); };
  }, [viewMode, inspectorEnabled, elementHistory.length]);

  // Load URL via WebContentsView
  useEffect(() => {
    if (window.electronAgent?.previewView) {
      window.electronAgent.previewView.loadURL(url).then(() => {
        setIsLoading(false);
        setHasError(false);
      }).catch(() => {
        setHasError(true);
        setErrorMessage("Cannot connect to dev server");
      });
    }
  }, [url]);

  // Refresh after file write
  useEffect(() => {
    if (lastWriteTimestamp === 0 || !window.electronAgent?.previewView) return;
    const timer = setTimeout(() => {
      window.electronAgent?.previewView?.reload();
    }, 500);
    return () => clearTimeout(timer);
  }, [lastWriteTimestamp]);

  // Auto-retry on error
  useEffect(() => {
    if (!hasError || retryCountRef.current >= 20) return;
    const timer = setTimeout(() => {
      retryCountRef.current += 1;
      window.electronAgent?.previewView?.loadURL(url).then(() => {
        setHasError(false);
        setErrorMessage(null);
        setIsLoading(false);
      }).catch(() => {
        setHasError(false);
        requestAnimationFrame(() => setHasError(true));
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [hasError, url]);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    retryCountRef.current = 0;
    window.electronAgent?.previewView?.reload();
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const toggleInspector = useCallback(() => {
    const next = !inspectorEnabled;
    setInspectorEnabled(next);
    if (!next) setInspectedElement(null);
    if (window.electronAgent?.injectInspectorInFrame) {
      window.electronAgent.injectInspectorInFrame().then(() => {
        setTimeout(() => {
          window.electronAgent?.previewView?.executeJS(
            `window.postMessage({ type: 'meld:toggle-inspector', enabled: ${next} }, '*')`
          );
        }, 50);
      });
    }
  }, [inspectorEnabled, setInspectorEnabled, setInspectedElement]);

  // postMessage listener
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "meld:element-selected") {
        const payload = e.data.payload as InspectedElement;
        setInspectedElement(payload);
        if (payload.componentName && filePaths.length > 0) {
          const match = matchByNaming(payload.componentName, filePaths);
          addElementToHistory(payload, match?.filePath ?? null);
          if (match) setSelectedFilePath(match.filePath);
        } else {
          addElementToHistory(payload, null);
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [filePaths, setInspectedElement, setSelectedFilePath, addElementToHistory]);

  const handleHistoryClick = useCallback((filePath: string | null) => {
    if (filePath) setSelectedFilePath(filePath);
  }, [setSelectedFilePath]);

  const showPreview = viewMode === "preview" || viewMode === "split";
  const showTerminal = viewMode === "terminal" || viewMode === "split";

  return (
    <div className="flex h-full flex-col bg-[#2C2C2C]">
      {/* Main area */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Preview */}
        {showPreview && (
          <div
            ref={previewRef}
            className={`relative ${viewMode === "split" ? "h-[55%]" : "flex-1"} bg-[#2C2C2C] ${inspectorEnabled ? "ring-2 ring-blue-400 ring-inset rounded-sm" : ""}`}
          >
            {(isLoading || hasError) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#2C2C2C]">
                <div className="flex flex-col items-center gap-3">
                  {hasError ? (
                    <>
                      <AlertTriangle className="h-6 w-6 text-amber-500" />
                      <span className="text-[13px] font-medium text-[#9A9A95]">
                        {errorMessage || "Waiting for dev server response..."}
                      </span>
                      {retryCountRef.current > 0 && retryCountRef.current < 20 && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin text-[#666]" />
                          <span className="text-[11px] text-[#666]">Auto-retry {retryCountRef.current}/20</span>
                        </div>
                      )}
                      {retryCountRef.current >= 20 && (
                        <button onClick={handleRefresh} className="mt-1 rounded-lg bg-[#3A3A3A] px-4 py-2 text-[12px] font-medium text-[#E8E8E5] hover:bg-[#444]">
                          Retry
                        </button>
                      )}
                      <button
                        onClick={() => setViewMode("terminal")}
                        className="flex items-center gap-1.5 text-[11px] text-[#666] hover:text-[#9A9A95] transition-colors"
                      >
                        <Terminal className="h-3 w-3" />
                        Check errors in terminal
                      </button>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-[#666]" />
                      <span className="text-[13px] text-[#666]">Loading...</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terminal */}
        {showTerminal && (
          <div className={`${viewMode === "split" ? "h-[45%]" : "flex-1"} flex flex-col`}>
            {viewMode === "split" && <div className="h-px bg-[#333]" />}
            <div className="flex flex-1 flex-col overflow-hidden p-3 bg-[#232323]">
              <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-[#2C2C2C] ring-1 ring-white/[0.08]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#3A3A3A] px-4 py-3.5">
                  <span className="text-[13px] font-semibold text-[#E8E8E5]">Meld Computer</span>
                  <div className="flex items-center gap-1">
                    <button onClick={toggleInspector} className={`rounded-md p-1.5 transition-colors ${inspectorEnabled ? "text-blue-400 bg-blue-500/15" : "text-[#666] hover:text-[#9A9A95] hover:bg-[#3A3A3A]"}`} title="Inspector">
                      <MousePointerClick className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={handleRefresh} className="rounded-md p-1.5 text-[#666] hover:text-[#9A9A95] hover:bg-[#3A3A3A] transition-colors" title="Refresh">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-md p-1.5 text-[#666] hover:text-[#9A9A95] hover:bg-[#3A3A3A] transition-colors" title="Open">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 border-b border-[#3A3A3A] px-4 py-2.5 bg-[#252525]">
                  <Loader2 className="h-3 w-3 animate-spin text-[#888]" />
                  <span className="text-[11px] text-[#9A9A95]">Running dev server{framework ? ` (${framework})` : ""}</span>
                </div>

                {/* Terminal */}
                <div className="flex-1 overflow-hidden">
                  <XTerminal className="h-full" />
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between border-t border-[#3A3A3A] px-4 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                    <span className="text-[10px] text-[#9A9A95]">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating tab bar */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3">
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl bg-[#1A1A1A]/90 p-1 shadow-lg shadow-black/30 backdrop-blur-sm ring-1 ring-white/[0.08]">
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11px] font-medium transition-all ${
                viewMode === "preview" ? "bg-white/10 text-[#E8E8E5] shadow-sm" : "text-[#777] hover:text-[#aaa]"
              }`}
            >
              <Monitor className="h-3 w-3" />
              Preview
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11px] font-medium transition-all ${
                viewMode === "split" ? "bg-white/10 text-[#E8E8E5] shadow-sm" : "text-[#777] hover:text-[#aaa]"
              }`}
            >
              <Columns2 className="h-3 w-3" />
              Split
            </button>
            <button
              onClick={() => setViewMode("terminal")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11px] font-medium transition-all ${
                viewMode === "terminal" ? "bg-white/10 text-[#E8E8E5] shadow-sm" : "text-[#777] hover:text-[#aaa]"
              }`}
            >
              <Terminal className="h-3 w-3" />
              Terminal
            </button>
          </div>
        </div>
      </div>

      {/* Element info bar */}
      {inspectedElement && inspectorEnabled && (
        <div className="flex items-center gap-2 border-t border-[#333] bg-[#232323] px-3 py-2">
          <MousePointerClick className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {inspectedElement.componentName && (
              <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[11px] font-medium text-blue-400">
                {inspectedElement.componentName}
              </span>
            )}
            <span className="text-[11px] text-[#666]">&lt;{inspectedElement.tagName}&gt;</span>
          </div>
        </div>
      )}

      {/* Element history */}
      {elementHistory.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto bg-[#232323] px-2 py-1.5 border-t border-[#333]">
          <span className="flex-shrink-0 text-[10px] font-medium text-[#555]">History:</span>
          {elementHistory.map((entry, i) => (
            <button
              key={`${entry.element.selector}-${entry.timestamp}`}
              onClick={() => handleHistoryClick(entry.filePath)}
              className={`group flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] transition-colors ${
                entry.filePath
                  ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                  : "bg-[#333] text-[#9A9A95] hover:bg-[#3A3A3A]"
              }`}
            >
              <span className="max-w-[120px] truncate font-medium">
                {entry.element.componentName || `<${entry.element.tagName}>`}
              </span>
              <span
                onClick={(e) => { e.stopPropagation(); removeElementFromHistory(i); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="h-2.5 w-2.5" />
              </span>
            </button>
          ))}
          <button
            onClick={clearElementHistory}
            className="ml-auto flex-shrink-0 rounded-md p-1 text-[#555] hover:bg-[#333] hover:text-[#9A9A95] transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
