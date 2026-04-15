// Three-agent pipeline — Planner → Generator → Evaluator
//
// Runs three independent harness loops in sequence:
//   1. Planner  — turns a short user prompt into a SprintContract
//   2. Generator — builds the thing, consuming the contract as its brief
//   3. Evaluator — judges the live app, producing a verdict
//
// If the evaluator fails, the pipeline optionally loops: it feeds the
// verdict's issues back into the generator and re-runs steps 2+3 until
// either (a) the evaluator passes or (b) the retry budget is exhausted.
//
// All three stages write to the SAME session — events are tagged with
// "stage_started" / "stage_completed" markers so the UI can render a
// banner per phase.

import type {
  HarnessConfig,
  SessionStore,
  SessionHandle,
  HarnessEvent,
  ModelProvider,
  ToolProvider,
  SandboxProvider,
} from "../types";
import { runHarness } from "../harness";
import { PlannerStrategy, PLANNER_SYSTEM } from "../orchestration/planner";
import { GeneratorStrategy } from "../orchestration/generator";
import {
  EvaluatorStrategy,
  EVALUATOR_SYSTEM,
  type EvaluationVerdict,
} from "../orchestration/evaluator";
import {
  parseContract,
  contractToGeneratorBrief,
  contractToEvaluatorBrief,
  type SprintContract,
} from "../contract";

export interface ThreeAgentPipelineInput {
  userId: string;
  agentId?: string;
  userPrompt: string;

  // Shared infrastructure — used by all three stages
  model: ModelProvider;
  sandbox: SandboxProvider;
  session: SessionStore;

  // Per-stage tool providers. Usually:
  //   - planner: read-only (web_search, browse_url)
  //   - generator: full builtin set + MCP
  //   - evaluator: read-only + browse_url + Vision
  plannerTools: ToolProvider;
  generatorTools: ToolProvider;
  evaluatorTools: ToolProvider;

  systemPrompt?: string;
  sandboxConfig?: HarnessConfig["sandboxConfig"];
  maxTokens?: number;

  /** Max generator → evaluator iterations (default 2). */
  maxIterations?: number;

  /**
   * If set, append events to this existing session instead of creating a new
   * master session. Useful when the calling route wants to return the
   * sessionId synchronously before running the pipeline in the background.
   */
  existingSessionId?: string;
}

export interface ThreeAgentPipelineResult {
  sessionId: string;
  status: "completed" | "error" | "cancelled";
  contract: SprintContract | null;
  finalVerdict: EvaluationVerdict | null;
  iterationsRun: number;
  generatorSessionIds: string[];
  evaluatorSessionIds: string[];
  plannerSessionId: string | null;
  error?: string;
}

export async function runThreeAgentPipeline(
  input: ThreeAgentPipelineInput
): Promise<ThreeAgentPipelineResult> {
  const maxIterations = input.maxIterations ?? 2;
  const maxTokens = input.maxTokens ?? 16384;
  const sandboxConfig = input.sandboxConfig ?? {
    template: "meld-agent",
    timeoutMs: 30 * 60 * 1000,
  };
  const systemPrompt = input.systemPrompt ?? "";

  // ─── Master session ─────────────────────────────
  const masterSession = input.existingSessionId
    ? { id: input.existingSessionId, userId: input.userId, agentId: input.agentId }
    : await input.session.create({
        userId: input.userId,
        agentId: input.agentId,
        prompt: input.userPrompt,
      });

  const emit = (type: HarnessEvent["type"], payload: Record<string, unknown> = {}) => {
    return input.session.append(masterSession.id, {
      type,
      timestamp: Date.now(),
      ...payload,
    });
  };

  const result: ThreeAgentPipelineResult = {
    sessionId: masterSession.id,
    status: "completed",
    contract: null,
    finalVerdict: null,
    iterationsRun: 0,
    generatorSessionIds: [],
    evaluatorSessionIds: [],
    plannerSessionId: null,
  };

  try {
    // ─── Stage 1: Planner ──────────────────────────
    await emit("stage_started", { stage: "planner" });
    const plannerStrat = new PlannerStrategy();
    const plannerSystem = systemPrompt
      ? `${systemPrompt}\n\n---\n\n${PLANNER_SYSTEM}`
      : PLANNER_SYSTEM;
    const plannerConfig: HarnessConfig = {
      userId: input.userId,
      agentId: input.agentId,
      initialPrompt: input.userPrompt,
      systemPrompt: plannerSystem,
      maxTokens,
      sandboxConfig,
      model: input.model,
      tools: input.plannerTools,
      sandbox: input.sandbox,
      session: input.session,
      orchestration: plannerStrat,
    };

    const plannerRun = await runHarness(plannerConfig);
    result.plannerSessionId = plannerRun.sessionId;

    await forwardEvents(input.session, plannerRun.sessionId, masterSession.id, "planner");
    await emit("stage_completed", { stage: "planner", sessionId: plannerRun.sessionId });

    if (plannerRun.status !== "completed" || !plannerRun.finalMessage) {
      throw new Error(`Planner failed: ${plannerRun.error ?? "no spec produced"}`);
    }

    const contract = parseContract(plannerRun.finalMessage);
    result.contract = contract;
    await emit("plan_produced", {
      contract: {
        goal: contract.goal,
        stack: contract.stack,
        features: contract.features,
        criteria: contract.criteria,
        outOfScope: contract.outOfScope,
      },
    });

    // ─── Stage 2+3: Generator ⇄ Evaluator loop ───
    let iteration = 0;
    let feedback: string | null = null;

    while (iteration < maxIterations) {
      iteration++;
      result.iterationsRun = iteration;

      // ── Generator ──
      await emit("stage_started", { stage: "generator", iteration });

      const generatorPrompt = feedback
        ? `${contractToGeneratorBrief(contract)}\n\n---\n\n## Evaluator feedback from previous iteration\n${feedback}`
        : contractToGeneratorBrief(contract);

      const generatorStrat = new GeneratorStrategy({ maxRounds: 50 });
      const generatorSystem = systemPrompt
        ? `${systemPrompt}\n\nYou are the GENERATOR in a 3-agent harness. Build exactly what the task brief asks for.`
        : `You are the GENERATOR in a 3-agent harness. Build exactly what the task brief asks for.`;
      const generatorConfig: HarnessConfig = {
        userId: input.userId,
        agentId: input.agentId,
        initialPrompt: generatorPrompt,
        systemPrompt: generatorSystem,
        maxTokens,
        sandboxConfig,
        model: input.model,
        tools: input.generatorTools,
        sandbox: input.sandbox,
        session: input.session,
        orchestration: generatorStrat,
      };

      const generatorRun = await runHarness(generatorConfig);
      result.generatorSessionIds.push(generatorRun.sessionId);
      await forwardEvents(input.session, generatorRun.sessionId, masterSession.id, "generator");
      await emit("stage_completed", {
        stage: "generator",
        iteration,
        sessionId: generatorRun.sessionId,
      });

      if (generatorRun.status !== "completed") {
        throw new Error(`Generator failed: ${generatorRun.error ?? "unknown"}`);
      }

      // ── Peek at the generator session to extract dev server URL + file count ──
      const generatorSnapshot = await input.session.getSnapshot(generatorRun.sessionId);
      const devServerUrl = generatorSnapshot?.events
        .filter(e => e.type === "dev_server_detected")
        .map(e => e.url as string | undefined)
        .filter((u): u is string => typeof u === "string")
        .pop();
      const fileCount = generatorSnapshot?.events.filter(
        e => e.type === "file_write"
      ).length ?? 0;

      // ── Evaluator ──
      await emit("stage_started", { stage: "evaluator", iteration });

      const evaluatorStrat = new EvaluatorStrategy({ maxRounds: 10 });
      const evaluatorPrompt = contractToEvaluatorBrief(contract, {
        devServerUrl,
        fileCount,
      });

      const evaluatorSystem = systemPrompt
        ? `${systemPrompt}\n\n---\n\n${EVALUATOR_SYSTEM}`
        : EVALUATOR_SYSTEM;
      const evaluatorConfig: HarnessConfig = {
        userId: input.userId,
        agentId: input.agentId,
        initialPrompt: evaluatorPrompt,
        systemPrompt: evaluatorSystem,
        maxTokens,
        sandboxConfig,
        model: input.model,
        tools: input.evaluatorTools,
        sandbox: input.sandbox,
        session: input.session,
        orchestration: evaluatorStrat,
      };

      const evaluatorRun = await runHarness(evaluatorConfig);
      result.evaluatorSessionIds.push(evaluatorRun.sessionId);
      await forwardEvents(input.session, evaluatorRun.sessionId, masterSession.id, "evaluator");

      const evaluatorSnapshot = await input.session.getSnapshot(evaluatorRun.sessionId);
      const evaluatorState = evaluatorSnapshot?.events
        .filter(e => e.type === "message")
        .map(e => e.content as string)
        .join("\n\n") ?? "";
      const verdict = tryExtractVerdict(evaluatorRun.finalMessage ?? evaluatorState);

      await emit("evaluation_verdict", {
        iteration,
        verdict: verdict ?? { pass: false, reason: "could not parse verdict" },
      });
      await emit("stage_completed", {
        stage: "evaluator",
        iteration,
        sessionId: evaluatorRun.sessionId,
      });

      result.finalVerdict = verdict;

      if (verdict?.pass) {
        break;
      }

      // Build feedback string for next generator iteration
      feedback = verdict
        ? `Score ${verdict.score}/100. Issues:\n${verdict.issues.map(i => `- ${i}`).join("\n")}\n\nSummary: ${verdict.summary}`
        : "Evaluator could not produce a parseable verdict. Check your output carefully and try again.";
    }
  } catch (err) {
    result.status = "error";
    result.error = err instanceof Error ? err.message : String(err);
    await emit("error", { message: result.error });
  } finally {
    await input.session.markComplete(masterSession.id, result.status);
    await emit("done", { summary: result.status });
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────

/**
 * Copy all events from a stage session into the master session, tagged
 * with the stage name. This gives the UI a single unified event stream.
 */
async function forwardEvents(
  store: SessionStore,
  fromSessionId: string,
  toSessionId: string,
  stage: "planner" | "generator" | "evaluator"
): Promise<void> {
  if (fromSessionId === toSessionId) return;
  const events = await store.getEvents(fromSessionId);
  for (const ev of events) {
    await store.append(toSessionId, { ...ev, stage });
  }
}

function tryExtractVerdict(text: string | null | undefined): EvaluationVerdict | null {
  if (!text) return null;
  // Lazy-import to avoid a cycle — the evaluator module already exports
  // the parser, but we only need it here.
  // Re-implement minimally: grab last fenced json block.
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/g;
  const matches = [...text.matchAll(fenceRe)];
  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(matches[i][1].trim()) as Partial<EvaluationVerdict>;
      if (
        typeof parsed.pass === "boolean" &&
        typeof parsed.score === "number" &&
        Array.isArray(parsed.issues) &&
        typeof parsed.summary === "string"
      ) {
        return parsed as EvaluationVerdict;
      }
    } catch {
      // continue
    }
  }
  return null;
}

// Re-export convenience — consumers usually import them all together.
export type { SprintContract, EvaluationVerdict };
export { SessionHandle };
