import { createAdminClient } from "@/lib/supabase/admin";

// --- Auto Tag Extraction ---

const TAG_PATTERNS: [RegExp, string][] = [
  [/tailwind|className|class=/i, "tailwind"],
  [/useState|useEffect|useRef|hook/i, "react-hooks"],
  [/component/i, "component"],
  [/layout|flex|grid/i, "layout"],
  [/color|background|bg-/i, "styling"],
  [/animation|transition|animate/i, "animation"],
  [/api|fetch|axios/i, "api"],
  [/form|input|submit/i, "form"],
  [/responsive|mobile|tablet/i, "responsive"],
  [/accessibility|aria-|a11y/i, "accessibility"],
  [/typescript|type |interface /i, "typescript"],
  [/refactor|extract/i, "refactoring"],
  [/test|jest|vitest/i, "testing"],
  [/next\/image|next\/link|next/i, "nextjs"],
  [/shadcn|radix/i, "shadcn"],
];

function autoTag(instruction: string, output: string): string[] {
  const combined = `${instruction} ${output}`;
  const tags: string[] = [];

  for (const [pattern, tag] of TAG_PATTERNS) {
    if (pattern.test(combined)) {
      tags.push(tag);
    }
  }

  return tags;
}

// --- Training Data Collection ---

export interface TrainingDataInput {
  userId: string;
  instruction: string;
  inputContext: string;
  output: string;
  modelUsed: string;
  elementHistory?: unknown[];
  designSystemMd?: string;
  framework?: string;
  filePath?: string;
}

/**
 * Fire-and-forget: saves training data to Supabase.
 * Do not await after calling to avoid blocking the response.
 */
export async function collectTrainingData(
  data: TrainingDataInput
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const tags = autoTag(data.instruction, data.output);

    await supabase.from("training_data").insert({
      user_id: data.userId,
      instruction: data.instruction,
      input_context: data.inputContext,
      output: data.output,
      model_used: data.modelUsed,
      element_history: data.elementHistory
        ? JSON.stringify(data.elementHistory)
        : null,
      design_system_md: data.designSystemMd ?? null,
      framework: data.framework ?? null,
      file_path: data.filePath ?? null,
      tags: tags.length > 0 ? tags : null,
    });
  } catch (err) {
    // Training data save failure does not affect the response
    console.error("[training-collector] save failed:", err);
  }
}
