import { BrowserWindow, WebContentsView, ipcMain } from "electron";
import { INSPECTOR_SCRIPT } from "./inspector-script.js";

let previewView: WebContentsView | null = null;
let currentUrl: string | null = null;
let inspectorInjected = false;

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows[0] ?? null;
}

/** Create WebContentsView and load URL */
function createPreviewView(url: string): WebContentsView {
  if (previewView) {
    destroyPreviewView();
  }

  previewView = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  currentUrl = url;
  inspectorInjected = false;

  // Auto-inject inspector on page load completion + hide dev UI
  previewView.webContents.on("did-finish-load", () => {
    injectInspector();
    // Hide framework dev overlays (Next.js / Vite etc.)
    previewView?.webContents.insertCSS(`
      nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog-overlay],
      #__next-build-indicator, #__next-build-watcher,
      [data-next-mark] { display: none !important; }
    `).catch(() => {});
    // Notify renderer of load completion
    const win = getMainWindow();
    win?.webContents.send("preview:did-finish-load", { url: currentUrl });
  });

  // Re-inject inspector on in-page navigation (HMR etc.)
  previewView.webContents.on("did-navigate-in-page", () => {
    inspectorInjected = false;
    injectInspector();
  });

  // Forward console messages to renderer (for debugging)
  previewView.webContents.on("console-message", (_e, _level, message) => {
    // Only forward meld: protocol messages
    if (message.startsWith("meld:")) {
      const win = getMainWindow();
      win?.webContents.send("preview:console", message);
    }
  });

  // Use IPC instead of window.parent.postMessage
  // Inspector script needs postMessage → preload's ipcRenderer conversion
  // WebContentsView has no preload, so inject message bridge via executeJavaScript
  previewView.webContents.on("did-finish-load", () => {
    // Bridge that monitors postMessage and forwards to main process
    previewView?.webContents.executeJavaScript(`
      (function() {
        if (window.__meldBridgeLoaded) return;
        window.__meldBridgeLoaded = true;

        // When the inspector calls window.parent.postMessage,
        // in WebContentsView parent is the window itself,
        // so detect message events and convert to custom events
        window.addEventListener('message', function(e) {
          if (e.data && e.data.type === 'meld:element-selected') {
            // Use title as temporary channel to forward to main process
            document.title = 'MELD_MSG:' + JSON.stringify(e.data);
          }
        });
      })();
    `).catch(() => {});
  });

  // Detect title change → forward to renderer
  previewView.webContents.on("page-title-updated", (_e, title) => {
    if (title.startsWith("MELD_MSG:")) {
      try {
        const data = JSON.parse(title.slice("MELD_MSG:".length));
        const win = getMainWindow();
        win?.webContents.send("preview:message", data);
      } catch {
        // Ignore parse failure
      }
    }
  });

  previewView.webContents.loadURL(url);

  return previewView;
}

/** Inject inspector script */
function injectInspector() {
  if (!previewView || inspectorInjected) return;
  inspectorInjected = true;

  previewView.webContents.executeJavaScript(INSPECTOR_SCRIPT).catch(() => {
    inspectorInjected = false;
  });
}

/** Remove WebContentsView */
function destroyPreviewView() {
  if (!previewView) return;
  const win = getMainWindow();
  if (win) {
    try {
      win.contentView.removeChildView(previewView);
    } catch {
      // Already removed
    }
  }
  previewView.webContents.close();
  previewView = null;
  currentUrl = null;
  inspectorInjected = false;
}

/** Register IPC handlers */
export function registerPreviewHandlers() {
  // Open preview / change URL
  ipcMain.handle("preview:loadURL", async (_, url: string) => {
    const win = getMainWindow();
    if (!win) return false;

    const view = createPreviewView(url);
    win.contentView.addChildView(view);

    // Set initial bounds (renderer adjusts via resize)
    const [winWidth, winHeight] = win.getSize();
    view.setBounds({ x: 0, y: 48, width: Math.floor(winWidth * 0.6), height: winHeight - 48 });

    return true;
  });

  // Update preview bounds (aligned to renderer's DOM position)
  ipcMain.on("preview:setBounds", (_, bounds: { x: number; y: number; width: number; height: number }) => {
    if (!previewView) return;
    previewView.setBounds({
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    });
  });

  // Show/hide preview
  ipcMain.on("preview:setVisible", (_, visible: boolean) => {
    if (!previewView) return;
    const win = getMainWindow();
    if (!win) return;
    if (visible) {
      // Ignore if already added
      try { win.contentView.addChildView(previewView); } catch {}
    } else {
      try { win.contentView.removeChildView(previewView); } catch {}
    }
  });

  // Refresh preview
  ipcMain.handle("preview:reload", async () => {
    if (!previewView) return false;
    inspectorInjected = false;
    previewView.webContents.reload();
    return true;
  });

  // Change preview URL (timestamp refresh)
  ipcMain.handle("preview:refresh", async (_, url: string) => {
    if (!previewView) return false;
    inspectorInjected = false;
    previewView.webContents.loadURL(url);
    return true;
  });

  // Toggle inspector
  ipcMain.on("preview:toggleInspector", (_, enabled: boolean) => {
    if (!previewView) return;
    // Inject inspector first if not yet injected
    if (!inspectorInjected) injectInspector();

    previewView.webContents.executeJavaScript(`
      window.postMessage({ type: 'meld:toggle-inspector', enabled: ${enabled} }, '*');
    `).catch(() => {});
  });

  // Close preview
  ipcMain.handle("preview:destroy", async () => {
    destroyPreviewView();
    return true;
  });

  // Get current preview URL
  ipcMain.handle("preview:getURL", async () => {
    return currentUrl;
  });
}

/** cleanup */
export function cleanupPreview() {
  destroyPreviewView();
}
