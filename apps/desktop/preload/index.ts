import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAgent", {
  isElectron: true,

  // GitHub OAuth login
  loginWithGithub: () => ipcRenderer.invoke("auth:github"),

  // Session persistence
  getSavedSession: () => ipcRenderer.invoke("auth:getSavedSession"),
  saveSession: (user: { id: string; githubUsername: string; avatarUrl?: string; hasFigmaToken?: boolean }) =>
    ipcRenderer.invoke("auth:saveSession", user),
  clearSession: () => ipcRenderer.invoke("auth:clearSession"),

  // MCP OAuth — Return via meld:// protocol after OAuth in system browser
  openExternalAuth: (url: string) => ipcRenderer.invoke("auth:openExternal", url),

  // Open project (native directory dialog)
  openProject: () => ipcRenderer.invoke("agent:openProject"),
  reopenProject: (path: string) => ipcRenderer.invoke("agent:reopenProject", path),
  createProject: (name: string) => ipcRenderer.invoke("agent:createProject", name),

  // File operations
  readFile: (filePath: string) => ipcRenderer.invoke("agent:readFile", filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke("agent:writeFile", filePath, content),
  refreshTree: () => ipcRenderer.invoke("agent:refreshTree"),

  // Dev server
  startDevServer: (dir: string) => ipcRenderer.invoke("agent:startDevServer", dir),
  stopDevServer: () => ipcRenderer.invoke("agent:stopDevServer"),
  restartDevServer: () => ipcRenderer.invoke("agent:restartDevServer"),

  // Event listeners
  onFileChanged: (cb: (data: { path: string; changeType: string }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: { path: string; changeType: string }) => cb(data);
    ipcRenderer.on("agent:fileChanged", handler);
    return () => ipcRenderer.removeListener("agent:fileChanged", handler);
  },
  onDevServerReady: (cb: (data: { url: string; framework: string }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: { url: string; framework: string }) => cb(data);
    ipcRenderer.on("agent:devServerReady", handler);
    return () => ipcRenderer.removeListener("agent:devServerReady", handler);
  },
  onTerminalOutput: (cb: (data: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: string) => cb(data);
    ipcRenderer.on("agent:terminal", handler);
    return () => ipcRenderer.removeListener("agent:terminal", handler);
  },

  // URL health check (direct HTTP request from Node.js without CORS)
  checkUrl: (url: string) => ipcRenderer.invoke("agent:checkUrl", url),

  // Get dev server URL directly (fallback for missed events)
  getDevServerUrl: () => ipcRenderer.invoke("agent:getDevServerUrl"),

  // User port configuration
  setDevPort: (port: number | null) => ipcRenderer.invoke("agent:setDevPort", port),
  getDevPort: () => ipcRenderer.invoke("agent:getDevPort"),

  // Buffered terminal logs (for late-registered listeners)
  getTerminalBuffer: () => ipcRenderer.invoke("agent:getTerminalBuffer"),

  // PTY input/resize
  ptyInput: (data: string) => ipcRenderer.send("agent:ptyInput", data),
  ptyResize: (cols: number, rows: number) => ipcRenderer.send("agent:ptyResize", cols, rows),

  // AI
  ai: {
    getModels: () => ipcRenderer.invoke("ai:getModels"),
    editCode: (input: {
      filePath: string;
      command: string;
      currentCode: string;
      modelId?: string;
      framework?: string;
      dependencies?: string[];
      designSystemMd?: string;
      elementContext?: string;
    }) => ipcRenderer.invoke("ai:editCode", input),
    getApiKey: (provider?: string) => ipcRenderer.invoke("ai:getApiKey", provider),
    setApiKey: (provider: string, key: string) => ipcRenderer.invoke("ai:setApiKey", provider, key),
    hasApiKey: () => ipcRenderer.invoke("ai:hasApiKey"),
    generateDesignSystem: (prompt: string, modelId?: string) =>
      ipcRenderer.invoke("ai:generateDesignSystem", { prompt, modelId }),
    extractFromUrl: (url: string, modelId?: string) =>
      ipcRenderer.invoke("ai:extractFromUrl", { url, modelId }),
  },

  // Inject inspector script (legacy — auto-injected in WebContentsView)
  injectInspector: () => ipcRenderer.invoke("agent:injectInspector"),
  injectInspectorInFrame: () => ipcRenderer.invoke("agent:injectInspectorInFrame"),

  // AI Agent Loop (autonomous coding)
  agentLoop: {
    start: (input: { command: string; modelId?: string; context?: Record<string, unknown> }) =>
      ipcRenderer.invoke("agent:startAgentLoop", input),
    cancel: () => ipcRenderer.send("agent:cancelAgentLoop"),
    approveEdit: (toolCallId: string, approved: boolean) =>
      ipcRenderer.invoke("agent:approveEdit", toolCallId, approved),
    rollback: (sessionId?: string) =>
      ipcRenderer.invoke("agent:rollback", sessionId) as Promise<{ rolledBack: string[]; errors: string[] }>,
    getBackupSessions: () =>
      ipcRenderer.invoke("agent:getBackupSessions") as Promise<string[]>,
    loadRecentSessions: (rootDir?: string) =>
      ipcRenderer.invoke("agent:loadRecentSessions", rootDir),
    onEvent: (cb: (event: { type: string; [key: string]: unknown }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, event: { type: string; [key: string]: unknown }) => cb(event);
      ipcRenderer.on("agent:agentEvent", handler);
      return () => ipcRenderer.removeListener("agent:agentEvent", handler);
    },
  },

  // WebContentsView preview
  preview: {
    loadURL: (url: string) => ipcRenderer.invoke("preview:loadURL", url),
    setBounds: (bounds: { x: number; y: number; width: number; height: number }) =>
      ipcRenderer.send("preview:setBounds", bounds),
    setVisible: (visible: boolean) => ipcRenderer.send("preview:setVisible", visible),
    reload: () => ipcRenderer.invoke("preview:reload"),
    refresh: (url: string) => ipcRenderer.invoke("preview:refresh", url),
    toggleInspector: (enabled: boolean) => ipcRenderer.send("preview:toggleInspector", enabled),
    destroy: () => ipcRenderer.invoke("preview:destroy"),
    onMessage: (cb: (data: { type: string; payload: unknown }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: { type: string; payload: unknown }) => cb(data);
      ipcRenderer.on("preview:message", handler);
      return () => ipcRenderer.removeListener("preview:message", handler);
    },
    onDidFinishLoad: (cb: (data: { url: string }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: { url: string }) => cb(data);
      ipcRenderer.on("preview:did-finish-load", handler);
      return () => ipcRenderer.removeListener("preview:did-finish-load", handler);
    },
  },
});
