import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAgent", {
  isElectron: true,

  // 프로젝트 열기 (네이티브 디렉토리 다이얼로그)
  openProject: () => ipcRenderer.invoke("agent:openProject"),
  createProject: (name: string) => ipcRenderer.invoke("agent:createProject", name),

  // 파일 조작
  readFile: (filePath: string) => ipcRenderer.invoke("agent:readFile", filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke("agent:writeFile", filePath, content),
  refreshTree: () => ipcRenderer.invoke("agent:refreshTree"),

  // Dev server
  startDevServer: (dir: string) => ipcRenderer.invoke("agent:startDevServer", dir),
  stopDevServer: () => ipcRenderer.invoke("agent:stopDevServer"),

  // 이벤트 리스너
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
});
