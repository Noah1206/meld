import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

// ─── Server-Side Agent Loop with SSE Streaming ──────────
// Runs the full agent loop on the server and streams events to the browser.
// This is for web mode (no local agent / no EC2).

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  // Allow unauthenticated in development
  if (!session && process.env.NODE_ENV === "production") {
    return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "API key not configured" }), { status: 503 });
  }

  const body = await req.json();
  const { command, context } = body;

  if (!command) {
    return new Response(JSON.stringify({ error: "command is required" }), { status: 400 });
  }

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        // ─── Simplified server-side agent loop ───
        // Full loop would need file system access (EC2).
        // This is a "thinking stream" that shows the AI's reasoning process.

        send({ type: "thinking", content: "Understanding your request..." });

        // Build system prompt (compact version)
        const systemPrompt = buildCompactSystemPrompt(context);

        send({ type: "thinking", content: "Planning approach..." });

        // First Claude call — planning/reasoning
        const planResponse = await callClaude(systemPrompt, command, ANTHROPIC_API_KEY);

        if (planResponse.thinking) {
          // Stream thinking in chunks
          const thoughts = planResponse.thinking.split(". ");
          for (let i = 0; i < thoughts.length; i++) {
            send({ type: "thinking", content: thoughts.slice(0, i + 1).join(". ") });
            await sleep(100);
          }
        }

        send({ type: "thinking", content: "Generating response..." });

        // Extract text response
        const textBlocks = planResponse.content?.filter((b: { type: string }) => b.type === "text") || [];
        const responseText = textBlocks.map((b: { text: string }) => b.text).join("\n");

        // Check if AI wants to use tools
        const toolBlocks = planResponse.content?.filter((b: { type: string }) => b.type === "tool_use") || [];

        if (toolBlocks.length > 0) {
          for (const tool of toolBlocks) {
            send({ type: "tool_call", toolName: tool.name, input: tool.input });
            await sleep(200);

            // For web mode, we can only simulate tool results
            // Real tool execution needs EC2/local agent
            send({ type: "tool_result", toolName: tool.name, result: `[Web mode] Tool "${tool.name}" requires a connected project. Use local agent or EC2 for full autonomy.` });
          }
        }

        if (responseText) {
          send({ type: "message", content: responseText });
        }

        send({ type: "done", summary: responseText?.slice(0, 200) || "Completed" });

      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// ─── Helpers ───

function buildCompactSystemPrompt(context?: Record<string, unknown>): string {
  let prompt = `You are Meld AI, a fully autonomous coding agent.
CORE: PLAN → BUILD → VERIFY → FIX → DELIVER.
Always verify via browser. Self-heal errors. Never deliver unverified code.
Match user's language.`;

  if (context?.framework) prompt += `\nFramework: ${context.framework}`;
  if (context?.category) prompt += `\nCategory: ${context.category}`;

  return prompt;
}

async function callClaude(system: string, message: string, apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 4096,
      system: [{ type: "text", text: system }],
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${err}`);
  }

  return res.json();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
