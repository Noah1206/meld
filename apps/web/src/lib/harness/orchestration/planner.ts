// PlannerStrategy — expands a short user prompt into a full product spec
// before any code is written.
//
// Planner constraints:
//   - Read-only tools (web_search, browse_url) are optional.
//   - No file writes, no shell commands, no sandbox mutation.
//   - Single-turn when possible: expand the prompt, return a spec, stop.
//
// The spec is captured as a plain text markdown block and surfaced via
// the "plan_produced" event so the pipeline can hand it to the generator.

import type {
  OrchestrationState,
  NextStepDecision,
  RoundResult,
  Message,
} from "../types";
import { SingleLoopStrategy } from "./single-loop";

export interface PlannerOptions {
  /** How many rounds the planner may take (default: 3). */
  maxRounds?: number;
}

export const PLANNER_SYSTEM = `You are the PLANNER in a 3-agent harness.

Your job is to take a short user request and expand it into a detailed product specification BEFORE any code is written. Follow this structure:

# Product spec

## Goal
(1-2 sentence restatement of what the user wants)

## Target stack
(recommended framework, language, notable libraries — be concrete)

## Features
- Feature 1 (user story)
- Feature 2
- ...

## Completion criteria
(Concrete, testable statements. The evaluator will check each of these.)
- [ ] The app starts without errors
- [ ] ...

## Out of scope
(What you are deliberately NOT building)

Rules:
- Be concrete. No "implement authentication" — say "email + password signup with bcrypt".
- No code in the plan. Only the spec.
- Stop after one spec. Do not ask for confirmation.
- Use web_search or browse_url ONLY if you need a fact you don't already know.`;

export class PlannerStrategy extends SingleLoopStrategy {
  readonly id = "planner";

  constructor(options: PlannerOptions = {}) {
    super({ maxRounds: options.maxRounds ?? 3 });
  }

  override initialState(init: { systemPrompt: string; userPrompt: string }): OrchestrationState {
    // The planner has its own system prompt — but we keep `init.systemPrompt`
    // as a prefix so callers can still layer extra constraints.
    const mergedPrompt = init.systemPrompt
      ? `${init.systemPrompt}\n\n---\n\n${PLANNER_SYSTEM}`
      : PLANNER_SYSTEM;

    const messages: Message[] = [
      { role: "user", content: `Expand this request into a product spec:\n\n${init.userPrompt}` },
    ];

    return {
      round: 0,
      messages,
      tokensUsed: 0,
      scratch: {
        systemPrompt: mergedPrompt,
        spec: null,
      },
    };
  }

  override nextStep(state: OrchestrationState, lastRound: RoundResult | null): NextStepDecision {
    // If the model produced a text response with spec content, capture it.
    if (lastRound) {
      const textBlocks = lastRound.response.content.filter(
        (b): b is { type: "text"; text: string } => b.type === "text"
      );
      if (textBlocks.length > 0 && lastRound.response.stopReason === "end_turn") {
        const spec = textBlocks.map(b => b.text).join("\n\n");
        state.scratch.spec = spec;
        return { type: "stop", reason: "spec_produced" };
      }
    }
    return super.nextStep(state, lastRound);
  }

  /** Read the captured spec out of a finished state. */
  extractSpec(state: OrchestrationState): string | null {
    return (state.scratch.spec as string | null) ?? null;
  }

  /** Read the merged system prompt the harness should send to the model. */
  extractSystemPrompt(state: OrchestrationState): string {
    return (state.scratch.systemPrompt as string | undefined) ?? PLANNER_SYSTEM;
  }
}
