"use client";

import { useState, useEffect, useCallback } from "react";
import type { FileEntry } from "@figma-code-bridge/shared";

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

  // 이벤트 리스너 등록
  useEffect(() => {
    const agent = window.electronAgent;
    if (!agent) return;

    const cleanupFileChanged = agent.onFileChanged(({ path, changeType }) => {
      // 파일 변경 시 트리 새로고침
      agent.refreshTree().then((fileTree) => {
        setState((prev) => ({ ...prev, fileTree }));
      });
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
  }, []);

  // 프로젝트 열기 (네이티브 디렉토리 다이얼로그)
  const openProject = useCallback(async (): Promise<boolean> => {
    const agent = window.electronAgent;
    if (!agent) return false;

    const result = await agent.openProject();
    if (!result) return false; // 사용자가 취소

    setState((prev) => ({
      ...prev,
      connected: true,
      fileTree: result.fileTree,
      projectName: result.projectName,
      projectPath: result.projectPath,
    }));

    // dev server 시작
    agent.startDevServer(result.projectPath);

    return true;
  }, []);

  const readFile = useCallback(async (filePath: string): Promise<string> => {
    const agent = window.electronAgent;
    if (!agent) throw new Error("Electron 환경이 아닙니다");
    return agent.readFile(filePath);
  }, []);

  const writeFile = useCallback(async (filePath: string, content: string): Promise<boolean> => {
    const agent = window.electronAgent;
    if (!agent) throw new Error("Electron 환경이 아닙니다");
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
    readFile,
    writeFile,
    refreshTree,
  };
}
