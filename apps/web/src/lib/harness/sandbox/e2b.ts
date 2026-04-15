// E2B sandbox provider
//
// Wraps the E2B cloud sandbox behind the SandboxProvider/Handle interface.
// Replicates the behavior in apps/web/src/app/api/ai/agent-run/route.ts but
// exposes nothing more than the abstract contract.

import { Sandbox } from "e2b";
import type {
  SandboxProvider,
  SandboxHandle,
  SandboxConfig,
  ExecOptions,
  ExecResult,
} from "../types";

export interface E2BProviderConfig {
  apiKey: string;
  defaultTemplate?: string;
}

export class E2BSandboxProvider implements SandboxProvider {
  readonly id = "e2b";
  private readonly apiKey: string;
  private readonly defaultTemplate: string;

  constructor(config: E2BProviderConfig) {
    this.apiKey = config.apiKey;
    this.defaultTemplate = config.defaultTemplate ?? "meld-agent";
  }

  async acquire(config: SandboxConfig): Promise<SandboxHandle> {
    const template = config.template || this.defaultTemplate;
    const sandbox = await Sandbox.create(template, {
      apiKey: this.apiKey,
      timeoutMs: config.timeoutMs,
    });
    const workingDir = config.workingDir ?? "/home/user/project";
    await sandbox.commands.run(`mkdir -p ${workingDir}`, { timeoutMs: 5000 }).catch(() => {});
    return new E2BSandboxHandle(sandbox, workingDir, this.apiKey);
  }

  async release(handle: SandboxHandle): Promise<void> {
    if (handle instanceof E2BSandboxHandle) {
      await handle.close();
    }
  }
}

class E2BSandboxHandle implements SandboxHandle {
  readonly id: string;
  private readonly sandbox: Sandbox;
  private readonly workingDir: string;
  private readonly apiKey: string;
  private closed = false;

  constructor(sandbox: Sandbox, workingDir: string, apiKey: string) {
    this.sandbox = sandbox;
    this.workingDir = workingDir;
    this.apiKey = apiKey;
    this.id = sandbox.sandboxId;
  }

  async exec(command: string, options: ExecOptions = {}): Promise<ExecResult> {
    const fullCmd = options.cwd
      ? `cd ${options.cwd} && ${command}`
      : `cd ${this.workingDir} && ${command}`;
    const timeoutMs = options.timeoutMs ?? 300000;

    if (options.background) {
      // Fire-and-forget — stdout/stderr still stream via callbacks.
      this.sandbox.commands
        .run(fullCmd, {
          timeoutMs,
          onStdout: options.onStdout ? (d: string) => options.onStdout!(d) : undefined,
          onStderr: options.onStderr ? (d: string) => options.onStderr!(d) : undefined,
        })
        .catch(() => {});
      await new Promise(r => setTimeout(r, 5000));
      return { stdout: "", stderr: "", exitCode: 0 };
    }

    const result = await this.sandbox.commands.run(fullCmd, {
      timeoutMs,
      onStdout: options.onStdout ? (d: string) => options.onStdout!(d) : undefined,
      onStderr: options.onStderr ? (d: string) => options.onStderr!(d) : undefined,
    });
    return {
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: result.exitCode,
    };
  }

  async readFile(path: string): Promise<string> {
    const full = this.resolvePath(path);
    return this.sandbox.files.read(full);
  }

  async writeFile(path: string, content: string): Promise<void> {
    const full = this.resolvePath(path);
    const dir = full.split("/").slice(0, -1).join("/");
    if (dir) {
      await this.sandbox.commands.run(`mkdir -p ${dir}`, { timeoutMs: 5000 }).catch(() => {});
    }
    await this.sandbox.files.write(full, content);
  }

  async deleteFile(path: string): Promise<void> {
    const full = this.resolvePath(path);
    await this.sandbox.commands.run(`rm -rf ${full}`, { timeoutMs: 5000 });
  }

  getPublicUrl(port: number): string {
    return `https://${this.sandbox.getHost(port)}`;
  }

  /**
   * tar+gzip the working directory and return as base64. Skips
   * node_modules / .next / .git / dist / build to keep payload size
   * reasonable.
   */
  async dumpSnapshot(): Promise<{ data: string; sizeBytes: number }> {
    const exclude = [
      "--exclude=./node_modules",
      "--exclude=./.next",
      "--exclude=./.git",
      "--exclude=./dist",
      "--exclude=./build",
      "--exclude=./.cache",
    ].join(" ");
    // We tar to /tmp first so we know the byte size before base64 encoding.
    await this.sandbox.commands.run(
      `cd ${this.workingDir} && tar czf /tmp/meld-snapshot.tar.gz ${exclude} .`,
      { timeoutMs: 60000 }
    );
    const sizeRes = await this.sandbox.commands.run(
      `stat -c %s /tmp/meld-snapshot.tar.gz 2>/dev/null || stat -f %z /tmp/meld-snapshot.tar.gz`,
      { timeoutMs: 5000 }
    );
    const sizeBytes = parseInt(sizeRes.stdout.trim() || "0", 10) || 0;
    const b64 = await this.sandbox.commands.run(
      `base64 -w0 /tmp/meld-snapshot.tar.gz 2>/dev/null || base64 /tmp/meld-snapshot.tar.gz | tr -d '\\n'`,
      { timeoutMs: 30000 }
    );
    await this.sandbox.commands.run(`rm -f /tmp/meld-snapshot.tar.gz`, { timeoutMs: 5000 }).catch(() => {});
    return { data: b64.stdout.trim(), sizeBytes };
  }

  /**
   * Decode + extract a previously-dumped tar.gz back into the working
   * directory. Existing files are overwritten.
   */
  async restoreSnapshot(data: string): Promise<void> {
    await this.sandbox.files.write("/tmp/meld-snapshot.b64", data);
    await this.sandbox.commands.run(
      `mkdir -p ${this.workingDir} && base64 -d /tmp/meld-snapshot.b64 > /tmp/meld-snapshot.tar.gz && cd ${this.workingDir} && tar xzf /tmp/meld-snapshot.tar.gz && rm -f /tmp/meld-snapshot.b64 /tmp/meld-snapshot.tar.gz`,
      { timeoutMs: 60000 }
    );
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      await Sandbox.kill(this.sandbox.sandboxId, { apiKey: this.apiKey });
    } catch {
      // ignore
    }
  }

  private resolvePath(path: string): string {
    if (path.startsWith("/")) return path;
    return `${this.workingDir}/${path}`;
  }
}
