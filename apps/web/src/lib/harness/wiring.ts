// Wiring — turn a persisted AgentDefinition into a live HarnessConfig.
//
// This is the glue between the DB row (pure JSON) and the runtime providers
// (Claude, E2B, Supabase store, registry). Callers should never assemble
// a HarnessConfig by hand — always go through this module.

import type {
  HarnessConfig,
  ToolProvider,
  SessionStore,
} from "./types";
import type { AgentDefinition } from "./agent-definition";
import { ClaudeModelProvider } from "./model/claude";
import { E2BSandboxProvider } from "./sandbox/e2b";
import { ToolRegistry } from "./tools/registry";
import { CompositeToolProvider } from "./tools/composite";
import { SupabaseSessionStore } from "./session/supabase";
import { SingleLoopStrategy } from "./orchestration/single-loop";

export interface BuildHarnessOptions {
  userId: string;
  prompt: string;
  /** Override the session store (tests can pass InMemorySessionStore). */
  sessionStore?: SessionStore;
  /** Override tool provider entirely (tests / Phase-2 pipeline stages). */
  toolProvider?: ToolProvider;
}

/**
 * Build a runtime HarnessConfig from an AgentDefinition.
 * Caller owns the returned providers — release/cleanup is the harness loop's job.
 */
export function buildHarnessConfig(
  definition: AgentDefinition,
  options: BuildHarnessOptions
): HarnessConfig {
  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const e2bKey = requireEnv("E2B_API_KEY");

  const model = new ClaudeModelProvider({
    apiKey,
    model: definition.modelId,
  });

  const sandbox = new E2BSandboxProvider({
    apiKey: e2bKey,
    defaultTemplate: definition.sandboxTemplate,
  });

  const staticRegistry = new ToolRegistry({
    builtin: definition.builtinToolIds,
  });

  const tools: ToolProvider =
    options.toolProvider ??
    new CompositeToolProvider({
      static: staticRegistry,
      includeMCP: definition.mcpServerIds.length > 0,
    });

  const session: SessionStore = options.sessionStore ?? new SupabaseSessionStore();

  const orchestration = new SingleLoopStrategy({
    maxRounds: definition.orchestration.maxRounds ?? 50,
    compressThreshold: definition.orchestration.compressThreshold ?? 20,
  });

  return {
    userId: options.userId,
    agentId: definition.id,
    initialPrompt: options.prompt,
    systemPrompt: definition.systemPrompt,
    maxTokens: definition.maxTokens,
    sandboxConfig: {
      template: definition.sandboxTemplate,
      timeoutMs: definition.sandboxTimeoutMs,
    },
    model,
    tools,
    sandbox,
    session,
    orchestration,
  };
}

// ─── Helpers ──────────────────────────────────────────
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}
