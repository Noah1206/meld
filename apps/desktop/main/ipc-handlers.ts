import { ipcMain, dialog, BrowserWindow } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import { scanProject } from "@figma-code-bridge/agent/scanner";
import { AgentLoop, rollbackSession, getBackupSessionIds, loadRecentSessions } from "./agent-loop.js";
import { getApiKey } from "./ai-handler.js";
import type { AgentLoopInput } from "@figma-code-bridge/shared";
import { createWatcher } from "@figma-code-bridge/agent/watcher";
import type { FSWatcher } from "chokidar";
import { startDevServer, stopDevServer, restartDevServer, resizePty, writeToPty, checkUrlHealth, getTerminalBuffer, getDevServerUrl, setUserPort, getUserPort, cleanup as cleanupDevServer } from "./dev-server.js";
import { INSPECTOR_SCRIPT } from "./inspector-script.js";

let activeWatcher: FSWatcher | null = null;
let currentRootDir: string | null = null;

export function registerIpcHandlers() {
  // Kill all child processes from previous project
  let activeAgent: import("./agent-loop.js").AgentLoop | null = null;

  async function cleanupPreviousProject() {
    stopDevServer();
    if (activeAgent) { activeAgent.cancel(); activeAgent = null; }
    if (activeWatcher) { await activeWatcher.close(); activeWatcher = null; }
  }

  // Open project directory (native dialog)
  ipcMain.handle("agent:openProject", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Project Folder",
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const rootDir = result.filePaths[0];
    currentRootDir = rootDir;

    await cleanupPreviousProject();

    // Scan file tree
    const fileTree = scanProject(rootDir);

    // Start file change detection
    activeWatcher = createWatcher(rootDir, (event) => {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        win.webContents.send("agent:fileChanged", event);
      }
    });

    // Auto-inject inspector script (before starting dev server)
    try {
      const publicDir = path.join(rootDir, "public");
      await fs.promises.mkdir(publicDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(publicDir, "__meld-inspector.js"),
        INSPECTOR_SCRIPT,
        "utf-8",
      );
    } catch {
      // Continue even if public folder creation fails
    }

    // Auto-start dev server
    startDevServer(rootDir);

    // Include dev server URL if already available (fast start)
    // Otherwise null → client receives it via onDevServerReady event
    const existingUrl = getDevServerUrl();

    return {
      projectPath: rootDir,
      projectName: path.basename(rootDir),
      fileTree,
      devServerUrl: existingUrl,
    };
  });

  // Reopen project from existing path (without dialog)
  ipcMain.handle("agent:reopenProject", async (_, projectPath: string) => {
    if (!projectPath || !fs.existsSync(projectPath)) return null;

    currentRootDir = projectPath;

    await cleanupPreviousProject();

    const fileTree = scanProject(projectPath);

    activeWatcher = createWatcher(projectPath, (event) => {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        win.webContents.send("agent:fileChanged", event);
      }
    });

    // Inject inspector
    try {
      const publicDir = path.join(projectPath, "public");
      await fs.promises.mkdir(publicDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(publicDir, "__meld-inspector.js"),
        INSPECTOR_SCRIPT,
        "utf-8",
      );
    } catch {}

    startDevServer(projectPath);
    const existingUrl = getDevServerUrl();

    return {
      projectPath,
      projectName: path.basename(projectPath),
      fileTree,
      devServerUrl: existingUrl,
    };
  });

  // Create new project folder and open it
  ipcMain.handle("agent:createProject", async (_, projectName: string) => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: "Select Location to Create Project",
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const parentDir = result.filePaths[0];
    const projectDir = path.join(parentDir, projectName);

    // Create folder
    await fs.promises.mkdir(projectDir, { recursive: true });

    currentRootDir = projectDir;

    // Clean up existing watcher
    if (activeWatcher) {
      await activeWatcher.close();
      activeWatcher = null;
    }

    const fileTree = scanProject(projectDir);

    activeWatcher = createWatcher(projectDir, (event) => {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        win.webContents.send("agent:fileChanged", event);
      }
    });

    return {
      projectPath: projectDir,
      projectName,
      fileTree,
    };
  });

  // Read file
  ipcMain.handle("agent:readFile", async (_, filePath: string) => {
    if (!currentRootDir) throw new Error("No project is open");

    const fullPath = path.resolve(currentRootDir, filePath);

    // Prevent path traversal
    if (!fullPath.startsWith(currentRootDir)) {
      throw new Error("Access to this path is not allowed");
    }

    // Check file existence (prevent ENOENT error logs)
    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }

    return fs.promises.readFile(fullPath, "utf-8");
  });

  // Write file
  ipcMain.handle("agent:writeFile", async (_, filePath: string, content: string) => {
    if (!currentRootDir) throw new Error("No project is open");

    const fullPath = path.resolve(currentRootDir, filePath);

    // Prevent path traversal
    if (!fullPath.startsWith(currentRootDir)) {
      throw new Error("Access to this path is not allowed");
    }

    // Create directory
    const dir = path.dirname(fullPath);
    await fs.promises.mkdir(dir, { recursive: true });

    await fs.promises.writeFile(fullPath, content, "utf-8");
    return true;
  });

  // Refresh file tree
  ipcMain.handle("agent:refreshTree", async () => {
    if (!currentRootDir) return [];
    return scanProject(currentRootDir);
  });

  // Start dev server
  ipcMain.handle("agent:startDevServer", async (_, dir: string) => {
    const rootDir = dir || currentRootDir;
    if (!rootDir) throw new Error("No project is open");

    await startDevServer(rootDir);
  });

  // Stop dev server
  ipcMain.handle("agent:stopDevServer", async () => {
    stopDevServer();
  });

  // Restart dev server (kill existing port process then start directly)
  ipcMain.handle("agent:restartDevServer", async () => {
    if (!currentRootDir) throw new Error("No project is open");
    await restartDevServer(currentRootDir);
  });

  // URL health check (direct from Node.js — no CORS)
  ipcMain.handle("agent:checkUrl", async (_, url: string) => {
    return checkUrlHealth(url);
  });

  // Get current dev server URL (fallback for missed events)
  ipcMain.handle("agent:getDevServerUrl", async () => {
    return getDevServerUrl();
  });

  // User port configuration
  ipcMain.handle("agent:setDevPort", async (_, port: number | null) => {
    setUserPort(port);
    return true;
  });

  ipcMain.handle("agent:getDevPort", async () => {
    return getUserPort();
  });

  // Get buffered terminal logs (for late-connected listeners)
  ipcMain.handle("agent:getTerminalBuffer", async () => {
    return getTerminalBuffer();
  });

  // PTY input (forward keystrokes to terminal)
  ipcMain.on("agent:ptyInput", (_, data: string) => {
    writeToPty(data);
  });

  // PTY resize
  ipcMain.on("agent:ptyResize", (_, cols: number, rows: number) => {
    resizePty(cols, rows);
  });

  // Execute inspector script directly in iframe (child frame)
  ipcMain.handle("agent:injectInspectorInFrame", async () => {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      const mainFrame = win.webContents.mainFrame;
      for (const frame of mainFrame.frames) {
        try {
          await frame.executeJavaScript(INSPECTOR_SCRIPT);
          // Hide Next.js / Vite dev overlay
          await frame.executeJavaScript(`
            (function() {
              if (document.getElementById('__meld-hide-dev-ui')) return;
              const s = document.createElement('style');
              s.id = '__meld-hide-dev-ui';
              s.textContent = 'nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog-overlay], #__next-build-indicator, #__next-build-watcher, [data-next-mark] { display: none !important; }';
              document.head.appendChild(s);
            })();
          `);
        } catch {
          // Frame is still loading or not accessible
        }
      }
    }
    return true;
  });

  // Inject inspector script (write to project's public/ folder — fallback)
  ipcMain.handle("agent:injectInspector", async () => {
    if (!currentRootDir) return false;

    try {
      // 1. Create inspector script file in public/ folder
      const publicDir = path.join(currentRootDir, "public");
      await fs.promises.mkdir(publicDir, { recursive: true });
      const scriptPath = path.join(publicDir, "__meld-inspector.js");
      await fs.promises.writeFile(scriptPath, INSPECTOR_SCRIPT, "utf-8");

      // 2. Try to insert script tag into SPA index.html
      const htmlPaths = [
        path.join(currentRootDir, "index.html"),
        path.join(currentRootDir, "public", "index.html"),
      ];

      for (const htmlPath of htmlPaths) {
        try {
          const html = await fs.promises.readFile(htmlPath, "utf-8");
          if (html.includes("__meld-inspector")) return true; // Already injected

          const scriptTag = '<script src="/__meld-inspector.js" defer></script>';
          const modified = html.replace("</head>", `  ${scriptTag}\n  </head>`);

          if (modified !== html) {
            await fs.promises.writeFile(htmlPath, modified, "utf-8");
            return true;
          }
        } catch {
          continue;
        }
      }

      // 3. Try to insert into Next.js App Router layout
      const layoutPaths = [
        "app/layout.tsx", "app/layout.jsx",
        "src/app/layout.tsx", "src/app/layout.jsx",
      ];

      for (const rel of layoutPaths) {
        const layoutPath = path.join(currentRootDir, rel);
        try {
          const content = await fs.promises.readFile(layoutPath, "utf-8");
          if (content.includes("__meld-inspector")) return true;

          const bodyMatch = content.match(/<body[^>]*>/);
          if (bodyMatch) {
            const scriptTag = `\n        <script src="/__meld-inspector.js" defer />`;
            const modified = content.replace(bodyMatch[0], `${bodyMatch[0]}${scriptTag}`);
            await fs.promises.writeFile(layoutPath, modified, "utf-8");
            return true;
          }
        } catch {
          continue;
        }
      }

      // Rely on auto-serving from public/ folder (Vite, Next.js, etc.)
      return true;
    } catch {
      return false;
    }
  });

  // ─── Agent Loop (AI autonomous coding) ──────────────────────

  ipcMain.handle("agent:startAgentLoop", async (_event, input: AgentLoopInput) => {
    if (!currentRootDir) throw new Error("No project open");

    // Cancel existing agent
    if (activeAgent) activeAgent.cancel();

    // Get API key from server (based on user session)
    let apiKey = "";
    try {
      // Primary: Fetch from server using Electron session cookie
      const wins = BrowserWindow.getAllWindows();
      if (wins.length > 0) {
        const cookies = await wins[0].webContents.session.cookies.get({ name: "fcb_session" });
        if (cookies.length > 0) {
          const res = await fetch("http://localhost:9090/api/ai/api-key", {
            headers: { Cookie: `fcb_session=${cookies[0].value}` },
          });
          if (res.ok) {
            const data = await res.json();
            apiKey = data.key ?? "";
          }
        }
      }
    } catch { /* Server connection failed */ }
    // Fallback: locally stored key
    if (!apiKey) apiKey = getApiKey("anthropic") ?? "";
    if (!apiKey) throw new Error("AI API key not available. Please check your subscription.");

    // Add file tree context
    if (!input.context) input.context = {};
    if (!input.context.fileTree) {
      const tree = scanProject(currentRootDir);
      const flatPaths = (entries: Array<{ path: string; type: string; children?: unknown[] }>): string[] => {
        const result: string[] = [];
        for (const e of entries) {
          if (e.type === "file") result.push(e.path);
          if (e.type === "dir" && Array.isArray(e.children)) result.push(...flatPaths(e.children as typeof entries));
        }
        return result;
      };
      input.context.fileTree = flatPaths(tree);
    }

    // Analyze imports of the selected file and add nearby files context
    if (input.context.selectedFile && input.context.currentCode && !input.context.nearbyFiles) {
      input.context.nearbyFiles = await resolveNearbyFiles(
        currentRootDir,
        input.context.selectedFile,
        input.context.currentCode,
      );
    }

    const modelId = input.modelId ?? "claude-sonnet-4-20250514";

    activeAgent = new AgentLoop({
      apiKey,
      modelId,
      rootDir: currentRootDir,
      input,
      onEvent: (event) => {
        // Forward all events to renderer
        const wins = BrowserWindow.getAllWindows();
        for (const win of wins) {
          win.webContents.send("agent:agentEvent", event);
        }
      },
    });

    // Run asynchronously (non-blocking)
    activeAgent.run().catch((err) => {
      const wins = BrowserWindow.getAllWindows();
      for (const win of wins) {
        win.webContents.send("agent:agentEvent", { type: "error", message: err.message });
      }
    });

    return { status: "started" };
  });

  ipcMain.on("agent:cancelAgentLoop", () => {
    if (activeAgent) {
      activeAgent.cancel();
      activeAgent = null;
    }
  });

  ipcMain.handle("agent:approveEdit", async (_event, toolCallId: string, approved: boolean) => {
    if (activeAgent) {
      activeAgent.approveEdit(toolCallId, approved);
    }
    return { ok: true };
  });

  // ─── Rollback (restore session files) ─────────────────────
  ipcMain.handle("agent:rollback", async (_event, sessionId?: string) => {
    const result = await rollbackSession(sessionId);

    // Forward file tree refresh event after rollback
    if (result.rolledBack.length > 0) {
      const wins = BrowserWindow.getAllWindows();
      for (const win of wins) {
        win.webContents.send("agent:agentEvent", {
          type: "rollback_complete",
          rolledBack: result.rolledBack,
          errors: result.errors,
        });
      }
    }

    return result;
  });

  ipcMain.handle("agent:getBackupSessions", async () => {
    return getBackupSessionIds();
  });

  // ─── Load session history ─────────────────────────────
  ipcMain.handle("agent:loadRecentSessions", async (_, rootDir?: string) => {
    const dir = rootDir ?? currentRootDir;
    if (!dir) return [];
    return loadRecentSessions(dir);
  });
}

// ─── Nearby files resolution utility ──────────────────────

/** Parse import statements of the selected file and collect related file contents */
async function resolveNearbyFiles(
  rootDir: string,
  selectedFile: string,
  currentCode: string,
): Promise<Record<string, string>> {
  const nearbyFiles: Record<string, string> = {};
  const MAX_NEARBY = 5;
  const MAX_FILE_SIZE = 3000; // bytes

  // import/require pattern matching
  const importPatterns = [
    /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,         // import ... from '...'
    /import\s+['"]([^'"]+)['"]/g,                        // import '...'
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,             // require('...')
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,              // dynamic import('...')
  ];

  const importPaths = new Set<string>();
  for (const pattern of importPatterns) {
    let match;
    while ((match = pattern.exec(currentCode)) !== null) {
      const importPath = match[1];
      // Skip node_modules and external packages
      if (!importPath.startsWith(".") && !importPath.startsWith("/") && !importPath.startsWith("@/") && !importPath.startsWith("~/")) continue;
      importPaths.add(importPath);
    }
  }

  const selectedDir = path.dirname(selectedFile);
  const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte", ""];

  for (const importPath of importPaths) {
    if (Object.keys(nearbyFiles).length >= MAX_NEARBY) break;

    // Resolve path aliases (@/ → src/)
    let resolvedImport = importPath;
    if (importPath.startsWith("@/")) {
      resolvedImport = importPath.replace("@/", "src/");
    } else if (importPath.startsWith("~/")) {
      resolvedImport = importPath.replace("~/", "");
    } else if (importPath.startsWith(".")) {
      resolvedImport = path.join(selectedDir, importPath);
    }

    // Try extensions
    for (const ext of EXTENSIONS) {
      const candidates = [
        resolvedImport + ext,
        path.join(resolvedImport, "index" + (ext || ".ts")),
        path.join(resolvedImport, "index" + (ext || ".tsx")),
      ];

      let found = false;
      for (const candidate of candidates) {
        const fullPath = path.resolve(rootDir, candidate);
        if (!fullPath.startsWith(rootDir)) continue;
        try {
          const stat = await fs.promises.stat(fullPath);
          if (stat.isFile() && stat.size <= MAX_FILE_SIZE) {
            const content = await fs.promises.readFile(fullPath, "utf-8");
            const relPath = path.relative(rootDir, fullPath);
            nearbyFiles[relPath] = content;
            found = true;
            break;
          }
        } catch { /* File not found */ }
      }
      if (found) break;
    }
  }

  return nearbyFiles;
}

export function cleanup() {
  if (activeWatcher) {
    activeWatcher.close();
    activeWatcher = null;
  }
  currentRootDir = null;
}
