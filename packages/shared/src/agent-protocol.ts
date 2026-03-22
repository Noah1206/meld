// Agent ↔ 웹앱 WebSocket 프로토콜 타입 정의

export interface AgentMessage {
  type: string;
  id: string;
  payload: unknown;
}

// 파일 트리 엔트리
export interface FileEntry {
  path: string; // 상대 경로 "src/components/Button.tsx"
  type: "file" | "dir";
  size?: number;
  children?: FileEntry[];
}

// --- 에이전트 → 웹앱 메시지 ---

export interface ConnectedMessage extends AgentMessage {
  type: "connected";
  payload: {
    projectPath: string;
    projectName: string;
  };
}

export interface FileTreeMessage extends AgentMessage {
  type: "fileTree";
  payload: {
    files: FileEntry[];
  };
}

export interface FileChangedMessage extends AgentMessage {
  type: "fileChanged";
  payload: {
    path: string;
    changeType: "add" | "change" | "unlink";
  };
}

export interface FileContentMessage extends AgentMessage {
  type: "fileContent";
  payload: {
    path: string;
    content: string;
  };
}

export interface WriteResultMessage extends AgentMessage {
  type: "writeResult";
  payload: {
    path: string;
    success: boolean;
    error?: string;
  };
}

export interface DevServerMessage extends AgentMessage {
  type: "devServer";
  payload: {
    url: string;
    framework: string;
  };
}

// --- 웹앱 → 에이전트 메시지 ---

export interface ReadFileMessage extends AgentMessage {
  type: "readFile";
  payload: {
    path: string;
  };
}

export interface WriteFileMessage extends AgentMessage {
  type: "writeFile";
  payload: {
    path: string;
    content: string;
  };
}

// 모든 에이전트 메시지 유니온
export type AgentToWebMessage =
  | ConnectedMessage
  | FileTreeMessage
  | FileChangedMessage
  | FileContentMessage
  | WriteResultMessage
  | DevServerMessage;

export type WebToAgentMessage = ReadFileMessage | WriteFileMessage;
