"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { FolderOpen, Eye, Code, Loader2, Terminal, Copy, Check, RefreshCw, Monitor } from "lucide-react";
import { FileTreeBrowser } from "./FileTreeBrowser";
import { PreviewFrame } from "./PreviewFrame";
import { useAgentStore } from "@/lib/store/agent-store";
import type { FileEntry } from "@figma-code-bridge/shared";

type LeftTab = "files" | "preview" | "terminal";

// Strip ANSI escape codes
const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");

function AgentDisconnectedGuide() {
  const [copied, setCopied] = useState(false);
  const command = "npx meld";

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full items-center justify-center bg-white p-6">
      <div className="animate-fade-in max-w-xs space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F7F5]">
          <Terminal className="h-5 w-5 text-[#787774]" />
        </div>

        <div>
          <p className="text-[15px] font-semibold text-[#1A1A1A]">Waiting for agent connection</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#787774]">
            Run the command below in your project folder.
            <br />
            The agent will access the file system.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="group flex w-full items-center gap-2.5 rounded-xl bg-[#1A1A1A] px-4 py-3 text-left font-mono text-[12px] transition-all hover:bg-[#252525] active:scale-[0.99]"
        >
          <span className="text-[#666]">$</span>
          <span className="flex-1 text-[#ccc]">{command}</span>
          {copied ? (
            <span className="flex items-center gap-1 text-[10px] text-green-400">
              <Check className="h-3 w-3" />
              Copied
            </span>
          ) : (
            <Copy className="h-3.5 w-3.5 text-[#555] transition-colors group-hover:text-[#999]" />
          )}
        </button>

        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin text-[#B4B4B0]" />
          <span className="text-[11px] text-[#B4B4B0]">Waiting for connection...</span>
        </div>
      </div>
    </div>
  );
}

// Manus-style terminal panel
function TerminalPanel() {
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const devServerFramework = useAgentStore((s) => s.devServerFramework);

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
        return next.length > 500 ? next.slice(-500) : next;
      });
    });

    return cleanup;
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Detect error patterns
  const detectedIssues = useMemo(() => {
    const allText = terminalLogs.map(stripAnsi).join("\n");
    const issues: { icon: string; title: string; desc: string; action?: string }[] = [];

    if (allText.includes("MissingSecret") || allText.includes("AUTH_SECRET") || allText.includes("NEXTAUTH_SECRET")) {
      issues.push({
        icon: "🔑", title: ".env secret required",
        desc: "AUTH_SECRET or NEXTAUTH_SECRET is not configured.",
        action: 'echo \'AUTH_SECRET="$(openssl rand -base64 32)"\' >> .env.local',
      });
    }

    if (allText.includes("ECONNREFUSED") && (allText.includes("5432") || allText.includes("postgres"))) {
      issues.push({ icon: "🗄️", title: "PostgreSQL connection failed", desc: "Check that PostgreSQL is running." });
    }
    if (allText.includes("ECONNREFUSED") && (allText.includes("27017") || allText.includes("mongo"))) {
      issues.push({ icon: "🗄️", title: "MongoDB connection failed", desc: "Check that MongoDB is running." });
    }
    if (allText.includes("ECONNREFUSED") && allText.includes("6379")) {
      issues.push({ icon: "🗄️", title: "Redis connection failed", desc: "Check that Redis is running." });
    }

    if (allText.includes("Cannot find module") || allText.includes("MODULE_NOT_FOUND")) {
      const modMatch = allText.match(/Cannot find module '([^']+)'/);
      issues.push({
        icon: "📦", title: `Module not found${modMatch ? `: ${modMatch[1]}` : ""}`,
        desc: "Run npm install or install the required package.",
        action: modMatch ? `npm install ${modMatch[1]}` : "npm install",
      });
    }

    if (allText.includes("EADDRINUSE")) {
      const portMatch = allText.match(/EADDRINUSE.*?:(\d+)/);
      issues.push({ icon: "🔌", title: `Port ${portMatch?.[1] || ""} conflict`, desc: "Terminate the process using that port." });
    }

    return issues;
  }, [terminalLogs]);

  const isElectron = typeof window !== "undefined" && !!window.electronAgent;

  return (
    <div className="flex h-full flex-col bg-[#1E1E1E]">
      {/* Header — Manus style */}
      <div className="flex items-center justify-between border-b border-[#333] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-[#9A9A95]" />
          <span className="text-[13px] font-semibold text-[#E8E8E5]">Meld Computer</span>
        </div>
        <div className="flex items-center gap-1">
          {isElectron && (
            <button
              onClick={async () => {
                setTerminalLogs([]);
                await window.electronAgent?.restartDevServer();
              }}
              className="rounded-md p-1 text-[#555] hover:text-[#9A9A95] hover:bg-[#333] transition-colors"
              title="Restart server"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setTerminalLogs([])}
            className="rounded-md px-2 py-0.5 text-[11px] text-[#555] hover:text-[#9A9A95] hover:bg-[#333] transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Status sub-header */}
      <div className="flex items-center gap-2 border-b border-[#2A2A2A] px-4 py-1.5 bg-[#1A1A1A]">
        <Loader2 className="h-3 w-3 animate-spin text-[#555]" />
        <span className="text-[11px] text-[#555]">
          Running dev server{devServerFramework ? ` (${devServerFramework})` : ""}
        </span>
        {detectedIssues.length > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-medium text-amber-400">
            {detectedIssues.length} issue{detectedIssues.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Issue banner */}
      {detectedIssues.length > 0 && (
        <div className="space-y-1.5 bg-amber-500/5 px-4 py-2.5 border-b border-[#2A2A2A]">
          {detectedIssues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[12px] leading-none mt-0.5">{issue.icon}</span>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-medium text-amber-400">{issue.title}</span>
                <span className="ml-2 text-[10px] text-amber-500/70">{issue.desc}</span>
                {issue.action && (
                  <code className="mt-1.5 block rounded-md bg-[#2A2A2A] px-3 py-1.5 font-mono text-[10px] text-amber-300 select-all">
                    $ {issue.action}
                  </code>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Terminal content */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={terminalRef} className="absolute inset-0 overflow-auto px-4 py-3 font-mono text-[12px] leading-[1.7] text-[#777]">
          {terminalLogs.length === 0 ? (
            <span className="text-[#444]">Waiting for output...</span>
          ) : (
            terminalLogs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">{stripAnsi(log)}</div>
            ))
          )}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between border-t border-[#2A2A2A] px-4 py-1.5">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
          <span className="text-[10px] text-[#555]">Live</span>
        </div>
        <span className="text-[10px] text-[#444]">{terminalLogs.length} lines</span>
      </div>
    </div>
  );
}

interface LocalPanelProps {
  connected: boolean;
  fileTree: FileEntry[];
  projectName: string | null;
  devServerUrl: string | null;
  devServerFramework: string | null;
  readFile: (path: string) => Promise<string>;
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
}

export function LocalPanel({
  connected,
  fileTree,
  projectName,
  devServerUrl,
  devServerFramework,
  readFile,
  selectedFilePath,
  onSelectFile,
}: LocalPanelProps) {
  const [activeTab, setActiveTab] = useState<LeftTab>("files");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const inspectorEnabled = useAgentStore((s) => s.inspectorEnabled);
  const isElectron = typeof window !== "undefined" && !!window.electronAgent;

  const handleSelectFile = useCallback(
    async (path: string) => {
      onSelectFile(path);
      setIsLoadingFile(true);
      try {
        const content = await readFile(path);
        setFileContent(content);
      } catch {
        setFileContent("// Unable to read file");
      } finally {
        setIsLoadingFile(false);
      }
    },
    [readFile, onSelectFile],
  );

  if (!connected) {
    return <AgentDisconnectedGuide />;
  }

  const TABS: { id: LeftTab; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: "files", label: "Files", icon: <FolderOpen className="h-3.5 w-3.5" /> },
    {
      id: "preview",
      label: "Preview",
      icon: (
        <span className="relative">
          <Eye className="h-3.5 w-3.5" />
          {inspectorEnabled && (
            <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
          )}
        </span>
      ),
      disabled: !devServerUrl,
    },
    ...(isElectron ? [{
      id: "terminal" as LeftTab,
      label: "Terminal",
      icon: <Terminal className="h-3.5 w-3.5" />,
    }] : []),
  ];

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Tab bar */}
      <div className="flex border-b border-[#E0E0DC]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors ${
              activeTab === tab.id
                ? "text-[#1A1A1A]"
                : tab.disabled
                  ? "cursor-not-allowed text-[#D4D4D0]"
                  : "text-[#B4B4B0] hover:text-[#787774]"
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full bg-[#1A1A1A]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        {activeTab === "files" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className={`overflow-hidden ${selectedFilePath ? "h-[55%]" : "flex-1"}`}>
              {fileTree.length === 0 ? (
                <div className="flex h-full items-center justify-center p-6">
                  <div className="text-center">
                    <FolderOpen className="mx-auto h-5 w-5 text-[#D4D4D0]" />
                    <p className="mt-2 text-[12px] text-[#B4B4B0]">
                      Project files will appear here after scanning
                    </p>
                  </div>
                </div>
              ) : (
                <FileTreeBrowser
                  files={fileTree}
                  selectedPath={selectedFilePath}
                  onSelectFile={handleSelectFile}
                />
              )}
            </div>

            {selectedFilePath && (
              <div className="flex flex-1 flex-col bg-[#F7F7F5]">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Code className="h-3 w-3 text-[#B4B4B0]" />
                  <span className="truncate text-[11px] font-medium text-[#787774]">
                    {selectedFilePath}
                  </span>
                </div>
                <div className="mx-2 mb-2 flex-1 overflow-auto rounded-lg bg-[#EEEEEC] p-4">
                  {isLoadingFile ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-[#B4B4B0]" />
                      <span className="text-[12px] text-[#B4B4B0]">Loading...</span>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-[#1A1A1A]">
                      {fileContent}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "preview" && devServerUrl && (
          <PreviewFrame url={devServerUrl} framework={devServerFramework} />
        )}

        {activeTab === "terminal" && (
          <TerminalPanel />
        )}
      </div>
    </div>
  );
}
