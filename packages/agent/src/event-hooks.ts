import * as fs from "node:fs";
import * as path from "node:path";
import type { AgentEvent } from "@figma-code-bridge/shared";

// ─── Event Hooks: Wake agent on external events ──────────

export interface EventHookConfig {
  rootDir: string;
  onTrigger: (event: string, detail: string) => void;
}

// Directories/files to ignore in file watcher
const IGNORE_PATTERNS = [
  "node_modules", ".git", ".next", ".meld", "dist", "build",
  ".turbo", ".cache", ".env", "package-lock.json", "pnpm-lock.yaml",
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some((p) => filePath.includes(p));
}

export class EventHooks {
  private watchers: fs.FSWatcher[] = [];
  private config: EventHookConfig;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingChanges = new Set<string>();

  constructor(config: EventHookConfig) {
    this.config = config;
  }

  /** Start watching for file changes */
  startFileWatcher() {
    try {
      const watcher = fs.watch(
        this.config.rootDir,
        { recursive: true },
        (eventType, filename) => {
          if (!filename || shouldIgnore(filename)) return;

          this.pendingChanges.add(filename);

          // Debounce: wait 2 seconds of silence before triggering
          if (this.debounceTimer) clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => {
            const changes = Array.from(this.pendingChanges);
            this.pendingChanges.clear();

            if (changes.length > 0) {
              this.config.onTrigger(
                "file_changed",
                `Files changed: ${changes.slice(0, 10).join(", ")}${changes.length > 10 ? ` (+${changes.length - 10} more)` : ""}`,
              );
            }
          }, 2000);
        },
      );

      this.watchers.push(watcher);
    } catch {
      // File watching not supported or permission denied
    }
  }

  /** Watch terminal output for errors */
  watchTerminalOutput(output: string) {
    const errorPatterns = [
      /Error:/i,
      /EADDRINUSE/,
      /ECONNREFUSED/,
      /MODULE_NOT_FOUND/,
      /Cannot find module/,
      /SyntaxError/,
      /TypeError/,
      /ReferenceError/,
      /FATAL/i,
      /Unhandled.*rejection/i,
      /segmentation fault/i,
    ];

    for (const pattern of errorPatterns) {
      if (pattern.test(output)) {
        this.config.onTrigger(
          "terminal_error",
          `Error detected in terminal: ${output.slice(0, 500)}`,
        );
        break;
      }
    }
  }

  /** Watch for git events (new commits, pushes) */
  startGitWatcher() {
    const gitHooksDir = path.join(this.config.rootDir, ".git", "hooks");
    try {
      // Watch for ref changes (someone pushed)
      const refsDir = path.join(this.config.rootDir, ".git", "refs");
      const watcher = fs.watch(refsDir, { recursive: true }, (eventType, filename) => {
        if (filename) {
          this.config.onTrigger(
            "git_ref_changed",
            `Git ref changed: ${filename}`,
          );
        }
      });
      this.watchers.push(watcher);
    } catch {
      // .git directory doesn't exist or not accessible
    }
  }

  /** Stop all watchers */
  stop() {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
