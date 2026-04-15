// Harness unit tests — mock providers, no network, no E2B.

import { describe, it, expect, beforeEach } from "vitest";
import { runHarness } from "@/lib/harness/harness";
import { SingleLoopStrategy } from "@/lib/harness/orchestration/single-loop";
import { ToolRegistry } from "@/lib/harness/tools/registry";
import { InMemorySessionStore } from "@/lib/harness/session/memory";
import { MockSandboxProvider } from "@/lib/harness/sandbox/mock";
import type {
  HarnessConfig,
  ModelProvider,
  ModelCompleteResponse,
  Tool,
  ContentBlock,
} from "@/lib/harness/types";

// ─── Mock model ───────────────────────────────────────
class ScriptedModel implements ModelProvider {
  readonly id = "mock:scripted";
  readonly calls: Array<{ messageCount: number; toolNames: string[] }> = [];
  private script: ModelCompleteResponse[];

  constructor(script: ModelCompleteResponse[]) {
    this.script = script;
  }

  async complete(req: {
    messages: unknown[];
    tools: { name: string }[];
  }): Promise<ModelCompleteResponse> {
    this.calls.push({
      messageCount: req.messages.length,
      toolNames: req.tools.map(t => t.name),
    });
    const next = this.script.shift();
    if (!next) throw new Error("scripted model exhausted");
    return next;
  }
}

// ─── Helpers ──────────────────────────────────────────
function textBlock(text: string): ContentBlock {
  return { type: "text", text };
}
function toolUse(id: string, name: string, input: Record<string, unknown>): ContentBlock {
  return { type: "tool_use", id, name, input };
}

function buildConfig(overrides: Partial<HarnessConfig> = {}): HarnessConfig {
  return {
    userId: "user_test",
    agentId: "agent_test",
    initialPrompt: "do something",
    systemPrompt: "you are a test agent",
    maxTokens: 1000,
    sandboxConfig: { template: "mock", timeoutMs: 60000 },
    model: new ScriptedModel([]),
    tools: new ToolRegistry({ builtin: ["read_file", "write_file", "list_files"] }),
    sandbox: new MockSandboxProvider(),
    session: new InMemorySessionStore(),
    orchestration: new SingleLoopStrategy({ maxRounds: 5 }),
    ...overrides,
  };
}

describe("runHarness", () => {
  let session: InMemorySessionStore;
  let sandbox: MockSandboxProvider;

  beforeEach(() => {
    session = new InMemorySessionStore();
    sandbox = new MockSandboxProvider();
  });

  it("stops immediately on end_turn response", async () => {
    const model = new ScriptedModel([
      {
        content: [textBlock("done.")],
        stopReason: "end_turn",
      },
    ]);

    const result = await runHarness(
      buildConfig({ model, session, sandbox })
    );

    expect(result.status).toBe("completed");
    expect(result.finalMessage).toBe("done.");
    expect(model.calls).toHaveLength(1);
  });

  it("executes tool_use and feeds result back to the model", async () => {
    sandbox = new MockSandboxProvider({
      files: { "/home/user/project/README.md": "hello world" },
    });

    const model = new ScriptedModel([
      {
        content: [
          textBlock("reading the readme"),
          toolUse("call_1", "read_file", { path: "/home/user/project/README.md" }),
        ],
        stopReason: "tool_use",
      },
      {
        content: [textBlock("readme says hello world.")],
        stopReason: "end_turn",
      },
    ]);

    const result = await runHarness(
      buildConfig({ model, session, sandbox })
    );

    expect(result.status).toBe("completed");
    expect(model.calls).toHaveLength(2);
    // Second model call should have seen the tool_result message
    expect(model.calls[1].messageCount).toBeGreaterThan(model.calls[0].messageCount);
  });

  it("releases sandbox on normal completion", async () => {
    const model = new ScriptedModel([
      {
        content: [textBlock("done")],
        stopReason: "end_turn",
      },
    ]);

    await runHarness(buildConfig({ model, session, sandbox }));
    expect(sandbox.acquired).toHaveLength(1);
    expect(sandbox.acquired[0].closed).toBe(true);
  });

  it("stops with max rounds reason if model keeps requesting tools", async () => {
    // Build a model that always asks for list_files
    const never: ModelCompleteResponse = {
      content: [toolUse("call_x", "list_files", {})],
      stopReason: "tool_use",
    };
    const model = new ScriptedModel([never, never, never, never, never, never, never]);

    const result = await runHarness(
      buildConfig({
        model,
        session,
        sandbox,
        orchestration: new SingleLoopStrategy({ maxRounds: 3 }),
      })
    );

    expect(result.status).toBe("completed");
    expect(model.calls.length).toBeLessThanOrEqual(3);
  });

  it("records events in the session store", async () => {
    const model = new ScriptedModel([
      {
        content: [textBlock("done")],
        stopReason: "end_turn",
      },
    ]);

    const result = await runHarness(buildConfig({ model, session, sandbox }));

    const snapshot = await session.getSnapshot(result.sessionId);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.events.length).toBeGreaterThan(0);

    const types = snapshot!.events.map(e => e.type);
    expect(types).toContain("sandbox_acquired");
    expect(types).toContain("message");
    expect(types).toContain("done");
  });

  it("marks session as error if sandbox acquire fails", async () => {
    class FailingSandbox extends MockSandboxProvider {
      async acquire(): Promise<never> {
        throw new Error("boom");
      }
    }
    const failingSandbox = new FailingSandbox();
    const model = new ScriptedModel([]);

    const result = await runHarness(
      buildConfig({ model, session, sandbox: failingSandbox })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("boom");

    const snap = await session.getSnapshot(result.sessionId);
    expect(snap?.status).toBe("error");
  });

  it("does not expose MCP-only tools when not configured", async () => {
    const model = new ScriptedModel([
      {
        content: [textBlock("done")],
        stopReason: "end_turn",
      },
    ]);

    await runHarness(
      buildConfig({
        model,
        session,
        sandbox,
        tools: new ToolRegistry({ builtin: ["read_file"] }),
      })
    );

    expect(model.calls[0].toolNames).toEqual(["read_file"]);
  });
});

// ─── Strategy unit tests ──────────────────────────────

describe("SingleLoopStrategy", () => {
  it("starts with the user prompt as the first message", () => {
    const strat = new SingleLoopStrategy();
    const state = strat.initialState({
      systemPrompt: "sys",
      userPrompt: "hi",
    });
    expect(state.round).toBe(0);
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toEqual({ role: "user", content: "hi" });
  });

  it("compresses history when it exceeds the threshold", () => {
    const strat = new SingleLoopStrategy({ compressThreshold: 5 });
    const state = strat.initialState({ systemPrompt: "s", userPrompt: "p" });
    state.messages = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg ${i}`,
    }));
    const decision = strat.nextStep(state, null);
    expect(decision.type).toBe("compress");
    const compressed = strat.compress(state);
    expect(compressed.messages.length).toBeLessThan(30);
  });

  it("stops on end_turn", () => {
    const strat = new SingleLoopStrategy();
    const state = strat.initialState({ systemPrompt: "s", userPrompt: "p" });
    const decision = strat.nextStep(state, {
      response: {
        content: [{ type: "text", text: "done" }],
        stopReason: "end_turn",
      },
      toolResults: [],
    });
    expect(decision.type).toBe("stop");
  });

  it("stops after maxRounds", () => {
    const strat = new SingleLoopStrategy({ maxRounds: 3 });
    const state = strat.initialState({ systemPrompt: "s", userPrompt: "p" });
    state.round = 3;
    const decision = strat.nextStep(state, null);
    expect(decision.type).toBe("stop");
  });
});

// ─── Tool registry unit tests ─────────────────────────

describe("ToolRegistry", () => {
  it("exposes only requested built-ins", async () => {
    const registry = new ToolRegistry({ builtin: ["read_file", "write_file"] });
    const tools = await registry.list("user_x");
    expect(tools.map(t => t.def.name).sort()).toEqual(["read_file", "write_file"]);
  });

  it("includes extra tools", async () => {
    const extraTool: Tool = {
      def: {
        name: "custom",
        description: "custom tool",
        input_schema: { type: "object", properties: {}, required: [] },
      },
      async execute() {
        return { text: "ran", isError: false };
      },
    };
    const registry = new ToolRegistry({ builtin: ["read_file"], extra: [extraTool] });
    const tools = await registry.list("user_x");
    expect(tools).toHaveLength(2);
    expect(tools.map(t => t.def.name)).toContain("custom");
  });
});

// ─── Session store unit tests ─────────────────────────

describe("InMemorySessionStore", () => {
  it("create → append → getEvents round-trip", async () => {
    const store = new InMemorySessionStore();
    const handle = await store.create({ userId: "u1", prompt: "p" });
    await store.append(handle.id, { type: "message", timestamp: 1, content: "hi" });
    await store.append(handle.id, { type: "done", timestamp: 2 });
    const events = await store.getEvents(handle.id);
    expect(events).toHaveLength(2);
  });

  it("getEvents since index skips earlier events", async () => {
    const store = new InMemorySessionStore();
    const handle = await store.create({ userId: "u1", prompt: "p" });
    for (let i = 0; i < 5; i++) {
      await store.append(handle.id, { type: "message", timestamp: i, idx: i });
    }
    const tail = await store.getEvents(handle.id, 3);
    expect(tail).toHaveLength(2);
  });

  it("markComplete + resume returns final snapshot", async () => {
    const store = new InMemorySessionStore();
    const handle = await store.create({ userId: "u1", prompt: "p" });
    await store.markComplete(handle.id, "completed");
    const snap = await store.resume(handle.id);
    expect(snap?.status).toBe("completed");
  });

  it("checkpoint saves a label + eventCount", async () => {
    const store = new InMemorySessionStore();
    const handle = await store.create({ userId: "u1", prompt: "p" });
    await store.append(handle.id, { type: "message", timestamp: 1 });
    const cp = await store.checkpoint(handle.id, "after-plan");
    expect(cp.label).toBe("after-plan");
    expect(cp.eventCount).toBe(1);
  });
});
