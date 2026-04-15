// Sprint Contract — the shared "definition of done" between Planner,
// Generator, and Evaluator.
//
// Anthropic's harness blog post calls this a "sprint contract": the
// concrete, testable statements the generator is building toward and the
// evaluator will measure against. Extracting them into a typed object
// (instead of leaving them loose in a markdown blob) lets the harness:
//   - inject the same criteria into the generator's system prompt
//   - feed them line-by-line to the evaluator's verdict
//   - surface them in the UI as a live checklist

export interface SprintContract {
  goal: string;
  stack: string;
  features: string[];
  criteria: string[];
  outOfScope: string[];
  /** The original markdown plan — preserved for traceability. */
  rawSpec: string;
}

/**
 * Parse a Planner-produced markdown spec into a SprintContract.
 * Tolerant — missing sections become empty arrays, not errors.
 */
export function parseContract(markdown: string): SprintContract {
  const sections = splitSections(markdown);

  return {
    goal: (sections.goal ?? "").trim(),
    stack: (sections.targetstack ?? sections.stack ?? "").trim(),
    features: parseBullets(sections.features ?? ""),
    criteria: parseBullets(sections.completioncriteria ?? sections.criteria ?? ""),
    outOfScope: parseBullets(sections.outofscope ?? ""),
    rawSpec: markdown,
  };
}

/** Render a contract back into a concise brief for the generator. */
export function contractToGeneratorBrief(contract: SprintContract): string {
  const lines: string[] = [];
  lines.push(`# Your task`);
  lines.push("");
  lines.push(`## Goal`);
  lines.push(contract.goal || "(not specified)");
  lines.push("");
  lines.push(`## Stack`);
  lines.push(contract.stack || "(not specified)");
  lines.push("");
  if (contract.features.length > 0) {
    lines.push(`## Features to build`);
    contract.features.forEach(f => lines.push(`- ${f}`));
    lines.push("");
  }
  if (contract.criteria.length > 0) {
    lines.push(`## Completion criteria (the evaluator WILL check these)`);
    contract.criteria.forEach(c => lines.push(`- [ ] ${c}`));
    lines.push("");
  }
  if (contract.outOfScope.length > 0) {
    lines.push(`## Out of scope (do NOT build these)`);
    contract.outOfScope.forEach(o => lines.push(`- ${o}`));
    lines.push("");
  }
  lines.push(`Build each feature completely. No TODO comments. No placeholder code.`);
  lines.push(`When finished, start the dev server so the evaluator can inspect the live app.`);
  return lines.join("\n");
}

/** Render a contract as the evaluator's initial prompt. */
export function contractToEvaluatorBrief(
  contract: SprintContract,
  context: { devServerUrl?: string; fileCount?: number }
): string {
  const lines: string[] = [];
  lines.push(`# Evaluation task`);
  lines.push("");
  lines.push(`The generator has produced an implementation. Your job is to judge whether it meets the spec.`);
  lines.push("");
  lines.push(`## Spec`);
  lines.push(contract.rawSpec);
  lines.push("");
  lines.push(`## What's available to you`);
  if (context.devServerUrl) {
    lines.push(`- **Dev server (USE browse_url to open this)**: ${context.devServerUrl}`);
  } else {
    lines.push(`- No dev server detected. The generator may have failed to start one.`);
  }
  if (context.fileCount !== undefined) {
    lines.push(`- ${context.fileCount} files were written. Use list_files / read_file to inspect.`);
  }
  lines.push("");
  lines.push(`Go through each completion criterion, test it, and emit your verdict JSON at the end.`);
  return lines.join("\n");
}

// ─── Helpers ──────────────────────────────────────────

function splitSections(md: string): Record<string, string> {
  const result: Record<string, string> = {};
  const headingRe = /^#{1,6}\s+(.+?)\s*$/gm;
  const headings = [...md.matchAll(headingRe)];

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const key = normalizeKey(h[1]);
    const start = (h.index ?? 0) + h[0].length;
    const end = i + 1 < headings.length ? headings[i + 1].index ?? md.length : md.length;
    result[key] = md.slice(start, end).trim();
  }
  return result;
}

function normalizeKey(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseBullets(section: string): string[] {
  return section
    .split("\n")
    .map(line => line.replace(/^[-*]\s*\[[ x]\]\s*/, "").replace(/^[-*]\s*/, ""))
    .filter(line => line.trim().length > 0 && !line.match(/^#{1,6}\s/))
    .map(line => line.trim());
}
