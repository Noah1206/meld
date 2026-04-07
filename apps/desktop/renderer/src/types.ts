export interface FileEntry {
  path: string;
  type: "file" | "dir";
  size?: number;
  children?: FileEntry[];
}

export interface AuthUser {
  id: string;
  githubUsername: string;
  email: string | null;
  avatarUrl: string | null;
  hasFigmaToken?: boolean;
  plan?: string;
}

export interface PreviewAPI {
  loadURL(url: string): Promise<boolean>;
  setBounds(bounds: { x: number; y: number; width: number; height: number }): void;
  setVisible(visible: boolean): void;
  reload(): Promise<boolean>;
  refresh(url: string): Promise<boolean>;
  toggleInspector(enabled: boolean): void;
  destroy(): Promise<boolean>;
  onMessage(cb: (data: { type: string; payload: unknown }) => void): () => void;
  onDidFinishLoad(cb: (data: { url: string }) => void): () => void;
}

export interface ElectronAgent {
  isElectron: true;
  loginWithGithub(): Promise<AuthUser | null>;
  openExternalAuth(url: string): void;
  openProject(): Promise<{ projectPath: string; projectName: string; fileTree: FileEntry[]; devServerUrl?: string | null } | null>;
  createProject(name: string): Promise<{ projectPath: string; projectName: string; fileTree: FileEntry[] } | null>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<boolean>;
  refreshTree(): Promise<FileEntry[]>;
  startDevServer(dir: string): Promise<void>;
  stopDevServer(): Promise<void>;
  onFileChanged(cb: (data: { path: string; changeType: string }) => void): () => void;
  onDevServerReady(cb: (data: { url: string; framework: string }) => void): () => void;
  onTerminalOutput(cb: (data: string) => void): () => void;
  ptyInput(data: string): void;
  ptyResize(cols: number, rows: number): void;
  injectInspector(): Promise<boolean>;
  injectInspectorInFrame(): Promise<boolean>;
  preview: PreviewAPI;
}

declare global {
  interface Window {
    electronAgent?: ElectronAgent;
  }
}
