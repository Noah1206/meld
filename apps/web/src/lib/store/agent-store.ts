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

  /**
   * Insert (or no-op if already present) a file path into the tree,
   * creating intermediate directories as needed. Used by the workspace
   * polling loop to incrementally build the tree from agent file_edit
   * events — so the right panel fills in as the agent writes files.
   */
  upsertFileByPath: (path: string) => void;

  /** In-memory cache of file contents the agent has written so Monaco
   *  can show the live code without round-tripping to the sandbox. */
  fileContents: Record<string, string>;
  setFileContent: (path: string, content: string) => void;

  /** Rolling log of web-search + browse_url activity the agent performed
   *  during the current run. Rendered as Manus-style cards in the chat. */
  browserActivity: BrowserActivityEntry[];
  pushBrowserActivity: (entry: BrowserActivityEntry) => void;
  clearBrowserActivity: () => void;

  /** Agent-initiated MCP connection request. Null when nothing is pending. */
  mcpRequest: { serverId: string; reason: string } | null;
  setMcpRequest: (req: { serverId: string; reason: string } | null) => void;

  /**
   * Per-turn file snapshots — keyed by a turn id (typically the user
   * message id). For each turn we record the path → content of files
   * that were about to change. This powers the "되돌리기" (rollback)
   * button: restoring the snapshot for a turn rewinds the file tree
   * to the state right before the agent took that turn.
   */
  fileSnapshots: Record<string, Record<string, string>>;

  /**
   * Capture the current value of `path` into the snapshot for `turnId`,
   * but only if no snapshot for that path+turn exists yet (we want the
   * very first state, not later overwrites within the same turn).
   */
  captureSnapshotForTurn: (turnId: string, path: string, contentBefore: string) => void;

  /**
   * Restore all files in the snapshot for `turnId` back into
   * `fileContents`. Returns the list of restored paths (so callers can
   * push the writes back to the sandbox if desired).
   */
  restoreSnapshotForTurn: (turnId: string) => string[];
}

export type BrowserActivityEntry =
  | { kind: "search"; query: string; status: "running" | "done" | "error"; results?: Array<{ title: string; url: string; snippet: string }>; timestamp: number }
  | { kind: "browse"; url: string; status: "running" | "done" | "error"; title?: string; screenshotUrl?: string; description?: string; timestamp: number };

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

  fileContents: {},
  setFileContent: (path, content) =>
    set((state) => ({ fileContents: { ...state.fileContents, [path]: content } })),

  mcpRequest: null,
  setMcpRequest: (mcpRequest) => set({ mcpRequest }),

  fileSnapshots: {},
  captureSnapshotForTurn: (turnId, path, contentBefore) =>
    set((state) => {
      const turn = state.fileSnapshots[turnId] ?? {};
      // Only capture the FIRST state of a path within a turn — later
      // overwrites in the same turn don't replace it.
      if (turn[path] !== undefined) return state;
      return {
        fileSnapshots: {
          ...state.fileSnapshots,
          [turnId]: { ...turn, [path]: contentBefore },
        },
      };
    }),
  restoreSnapshotForTurn: (turnId) => {
    let restored: string[] = [];
    set((s) => {
      const turn = s.fileSnapshots[turnId];
      if (!turn) return s;
      restored = Object.keys(turn);
      const nextContents: Record<string, string> = { ...s.fileContents };
      for (const p of restored) {
        nextContents[p] = turn[p];
      }
      return {
        fileContents: nextContents,
        lastChangedFilePath: restored[restored.length - 1] ?? null,
        lastWriteTimestamp: Date.now(),
      };
    });
    return restored;
  },

  browserActivity: [],
  pushBrowserActivity: (entry) =>
    set((state) => {
      // If the last entry matches kind + key (query/url) and was running,
      // update it in place instead of appending a duplicate.
      const last = state.browserActivity[state.browserActivity.length - 1];
      const sameKey =
        last &&
        last.kind === entry.kind &&
        ((last.kind === "search" && entry.kind === "search" && last.query === entry.query) ||
          (last.kind === "browse" && entry.kind === "browse" && last.url === entry.url));
      if (sameKey && last.status === "running") {
        return {
          browserActivity: [
            ...state.browserActivity.slice(0, -1),
            { ...last, ...entry } as BrowserActivityEntry,
          ],
        };
      }
      return { browserActivity: [...state.browserActivity, entry] };
    }),
  clearBrowserActivity: () => set({ browserActivity: [] }),

  upsertFileByPath: (path) =>
    set((state) => {
      const segments = path.split("/").filter(Boolean);
      if (segments.length === 0) return state;
      const nextTree = cloneTree(state.fileTree);
      insertPath(nextTree, segments, "");
      return { fileTree: nextTree, lastChangedFilePath: path, lastWriteTimestamp: Date.now() };
    }),
}));

// ─── File tree helpers ──────────────────────────────
function cloneTree(tree: FileEntry[]): FileEntry[] {
  return tree.map((node) => ({
    ...node,
    children: node.children ? cloneTree(node.children) : undefined,
  }));
}

function insertPath(
  nodes: FileEntry[],
  segments: string[],
  parentPath: string,
): void {
  const [head, ...rest] = segments;
  const currentPath = parentPath ? `${parentPath}/${head}` : head;
  const existing = nodes.find((n) => n.path === currentPath);

  if (rest.length === 0) {
    // Leaf file
    if (!existing) {
      nodes.push({ path: currentPath, type: "file" });
    }
    // Sort: dirs first, then files alphabetically
    nodes.sort(sortFileEntry);
    return;
  }

  // Directory segment
  if (existing && existing.type === "dir") {
    existing.children = existing.children ?? [];
    insertPath(existing.children, rest, currentPath);
  } else {
    const dir: FileEntry = {
      path: currentPath,
      type: "dir",
      children: [],
    };
    nodes.push(dir);
    insertPath(dir.children!, rest, currentPath);
  }
  nodes.sort(sortFileEntry);
}

function sortFileEntry(a: FileEntry, b: FileEntry): number {
  if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
  return a.path.localeCompare(b.path);
}
