"use client";

import { create } from "zustand";
import type { FileEntry } from "@figma-code-bridge/shared";

export interface InspectedElement {
  tagName: string;
  className: string;
  id: string;
  textContent: string;
  componentName: string | null;
  selector: string;
  rect: { x: number; y: number; width: number; height: number };
  sourceLoc?: string;
  computedStyle?: Record<string, string>;
}

interface AgentState {
  connected: boolean;
  fileTree: FileEntry[];
  projectName: string | null;
  devServerUrl: string | null;
  devServerFramework: string | null;
  dependencies: string[];
  selectedFilePath: string | null;
  lastWriteTimestamp: number;
  lastChangedFilePath: string | null;

  // Inspector state
  inspectorEnabled: boolean;
  inspectedElement: InspectedElement | null;
  // Selected element history (for AI context)
  elementHistory: Array<{ element: InspectedElement; filePath?: string; timestamp: number }>;

  // Agent readFile/writeFile handlers (injected from useAgentConnection)
  readFileFn: ((path: string) => Promise<string>) | null;
  writeFileFn: ((path: string, content: string) => Promise<boolean>) | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setFileTree: (files: FileEntry[]) => void;
  setProjectName: (name: string | null) => void;
  setDevServerUrl: (url: string | null) => void;
  setDevServerFramework: (framework: string | null) => void;
  setDependencies: (deps: string[]) => void;
  setSelectedFilePath: (path: string | null) => void;
  setInspectorEnabled: (enabled: boolean) => void;
  setInspectedElement: (el: InspectedElement | null) => void;
  addElementHistory: (el: InspectedElement, filePath?: string) => void;
  clearElementHistory: () => void;
  setLastWrite: () => void;
  setLastChangedFile: (path: string | null) => void;
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
  dependencies: [],
  selectedFilePath: null,
  inspectorEnabled: false,
  inspectedElement: null,
  elementHistory: [],
  lastWriteTimestamp: 0,
  lastChangedFilePath: null,
  readFileFn: null,
  writeFileFn: null,

  setConnected: (connected) => set({ connected }),
  setFileTree: (fileTree) => set({ fileTree }),
  setProjectName: (projectName) => set({ projectName }),
  setDevServerUrl: (devServerUrl) => set({ devServerUrl }),
  setDevServerFramework: (devServerFramework) => set({ devServerFramework }),
  setDependencies: (dependencies) => set({ dependencies }),
  setSelectedFilePath: (selectedFilePath) => set({ selectedFilePath }),
  setInspectorEnabled: (inspectorEnabled) => set({ inspectorEnabled }),
  setInspectedElement: (inspectedElement) => set({ inspectedElement }),
  addElementHistory: (el, filePath) => set((state) => ({
    elementHistory: [...state.elementHistory, { element: el, filePath, timestamp: Date.now() }].slice(-20), // Keep max 20 entries
  })),
  clearElementHistory: () => set({ elementHistory: [] }),
  setLastWrite: () => set({ lastWriteTimestamp: Date.now() }),
  setLastChangedFile: (lastChangedFilePath) => set({ lastChangedFilePath }),
  setHandlers: (readFileFn, writeFileFn) => set({ readFileFn, writeFileFn }),
}));
