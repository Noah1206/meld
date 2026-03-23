"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FileEntry, AgentMessage } from "@figma-code-bridge/shared";

interface AgentConnectionState {
  connected: boolean;
  fileTree: FileEntry[];
  projectName: string | null;
  devServerUrl: string | null;
  devServerFramework: string | null;
}

interface UseAgentConnectionReturn extends AgentConnectionState {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<boolean>;
  refreshTree: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000;

export function useAgentConnection(wsUrl: string | null): UseAgentConnectionReturn {
  const [state, setState] = useState<AgentConnectionState>({
    connected: false,
    fileTree: [],
    projectName: null,
    devServerUrl: null,
    devServerFramework: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pendingReads = useRef<Map<string, { resolve: (v: string) => void; reject: (e: Error) => void }>>(new Map());
  const pendingWrites = useRef<Map<string, { resolve: (v: boolean) => void; reject: (e: Error) => void }>>(new Map());
  useEffect(() => {
    if (!wsUrl) return;

    let reconnectCount = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    function tryConnect() {
      if (disposed || !wsUrl) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectCount = 0;
        setState((prev) => ({ ...prev, connected: true }));
      };

      ws.onmessage = (event) => {
        let msg: AgentMessage;
        try {
          msg = JSON.parse(event.data as string) as AgentMessage;
        } catch {
          return;
        }

        const payload = msg.payload as Record<string, unknown>;

        switch (msg.type) {
          case "connected": {
            setState((prev) => ({
              ...prev,
              connected: true,
              projectName: payload.projectName as string,
            }));
            break;
          }
          case "fileTree": {
            setState((prev) => ({
              ...prev,
              fileTree: payload.files as FileEntry[],
            }));
            break;
          }
          case "fileChanged": {
            // 파일 변경 시 최신 트리 재요청
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "getFileTree", id: crypto.randomUUID(), payload: {} }));
            }
            break;
          }
          case "fileContent": {
            const filePath = payload.path as string;
            const pending = pendingReads.current.get(filePath);
            if (pending) {
              if (payload.error) {
                pending.reject(new Error(payload.error as string));
              } else {
                pending.resolve(payload.content as string);
              }
              pendingReads.current.delete(filePath);
            }
            break;
          }
          case "writeResult": {
            const writePath = payload.path as string;
            const writePending = pendingWrites.current.get(writePath);
            if (writePending) {
              writePending.resolve(payload.success as boolean);
              pendingWrites.current.delete(writePath);
            }
            break;
          }
          case "devServer": {
            setState((prev) => ({
              ...prev,
              devServerUrl: payload.url as string,
              devServerFramework: payload.framework as string,
            }));
            break;
          }
        }
      };

      ws.onclose = () => {
        setState((prev) => ({ ...prev, connected: false }));
        wsRef.current = null;

        if (!disposed && reconnectCount < MAX_RECONNECT_ATTEMPTS) {
          reconnectCount++;
          reconnectTimer = setTimeout(tryConnect, RECONNECT_INTERVAL);
        }
      };

      ws.onerror = () => {
        // onclose에서 처리
      };
    }

    tryConnect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [wsUrl]);

  const sendMessage = useCallback((type: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type, id: crypto.randomUUID(), payload }),
      );
    }
  }, []);

  const readFile = useCallback(
    (filePath: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reject(new Error("에이전트 연결 안 됨"));
          return;
        }
        pendingReads.current.set(filePath, { resolve, reject });
        sendMessage("readFile", { path: filePath });

        setTimeout(() => {
          if (pendingReads.current.has(filePath)) {
            pendingReads.current.delete(filePath);
            reject(new Error("파일 읽기 타임아웃"));
          }
        }, 10_000);
      });
    },
    [sendMessage],
  );

  const writeFile = useCallback(
    (filePath: string, content: string): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reject(new Error("에이전트 연결 안 됨"));
          return;
        }
        pendingWrites.current.set(filePath, { resolve, reject });
        sendMessage("writeFile", { path: filePath, content });

        setTimeout(() => {
          if (pendingWrites.current.has(filePath)) {
            pendingWrites.current.delete(filePath);
            reject(new Error("파일 쓰기 타임아웃"));
          }
        }, 10_000);
      });
    },
    [sendMessage],
  );

  const refreshTree = useCallback(() => {
    sendMessage("getFileTree", {});
  }, [sendMessage]);

  return {
    ...state,
    readFile,
    writeFile,
    refreshTree,
  };
}
