"use client";

import { create } from "zustand";
import type { FileEntry } from "@figma-code-bridge/shared";

interface AgentState {
  connected: boolean;
  fileTree: FileEntry[];
  projectName: string | null;
  devServerUrl: string | null;
  selectedFilePath: string | null;

  // 에이전트 readFile/writeFile 핸들러 (useAgentConnection에서 주입)
  readFileFn: ((path: string) => Promise<string>) | null;
  writeFileFn: ((path: string, content: string) => Promise<boolean>) | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setFileTree: (files: FileEntry[]) => void;
  setProjectName: (name: string | null) => void;
  setDevServerUrl: (url: string | null) => void;
  setSelectedFilePath: (path: string | null) => void;
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
  selectedFilePath: null,
  readFileFn: null,
  writeFileFn: null,

  setConnected: (connected) => set({ connected }),
  setFileTree: (fileTree) => set({ fileTree }),
  setProjectName: (projectName) => set({ projectName }),
  setDevServerUrl: (devServerUrl) => set({ devServerUrl }),
  setSelectedFilePath: (selectedFilePath) => set({ selectedFilePath }),
  setHandlers: (readFileFn, writeFileFn) => set({ readFileFn, writeFileFn }),
}));
