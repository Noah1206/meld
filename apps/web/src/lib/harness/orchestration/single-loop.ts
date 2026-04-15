// Single-loop orchestration strategy
//
// Exact behavioral replica of the legacy agent-run/route.ts loop:
//   - up to 50 rounds
//   - compress messages once the history exceeds 20 entries
//   - stop on end_turn or when the round budget is exhausted
//
// This is the Phase 1 default strategy. The 3-agent pipeline (Phase 2)
// replaces it with Planner/Generator/Evaluator-specific strategies.

import type {
  OrchestrationStrategy,
  OrchestrationState,
  NextStepDecision,
  RoundResult,
  Message,
} from "../types";
import { compressMessages } from "@/lib/agent/context/compress";

export interface SingleLoopOptions {
  maxRounds?: number;
  compressThreshold?: number;
}

export class SingleLoopStrategy implements OrchestrationStrategy {
  readonly id: string = "single-loop";
  private readonly maxRounds: number;
  private readonly compressThreshold: number;

  constructor(options: SingleLoopOptions = {}) {
    this.maxRounds = options.maxRounds ?? 50;
    this.compressThreshold = options.compressThreshold ?? 20;
  }

  initialState(init: { systemPrompt: string; userPrompt: string }): OrchestrationState {
    return {
      round: 0,
      messages: [{ role: "user", content: init.userPrompt }],
      tokensUsed: 0,
      scratch: {},
    };
  }

  nextStep(state: OrchestrationState, lastRound: RoundResult | null): NextStepDecision {
    if (state.round >= this.maxRounds) {
      return { type: "stop", reason: `max rounds (${this.maxRounds}) reached` };
    }

    if (lastRound && lastRound.response.stopReason === "end_turn") {
      return { type: "stop", reason: "end_turn" };
    }

    if (state.messages.length > this.compressThreshold) {
      return { type: "compress", reason: `history > ${this.compressThreshold}` };
    }

    return { type: "call_model" };
  }

  onRoundComplete(state: OrchestrationState, round: RoundResult): OrchestrationState {
    const nextMessages: Message[] = [...state.messages];

    // Assistant message from the model
    nextMessages.push({ role: "assistant", content: round.response.content });

    // Tool results — if there were any, send them back as a user message
    if (round.toolResults.length > 0) {
      nextMessages.push({
        role: "user",
        content: round.toolResults.map(r => ({
          type: "tool_result" as const,
          tool_use_id: r.callId,
          content: truncateForModel(r.result.text),
          is_error: r.result.isError,
        })),
      });
    }

    const usage = round.response.usage;
    const tokensUsed = state.tokensUsed + (usage ? usage.inputTokens + usage.outputTokens : 0);

    return {
      ...state,
      round: state.round + 1,
      messages: nextMessages,
      tokensUsed,
    };
  }

  compress(state: OrchestrationState): OrchestrationState {
    const compressed = compressMessages(state.messages);
    return { ...state, messages: compressed };
  }
}

// ─── Helpers ──────────────────────────────────────────

function truncateForModel(text: string): string {
  const MAX = 8000;
  if (text.length <= MAX) return text;
  return text.slice(0, MAX) + `\n...[truncated, ${text.length - MAX} chars omitted]`;
}

// compressMessages now imported from @/lib/agent/context/compress
// so the workspace single-loop and the harness orchestration share
// exactly one implementation.
