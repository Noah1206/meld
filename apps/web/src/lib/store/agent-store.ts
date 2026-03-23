"use client";

import { create } from "zustand";
import type { FileEntry } from "@figma-code-bridge/shared";

interface AgentState {
  connected: boolean;
  fileTree: FileEntry[];
  projectName: string | null;
  devServerUrl: string | null;
  devServerFramework: string | null;
  selectedFilePath: string | null;
  lastWriteTimestamp: number;

  // 에이전트 readFile/writeFile 핸들러 (useAgentConnection에서 주입)
  readFileFn: ((path: string) => Promise<string>) | null;
  writeFileFn: ((path: string, content: string) => Promise<boolean>) | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setFileTree: (files: FileEntry[]) => void;
  setProjectName: (name: string | null) => void;
  setDevServerUrl: (url: string | null) => void;
  setDevServerFramework: (framework: string | null) => void;
  setSelectedFilePath: (path: string | null) => void;
  setLastWrite: () => void;
  setHandlers: (
    readFile: (path: string) => Promise<string>,
    writeFile: (path: string, content: string) => Promise<boolean>,
  ) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  connected: false,
  fileTree: [],
  projectName: null,
  devServerUrl: null,
  devServerFramework: null,
  selectedFilePath: null,
  lastWriteTimestamp: 0,
  readFileFn: null,
  writeFileFn: null,

  setConnected: (connected) => set({ connected }),
  setFileTree: (fileTree) => set({ fileTree }),
  setProjectName: (projectName) => set({ projectName }),
  setDevServerUrl: (devServerUrl) => set({ devServerUrl }),
  setDevServerFramework: (devServerFramework) => set({ devServerFramework }),
  setSelectedFilePath: (selectedFilePath) => set({ selectedFilePath }),
  setLastWrite: () => set({ lastWriteTimestamp: Date.now() }),
  setHandlers: (readFileFn, writeFileFn) => set({ readFileFn, writeFileFn }),
}));
