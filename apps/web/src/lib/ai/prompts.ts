export function buildCodeEditPrompt(
  figmaNodeName: string,
  figmaNodeType: string,
  userCommand: string,
  currentCode: string,
  filePath: string,
  context?: {
    framework?: string;
    dependencies?: string[];
    projectStructure?: string;
    siblingFiles?: string[];
    designSystemMd?: string;
  }
): { system: string; user: string } {
  let systemExtra = "";

  if (context?.framework && context.framework !== "unknown") {
    systemExtra += `\nThis project uses ${context.framework}.`;
    systemExtra += getFrameworkGuidelines(context.framework, context.dependencies);
  }
  if (context?.dependencies?.length) {
    systemExtra += `\nAvailable libraries: ${context.dependencies.join(", ")}`;
  }
  if (context?.projectStructure) {
    systemExtra += `\nProject structure:\n${context.projectStructure}`;
  }
  if (context?.siblingFiles?.length) {
    systemExtra += `\nFiles in same directory: ${context.siblingFiles.join(", ")}`;
  }
  if (context?.designSystemMd) {
    systemExtra += `\n\n--- DESIGN SYSTEM ---\nYou must follow this design system strictly. All style values (colors, fonts, spacing) must come from this system.\n\n${context.designSystemMd}\n--- END DESIGN SYSTEM ---`;
  }

  const system = `You are Meld AI, an expert at modifying existing code based on user instructions and design specifications.
${systemExtra}
You must respond ONLY with the following JSON format (no other text):
{
  "filePath": "${filePath}",
  "original": "code before (changed part only)",
  "modified": "code after (changed part only)",
  "explanation": "brief explanation of changes"
}`;

  const user = `Figma node: "${figmaNodeName}" (${figmaNodeType})
File: ${filePath}

Current code:
\`\`\`
${currentCode}
\`\`\`

User command: ${userCommand}`;

  return { system, user };
}

function getFrameworkGuidelines(
  framework: string,
  deps?: string[],
): string {
  const hasDep = (name: string) => deps?.some((d) => d === name || d.startsWith(name + "/"));
  let guide = "";

  switch (framework) {
    case "Next.js":
      guide += `
[Next.js Guidelines]
- Server Components by default with App Router. Add "use client" only when using client hooks/events.
- Use next/image for images, next/link for navigation.
- Use "use server" for server actions.`;
      break;
    case "React":
      guide += `
[React Guidelines]
- Use functional components with hooks.
- State: useState/useReducer. Effects: useEffect.
- Follow single responsibility principle.`;
      break;
    case "Vue":
      guide += `
[Vue Guidelines]
- Use Composition API with <script setup>.
- State: ref()/reactive(). Type-safe props: defineProps/defineEmits.`;
      break;
    case "Angular":
      guide += `
[Angular Guidelines]
- Prefer standalone components with decorators.
- Services: Injectable + providedIn: 'root'.
- Prefer Reactive Forms over Template-driven.`;
      break;
    case "Svelte":
      guide += `
[Svelte Guidelines]
- Use $: for reactive declarations.
- Component props: export let.
- Stores: writable/readable.`;
      break;
  }

  if (hasDep("tailwindcss")) {
    guide += `\n- Tailwind CSS: Use utility classes, avoid inline styles.`;
  }
  if (hasDep("@shadcn") || hasDep("shadcn")) {
    guide += `\n- shadcn/ui: Reuse existing UI components (Button, Card, Dialog, etc.).`;
  }
  if (hasDep("@radix-ui")) {
    guide += `\n- Radix UI: Use accessibility-first primitives.`;
  }

  return guide;
}
