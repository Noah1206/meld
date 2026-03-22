#!/usr/bin/env node

import * as path from "node:path";
import * as fs from "node:fs";
import { Command } from "commander";
import { startServer } from "./server.js";

const program = new Command();

program
  .name("figma-code-bridge")
  .description("FigmaCodeBridge 로컬 에이전트 — 웹앱과 로컬 프로젝트를 연결합니다")
  .version("0.1.0")
  .argument("[path]", "프로젝트 경로 (기본: 현재 디렉토리)", ".")
  .option("-p, --port <number>", "WebSocket 포트", "3100")
  .action((projectPath: string, options: { port: string }) => {
    const rootDir = path.resolve(process.cwd(), projectPath);

    // 경로 유효성 검사
    if (!fs.existsSync(rootDir)) {
      console.error(`\n  ❌ 경로가 존재하지 않습니다: ${rootDir}\n`);
      process.exit(1);
    }

    if (!fs.statSync(rootDir).isDirectory()) {
      console.error(`\n  ❌ 디렉토리가 아닙니다: ${rootDir}\n`);
      process.exit(1);
    }

    const port = parseInt(options.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error(`\n  ❌ 유효하지 않은 포트: ${options.port}\n`);
      process.exit(1);
    }

    startServer({ port, rootDir });
  });

program.parse();
