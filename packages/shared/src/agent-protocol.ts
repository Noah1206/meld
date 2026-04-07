// Agent ↔ webapp WebSocket protocol type definitions

export interface AgentMessage {
  type: string;
  id: string;
  payload: unknown;
}

// File tree entry
export interface FileEntry {
  path: string; // Relative path e.g. "src/components/Button.tsx"
  type: "file" | "dir";
  size?: number;
  children?: FileEntry[];
}

// --- Agent → webapp messages ---

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

// --- Webapp → agent messages ---

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

// All agent message union
export type AgentToWebMessage =
  | ConnectedMessage
  | FileTreeMessage
  | FileChangedMessage
  | FileContentMessage
  | WriteResultMessage
  | DevServerMessage;

export type WebToAgentMessage = ReadFileMessage | WriteFileMessage;
