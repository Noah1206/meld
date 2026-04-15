// Phase 2 — pipeline & strategy tests (mock providers only).

import { describe, it, expect } from "vitest";
import { runThreeAgentPipeline } from "@/lib/harness/pipeline/three-agent";
import { parseContract, contractToGeneratorBrief } from "@/lib/harness/contract";
import { extractVerdict } from "@/lib/harness/orchestration/evaluator";
import { PlannerStrategy } from "@/lib/harness/orchestration/planner";
import { GeneratorStrategy } from "@/lib/harness/orchestration/generator";
import { EvaluatorStrategy } from "@/lib/harness/orchestration/evaluator";
import { ToolRegistry } from "@/lib/harness/tools/registry";
import { InMemorySessionStore } from "@/lib/harness/session/memory";
import { MockSandboxProvider } from "@/lib/harness/sandbox/mock";
import type {
  ModelProvider,
  ModelCompleteResponse,
  ContentBlock,
} from "@/lib/harness/types";

// ─── Scripted model (keyed by stage via system prompt sniff) ──

class StagedModel implements ModelProvider {
  readonly id = "mock:staged";
  readonly calls: Array<{ stage: string; msgs: number }> = [];
  constructor(
    private readonly responses: {
      planner: ModelCompleteResponse[];
      generator: ModelCompleteResponse[];
      evaluator: ModelCompleteResponse[];
    }
  ) {}

  async complete(req: { system: string; messages: unknown[] }): Promise<ModelCompleteResponse> {
    const stage = this.detectStage(req.system);
    this.calls.push({ stage, msgs: req.messages.length });
    const bucket = this.responses[stage];
    const next = bucket.shift();
    if (!next) throw new Error(`staged model exhausted for ${stage}`);
    return next;
  }

  private detectStage(system: string): "planner" | "generator" | "evaluator" {
    if (system.includes("PLANNER")) return "planner";
    if (system.includes("EVALUATOR")) return "evaluator";
    return "generator";
  }
}

const text = (t: string): ContentBlock => ({ type: "text", text: t });

// ─── Contract parsing ────────────────────────────────

describe("parseContract", () => {
  it("extracts all sections from a well-formed markdown spec", () => {
    const md = `# Product spec

## Goal
Build a counter app.

## Target stack
Next.js 14, TypeScript, Tailwind

## Features
- Plus button increments counter
- Minus button decrements counter
- Reset button sets counter to 0

## Completion criteria
- [ ] The app starts on port 3000
- [ ] Clicking + increases the displayed number
- [ ] Clicking - decreases the displayed number
- [ ] Clicking reset sets the number to 0

## Out of scope
- Authentication
- Persistence
`;
    const c = parseContract(md);
    expect(c.goal).toBe("Build a counter app.");
    expect(c.stack).toContain("Next.js");
    expect(c.features).toHaveLength(3);
    expect(c.criteria).toHaveLength(4);
    expect(c.criteria[0]).toBe("The app starts on port 3000");
    expect(c.outOfScope).toEqual(["Authentication", "Persistence"]);
  });

  it("tolerates missing sections", () => {
    const c = parseContract("# Goal\nJust do it.");
    expect(c.goal).toBe("Just do it.");
    expect(c.features).toEqual([]);
    expect(c.criteria).toEqual([]);
  });
});

describe("contractToGeneratorBrief", () => {
  it("renders a brief the generator can consume", () => {
    const c = parseContract(`# Goal\nApp.\n# Completion criteria\n- [ ] Works\n- [ ] Is fast`);
    const brief = contractToGeneratorBrief(c);
    expect(brief).toContain("# Your task");
    expect(brief).toContain("- [ ] Works");
    expect(brief).toContain("- [ ] Is fast");
  });
});

// ─── Verdict extraction ──────────────────────────────

describe("extractVerdict", () => {
  it("parses a fenced JSON verdict", () => {
    const txt = `Let me think.

\`\`\`json
{
  "pass": true,
  "score": 92,
  "issues": ["minor: missing reset button animation"],
  "summary": "Works well."
}
\`\`\``;
    const v = extractVerdict(txt);
    expect(v).not.toBeNull();
    expect(v!.pass).toBe(true);
    expect(v!.score).toBe(92);
  });

  it("returns null on garbage input", () => {
    expect(extractVerdict("no verdict here")).toBeNull();
    expect(extractVerdict("```{broken json")).toBeNull();
  });

  it("picks the LAST fenced JSON block when multiple exist", () => {
    const txt = `\`\`\`json
{"wrong": true}
\`\`\`

later...

\`\`\`json
{"pass": false, "score": 50, "issues": ["x"], "summary": "no"}
\`\`\``;
    const v = extractVerdict(txt);
    expect(v?.pass).toBe(false);
  });
});

// ─── Strategy lifecycle ──────────────────────────────

describe("PlannerStrategy", () => {
  it("stops and extracts spec on first end_turn", () => {
    const s = new PlannerStrategy();
    const state = s.initialState({ systemPrompt: "", userPrompt: "build me a counter" });
    const decision = s.nextStep(state, {
      response: { content: [text("# Goal\nCounter")], stopReason: "end_turn" },
      toolResults: [],
    });
    expect(decision.type).toBe("stop");
    expect(s.extractSpec(state)).toContain("Counter");
  });
});

describe("GeneratorStrategy.acceptFeedback", () => {
  it("appends evaluator feedback as a new user message", () => {
    const s = new GeneratorStrategy();
    const state = s.initialState({ systemPrompt: "", userPrompt: "build" });
    const updated = s.acceptFeedback(state, "The reset button is missing.");
    expect(updated.messages.length).toBe(state.messages.length + 1);
    expect(updated.messages[updated.messages.length - 1].content).toContain("reset button");
    expect(updated.scratch.retries).toBe(1);
  });
});

describe("EvaluatorStrategy", () => {
  it("captures verdict from final text", () => {
    const s = new EvaluatorStrategy();
    const state = s.initialState({ systemPrompt: "", userPrompt: "evaluate" });
    const verdictJson = '```json\n{"pass": true, "score": 90, "issues": [], "summary": "good"}\n```';
    s.nextStep(state, {
      response: { content: [text(verdictJson)], stopReason: "end_turn" },
      toolResults: [],
    });
    expect(s.extractVerdict(state)?.pass).toBe(true);
  });
});

// ─── Three-agent pipeline integration ────────────────

describe("runThreeAgentPipeline (mock end-to-end)", () => {
  it("runs Planner → Generator → Evaluator and passes on first try", async () => {
    const session = new InMemorySessionStore();
    const sandbox = new MockSandboxProvider();

    const plannerResponse: ModelCompleteResponse = {
      content: [
        text(`# Goal
Simple counter.

## Target stack
HTML/JS

## Completion criteria
- [ ] Plus button works
- [ ] Minus button works
`),
      ],
      stopReason: "end_turn",
    };

    const generatorResponse: ModelCompleteResponse = {
      content: [text("Implementation done.")],
      stopReason: "end_turn",
    };

    const evaluatorResponse: ModelCompleteResponse = {
      content: [
        text(
          '```json\n{"pass": true, "score": 95, "issues": [], "summary": "ok"}\n```'
        ),
      ],
      stopReason: "end_turn",
    };

    const model = new StagedModel({
      planner: [plannerResponse],
      generator: [generatorResponse],
      evaluator: [evaluatorResponse],
    });

    const tools = new ToolRegistry({ builtin: ["read_file"] });

    const result = await runThreeAgentPipeline({
      userId: "u1",
      userPrompt: "build a counter",
      model,
      sandbox,
      session,
      plannerTools: tools,
      generatorTools: tools,
      evaluatorTools: tools,
    });

    expect(result.status).toBe("completed");
    expect(result.contract).not.toBeNull();
    expect(result.contract?.criteria).toHaveLength(2);
    expect(result.finalVerdict?.pass).toBe(true);
    expect(result.iterationsRun).toBe(1);
    expect(result.generatorSessionIds).toHaveLength(1);
    expect(result.evaluatorSessionIds).toHaveLength(1);

    const masterSnapshot = await session.getSnapshot(result.sessionId);
    const types = masterSnapshot!.events.map(e => e.type);
    expect(types).toContain("stage_started");
    expect(types).toContain("stage_completed");
    expect(types).toContain("plan_produced");
    expect(types).toContain("evaluation_verdict");
  });

  it("retries generator when evaluator fails, stops on pass", async () => {
    const session = new InMemorySessionStore();
    const sandbox = new MockSandboxProvider();

    const plan: ModelCompleteResponse = {
      content: [text(`# Goal\nX\n## Completion criteria\n- [ ] Works`)],
      stopReason: "end_turn",
    };
    const gen: ModelCompleteResponse = {
      content: [text("done")],
      stopReason: "end_turn",
    };
    const fail: ModelCompleteResponse = {
      content: [
        text('```json\n{"pass": false, "score": 40, "issues": ["broken"], "summary": "no"}\n```'),
      ],
      stopReason: "end_turn",
    };
    const pass: ModelCompleteResponse = {
      content: [
        text('```json\n{"pass": true, "score": 90, "issues": [], "summary": "ok"}\n```'),
      ],
      stopReason: "end_turn",
    };

    const model = new StagedModel({
      planner: [plan],
      generator: [gen, gen],
      evaluator: [fail, pass],
    });

    const tools = new ToolRegistry({ builtin: ["read_file"] });

    const result = await runThreeAgentPipeline({
      userId: "u1",
      userPrompt: "do it",
      model,
      sandbox,
      session,
      plannerTools: tools,
      generatorTools: tools,
      evaluatorTools: tools,
      maxIterations: 3,
    });

    expect(result.status).toBe("completed");
    expect(result.iterationsRun).toBe(2);
    expect(result.finalVerdict?.pass).toBe(true);
  });

  it("stops after maxIterations even if evaluator keeps failing", async () => {
    const session = new InMemorySessionStore();
    const sandbox = new MockSandboxProvider();

    const plan: ModelCompleteResponse = {
      content: [text(`# Goal\nX\n## Completion criteria\n- [ ] Works`)],
      stopReason: "end_turn",
    };
    const gen: ModelCompleteResponse = {
      content: [text("done")],
      stopReason: "end_turn",
    };
    const fail: ModelCompleteResponse = {
      content: [
        text('```json\n{"pass": false, "score": 10, "issues": ["x"], "summary": "no"}\n```'),
      ],
      stopReason: "end_turn",
    };

    const model = new StagedModel({
      planner: [plan],
      generator: [gen, gen],
      evaluator: [fail, fail],
    });

    const tools = new ToolRegistry({ builtin: ["read_file"] });

    const result = await runThreeAgentPipeline({
      userId: "u1",
      userPrompt: "do it",
      model,
      sandbox,
      session,
      plannerTools: tools,
      generatorTools: tools,
      evaluatorTools: tools,
      maxIterations: 2,
    });

    expect(result.iterationsRun).toBe(2);
    expect(result.finalVerdict?.pass).toBe(false);
  });
});
