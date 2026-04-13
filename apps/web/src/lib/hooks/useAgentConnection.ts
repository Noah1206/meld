"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FileEntry, AgentMessage, AgentEvent, AgentLoopInput } from "@figma-code-bridge/shared";

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
  // Agent loop
  startAgent: (input: AgentLoopInput & { apiKey?: string }) => void;
  cancelAgent: () => void;
  approveEdit: (toolCallId: string, approved: boolean) => void;
  respondToAgent: (questionId: string, response: string) => void;
  onAgentEvent: (callback: (event: AgentEvent) => void) => () => void;
  onVMFrame: (callback: (frame: { timestamp: number; screenshot: string; url: string; title: string; cursor?: { x: number; y: number }; action?: string }) => void) => () => void;
  // Dev server
  startDevServer: () => void;
  stopDevServer: () => void;
  restartDevServer: () => void;
  checkUrl: (url: string) => Promise<{ ok: boolean; status?: number; error?: string }>;
  getTerminalBuffer: () => Promise<string[]>;
  onTerminalOutput: (callback: (data: string) => void) => () => void;
  // Rollback
  rollback: (sessionId?: string) => void;
  // Send raw message
  sendMessage: (type: string, payload: unknown) => void;
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
  const pendingRequests = useRef<Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>>(new Map());
  const agentEventListeners = useRef<Set<(event: AgentEvent) => void>>(new Set());
  const vmFrameListeners = useRef<Set<(frame: { timestamp: number; screenshot: string; url: string; title: string; cursor?: { x: number; y: number }; action?: string }) => void>>(new Set());
  const terminalListeners = useRef<Set<(data: string) => void>>(new Set());

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

          // ─── Agent loop events ───
          case "agentEvent": {
            const agentEvent = payload as unknown as AgentEvent;
            for (const listener of agentEventListeners.current) {
              listener(agentEvent);
            }
            break;
          }

          // ─── VM Screen frames ───
          case "vmFrame": {
            for (const listener of vmFrameListeners.current) {
              listener(payload as { timestamp: number; screenshot: string; url: string; title: string; cursor?: { x: number; y: number }; action?: string });
            }
            break;
          }

          // ─── Heartbeat alerts ───
          case "heartbeatAlert": {
            const alert = payload as { message: string; severity: string };
            for (const listener of agentEventListeners.current) {
              listener({ type: "message", content: `🔔 [Heartbeat] ${alert.message}` } as AgentEvent);
            }
            break;
          }

          // ─── Dev server events ───
          case "devServerReady": {
            setState((prev) => ({
              ...prev,
              devServerUrl: payload.url as string,
              devServerFramework: (payload.framework as string) ?? prev.devServerFramework,
            }));
            break;
          }
          case "terminalOutput": {
            const data = (payload as { data: string }).data;
            for (const listener of terminalListeners.current) {
              listener(data);
            }
            break;
          }

          // ─── Request-response messages ───
          case "checkUrlResult":
          case "terminalBuffer":
          case "devPort":
          case "devServerUrl":
          case "backupSessions":
          case "recentSessions":
          case "rollbackResult": {
            const requestId = payload.requestId as string;
            if (requestId) {
              const pending = pendingRequests.current.get(requestId);
              if (pending) {
                pending.resolve(payload);
                pendingRequests.current.delete(requestId);
              }
            }
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

  const sendRequest = useCallback((type: string, payload: Record<string, unknown>): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error("Agent not connected"));
        return;
      }
      const requestId = crypto.randomUUID();
      pendingRequests.current.set(requestId, { resolve, reject });
      wsRef.current.send(
        JSON.stringify({ type, id: requestId, payload: { ...payload, requestId } }),
      );
      setTimeout(() => {
        if (pendingRequests.current.has(requestId)) {
          pendingRequests.current.delete(requestId);
          reject(new Error("Request timeout"));
        }
      }, 10_000);
    });
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

  // ─── Agent loop methods ───

  const startAgent = useCallback((input: AgentLoopInput & { apiKey?: string }) => {
    sendMessage("startAgent", input);
  }, [sendMessage]);

  const cancelAgent = useCallback(() => {
    sendMessage("cancelAgent", {});
  }, [sendMessage]);

  const approveEdit = useCallback((toolCallId: string, approved: boolean) => {
    sendMessage("approveEdit", { toolCallId, approved });
  }, [sendMessage]);

  const respondToAgent = useCallback((questionId: string, response: string) => {
    sendMessage("respondToAgent", { questionId, response });
  }, [sendMessage]);

  // Listen for respond-to-agent messages from UI components (AgentCards)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "meld:respond-to-agent") {
        respondToAgent(e.data.questionId, e.data.response);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [respondToAgent]);

  const onAgentEvent = useCallback((callback: (event: AgentEvent) => void) => {
    agentEventListeners.current.add(callback);
    return () => {
      agentEventListeners.current.delete(callback);
    };
  }, []);

  type VMFrame = { timestamp: number; screenshot: string; url: string; title: string; cursor?: { x: number; y: number }; action?: string };
  const onVMFrame = useCallback((callback: (frame: VMFrame) => void) => {
    vmFrameListeners.current.add(callback);
    return () => {
      vmFrameListeners.current.delete(callback);
    };
  }, []);

  // ─── Dev server methods ───

  const startDevServer = useCallback(() => {
    sendMessage("startDevServer", {});
  }, [sendMessage]);

  const stopDevServer = useCallback(() => {
    sendMessage("stopDevServer", {});
  }, [sendMessage]);

  const restartDevServer = useCallback(() => {
    sendMessage("restartDevServer", {});
  }, [sendMessage]);

  const checkUrl = useCallback(async (url: string): Promise<{ ok: boolean; status?: number; error?: string }> => {
    try {
      const result = await sendRequest("checkUrl", { url });
      return result as { ok: boolean; status?: number; error?: string };
    } catch {
      return { ok: false, error: "Request failed" };
    }
  }, [sendRequest]);

  const getTerminalBuffer = useCallback(async (): Promise<string[]> => {
    try {
      const result = await sendRequest("getTerminalBuffer", {}) as { logs: string[] };
      return result.logs;
    } catch {
      return [];
    }
  }, [sendRequest]);

  const onTerminalOutput = useCallback((callback: (data: string) => void) => {
    terminalListeners.current.add(callback);
    return () => {
      terminalListeners.current.delete(callback);
    };
  }, []);

  // ─── Rollback ───

  const rollback = useCallback((sessionId?: string) => {
    sendMessage("rollback", { sessionId });
  }, [sendMessage]);

  return {
    ...state,
    readFile,
    writeFile,
    refreshTree,
    startAgent,
    cancelAgent,
    approveEdit,
    respondToAgent,
    onAgentEvent,
    onVMFrame,
    startDevServer,
    stopDevServer,
    restartDevServer,
    checkUrl,
    getTerminalBuffer,
    onTerminalOutput,
    rollback,
    sendMessage,
  };
}
