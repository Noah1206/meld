// Mock sandbox for unit tests
//
// In-memory file system + pluggable exec responses. Never hits a real
// sandbox or network.

import type {
  SandboxProvider,
  SandboxHandle,
  ExecOptions,
  ExecResult,
} from "../types";

export type MockExecHandler = (command: string, options: ExecOptions) => ExecResult | Promise<ExecResult>;

export interface MockSandboxConfig {
  files?: Record<string, string>;
  execHandler?: MockExecHandler;
  hostFormat?: (port: number) => string;
}

export class MockSandboxProvider implements SandboxProvider {
  readonly id = "mock";
  private readonly config: MockSandboxConfig;
  readonly acquired: MockSandboxHandle[] = [];

  constructor(config: MockSandboxConfig = {}) {
    this.config = config;
  }

  async acquire(): Promise<SandboxHandle> {
    const handle = new MockSandboxHandle(this.config);
    this.acquired.push(handle);
    return handle;
  }

  async release(handle: SandboxHandle): Promise<void> {
    if (handle instanceof MockSandboxHandle) {
      handle.closed = true;
    }
  }
}

export class MockSandboxHandle implements SandboxHandle {
  readonly id: string;
  readonly files: Map<string, string>;
  readonly execLog: Array<{ command: string; options: ExecOptions }> = [];
  closed = false;
  private readonly execHandler: MockExecHandler;
  private readonly hostFormat: (port: number) => string;

  constructor(config: MockSandboxConfig) {
    this.id = `mock_${Math.random().toString(36).slice(2, 10)}`;
    this.files = new Map(Object.entries(config.files ?? {}));
    this.execHandler = config.execHandler ?? (() => ({ stdout: "", stderr: "", exitCode: 0 }));
    this.hostFormat = config.hostFormat ?? (port => `mock.sandbox:${port}`);
  }

  async exec(command: string, options: ExecOptions = {}): Promise<ExecResult> {
    this.execLog.push({ command, options });
    const result = await this.execHandler(command, options);
    if (options.onStdout && result.stdout) options.onStdout(result.stdout);
    if (options.onStderr && result.stderr) options.onStderr(result.stderr);
    return result;
  }

  async readFile(path: string): Promise<string> {
    if (!this.files.has(path)) {
      throw new Error(`Mock file not found: ${path}`);
    }
    return this.files.get(path)!;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async deleteFile(path: string): Promise<void> {
    this.files.delete(path);
  }

  getPublicUrl(port: number): string {
    return `https://${this.hostFormat(port)}`;
  }
}
