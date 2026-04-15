// POST /api/harness/run — start a harness pipeline for an agent.
//
// Body: { agentId: string, prompt: string }
// Response: { sessionId: string }
//
// The pipeline runs in the background; the client polls
// /api/harness/run/events?session=... for progress.

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAgent } from "@/lib/harness/agent-definition";
import { buildHarnessConfig } from "@/lib/harness/wiring";
import { runHarness } from "@/lib/harness/harness";
import { runThreeAgentPipeline } from "@/lib/harness/pipeline/three-agent";
import { SupabaseSessionStore } from "@/lib/harness/session/supabase";
import { E2BSandboxProvider } from "@/lib/harness/sandbox/e2b";
import { ClaudeModelProvider } from "@/lib/harness/model/claude";
import { ToolRegistry } from "@/lib/harness/tools/registry";
import { CompositeToolProvider } from "@/lib/harness/tools/composite";

interface RunRequestBody {
  agentId: string;
  prompt: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: RunRequestBody;
  try {
    body = (await req.json()) as RunRequestBody;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.agentId || !body.prompt) {
    return Response.json({ error: "agentId and prompt are required" }, { status: 400 });
  }

  const agent = await getAgent(session.userId, body.agentId);
  if (!agent) {
    return Response.json({ error: "agent not found" }, { status: 404 });
  }

  // Pre-create the session so we can return its ID immediately.
  const sessionStore = new SupabaseSessionStore();
  const masterHandle = await sessionStore.create({
    userId: session.userId,
    agentId: agent.id,
    prompt: body.prompt,
  });

  // Kick off the pipeline without awaiting — runs in background.
  const userId = session.userId;
  const prompt = body.prompt;

  queueMicrotask(() => {
    void (async () => {
      try {
        if (agent.pipeline === "three-agent") {
          // Build three stage-specific tool providers sharing the same infra.
          const anthropicKey = requireEnv("ANTHROPIC_API_KEY");
          const e2bKey = requireEnv("E2B_API_KEY");
          const model = new ClaudeModelProvider({
            apiKey: anthropicKey,
            model: agent.modelId,
          });
          const sandbox = new E2BSandboxProvider({
            apiKey: e2bKey,
            defaultTemplate: agent.sandboxTemplate,
          });

          const plannerTools = new ToolRegistry({
            builtin: ["web_search", "browse_url"].filter(t =>
              agent.builtinToolIds.includes(t)
            ),
          });
          const generatorTools = new CompositeToolProvider({
            static: new ToolRegistry({ builtin: agent.builtinToolIds }),
            includeMCP: agent.mcpServerIds.length > 0,
          });
          const evaluatorTools = new ToolRegistry({
            builtin: ["read_file", "list_files", "browse_url"].filter(t =>
              agent.builtinToolIds.includes(t)
            ),
          });

          await runThreeAgentPipeline({
            userId,
            agentId: agent.id,
            userPrompt: prompt,
            model,
            sandbox,
            session: sessionStore,
            plannerTools,
            generatorTools,
            evaluatorTools,
            systemPrompt: agent.systemPrompt,
            sandboxConfig: {
              template: agent.sandboxTemplate,
              timeoutMs: agent.sandboxTimeoutMs,
            },
            maxTokens: agent.maxTokens,
            maxIterations: agent.orchestration.maxIterations ?? 2,
            existingSessionId: masterHandle.id,
          });
        } else {
          // single-loop
          const config = buildHarnessConfig(agent, {
            userId,
            prompt,
            sessionStore,
          });
          await runHarness(config, { sessionId: masterHandle.id });
        }
      } catch (err) {
        console.error("[harness/run] background error:", err);
        const message = err instanceof Error ? err.message : String(err);
        await sessionStore
          .append(masterHandle.id, { type: "error", timestamp: Date.now(), message })
          .catch(() => {});
        await sessionStore.markComplete(masterHandle.id, "error").catch(() => {});
      }
    })();
  });

  return Response.json({ sessionId: masterHandle.id, status: "started" });
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}
