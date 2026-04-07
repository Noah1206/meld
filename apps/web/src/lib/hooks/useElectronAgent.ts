"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FileEntry } from "@figma-code-bridge/shared";
import { useAgentStore } from "@/lib/store/agent-store";
interface ElectronAgentState {
  connected: boolean;
  fileTree: FileEntry[];
  projectName: string | null;
  projectPath: string | null;
  devServerUrl: string | null;
  devServerFramework: string | null;
}

interface UseElectronAgentReturn extends ElectronAgentState {
  openProject: () => Promise<boolean>;
  createProject: (name: string) => Promise<boolean>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<boolean>;
  refreshTree: () => void;
}

export function useElectronAgent(): UseElectronAgentReturn {
  const [state, setState] = useState<ElectronAgentState>({
    connected: false,
    fileTree: [],
    projectName: null,
    projectPath: null,
    devServerUrl: null,
    devServerFramework: null,
  });

  // Track selectedFilePath from store (ref to avoid stale closure)
  const selectedFilePathRef = useRef<string | null>(null);
  useEffect(() => {
    return useAgentStore.subscribe((s) => {
      selectedFilePathRef.current = s.selectedFilePath;
    });
  }, []);

  const setLastWrite = useAgentStore((s) => s.setLastWrite);
  const setLastChangedFile = useAgentStore((s) => s.setLastChangedFile);

  // Register event listeners
  useEffect(() => {
    const agent = window.electronAgent;
    if (!agent) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const cleanupFileChanged = agent.onFileChanged((data: { path: string; changeType: string }) => {
      // Debounce: scan only once after 500ms even if multiple changes arrive
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        // 1) Refresh file tree
        agent.refreshTree().then((fileTree) => {
          setState((prev) => ({ ...prev, fileTree }));
        });

        // 2) Record changed file path in store -> PreviewFrame refreshes
        setLastChangedFile(data.path);
        setLastWrite();

        // 3) Auto-reload if the changed file is the currently selected file (for editor refresh)
        const currentSelected = selectedFilePathRef.current;
        if (currentSelected && data.path && currentSelected.endsWith(data.path)) {
          // Editor component auto-detects via lastWriteTimestamp change
          // Dispatch additional actions here if needed
        }
      }, 500);
    });

    const cleanupDevServer = agent.onDevServerReady(({ url, framework }) => {
      setState((prev) => ({
        ...prev,
        devServerUrl: url,
        devServerFramework: framework,
      }));
    });

    return () => {
      cleanupFileChanged();
      cleanupDevServer();
    };
  }, [setLastWrite, setLastChangedFile]);

  // Open project (native directory dialog)
  const openProject = useCallback(async (): Promise<boolean> => {
    const agent = window.electronAgent;
    if (!agent) return false;

    const result = await agent.openProject();
    if (!result) return false; // User cancelled

    setState({
      connected: true,
      fileTree: result.fileTree,
      projectName: result.projectName,
      projectPath: result.projectPath,
      devServerUrl: result.devServerUrl ?? null,
      devServerFramework: null,
    });

    return true;
  }, []);

  // Create new project
  const createProject = useCallback(async (name: string): Promise<boolean> => {
    const agent = window.electronAgent;
    if (!agent?.createProject) return false;

    const result = await agent.createProject(name);
    if (!result) return false;

    setState({
      connected: true,
      fileTree: result.fileTree,
      projectName: result.projectName,
      projectPath: result.projectPath,
      devServerUrl: null,
      devServerFramework: null,
    });

    return true;
  }, []);

  const readFile = useCallback(async (filePath: string): Promise<string> => {
    const agent = window.electronAgent;
    if (!agent) throw new Error("Not in Electron environment");
    return agent.readFile(filePath);
  }, []);

  const writeFile = useCallback(async (filePath: string, content: string): Promise<boolean> => {
    const agent = window.electronAgent;
    if (!agent) throw new Error("Not in Electron environment");
    return agent.writeFile(filePath, content);
  }, []);

  const refreshTree = useCallback(() => {
    const agent = window.electronAgent;
    if (!agent || !state.connected) return;

    agent.refreshTree().then((fileTree) => {
      setState((prev) => ({ ...prev, fileTree }));
    });
  }, [state.connected]);

  return {
    ...state,
    openProject,
    createProject,
    readFile,
    writeFile,
    refreshTree,
  };
}
