#!/usr/bin/env node

import * as path from "node:path";
import * as fs from "node:fs";
import { Command } from "commander";
import { startServer } from "./server.js";

// Re-export for direct import from Electron or other external consumers
export { scanProject } from "./scanner.js";
export { createWatcher } from "./watcher.js";
export type { FileChangeEvent, ChangeHandler } from "./watcher.js";
export { detectFramework, checkPort } from "./server.js";
export { AgentLoop, rollbackSession, getBackupSessionIds, loadRecentSessions } from "./agent-loop.js";
export type { SessionRecord } from "./agent-loop.js";
export { HeartbeatScheduler } from "./heartbeat.js";
export type { HeartbeatConfig, StandingOrder, HeartbeatInstruction } from "./heartbeat.js";
export { EventHooks } from "./event-hooks.js";
export type { EventHookConfig } from "./event-hooks.js";
export { bootVMScreen, shutdownVMScreen, vmNavigate, vmClick, vmType, vmScroll, vmScreenshot, vmEvaluate, isVMScreenRunning } from "./vm-screen.js";

const program = new Command();

program
  .name("meld-agent")
  .description("Meld local agent — connects web IDE to your project")
  .version("0.1.0")
  .argument("[path]", "Project path (default: current directory)", ".")
  .option("-p, --port <number>", "WebSocket port", "3100")
  .option("-k, --api-key <key>", "Anthropic API key (or set ANTHROPIC_API_KEY env var)")
  .action((projectPath: string, options: { port: string; apiKey?: string }) => {
    const rootDir = path.resolve(process.cwd(), projectPath);

    // Path validation
    if (!fs.existsSync(rootDir)) {
      console.error(`\n  ❌ Path does not exist: ${rootDir}\n`);
      process.exit(1);
    }

    if (!fs.statSync(rootDir).isDirectory()) {
      console.error(`\n  ❌ Not a directory: ${rootDir}\n`);
      process.exit(1);
    }

    const port = parseInt(options.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error(`\n  ❌ Invalid port: ${options.port}\n`);
      process.exit(1);
    }

    // Resolve API key: CLI flag > env var > .meld/config.json
    let apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const configPath = path.join(rootDir, ".meld", "config.json");
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        apiKey = config.apiKey;
      } catch { /* no config file */ }
    }

    if (!apiKey) {
      console.log(`\n  ⚠️  No API key found. AI agent features will not work.`);
      console.log(`  Set ANTHROPIC_API_KEY env var or use --api-key flag.\n`);
    }

    startServer({ port, rootDir, apiKey });
  });

program.parse();
