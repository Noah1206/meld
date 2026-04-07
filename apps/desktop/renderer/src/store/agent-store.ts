import { create } from "zustand";
import type { FileEntry } from "../types";

export interface InspectedElement {
  tagName: string;
  className: string;
  id: string;
  textContent: string;
  componentName: string | null;
  selector: string;
  rect: { x: number; y: number; width: number; height: number };
  // Enhanced info
  sourceLoc: string | null; // "filename:line:column" (React dev mode __source)
  computedStyle: Record<string, string> | null; // Key CSS properties
}

// Selection history entry (for AI context)
export interface ElementHistoryEntry {
  element: InspectedElement;
  filePath: string | null; // Mapped file path
  timestamp: number;
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

  // Element selection history (helps AI understand user's area of interest)
  elementHistory: ElementHistoryEntry[];

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
  setLastWrite: () => void;
  setLastChangedFile: (path: string | null) => void;
  setHandlers: (
    readFile: (path: string) => Promise<string>,
    writeFile: (path: string, content: string) => Promise<boolean>,
  ) => void;
  addElementToHistory: (element: InspectedElement, filePath: string | null) => void;
  removeElementFromHistory: (index: number) => void;
  clearElementHistory: () => void;
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
  setLastWrite: () => set({ lastWriteTimestamp: Date.now() }),
  setLastChangedFile: (lastChangedFilePath) => set({ lastChangedFilePath }),
  setHandlers: (readFileFn, writeFileFn) => set({ readFileFn, writeFileFn }),
  addElementToHistory: (element, filePath) =>
    set((state) => {
      // Dedup: remove existing entry with same selector and keep latest
      const filtered = state.elementHistory.filter(
        (e) => e.element.selector !== element.selector,
      );
      // Keep max 10 entries
      const next = [...filtered, { element, filePath, timestamp: Date.now() }];
      return { elementHistory: next.slice(-10) };
    }),
  removeElementFromHistory: (index) =>
    set((state) => ({
      elementHistory: state.elementHistory.filter((_, i) => i !== index),
    })),
  clearElementHistory: () => set({ elementHistory: [] }),
}));
