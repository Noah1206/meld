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

const program = new Command();

program
  .name("figma-code-bridge")
  .description("FigmaCodeBridge local agent — connects web app to local project")
  .version("0.1.0")
  .argument("[path]", "Project path (default: current directory)", ".")
  .option("-p, --port <number>", "WebSocket 포트", "3100")
  .action((projectPath: string, options: { port: string }) => {
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

    startServer({ port, rootDir });
  });

program.parse();
