import type { FileEntry } from "@figma-code-bridge/shared";

interface ElectronAgent {
  isElectron: true;
  openExternalAuth(url: string): void;
  navigateTo?(path: string): Promise<boolean>;
  getSavedSession?(): Promise<{ id: string; githubUsername: string; avatarUrl?: string; hasFigmaToken?: boolean } | null>;
  saveSession?(user: { id: string; githubUsername: string; avatarUrl?: string; hasFigmaToken?: boolean }): Promise<boolean>;
  clearSession?(): Promise<boolean>;
  agentLoop?: {
    start(input: { command: string; modelId?: string; context?: Record<string, unknown> }): Promise<{ status: string }>;
    cancel(): void;
    approveEdit(toolCallId: string, approved: boolean): Promise<{ ok: boolean }>;
    rollback(sessionId?: string): Promise<{ rolledBack: string[]; errors: string[] }>;
    getBackupSessions(): Promise<string[]>;
    loadRecentSessions(rootDir?: string): Promise<Array<{
      sessionId: string;
      timestamp: string;
      command: string;
      modelId: string;
      duration: number;
      status: "completed" | "error" | "cancelled";
      filesChanged: string[];
      filesRead: string[];
      toolCalls: number;
      errorMessage?: string;
      summary?: string;
    }>>;
    onEvent(cb: (event: { type: string; [key: string]: unknown }) => void): () => void;
  };
  openProject(): Promise<{
    projectPath: string;
    projectName: string;
    fileTree: FileEntry[];
    devServerUrl?: string | null;
  } | null>;
  reopenProject(path: string): Promise<{
    projectPath: string;
    projectName: string;
    fileTree: FileEntry[];
    devServerUrl?: string | null;
  } | null>;
  createProject(name: string): Promise<{
    projectPath: string;
    projectName: string;
    fileTree: FileEntry[];
  } | null>;
  createProjectAuto(suggestedName?: string): Promise<{
    projectPath: string;
    projectName: string;
    fileTree: FileEntry[];
  } | null>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<boolean>;
  refreshTree(): Promise<FileEntry[]>;
  startDevServer(dir: string): Promise<void>;
  stopDevServer(): Promise<void>;
  restartDevServer(): Promise<void>;
  onFileChanged(cb: (data: { path: string; changeType: string }) => void): () => void;
  onDevServerReady(cb: (data: { url: string; framework: string }) => void): () => void;
  onTerminalOutput(cb: (data: string) => void): () => void;
  getDevServerUrl(): Promise<string | null>;
  setDevPort(port: number | null): Promise<boolean>;
  getDevPort(): Promise<number | null>;
  checkUrl(url: string): Promise<{ ok: boolean; status: number; error?: string }>;
  getTerminalBuffer(): Promise<string[]>;
  injectInspectorInFrame(): Promise<boolean>;
  loginWithGithub?(): Promise<{ githubUsername: string; avatarUrl?: string; hasFigmaToken?: boolean } | null>;
  ptyInput?(data: string): void;
  ptyResize?(cols: number, rows: number): void;
  preview?: {
    loadURL(url: string): Promise<void>;
    setBounds(bounds: { x: number; y: number; width: number; height: number }): void;
    setVisible(visible: boolean): void;
    reload(): Promise<void>;
    refresh(url: string): Promise<void>;
    toggleInspector(enabled: boolean): void;
    destroy(): Promise<void>;
    onMessage(cb: (data: { type: string; payload: unknown }) => void): () => void;
    onDidFinishLoad(cb: (data: { url: string }) => void): () => void;
  };
  injectInspector?(): Promise<boolean>;
  ai: {
    getModels(): Promise<Array<{ id: string; label: string; sub: string; color: string; provider: string; hasKey: boolean }>>;
    editCode(input: {
      filePath: string;
      command: string;
      currentCode: string;
      modelId?: string;
      framework?: string;
      dependencies?: string[];
      designSystemMd?: string;
      elementContext?: string;
    }): Promise<{ filePath: string; original: string; modified: string; explanation: string }>;
    getApiKey(provider?: string): Promise<string | null | Record<string, string | null>>;
    setApiKey(provider: string, key: string): Promise<boolean>;
    hasApiKey(): Promise<boolean>;
    extractFromUrl(url: string, modelId?: string): Promise<{
      name: string; primary: string; secondary: string; tertiary: string;
      fontFamily: string; headingFamily: string; baseFontSize: number; scale: number;
    }>;
    generateDesignSystem(prompt: string, modelId?: string): Promise<{
      name: string; primary: string; secondary: string; tertiary: string;
      fontFamily: string; headingFamily: string; baseFontSize: number; scale: number;
    }>;
    generateTitle(prompt: string, modelId?: string): Promise<string>;
    classifyIntent(prompt: string, modelId?: string): Promise<"create" | "chat">;
    chat(prompt: string, modelId?: string, category?: string, projectContext?: { fileTree?: string[]; framework?: string; dependencies?: string[]; selectedFile?: string; currentCode?: string }): Promise<string>;
    chatStream(prompt: string, modelId?: string, streamId?: string, category?: string): Promise<{ success: boolean; fullText?: string; error?: string }>;
    onStreamChunk(cb: (data: { streamId: string; chunk: string; done: boolean; fullText?: string; error?: string }) => void): () => void;
  };
}

declare global {
  interface Window {
    electronAgent?: ElectronAgent;
  }
}

export type { ElectronAgent };
