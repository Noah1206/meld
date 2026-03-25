export interface FileEntry {
  path: string;
  type: "file" | "dir";
  size?: number;
  children?: FileEntry[];
}

export interface ElectronAgent {
  isElectron: true;
  openProject(): Promise<{ projectPath: string; projectName: string; fileTree: FileEntry[] } | null>;
  createProject(name: string): Promise<{ projectPath: string; projectName: string; fileTree: FileEntry[] } | null>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<boolean>;
  refreshTree(): Promise<FileEntry[]>;
  startDevServer(dir: string): Promise<void>;
  stopDevServer(): Promise<void>;
  onFileChanged(cb: (data: { path: string; changeType: string }) => void): () => void;
  onDevServerReady(cb: (data: { url: string; framework: string }) => void): () => void;
  onTerminalOutput(cb: (data: string) => void): () => void;
}

declare global {
  interface Window {
    electronAgent?: ElectronAgent;
  }
}
