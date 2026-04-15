// EvaluatorStrategy — the skeptical critic in the 3-agent pipeline.
//
// Called AFTER the Generator finishes. The Evaluator:
//   1. Receives the product spec + the list of files written + the dev
//      server URL if one is running.
//   2. Uses browse_url (Firecrawl + Vision) to view the live app.
//   3. Uses read_file / list_files to spot-check code.
//   4. Produces a verdict: { pass: boolean, issues: string[], score: number }
//
// Verdict is captured in state.scratch.verdict and surfaced via the
// "evaluation_verdict" event by the pipeline wrapper.

import type {
  OrchestrationState,
  NextStepDecision,
  RoundResult,
  Message,
} from "../types";
import { SingleLoopStrategy } from "./single-loop";

export interface EvaluatorOptions {
  maxRounds?: number;
}

export interface EvaluationVerdict {
  pass: boolean;
  score: number;         // 0-100
  issues: string[];
  summary: string;
}

export const EVALUATOR_SYSTEM = `You are the EVALUATOR in a 3-agent harness.

You receive: (1) the original product spec, (2) the files the generator wrote, (3) the dev server URL if one is live.

Your job is to judge — strictly — whether the generator's output satisfies the spec. Be skeptical. The generator is optimistic; you are not.

Process (do these IN ORDER):

1. **Static checks** — run these via \`run_command\` BEFORE looking at the live app. Each failure becomes an issue.
   a. Detect the package manager (look for pnpm-lock.yaml / yarn.lock / package-lock.json) and pick the right command.
   b. Run \`<pm> tsc --noEmit\` (or \`<pm> exec tsc --noEmit\`). If it errors, capture the first 5 errors verbatim into the issues list.
   c. Run \`<pm> run build\` (only if a "build" script exists in package.json — check first with \`run_command\` reading package.json). If the build fails, capture the failure summary into the issues list.
   d. If \`<pm> run lint\` exists, run it too. Lint errors become issues; lint warnings are NOT fatal.
2. **Visual + behavioral checks** — only after static checks pass (or in parallel for lower-priority static issues).
   a. Use \`browse_url\` to open the dev server URL and inspect the live app visually.
   b. Use \`read_file\` / \`list_files\` to spot-check the code structure.
   c. Check EACH item in the spec's "Completion criteria" section individually.
3. **Verdict** — produce your final verdict as a JSON object with EXACTLY this shape:

\`\`\`json
{
  "pass": boolean,
  "score": 0-100,
  "issues": ["concrete issue 1", "concrete issue 2", ...],
  "summary": "one paragraph"
}
\`\`\`

Rules:
- If typecheck OR build fails, pass MUST be false (no exceptions).
- If ANY completion criterion fails, set pass=false.
- Issues must be concrete and actionable (tell the generator exactly what to fix).
- Do NOT modify files. You are read-only.
- End your final message with the JSON block and stop.`;

export class EvaluatorStrategy extends SingleLoopStrategy {
  readonly id = "evaluator";

  constructor(options: EvaluatorOptions = {}) {
    // 16 rounds: ~3 for static checks (typecheck/build/lint), ~5 for
    // visual + file inspection, headroom for retries.
    super({ maxRounds: options.maxRounds ?? 16 });
  }

  override initialState(init: {
    systemPrompt: string;
    userPrompt: string;
  }): OrchestrationState {
    const mergedPrompt = init.systemPrompt
      ? `${init.systemPrompt}\n\n---\n\n${EVALUATOR_SYSTEM}`
      : EVALUATOR_SYSTEM;

    const messages: Message[] = [{ role: "user", content: init.userPrompt }];

    return {
      round: 0,
      messages,
      tokensUsed: 0,
      scratch: {
        systemPrompt: mergedPrompt,
        verdict: null,
      },
    };
  }

  override nextStep(state: OrchestrationState, lastRound: RoundResult | null): NextStepDecision {
    if (lastRound && lastRound.response.stopReason === "end_turn") {
      // Try to extract a verdict from the final text
      const text = lastRound.response.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map(b => b.text)
        .join("\n");
      const verdict = extractVerdict(text);
      if (verdict) {
        state.scratch.verdict = verdict;
      }
      return { type: "stop", reason: "verdict_produced" };
    }
    return super.nextStep(state, lastRound);
  }

  extractVerdict(state: OrchestrationState): EvaluationVerdict | null {
    return (state.scratch.verdict as EvaluationVerdict | null) ?? null;
  }

  extractSystemPrompt(state: OrchestrationState): string {
    return (state.scratch.systemPrompt as string | undefined) ?? EVALUATOR_SYSTEM;
  }
}

// ─── Verdict parsing ──────────────────────────────────

/** Find the last fenced JSON block in `text` and parse it as a verdict. */
export function extractVerdict(text: string): EvaluationVerdict | null {
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/g;
  const matches = [...text.matchAll(fenceRe)];
  for (let i = matches.length - 1; i >= 0; i--) {
    const raw = matches[i][1].trim();
    try {
      const parsed = JSON.parse(raw) as Partial<EvaluationVerdict>;
      if (
        typeof parsed.pass === "boolean" &&
        typeof parsed.score === "number" &&
        Array.isArray(parsed.issues) &&
        typeof parsed.summary === "string"
      ) {
        return parsed as EvaluationVerdict;
      }
    } catch {
      // try the next fence
    }
  }
  // Fallback: look for a bare JSON object at the very end.
  const tailMatch = text.match(/\{[\s\S]*\}\s*$/);
  if (tailMatch) {
    try {
      const parsed = JSON.parse(tailMatch[0]) as Partial<EvaluationVerdict>;
      if (
        typeof parsed.pass === "boolean" &&
        typeof parsed.score === "number" &&
        Array.isArray(parsed.issues) &&
        typeof parsed.summary === "string"
      ) {
        return parsed as EvaluationVerdict;
      }
    } catch {
      // ignore
    }
  }
  return null;
}
