// GeneratorStrategy — the "Generator" role in the Planner/Generator/Evaluator
// harness. Behaviorally identical to SingleLoopStrategy, but:
//   1. Reserves a "feedback" slot in state.scratch for evaluator critiques.
//   2. Injects evaluator feedback (if present) as a fresh user message at
//      the start of each round.
//   3. Tracks whether it is running in a follow-up iteration (after an
//      evaluator rejection) so the harness can stop if it keeps failing.

import type {
  OrchestrationState,
  NextStepDecision,
  RoundResult,
  Message,
} from "../types";
import { SingleLoopStrategy, SingleLoopOptions } from "./single-loop";

export interface GeneratorOptions extends SingleLoopOptions {
  /** Max times the generator will accept evaluator feedback and retry. */
  maxRetries?: number;
}

export class GeneratorStrategy extends SingleLoopStrategy {
  readonly id = "generator";
  private readonly maxRetries: number;

  constructor(options: GeneratorOptions = {}) {
    super(options);
    this.maxRetries = options.maxRetries ?? 3;
  }

  override initialState(init: {
    systemPrompt: string;
    userPrompt: string;
  }): OrchestrationState {
    const base = super.initialState(init);
    base.scratch.feedback = [];
    base.scratch.retries = 0;
    return base;
  }

  /**
   * Inject an evaluator critique into the generator's message history.
   * Call this between pipeline iterations (not from inside the loop).
   */
  acceptFeedback(state: OrchestrationState, feedback: string): OrchestrationState {
    const history = (state.scratch.feedback as string[] | undefined) ?? [];
    const retries = ((state.scratch.retries as number | undefined) ?? 0) + 1;
    const feedbackMessage: Message = {
      role: "user",
      content:
        `The evaluator reviewed your previous attempt and reported issues:\n\n${feedback}\n\n` +
        `Address each point and continue.`,
    };
    return {
      ...state,
      messages: [...state.messages, feedbackMessage],
      scratch: {
        ...state.scratch,
        feedback: [...history, feedback],
        retries,
      },
    };
  }

  override nextStep(state: OrchestrationState, lastRound: RoundResult | null): NextStepDecision {
    const retries = (state.scratch.retries as number | undefined) ?? 0;
    if (retries > this.maxRetries) {
      return { type: "stop", reason: `max retries (${this.maxRetries}) exhausted` };
    }
    return super.nextStep(state, lastRound);
  }
}
