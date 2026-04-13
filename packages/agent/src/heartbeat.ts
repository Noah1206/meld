import * as fs from "node:fs";
import * as path from "node:path";
import type { AgentEvent, AgentLoopInput } from "@figma-code-bridge/shared";
import { AgentLoop } from "./agent-loop.js";

// ─── Heartbeat: Self-awakening autonomous agent ──────────
// The agent wakes up on a schedule, checks standing orders,
// and takes action without user intervention.

export interface HeartbeatConfig {
  /** Interval in milliseconds (default: 30 minutes) */
  intervalMs: number;
  /** Project root directory */
  rootDir: string;
  /** Claude API key */
  apiKey: string;
  /** Model to use */
  modelId: string;
  /** Meld server URL for proxied API calls */
  serverUrl?: string;
  /** Callback for agent events (sent to user via WebSocket) */
  onEvent: (event: AgentEvent) => void;
  /** Callback when heartbeat finds something important */
  onAlert: (message: string, severity: "info" | "warning" | "critical") => void;
}

export interface StandingOrder {
  instruction: string;
  autoAction: boolean; // true = execute without asking, false = notify user first
}

export interface HeartbeatInstruction {
  intervalMs: number;
  standingOrders: StandingOrder[];
  autoActions: string[];
  askFirstActions: string[];
  notifications: string[];
}

const DEFAULT_HEARTBEAT: HeartbeatInstruction = {
  intervalMs: 30 * 60 * 1000, // 30 minutes
  standingOrders: [
    { instruction: "Check if the dev server is running and healthy", autoAction: true },
    { instruction: "Run 'npm run build' and check for errors", autoAction: true },
    { instruction: "Check terminal output for new errors or warnings", autoAction: true },
  ],
  autoActions: [
    "Fix lint errors",
    "Fix TypeScript type errors",
    "Restart crashed dev server",
    "Install missing packages when import errors detected",
  ],
  askFirstActions: [
    "Deploy to production",
    "Run database migrations",
    "Delete files",
    "Push to git",
  ],
  notifications: [
    "Build failure",
    "New runtime error",
    "Server crash",
  ],
};

export class HeartbeatScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private config: HeartbeatConfig;
  private instructions: HeartbeatInstruction;
  private isRunning = false;
  private beatCount = 0;
  private lastBeatAt: Date | null = null;

  constructor(config: HeartbeatConfig) {
    this.config = config;
    this.instructions = { ...DEFAULT_HEARTBEAT, intervalMs: config.intervalMs };
  }

  async start() {
    // Load HEARTBEAT.md if it exists
    await this.loadHeartbeatMd();

    // Create HEARTBEAT.md if it doesn't exist
    await this.ensureHeartbeatMd();

    // Start the heartbeat timer
    this.timer = setInterval(() => this.beat(), this.instructions.intervalMs);

    // Run first beat immediately
    this.beat();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getStatus() {
    return {
      running: !!this.timer,
      beatCount: this.beatCount,
      lastBeatAt: this.lastBeatAt,
      intervalMs: this.instructions.intervalMs,
      standingOrders: this.instructions.standingOrders.length,
    };
  }

  private async beat() {
    if (this.isRunning) return; // Skip if previous beat still running
    this.isRunning = true;
    this.beatCount++;
    this.lastBeatAt = new Date();

    try {
      // Reload instructions (user may have edited HEARTBEAT.md)
      await this.loadHeartbeatMd();

      for (const order of this.instructions.standingOrders) {
        try {
          await this.executeOrder(order);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.config.onAlert(
            `Heartbeat order failed: "${order.instruction}" — ${msg}`,
            "warning",
          );
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async executeOrder(order: StandingOrder) {
    const command = `[HEARTBEAT] Execute this standing order: "${order.instruction}"

CONTEXT:
- This is an automated heartbeat check, NOT a user request.
- If everything is fine, just report "OK" briefly.
- If there's a problem and autoAction is allowed, FIX IT immediately.
- If it requires user approval (deploy, migration, delete), use ask_user(confirm).
- Be brief. No unnecessary explanations.

Auto-action allowed: ${order.autoAction ? "YES — fix problems without asking" : "NO — notify user only"}
Allowed auto-fixes: ${this.instructions.autoActions.join(", ")}
Requires user approval: ${this.instructions.askFirstActions.join(", ")}`;

    const input: AgentLoopInput = {
      command,
      context: {
        category: "tool",
        connectedServices: "Heartbeat mode — limited to standing orders",
      },
    };

    const loop = new AgentLoop({
      apiKey: this.config.apiKey,
      modelId: this.config.modelId,
      rootDir: this.config.rootDir,
      input,
      onEvent: (event) => {
        // Forward events to the user's WebSocket (if connected)
        this.config.onEvent(event);

        // Check for alerts
        if (event.type === "error") {
          this.config.onAlert(event.message, "critical");
        }
        if (event.type === "message" && typeof event.content === "string") {
          // Check if the agent found something noteworthy
          const content = event.content.toLowerCase();
          for (const trigger of this.instructions.notifications) {
            if (content.includes(trigger.toLowerCase())) {
              this.config.onAlert(event.content, "warning");
              break;
            }
          }
        }
      },
      maxRounds: 10, // Heartbeat should be quick
      serverUrl: this.config.serverUrl,
    });

    await loop.run();
  }

  private async loadHeartbeatMd() {
    const filePath = path.join(this.config.rootDir, "HEARTBEAT.md");
    try {
      const content = await fs.promises.readFile(filePath, "utf-8");
      this.instructions = this.parseHeartbeatMd(content);
    } catch {
      // File doesn't exist yet, use defaults
    }
  }

  private async ensureHeartbeatMd() {
    const filePath = path.join(this.config.rootDir, "HEARTBEAT.md");
    try {
      await fs.promises.access(filePath);
    } catch {
      // Create default HEARTBEAT.md
      const content = `# Heartbeat Configuration

## Interval
30m

## Standing Orders
1. Check dev server health
2. Run npm run build — fix errors automatically if possible
3. Check for new error logs in terminal output

## Auto-Actions (execute without asking)
- Fix lint errors
- Fix TypeScript errors
- Restart crashed dev server
- Install missing packages

## Ask-First Actions (notify user)
- Deploy to production
- Run database migrations
- Delete files
- Push to git

## Notifications (alert user when detected)
- Build failure
- New runtime error
- Server crash
`;
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, content, "utf-8");
    }
  }

  private parseHeartbeatMd(content: string): HeartbeatInstruction {
    const result: HeartbeatInstruction = { ...DEFAULT_HEARTBEAT };

    // Parse interval
    const intervalMatch = content.match(/## Interval\s*\n\s*(\d+)(m|h|min|hr)/i);
    if (intervalMatch) {
      const num = parseInt(intervalMatch[1]);
      const unit = intervalMatch[2].toLowerCase();
      result.intervalMs = unit.startsWith("h")
        ? num * 60 * 60 * 1000
        : num * 60 * 1000;
    }

    // Parse standing orders
    const ordersSection = content.match(/## Standing Orders\s*\n([\s\S]*?)(?=\n## |$)/);
    if (ordersSection) {
      const lines = ordersSection[1].split("\n").filter((l) => /^\d+\.\s/.test(l.trim()));
      result.standingOrders = lines.map((l) => ({
        instruction: l.replace(/^\d+\.\s*/, "").trim(),
        autoAction: true,
      }));
    }

    // Parse auto-actions
    const autoSection = content.match(/## Auto-Actions[^\n]*\n([\s\S]*?)(?=\n## |$)/);
    if (autoSection) {
      result.autoActions = autoSection[1]
        .split("\n")
        .filter((l) => l.trim().startsWith("-"))
        .map((l) => l.replace(/^-\s*/, "").trim());
    }

    // Parse ask-first actions
    const askSection = content.match(/## Ask-First[^\n]*\n([\s\S]*?)(?=\n## |$)/);
    if (askSection) {
      result.askFirstActions = askSection[1]
        .split("\n")
        .filter((l) => l.trim().startsWith("-"))
        .map((l) => l.replace(/^-\s*/, "").trim());

      // Mark these standing orders as requiring approval
      for (const order of result.standingOrders) {
        if (result.askFirstActions.some((a) => order.instruction.toLowerCase().includes(a.toLowerCase()))) {
          order.autoAction = false;
        }
      }
    }

    // Parse notifications
    const notifSection = content.match(/## Notifications[^\n]*\n([\s\S]*?)(?=\n## |$)/);
    if (notifSection) {
      result.notifications = notifSection[1]
        .split("\n")
        .filter((l) => l.trim().startsWith("-"))
        .map((l) => l.replace(/^-\s*/, "").trim());
    }

    return result;
  }
}
