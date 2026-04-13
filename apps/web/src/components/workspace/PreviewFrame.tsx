"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, ExternalLink, Loader2, MousePointerClick, FileCode, AlertTriangle, Terminal, Monitor, Columns2, Sparkles } from "lucide-react";
import { useAgentStore, type InspectedElement } from "@/lib/store/agent-store";
import { matchByNaming } from "@/lib/mapping/engine";
import type { FileEntry } from "@figma-code-bridge/shared";

interface PreviewFrameProps {
  url: string;
  framework?: string | null;
  onFixWithAI?: (errorMessage: string) => void;
}

function flattenPaths(entries: FileEntry[]): string[] {
  const paths: string[] = [];
  for (const e of entries) {
    if (e.type === "file") paths.push(e.path);
    if (e.children) paths.push(...flattenPaths(e.children as FileEntry[]));
  }
  return paths;
}

type ViewMode = "preview" | "terminal" | "split";

export function PreviewFrame({ url, framework, onFixWithAI }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [devServerCrashed, setDevServerCrashed] = useState(false);
  const retryCountRef = useRef(0);
  const wasHealthyRef = useRef(false);
  const consecutiveFailRef = useRef(0);
  const autoRestartCountRef = useRef(0); // Limit auto-restarts to prevent infinite loop
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const lastWriteTimestamp = useAgentStore((s) => s.lastWriteTimestamp);
  const inspectorEnabled = useAgentStore((s) => s.inspectorEnabled);
  const inspectedElement = useAgentStore((s) => s.inspectedElement);
  const setInspectorEnabled = useAgentStore((s) => s.setInspectorEnabled);
  const setInspectedElement = useAgentStore((s) => s.setInspectedElement);
  const setSelectedFilePath = useAgentStore((s) => s.setSelectedFilePath);
  const addElementHistory = useAgentStore((s) => s.addElementHistory);
  const selectedFilePath = useAgentStore((s) => s.selectedFilePath);
  const readFileFn = useAgentStore((s) => s.readFileFn);
  const writeFileFn = useAgentStore((s) => s.writeFileFn);
  const setLastWrite = useAgentStore((s) => s.setLastWrite);
  const devServerFramework = useAgentStore((s) => s.devServerFramework);
  const fileTree = useAgentStore((s) => s.fileTree);

  const filePaths = useMemo(() => flattenPaths(fileTree as FileEntry[]), [fileTree]);

  // Listen for inspector messages from preview iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "meld:element-selected") {
        const payload = e.data.payload as InspectedElement;
        setInspectedElement(payload);
        if (payload.componentName && filePaths.length > 0) {
          const match = matchByNaming(payload.componentName, filePaths);
          addElementHistory(payload, match?.filePath ?? undefined);
          if (match) setSelectedFilePath(match.filePath);
        } else {
          addElementHistory(payload, undefined);
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [filePaths, setInspectedElement, setSelectedFilePath, addElementHistory]);

  // Terminal: load buffered logs + collect real-time output
  useEffect(() => {
    const agent = window.electronAgent;
    if (!agent) return;

    if (agent.getTerminalBuffer) {
      agent.getTerminalBuffer().then((buffer) => {
        if (buffer.length > 0) setTerminalLogs(buffer);
      });
    }

    if (!agent.onTerminalOutput) return;
    const cleanup = agent.onTerminalOutput((data: string) => {
      setTerminalLogs((prev) => {
        const next = [...prev, data];
        return next.length > 200 ? next.slice(-200) : next;
      });
    });

    return cleanup;
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const checkHealth = useCallback(async (targetUrl: string): Promise<boolean> => {
    const agent = window.electronAgent;

    if (agent?.checkUrl) {
      const result = await agent.checkUrl(targetUrl);
      if (!result.ok) {
        if (result.status >= 500) setErrorMessage("Dev server encountered an internal error. Check the terminal for details.");
        else if (result.error?.includes("ECONNREFUSED")) setErrorMessage("Dev server is not running. It may still be starting up.");
        else if (result.error?.includes("ECONNRESET") || result.error?.includes("socket hang up")) setErrorMessage("Dev server connection was interrupted. It may be restarting.");
        else if (result.error?.includes("ETIMEDOUT")) setErrorMessage("Dev server is taking too long to respond. It may be under heavy load.");
        else if (result.error) setErrorMessage("Cannot reach the dev server. Check if it started correctly.");
        else setErrorMessage("Waiting for dev server to become ready...");
        return false;
      }
      return true;
    }

    try {
      const res = await fetch(targetUrl);
      if (res.status >= 500) { setErrorMessage("Dev server encountered an internal error. Check the terminal for details."); return false; }
      return true;
    } catch {
      setErrorMessage("Waiting for dev server to become ready...");
      return false;
    }
  }, []);

  useEffect(() => {
    // If URL is not http (e.g. about:blank), just wait
    if (!url.startsWith("http")) {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage(null);
    setDevServerCrashed(false);
    retryCountRef.current = 0;
    consecutiveFailRef.current = 0;

    const tryLoad = async () => {
      // Retry up to 10 times with 2s delay (20s total) for dev server startup
      for (let attempt = 0; attempt < 10; attempt++) {
        if (cancelled) return;
        const ok = await checkHealth(url);
        if (cancelled) return;
        if (ok) {
          wasHealthyRef.current = true;
          if (iframeRef.current) iframeRef.current.src = url;
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      // All retries failed — try restarting dev server
      if (cancelled) return;
      const agent = window.electronAgent;
      if (agent?.restartDevServer) {
        try { await agent.restartDevServer(); } catch {}
        // Wait for restart, then retry
        for (let attempt = 0; attempt < 10; attempt++) {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, 2000));
          const ok = await checkHealth(url);
          if (cancelled) return;
          if (ok) {
            wasHealthyRef.current = true;
            if (iframeRef.current) iframeRef.current.src = url;
            return;
          }
        }
      }
      if (!cancelled) setHasError(true);
    };

    tryLoad();
    return () => { cancelled = true; };
  }, [url, checkHealth]);

  useEffect(() => {
    if (lastWriteTimestamp === 0) return;
    const timer = setTimeout(() => {
      if (iframeRef.current) {
        setIsLoading(true);
        const separator = url.includes("?") ? "&" : "?";
        iframeRef.current.src = `${url}${separator}_t=${lastWriteTimestamp}`;
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [lastWriteTimestamp, url]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "meld:element-selected") {
        const payload = e.data.payload as InspectedElement;
        setInspectedElement(payload);
        addElementHistory(payload);
        if (payload.componentName && filePaths.length > 0) {
          const match = matchByNaming(payload.componentName, filePaths);
          if (match) setSelectedFilePath(match.filePath);
        }
      }
      if (e.data?.type === "meld:visual-edit") {
        const { editType, property, value, oldText, newText, element } = e.data.payload;
        handleVisualEditRef.current?.({ editType, property, value, oldText, newText, element });
      }
      if (e.data?.type === "meld:ask-ai") {
        const payload = e.data.payload as InspectedElement;
        setInspectedElement(payload);
        if (payload.componentName && filePaths.length > 0) {
          const match = matchByNaming(payload.componentName, filePaths);
          if (match) setSelectedFilePath(match.filePath);
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [filePaths, setInspectedElement, setSelectedFilePath, addElementHistory]);

  // Capture screenshot of the preview iframe for Vision
  const capturePreviewScreenshot = async (): Promise<string | undefined> => {
    try {
      if (window.electronAgent?.preview) {
        // Electron: use webContents.capturePage via IPC (if available)
        return undefined; // TODO: implement IPC screenshot
      }
      // Web: use html2canvas-like approach via canvas
      const iframe = iframeRef.current;
      if (!iframe) return undefined;
      // Can't capture cross-origin iframe directly, but we can capture the whole preview area
      const canvas = document.createElement("canvas");
      const rect = iframe.getBoundingClientRect();
      canvas.width = Math.min(rect.width, 800);
      canvas.height = Math.min(rect.height, 600);
      // For same-origin iframes, try drawImage
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;
      ctx.fillStyle = "#2C2C2C";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Note: cross-origin will fail silently, which is fine
      try {
        ctx.drawImage(iframe as unknown as CanvasImageSource, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.6);
      } catch {
        return undefined;
      }
    } catch {
      return undefined;
    }
  };

  // --- Visual Edit: 2-stage pipeline (instant preview + background code sync) ---
  interface VisualEdit {
    editType: string; property?: string; value?: string;
    oldText?: string; newText?: string;
    element: { selector: string; componentName: string | null; className: string; tagName: string };
    parentElement?: { selector: string; componentName: string | null; className: string; tagName: string };
  }

  const pendingEditsRef = useRef<VisualEdit[]>([]);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleVisualEditRef = useRef<((edit: VisualEdit) => void) | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced">("idle");

  const editToCommand = useCallback((edit: VisualEdit): string => {
    const elDesc = edit.element.componentName || edit.element.tagName;
    const elClasses = edit.element.className.split(" ").slice(0, 3).join(" ");

    if (edit.editType === "text" && edit.oldText && edit.newText) {
      return `Change the text "${edit.oldText}" to "${edit.newText}"`;
    } else if (edit.editType === "color" && edit.property && edit.value) {
      const propLabel = edit.property === "background-color" ? "background color" : "text color";
      return `Change the ${propLabel} of the ${elDesc} (${elClasses}) to ${edit.value}`;
    } else if (edit.editType === "spacing" && edit.property && edit.value) {
      return `Change the ${edit.property} of the ${elDesc} (${elClasses}) to ${edit.value}`;
    } else if (edit.editType === "position" && edit.value) {
      const pos = JSON.parse(edit.value);
      return `Move the ${elDesc} (${elClasses}) to position left: ${pos.left}, top: ${pos.top}. Use position: ${pos.position} or appropriate positioning. If using Tailwind, use relative positioning classes.`;
    } else if (edit.editType === "resize" && edit.value) {
      const size = JSON.parse(edit.value);
      return `Resize the ${elDesc} (${elClasses}) to width: ${size.width}, height: ${size.height}. Use appropriate width/height classes or inline styles.`;
    } else if (edit.editType === "borderRadius" && edit.value) {
      return `Change the border-radius of the ${elDesc} (${elClasses}) to ${edit.value}. Use Tailwind rounded classes if possible.`;
    } else if (edit.editType === "align" && edit.value) {
      return `Align the ${elDesc} (${elClasses}) to ${edit.value}. Modify the parent container's flex/grid alignment or text-align as needed. Use Tailwind classes like items-center, justify-center, text-left, etc.`;
    } else if (edit.editType === "fontSize" && edit.value) {
      return `Change the font-size of the ${elDesc} (${elClasses}) to ${edit.value}. Use Tailwind text-* classes if possible.`;
    } else if (edit.editType === "opacity" && edit.value) {
      return `Change the opacity of the ${elDesc} (${elClasses}) to ${edit.value}.`;
    } else if (edit.editType === "gap" && edit.value) {
      return `Change the gap of the ${elDesc} (${elClasses}) to ${edit.value}. Use Tailwind gap-* classes if possible.`;
    } else if (edit.editType === "shadow" && edit.value) {
      return `Change the box-shadow of the ${elDesc} (${elClasses}) to ${edit.value}. Use Tailwind shadow-* classes if possible.`;
    } else if (edit.editType === "style" && edit.property && edit.value) {
      return `Change the ${edit.property} of the ${elDesc} (${elClasses}) to ${edit.value}.`;
    }
    return "";
  }, []);

  const syncEditsToCode = useCallback(async (edits: VisualEdit[]) => {
    const targetFile = selectedFilePath;
    if (!targetFile || !readFileFn || !writeFileFn) return;

    const commands = edits.map(editToCommand).filter(Boolean);
    if (commands.length === 0) return;

    const combinedCommand = commands.length === 1
      ? commands[0]
      : `Apply the following changes to the component:\n${commands.map((c, i) => `${i + 1}. ${c}`).join("\n")}`;

    const currentCode = await readFileFn(targetFile);

    try {
      let result: { filePath: string; original: string; modified: string; explanation: string };

      if (window.electronAgent?.ai) {
        result = await window.electronAgent.ai.editCode({
          filePath: targetFile, command: combinedCommand, currentCode,
          framework: devServerFramework ?? undefined,
        });
      } else {
        const res = await fetch("/api/ai/edit-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filePath: targetFile, command: combinedCommand, currentCode }),
        });
        const data = await res.json();
        if (!res.ok) return;
        result = data.type === "chat"
          ? { filePath: targetFile, original: "", modified: "", explanation: data.text }
          : { filePath: data.filePath, original: data.original, modified: data.modified, explanation: data.explanation };
      }

      if (result.modified && targetFile) {
        await writeFileFn(targetFile, result.modified);
        setLastWrite();
      }
    } catch (err) {
      console.error("[visual-edit] Code sync failed:", err);
    }
  }, [selectedFilePath, readFileFn, writeFileFn, devServerFramework, editToCommand, setLastWrite]);

  const handleVisualEdit = useCallback((edit: VisualEdit) => {
    // Stage 1: Visual change is ALREADY applied instantly by inspector-script
    //          (element.style is modified in the iframe before this message arrives)

    // Stage 2: Queue for background code sync with debounce
    pendingEditsRef.current.push(edit);
    clearTimeout(syncTimerRef.current);
    setSyncStatus("idle");

    syncTimerRef.current = setTimeout(async () => {
      const edits = [...pendingEditsRef.current];
      pendingEditsRef.current = [];
      setSyncStatus("syncing");
      await syncEditsToCode(edits);
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus("idle"), 2000);
    }, 800);
  }, [syncEditsToCode]);

  // Keep the ref in sync so the earlier message-handler effect can call
  // the latest callback without a hoisting order mismatch. This is the
  // standard "useEvent" pattern; react-compiler's immutability rule flags
  // it but the underlying ref mutation is intentional and cleanup-safe.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    handleVisualEditRef.current = handleVisualEdit;
  }, [handleVisualEdit]);

  // Apply a style change directly to the selected element in iframe (instant)
  const applyStyleToIframe = useCallback((property: string, value: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "meld:apply-style", property, value },
      "*",
    );
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage(null);
    retryCountRef.current = 0;
    const ok = await checkHealth(url);
    if (ok && iframeRef.current) iframeRef.current.src = url;
    else setHasError(true);
  }, [url, checkHealth]);

  useEffect(() => {
    if (!hasError || retryCountRef.current >= 20) return;
    const timer = setTimeout(async () => {
      retryCountRef.current += 1;
      const ok = await checkHealth(url);
      if (ok) {
        setHasError(false);
        setErrorMessage(null);
        if (iframeRef.current) iframeRef.current.src = url;
      } else {
        setHasError(false);
        requestAnimationFrame(() => setHasError(true));
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [hasError, url, checkHealth]);

  // Dev server crash detection: 5 consecutive health check failures → auto-restart
  useEffect(() => {
    if (!url || hasError) return;

    healthCheckIntervalRef.current = setInterval(async () => {
      const ok = await checkHealth(url);
      if (ok) {
        consecutiveFailRef.current = 0;
        if (devServerCrashed) setDevServerCrashed(false);
      } else {
        consecutiveFailRef.current += 1;
        if (wasHealthyRef.current && consecutiveFailRef.current >= 5) {
          // Auto-restart dev server (max 2 times to prevent infinite loop)
          const agent = window.electronAgent;
          if (agent?.restartDevServer && autoRestartCountRef.current < 2) {
            autoRestartCountRef.current++;
            consecutiveFailRef.current = 0;
            try { await agent.restartDevServer(); } catch {}
            return;
          }
          setDevServerCrashed(true);
        }
      }
    }, 5000); // Check every 5 seconds

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    };
  }, [url, hasError, checkHealth, devServerCrashed]);

  const toggleInspector = useCallback(() => {
    const next = !inspectorEnabled;
    setInspectorEnabled(next);
    if (!next) setInspectedElement(null);

    const sendToggle = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "meld:toggle-inspector", enabled: next }, "*",
      );
    };

    if (next && window.electronAgent?.injectInspectorInFrame) {
      window.electronAgent.injectInspectorInFrame().then(() => setTimeout(sendToggle, 50));
    } else {
      sendToggle();
    }
  }, [inspectorEnabled, setInspectorEnabled, setInspectedElement]);

  const mappedFilePath = useMemo(() => {
    if (!inspectedElement?.componentName || filePaths.length === 0) return null;
    return matchByNaming(inspectedElement.componentName, filePaths)?.filePath ?? null;
  }, [inspectedElement, filePaths]);

  const handleFileClick = useCallback(() => {
    if (mappedFilePath) setSelectedFilePath(mappedFilePath);
  }, [mappedFilePath, setSelectedFilePath]);

  const isElectron = typeof window !== "undefined" && !!window.electronAgent;
  const showTerminal = viewMode === "terminal" || viewMode === "split";
  const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");

  const detectedIssues = useMemo(() => {
    const allText = terminalLogs.map(stripAnsi).join("\n");
    const issues: { icon: string; title: string; desc: string; action?: string }[] = [];

    if (allText.includes("MissingSecret") || allText.includes("AUTH_SECRET") || allText.includes("NEXTAUTH_SECRET")) {
      issues.push({ icon: "🔑", title: ".env secret required", desc: "AUTH_SECRET or NEXTAUTH_SECRET is not configured.", action: 'echo \'AUTH_SECRET="$(openssl rand -base64 32)"\' >> .env.local' });
    }
    if (allText.includes("ECONNREFUSED") && (allText.includes("5432") || allText.includes("postgres"))) {
      issues.push({ icon: "🗄️", title: "PostgreSQL connection failed", desc: "Make sure PostgreSQL is running." });
    }
    if (allText.includes("ECONNREFUSED") && (allText.includes("27017") || allText.includes("mongo"))) {
      issues.push({ icon: "🗄️", title: "MongoDB connection failed", desc: "Make sure MongoDB is running." });
    }
    if (allText.includes("ECONNREFUSED") && allText.includes("6379")) {
      issues.push({ icon: "🗄️", title: "Redis connection failed", desc: "Make sure Redis is running." });
    }
    if (allText.includes("DATABASE_URL") || (allText.includes("database") && allText.includes("ECONNREFUSED"))) {
      issues.push({ icon: "🗄️", title: "Database connection failed", desc: "Check your DATABASE_URL environment variable and DB server status." });
    }
    const envMatch = allText.match(/(?:process\.env\.|Missing environment variable[:\s]+)([A-Z_]+)/);
    if (envMatch && !issues.some((i) => i.title.includes("secret"))) {
      issues.push({ icon: "⚙️", title: `Missing env variable: ${envMatch[1]}`, desc: `Add ${envMatch[1]} to your .env.local file.` });
    }
    if (allText.includes("Cannot find module") || allText.includes("MODULE_NOT_FOUND")) {
      const modMatch = allText.match(/Cannot find module '([^']+)'/);
      issues.push({ icon: "📦", title: `Module not found${modMatch ? `: ${modMatch[1]}` : ""}`, desc: "Run npm install or install the missing package.", action: modMatch ? `npm install ${modMatch[1]}` : "npm install" });
    }
    if (allText.includes("prisma") && (allText.includes("migrate") || allText.includes("The table") || allText.includes("does not exist"))) {
      issues.push({ icon: "🔄", title: "DB migration needed", desc: "Run Prisma migration.", action: "npx prisma migrate dev" });
    }
    if (allText.includes("EADDRINUSE")) {
      const portMatch = allText.match(/EADDRINUSE.*?:(\d+)/);
      issues.push({ icon: "🔌", title: `Port ${portMatch?.[1] || ""} conflict`, desc: "Stop the process using that port." });
    }
    return issues;
  }, [terminalLogs]);

  return (
    <div className="flex h-full flex-col bg-[#2C2C2C]">
      {/* Main area: iframe is always displayed */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Preview iframe — always full size */}
        <div className={`absolute inset-0 ${inspectorEnabled ? "ring-2 ring-blue-400 ring-inset rounded-sm" : ""}`}>
          {(isLoading || hasError) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#2C2C2C]">
              <div className="flex flex-col items-center gap-3">
                {hasError ? (
                  <>
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                    <span className="text-[13px] font-medium text-[#9A9A95]">
                      {errorMessage || "Waiting for dev server response..."}
                    </span>
                    {(detectedIssues.length > 0 || errorMessage?.includes("500")) && (
                      <div className="max-w-sm space-y-2.5">
                        {detectedIssues.length > 0 ? (
                          detectedIssues.map((issue, i) => (
                            <div key={i} className="rounded-xl bg-amber-50 px-4 py-3 text-left">
                              <p className="text-[12px] font-medium text-amber-900">{issue.icon} {issue.title}</p>
                              <p className="mt-1 text-[11px] text-amber-700">{issue.desc}</p>
                              {issue.action && (
                                <code className="mt-2 block rounded-lg bg-amber-100/80 px-3 py-1.5 font-mono text-[10px] text-amber-800 select-all">{issue.action}</code>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl bg-amber-50 px-4 py-3 text-left">
                            <p className="text-[11px] font-medium text-amber-800">There seems to be an issue with the project server</p>
                            <ul className="mt-1.5 space-y-1 text-[11px] text-amber-700">
                              <li>• Is your .env file configured?</li>
                              <li>• Is the DB connection working?</li>
                              <li>• Are node_modules up to date?</li>
                            </ul>
                          </div>
                        )}
                        {isElectron && (
                          <div className="flex w-full gap-2">
                            <button
                              onClick={async () => {
                                setErrorMessage("Restarting server...");
                                retryCountRef.current = 0;
                                setTerminalLogs([]);
                                await window.electronAgent?.restartDevServer();
                              }}
                              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#333]"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Restart
                            </button>
                            {onFixWithAI && errorMessage && !/EADDRINUSE|already in use|port/i.test(errorMessage) && (
                              <button
                                onClick={() => {
                                  const lastLogs = terminalLogs.slice(-20).join("\n");
                                  onFixWithAI(`Dev server error:\n${errorMessage}\n\nTerminal output:\n${lastLogs}`);
                                  setHasError(false);
                                  setErrorMessage(null);
                                }}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-500"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                Fix with AI
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {retryCountRef.current > 0 && retryCountRef.current < 20 && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin text-[#B4B4B0]" />
                        <span className="text-[11px] text-[#B4B4B0]">Auto-retry {retryCountRef.current}/20</span>
                      </div>
                    )}
                    {retryCountRef.current >= 20 && (
                      <button onClick={handleRefresh} className="mt-1 rounded-lg bg-[#1A1A1A] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#333]">
                        Retry
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-[#787774]" />
                    <span className="text-[13px] text-[#787774]">Loading...</span>
                  </>
                )}
              </div>
            </div>
          )}
          {/* Dev server crash banner */}
          {devServerCrashed && !hasError && (
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-red-900/90 px-4 py-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-300" />
                <span className="text-[13px] font-medium text-red-100">Dev server is not responding</span>
              </div>
              <div className="flex items-center gap-2">
                {onFixWithAI && (
                  <button
                    onClick={() => {
                      const lastLogs = terminalLogs.slice(-20).join("\n");
                      onFixWithAI(`Dev server crashed. Terminal output:\n${lastLogs}`);
                      setDevServerCrashed(false);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-600"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Fix with AI
                  </button>
                )}
                <button
                  onClick={async () => {
                    setDevServerCrashed(false);
                    consecutiveFailRef.current = 0;
                    wasHealthyRef.current = false;
                    setTerminalLogs([]);
                    if (window.electronAgent?.restartDevServer) {
                      await window.electronAgent.restartDevServer();
                    } else {
                      handleRefresh();
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-red-800 px-3 py-1.5 text-[12px] font-medium text-red-100 transition-colors hover:bg-red-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Restart
                </button>
              </div>
            </div>
          )}
          {/* Code sync status indicator */}
          {syncStatus !== "idle" && (
            <div className="animate-pop-in absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-lg bg-black/70 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {syncStatus === "syncing" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Syncing code...</span>
                </>
              ) : (
                <>
                  <span className="text-emerald-400">✓</span>
                  <span>Code synced</span>
                </>
              )}
            </div>
          )}
          <iframe
            ref={iframeRef}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={() => {
              setIsLoading(false);
              setHasError(false);
              setErrorMessage(null);
              setDevServerCrashed(false);
              retryCountRef.current = 0;
              wasHealthyRef.current = true;
              consecutiveFailRef.current = 0;
              if (window.electronAgent?.injectInspectorInFrame) {
                window.electronAgent.injectInspectorInFrame().then(() => {
                  if (inspectorEnabled) {
                    setTimeout(() => {
                      iframeRef.current?.contentWindow?.postMessage({ type: "meld:toggle-inspector", enabled: true }, "*");
                    }, 50);
                  }
                });
              } else if (inspectorEnabled) {
                iframeRef.current?.contentWindow?.postMessage({ type: "meld:toggle-inspector", enabled: true }, "*");
              }
            }}
            onError={() => { setHasError(true); setErrorMessage("Failed to load page"); }}
            title="Dev Server Preview"
          />
        </div>

      </div>

    </div>
  );
}
