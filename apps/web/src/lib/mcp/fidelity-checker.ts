// ─── Design Fidelity Checker (#2) ───────────────────
// Compares Figma design vs code implementation via MCP tool chaining.
// Figma MCP → design data/images + GitHub MCP → code analysis + Claude Vision → comparison
//
// This module itself is registered as an MCP tool, callable directly by AI.

import type { MCPTool, MCPToolResult, FidelityCheckResult, FidelityCheck } from "./types";
import { executeTool, isConnected, getClaudeTools } from "./registry";

// Tools provided by the Fidelity Checker
export function getFidelityTools(): MCPTool[] {
  return [
    {
      name: "fidelity_check",
      description: "Compare Figma design with current code implementation. Detects differences in color, spacing, typography, and layout.",
      inputSchema: {
        type: "object",
        properties: {
          figma_file_key: { type: "string", description: "Figma file key" },
          figma_node_id: { type: "string", description: "Figma node ID to compare" },
          code_file_path: { type: "string", description: "Code file path to compare" },
          github_owner: { type: "string", description: "GitHub repo owner" },
          github_repo: { type: "string", description: "GitHub repo name" },
        },
        required: ["figma_file_key", "figma_node_id"],
      },
    },
    {
      name: "fidelity_extract_design_spec",
      description: "Extract design specs (colors, sizes, spacing, fonts, etc.) from Figma nodes for implementation.",
      inputSchema: {
        type: "object",
        properties: {
          figma_file_key: { type: "string", description: "Figma file key" },
          figma_node_ids: { type: "array", description: "List of node IDs", items: { type: "string" } },
        },
        required: ["figma_file_key", "figma_node_ids"],
      },
    },
  ];
}

// Execute fidelity tool
export async function executeFidelityTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<MCPToolResult> {
  switch (toolName) {
    case "fidelity_check":
      return runFidelityCheck(userId, args);
    case "fidelity_extract_design_spec":
      return extractDesignSpec(userId, args);
    default:
      return { content: [{ type: "text", text: `Unknown fidelity tool: ${toolName}` }], isError: true };
  }
}

// ─── Run fidelity check ─────────────────────────────
async function runFidelityCheck(
  userId: string,
  args: Record<string, unknown>,
): Promise<MCPToolResult> {
  const fileKey = args.figma_file_key as string;
  const nodeId = args.figma_node_id as string;
  const codePath = args.code_file_path as string | undefined;
  const owner = args.github_owner as string | undefined;
  const repo = args.github_repo as string | undefined;

  const checks: FidelityCheck[] = [];
  let figmaImageUrl: string | undefined;

  // Step 1: Fetch node data from Figma
  if (!isConnected(userId, "figma")) {
    return { content: [{ type: "text", text: "Figma MCP is not connected. Connect Figma for fidelity checks." }], isError: true };
  }

  const nodeResult = await executeTool(userId, "figma_get_nodes", {
    file_key: fileKey, node_ids: [nodeId],
  });

  // Step 2: Render Figma image
  const imageResult = await executeTool(userId, "figma_get_images", {
    file_key: fileKey, node_ids: [nodeId], format: "png",
  });
  if (!imageResult.isError) {
    try {
      const images = JSON.parse(imageResult.content[0]?.text ?? "{}");
      figmaImageUrl = images[nodeId] ?? Object.values(images)[0] as string;
    } catch { /* ignore */ }
  }

  // Step 3: Extract design specs from node data
  if (!nodeResult.isError) {
    try {
      const nodeData = JSON.parse(nodeResult.content[0]?.text ?? "{}");
      extractChecksFromNode(nodeData, checks);
    } catch { /* ignore */ }
  }

  // Step 4: Fetch code from GitHub and compare
  if (codePath && owner && repo && isConnected(userId, "github")) {
    const codeResult = await executeTool(userId, "github_get_file", {
      owner, repo, path: codePath,
    });
    if (!codeResult.isError) {
      try {
        const codeData = JSON.parse(codeResult.content[0]?.text ?? "{}");
        compareCodeWithDesign(codeData.content as string, checks);
      } catch { /* ignore */ }
    }
  }

  const matchCount = checks.filter((c) => c.match).length;
  const overall = checks.length > 0 ? Math.round((matchCount / checks.length) * 100) : 0;

  const result: FidelityCheckResult = {
    overall,
    checks,
    figmaImageUrl,
  };

  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2),
    }],
  };
}

// ─── Extract design spec ──────────────────────────────
async function extractDesignSpec(
  userId: string,
  args: Record<string, unknown>,
): Promise<MCPToolResult> {
  const fileKey = args.figma_file_key as string;
  const nodeIds = args.figma_node_ids as string[];

  if (!isConnected(userId, "figma")) {
    return { content: [{ type: "text", text: "Figma MCP is not connected." }], isError: true };
  }

  const nodeResult = await executeTool(userId, "figma_get_nodes", {
    file_key: fileKey, node_ids: nodeIds,
  });

  if (nodeResult.isError) return nodeResult;

  try {
    const rawData = JSON.parse(nodeResult.content[0]?.text ?? "{}");
    const specs: Record<string, unknown>[] = [];

    function extractSpec(node: Record<string, unknown>): Record<string, unknown> {
      const spec: Record<string, unknown> = {
        name: node.name,
        type: node.type,
      };

      const bbox = node.absoluteBoundingBox as Record<string, number> | undefined;
      if (bbox) {
        spec.size = { width: bbox.width, height: bbox.height };
      }

      const fills = node.fills as Array<Record<string, unknown>> | undefined;
      if (fills?.length) {
        spec.fills = fills.map((f) => {
          const color = f.color as Record<string, number> | undefined;
          if (color) {
            return {
              type: f.type,
              color: `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},${(color.a ?? 1).toFixed(2)})`,
              hex: `#${Math.round(color.r * 255).toString(16).padStart(2, "0")}${Math.round(color.g * 255).toString(16).padStart(2, "0")}${Math.round(color.b * 255).toString(16).padStart(2, "0")}`,
            };
          }
          return { type: f.type };
        });
      }

      if (node.cornerRadius) spec.borderRadius = node.cornerRadius;
      if (node.opacity !== undefined && node.opacity !== 1) spec.opacity = node.opacity;
      if (node.paddingLeft || node.paddingTop) {
        spec.padding = {
          top: node.paddingTop, right: node.paddingRight,
          bottom: node.paddingBottom, left: node.paddingLeft,
        };
      }
      if (node.itemSpacing) spec.gap = node.itemSpacing;
      if (node.layoutMode) spec.flexDirection = node.layoutMode === "HORIZONTAL" ? "row" : "column";

      const style = node.style as Record<string, unknown> | undefined;
      if (style) {
        spec.typography = {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeightPx,
          letterSpacing: style.letterSpacing,
        };
      }

      if (node.characters) spec.text = node.characters;

      return spec;
    }

    function walkAndExtract(obj: unknown) {
      if (!obj || typeof obj !== "object") return;
      if ("name" in (obj as Record<string, unknown>)) {
        specs.push(extractSpec(obj as Record<string, unknown>));
      }
      const children = (obj as Record<string, unknown>).children as unknown[] | undefined;
      if (children) for (const c of children) walkAndExtract(c);
      // Handle nodes map (Figma /nodes API response format)
      const nodes = (obj as Record<string, unknown>).nodes as Record<string, unknown> | undefined;
      if (nodes) for (const v of Object.values(nodes)) walkAndExtract(v);
      const doc = (obj as Record<string, unknown>).document as unknown;
      if (doc) walkAndExtract(doc);
    }

    walkAndExtract(rawData);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ specs, nodeCount: specs.length }, null, 2),
      }],
    };
  } catch {
    return nodeResult;
  }
}

// ─── Helper: extract check items from node ─────────────────
function extractChecksFromNode(nodeData: unknown, checks: FidelityCheck[]) {
  function walk(obj: unknown) {
    if (!obj || typeof obj !== "object") return;
    const node = obj as Record<string, unknown>;

    // Color checks
    const fills = node.fills as Array<Record<string, unknown>> | undefined;
    if (fills?.length) {
      for (const f of fills) {
        const color = f.color as Record<string, number> | undefined;
        if (color) {
          const hex = `#${Math.round(color.r * 255).toString(16).padStart(2, "0")}${Math.round(color.g * 255).toString(16).padStart(2, "0")}${Math.round(color.b * 255).toString(16).padStart(2, "0")}`;
          checks.push({
            category: "color",
            element: (node.name as string) ?? "unknown",
            expected: hex,
            actual: "needs inspection",
            match: false,
            severity: "warning",
          });
        }
      }
    }

    // Typography checks
    const style = node.style as Record<string, unknown> | undefined;
    if (style?.fontFamily) {
      checks.push({
        category: "typography",
        element: (node.name as string) ?? "unknown",
        expected: `${style.fontFamily} ${style.fontSize}px/${style.fontWeight}`,
        actual: "needs inspection",
        match: false,
        severity: "warning",
      });
    }

    // Size checks
    const bbox = node.absoluteBoundingBox as Record<string, number> | undefined;
    if (bbox) {
      checks.push({
        category: "size",
        element: (node.name as string) ?? "unknown",
        expected: `${Math.round(bbox.width)}×${Math.round(bbox.height)}px`,
        actual: "needs inspection",
        match: false,
        severity: "info",
      });
    }

    // Spacing checks
    if (node.paddingLeft || node.paddingTop) {
      checks.push({
        category: "spacing",
        element: (node.name as string) ?? "unknown",
        expected: `padding: ${node.paddingTop ?? 0} ${node.paddingRight ?? 0} ${node.paddingBottom ?? 0} ${node.paddingLeft ?? 0}`,
        actual: "needs inspection",
        match: false,
        severity: "warning",
      });
    }

    // Recurse
    const children = node.children as unknown[] | undefined;
    if (children) for (const c of children) walk(c);
    const nodes = node.nodes as Record<string, unknown> | undefined;
    if (nodes) for (const v of Object.values(nodes)) walk(v);
    const doc = node.document as unknown;
    if (doc) walk(doc);
  }

  walk(nodeData);
}

// ─── Helper: compare design values against code ─────────────────
function compareCodeWithDesign(code: string, checks: FidelityCheck[]) {
  for (const check of checks) {
    if (check.category === "color") {
      // Search for the color in code (hex, rgb, tailwind class, etc.)
      const hex = check.expected.toLowerCase();
      if (code.toLowerCase().includes(hex)) {
        check.actual = hex;
        check.match = true;
      } else {
        // Attempt to infer from Tailwind classes
        const tailwindMatch = code.match(/(?:bg|text|border)-\[([#\w]+)\]/g);
        if (tailwindMatch) {
          for (const m of tailwindMatch) {
            const colorVal = m.match(/\[([^\]]+)\]/)?.[1];
            if (colorVal?.toLowerCase() === hex) {
              check.actual = colorVal;
              check.match = true;
              break;
            }
          }
        }
        if (!check.match) {
          check.actual = "Color not found in code";
          check.severity = "critical";
        }
      }
    }

    if (check.category === "typography") {
      const fontMatch = check.expected.match(/^(\S+)\s+(\d+)px/);
      if (fontMatch) {
        const fontSize = fontMatch[2];
        if (code.includes(`text-[${fontSize}px]`) || code.includes(`fontSize: ${fontSize}`) || code.includes(`font-size: ${fontSize}px`)) {
          check.match = true;
          check.actual = `${fontSize}px found`;
        } else {
          check.actual = "Font size mismatch possible";
        }
      }
    }
  }
}
