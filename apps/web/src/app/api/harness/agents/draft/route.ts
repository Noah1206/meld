// POST /api/harness/agents/draft
//
// Conversational agent builder. The client sends the running chat history
// plus the current draft; we ask Claude to (a) respond in natural language
// and (b) return an updated AgentDefinitionDraft. When the user is happy
// they POST to /api/harness/agents with the final draft.

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  DEFAULT_BUILTIN_TOOLS,
  type AgentDefinitionDraft,
} from "@/lib/harness/agent-definition";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface DraftRequestBody {
  messages: ChatMessage[];
  currentDraft?: AgentDefinitionDraft;
}

interface DraftResponseBody {
  reply: string;
  draft: AgentDefinitionDraft;
  ready: boolean;
}

const SYSTEM_PROMPT = `You are the Meld agent-builder assistant. The user wants to create a new harness agent through a short chat. Your job: ask 1-2 clarifying questions if needed, then output a complete AgentDefinitionDraft as JSON.

Return format — every single turn, your entire reply MUST be:

<reply>
...short natural-language reply to the user (1-5 sentences, Korean if the user writes Korean)...
</reply>

<draft>
{
  "name": "...",
  "description": "...",
  "pipeline": "single-loop" | "three-agent",
  "systemPrompt": "...",
  "modelId": "claude-sonnet-4-6-20250514",
  "maxTokens": 16384,
  "builtinToolIds": ["read_file", "write_file", ...],
  "mcpServerIds": [],
  "sandboxTemplate": "meld-agent",
  "sandboxTimeoutMs": 1800000,
  "orchestration": { "maxRounds": 50, "maxIterations": 2 }
}
</draft>

<ready>true</ready>  or  <ready>false</ready>

Rules:
- The <draft> block must always be valid JSON, even if some fields are placeholder. Start with sensible defaults and refine based on conversation.
- Available built-in tool IDs: ${DEFAULT_BUILTIN_TOOLS.join(", ")}.
- Available MCP server IDs: github, vercel, supabase, linear, notion, slack, canva, figma.
- Prefer "three-agent" pipeline for quality-critical work, "single-loop" for quick prototyping.
- systemPrompt should be concrete and specific to the agent's purpose.
- Set <ready>true</ready> ONLY when name, description, pipeline, systemPrompt are all filled and the user has not asked for further changes.
- Never invent tools that are not in the list above. Never return markdown code fences inside <draft>.`;

function defaultDraft(): AgentDefinitionDraft {
  return {
    name: "",
    description: "",
    pipeline: "three-agent",
    systemPrompt: "",
    modelId: "claude-sonnet-4-6-20250514",
    maxTokens: 16384,
    builtinToolIds: DEFAULT_BUILTIN_TOOLS,
    mcpServerIds: [],
    sandboxTemplate: "meld-agent",
    sandboxTimeoutMs: 30 * 60 * 1000,
    orchestration: { maxRounds: 50, maxIterations: 2 },
  };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: DraftRequestBody;
  try {
    body = (await req.json()) as DraftRequestBody;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY missing" }, { status: 503 });
  }

  // Build Claude messages. We embed the current draft as a prefix on the
  // first user message so the model always sees the latest state.
  const draftContext = body.currentDraft
    ? `Current draft state (update or keep as needed):\n<current_draft>\n${JSON.stringify(body.currentDraft, null, 2)}\n</current_draft>\n\n`
    : "";

  const claudeMessages = body.messages.map((m, i) => ({
    role: m.role,
    content: i === 0 && m.role === "user" ? `${draftContext}${m.content}` : m.content,
  }));

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20250514",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: claudeMessages,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: `Claude API error: ${res.status} ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    const fullText = data.content
      .filter(c => c.type === "text")
      .map(c => c.text ?? "")
      .join("\n");

    const parsed = parseDraftResponse(fullText, body.currentDraft ?? defaultDraft());
    const response: DraftResponseBody = parsed;
    return Response.json(response);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

// ─── Parser ────────────────────────────────────────
function parseDraftResponse(
  text: string,
  fallbackDraft: AgentDefinitionDraft
): DraftResponseBody {
  const replyMatch = text.match(/<reply>([\s\S]*?)<\/reply>/i);
  const draftMatch = text.match(/<draft>([\s\S]*?)<\/draft>/i);
  const readyMatch = text.match(/<ready>\s*(true|false)\s*<\/ready>/i);

  const reply = replyMatch?.[1]?.trim() ?? text.trim();

  let draft: AgentDefinitionDraft = fallbackDraft;
  if (draftMatch?.[1]) {
    try {
      const parsed = JSON.parse(draftMatch[1].trim()) as Partial<AgentDefinitionDraft>;
      draft = { ...fallbackDraft, ...parsed };
    } catch {
      // keep fallback
    }
  }

  const ready = readyMatch?.[1]?.toLowerCase() === "true";

  return { reply, draft, ready };
}
