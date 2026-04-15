import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "e2b";
import { getSession } from "@/lib/auth/session";
import { pushEvent, markComplete } from "./events/route";
import { compressMessages } from "@/lib/agent/context/compress";
import {
  summarizeHistory,
  collapseReadFileCards,
  DEFAULT_SUMMARY_CONFIG,
} from "@/lib/agent/context/summarize";
import {
  truncateCommandOutput,
  truncateFileContent,
  truncateBrowseResult,
  truncateListFiles,
} from "@/lib/agent/truncate";
import { stashToSandbox, STASH_THRESHOLD_CHARS } from "@/lib/agent/external-memory";
import {
  classifyMode,
  appendTrace,
  DEFAULT_MODE,
  type AgentMode,
  type ToolTraceEntry,
} from "@/lib/agent/tools/modes";
import { BUILTIN_TOOLS_WITH_MCP_REQUEST } from "@/lib/agent/tools/schemas";

/** Natural-language nudges injected when the agent's mode changes.
 *  Fed to Claude as a text block appended to the most recent user
 *  message so the tools-array prefix (cached) is never mutated. */
const MODE_NUDGE: Record<AgentMode, string> = {
  implement: "Continue writing files and running commands to finish the plan.",
  explore: "You're in exploration mode. Favor read_file, list_files, search_files, and web_search. Avoid writes until you have enough context.",
  verify: "You're verifying the build. Focus on run_command for tests/lint/typecheck and read_file to inspect outputs. No speculative edits.",
  browse: "You're gathering external information. Use browse_url and web_search. Avoid file writes unless the task demands them.",
  debug: "You hit errors. Re-run failing commands, read related files, search for similar issues online. Isolate the root cause before editing.",
};
import {
  getConnectedServers,
  getClaudeTools,
  executeTool as executeMCPTool,
} from "@/lib/mcp/registry";

// ─── Server-Side Agent Loop with E2B ──────────
// POST starts the agent. GET /events?session=xxx polls for events.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const E2B_API_KEY = process.env.E2B_API_KEY;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API keys not configured" }, { status: 503 });
  }
  if (!E2B_API_KEY) {
    return NextResponse.json({ error: "E2B API key not configured" }, { status: 503 });
  }

  const { command, context } = await req.json();
  if (!command) {
    return NextResponse.json({ error: "command required" }, { status: 400 });
  }

  // Verify the caller's session server-side. We NEVER trust a
  // client-supplied userId for credential lookups — the auto-connect
  // path only runs for the authenticated user behind this cookie.
  // Anonymous callers still get the agent, they just don't get the
  // zero-friction MCP reconnect.
  const session = await getSession();
  const verifiedUserId = session?.userId;

  const sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Start agent loop in background (non-blocking). `verifiedUserId`
  // is forwarded so the request_mcp tool can auto-reconnect against
  // previously-stored tokens without bothering the user.
  runAgentLoop(sessionId, command, context, verifiedUserId).catch((err) => {
    console.error("[agent-run] Loop error:", err);
    pushEvent(sessionId, { type: "error", message: err instanceof Error ? err.message : "Unknown error" });
    markComplete(sessionId);
  });

  return NextResponse.json({ sessionId, status: "started" });
}

// ─── Dev Server Detection ───
const DEV_SERVER_PATTERNS = [
  /https?:\/\/localhost:(\d+)/,
  /https?:\/\/127\.0\.0\.1:(\d+)/,
  /https?:\/\/0\.0\.0\.0:(\d+)/,
  /Local:\s+https?:\/\/[^:]+:(\d+)/,
  /ready on\s+https?:\/\/[^:]+:(\d+)/i,
  /listening on[:\s]+(\d+)/i,
  /started.*(?:port|:)\s*(\d+)/i,
];

function detectDevServerPort(output: string): number | null {
  for (const pattern of DEV_SERVER_PATTERNS) {
    const match = output.match(pattern);
    if (match?.[1]) return parseInt(match[1], 10);
  }
  return null;
}

// ─── Agent Loop (runs in background) ───
async function runAgentLoop(sessionId: string, command: string, context?: Record<string, unknown>, userId?: string) {
  const send = (event: Record<string, unknown>) => {
    pushEvent(sessionId, { ...event, _timestamp: Date.now() });
  };

  let sandbox: Sandbox | null = null;
  let devServerDetected = false;

  // Hoisted so the `finally` block can log a session summary.
  let round = 0;
  let totalInputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheCreationTokens = 0;
  let totalOutputTokens = 0;
  const totalOmittedCharsByTool: Record<string, number> = {};
  let finalMode: AgentMode = DEFAULT_MODE;
  let summaryCount = 0;
  let ceilingWarningFired = false;
  let mcpOverheadTokensHoisted = 0;
  const TOKEN_CEILING = 400_000;

  // Per-session MCP request tracker. Prevents the agent from spamming
  // the same `request_mcp` call twice — if it didn't auto-connect the
  // first time, a retry won't either.
  const requestedMCP = new Set<string>();

  try {
    send({ type: "thinking", content: "Starting virtual environment..." });
    sandbox = await Sandbox.create("meld-agent", {
      apiKey: E2B_API_KEY!,
      timeoutMs: 30 * 60 * 1000, // 30 min
    });
    send({ type: "thinking", content: "Virtual environment ready" });

    await sandbox.commands.run("mkdir -p /home/user/project", { timeoutMs: 5000 });

    send({ type: "thinking", content: "Analyzing your request..." });

    // Phase L: inject the tools of every MCP server this user has
    // already connected. They get handed to Claude in the SAME tools
    // array as the builtin 9+1, so the agent can call them directly
    // without going through request_mcp first. No user prompt needed.
    const connectedMCP = userId ? getConnectedServers(userId) : [];
    let mcpClaudeTools: Array<Record<string, unknown>> = userId
      ? (getClaudeTools(userId) as unknown as Array<Record<string, unknown>>)
      : [];
    const connectedSummary = connectedMCP
      .map((s) => `${s.adapterId} (${s.tools.length} tools)`)
      .join(", ");
    // Phase R: rough token estimate so the user can see the cost
    // of having lots of MCPs connected. Anthropic charges ~1 token
    // per 4 characters for JSON-serialized tool definitions.
    const estimateTokens = (tools: Array<Record<string, unknown>>): number =>
      Math.ceil(JSON.stringify(tools).length / 4);
    const mcpOverheadTokens = estimateTokens(mcpClaudeTools);
    mcpOverheadTokensHoisted = mcpOverheadTokens;
    if (connectedMCP.length > 0) {
      console.log(
        `[mcp-inject][${sessionId}] connected=${connectedMCP.length} tools=${mcpClaudeTools.length} est_tokens=${mcpOverheadTokens} list=${connectedSummary}`,
      );
      send({
        type: "mcp_injected",
        servers: connectedMCP.map((s) => ({ id: s.adapterId, toolCount: s.tools.length })),
        estimatedTokens: mcpOverheadTokens,
      });
    }

    const systemPrompt = buildSystemPrompt(context, { connectedMCP });
    const messages: Array<{ role: string; content: unknown }> = [
      { role: "user", content: command },
    ];
    const maxRounds = 50;

    // Phase 3-fix: Manus-style soft masking.
    //
    // The tools array stays byte-identical for as long as possible.
    // Mode classification runs every round, but its output is fed to
    // Claude as a nudge appended to the most recent user message
    // (i.e. the SUFFIX of the prompt, not the prefix) so prompt
    // caching stays warm. The only thing that invalidates the cached
    // prefix is `request_mcp` auto-connect actually adding a NEW
    // server mid-session — a rare, deliberate event.
    //
    // Why append-to-user-message instead of tweaking the system prompt:
    // the system block is part of the cached prefix. If we mutated it
    // per-round we'd pay full price every round on ~2K tokens of
    // prose. Appending to user messages keeps the prefix identical.
    let tools: unknown[] = [
      ...(BUILTIN_TOOLS_WITH_MCP_REQUEST as unknown as Array<Record<string, unknown>>),
      ...mcpClaudeTools,
    ];
    let toolTrace: ToolTraceEntry[] = [];

    // Phase 4: track files read so we can collapse their past
    // tool_result blocks into "already read" cards during summary.
    const readFilePaths = new Map<string, number>();

    while (round < maxRounds) {
      round++;

      // Phase 4: try the async Haiku summarizer first. It only kicks
      // in once the transcript crosses the activation threshold, and
      // it rewrites `messages` in place (swallowing one cache miss
      // in exchange for real continuation memory). If it no-ops or
      // fails the deterministic compressMessages still runs.
      let preparedMessages = messages;
      if (preparedMessages.length >= DEFAULT_SUMMARY_CONFIG.activationLength) {
        try {
          const result = await summarizeHistory(
            preparedMessages,
            ANTHROPIC_API_KEY,
          );
          if (result.didSummarize) {
            summaryCount++;
            // Replace the source messages so the summary persists
            // across future rounds — otherwise we'd re-summarize
            // every round and burn cache + Haiku calls.
            messages.length = 0;
            for (const m of result.messages) messages.push(m);
            preparedMessages = messages;
            console.log(
              `[summarize][${sessionId}] round=${round} kept=${messages.length} count=${summaryCount}`
            );
            send({
              type: "history_summarized",
              round,
              messagesAfter: messages.length,
              summaryCount,
            });
          }
        } catch (err) {
          console.warn(
            `[summarize][${sessionId}] failed, continuing:`,
            err instanceof Error ? err.message : err
          );
        }
      }

      // Phase 4: collapse past read_file tool_result blocks into
      // "already read" cards. Applied to the pre-call snapshot only —
      // the live `messages` array is not mutated so the next round's
      // append-only growth is unaffected.
      const withReadCards = collapseReadFileCards(
        preparedMessages,
        readFilePaths,
        DEFAULT_SUMMARY_CONFIG.readCardMaxChars,
      );

      const compressed = compressMessages(withReadCards);
      const response = await callClaude(systemPrompt, compressed, tools);
      const assistantContent = response.content;
      messages.push({ role: "assistant", content: assistantContent });

      // Per-round usage logging. Anthropic returns cache_read /
      // cache_creation only when prompt-caching-2024-07-31 is active.
      const usage = (response as { usage?: Record<string, number> }).usage;
      if (usage) {
        const inp = usage.input_tokens ?? 0;
        const cRead = usage.cache_read_input_tokens ?? 0;
        const cCreate = usage.cache_creation_input_tokens ?? 0;
        const out = usage.output_tokens ?? 0;
        totalInputTokens += inp;
        totalCacheReadTokens += cRead;
        totalCacheCreationTokens += cCreate;
        totalOutputTokens += out;
        const denom = inp + cRead + cCreate;
        const hitRate = denom > 0 ? cRead / denom : 0;
        console.log(
          `[cache][${sessionId}] round=${round} input=${inp} cache_read=${cRead} cache_create=${cCreate} output=${out} hit=${(hitRate * 100).toFixed(1)}%`
        );
        send({
          type: "usage",
          round,
          inputTokens: inp,
          cacheReadTokens: cRead,
          cacheCreationTokens: cCreate,
          outputTokens: out,
          hitRate,
        });

        // Phase 4: token ceiling guard. Once cumulative input crosses
        // TOKEN_CEILING, nudge the agent to wrap up so it doesn't
        // silently blow the budget. Fire once per session to stay
        // cache-friendly.
        const cumulativeInput =
          totalInputTokens + totalCacheReadTokens + totalCacheCreationTokens;
        if (!ceilingWarningFired && cumulativeInput >= TOKEN_CEILING) {
          ceilingWarningFired = true;
          console.log(
            `[ceiling][${sessionId}] round=${round} cumulative=${cumulativeInput} — injecting wrap-up nudge`
          );
          send({ type: "token_ceiling", round, cumulativeInput });
          messages.push({
            role: "user",
            content:
              "⚠️ 토큰 상한에 근접했습니다. 남은 작업을 마무리 단계로 전환하세요: (1) 진행 중인 변경만 완료 (2) 새 탐색·대규모 수정 중단 (3) dev 서버 기동으로 검증 (4) 짧은 요약 메시지로 종료. 새 파일 생성은 꼭 필요한 것만.",
          });
        }
      }

      for (const block of assistantContent) {
        if (block.type === "text" && block.text) {
          send({ type: "message", content: block.text });
        }
      }

      if (response.stop_reason === "end_turn") {
        send({ type: "done", summary: "Completed" });
        break;
      }

      if (response.stop_reason === "tool_use") {
        const toolCalls = assistantContent.filter((b: { type: string }) => b.type === "tool_use");
        const toolNames = toolCalls.map((b: { name: string }) => b.name).join(", ");
        send({ type: "thinking", content: `Executing: ${toolNames}` });

        const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean }> = [];

        for (const block of assistantContent) {
          if (block.type !== "tool_use") continue;
          const { id, name, input } = block;
          send({ type: "tool_call", toolName: name, input });

          const result = await executeTool(sandbox!, name, input, send, () => devServerDetected, (v: boolean) => { devServerDetected = v; }, userId, requestedMCP);
          send({ type: "tool_result", toolName: name, result: result.text.slice(0, 500) });

          // Phase 2: per-tool truncation now happens inside executeTool.
          // The result.text is already sized for context. Log leverage
          // so we can track savings over time.
          if (result.omittedChars && result.omittedChars > 0) {
            totalOmittedCharsByTool[name] = (totalOmittedCharsByTool[name] ?? 0) + result.omittedChars;
            console.log(
              `[truncate][${sessionId}] ${name} kept=${result.text.length} omitted=${result.omittedChars} orig=${result.originalChars}`
            );
          }

          // Phase 3: record for mode classification.
          toolTrace = appendTrace(toolTrace, { name, isError: result.isError });

          // Phase 4: remember successful read_file calls so the
          // summarizer can collapse them into "already read" cards.
          if (name === "read_file" && !result.isError) {
            const path = String((input as Record<string, unknown>)?.path ?? "");
            if (path) {
              const lineCount = result.text.split("\n").length;
              readFilePaths.set(path, lineCount);
            }
          }

          // Phase O: when request_mcp auto-connects a new server, its
          // tools come back in `newlyAddedMCPTools`. Append them to
          // both the live `tools` array and the `mcpClaudeTools`
          // tracker. Deduped by tool name. This is one of the two
          // deliberate cache-invalidation events in the session (the
          // other being summarizeHistory) — we accept the one-time
          // cost in exchange for the agent gaining new capabilities.
          if (result.newlyAddedMCPTools && result.newlyAddedMCPTools.length > 0) {
            const existingNames = new Set(
              mcpClaudeTools.map((t) => String((t as { name?: unknown }).name ?? "")),
            );
            const fresh = result.newlyAddedMCPTools.filter(
              (t) => !existingNames.has(String((t as { name?: unknown }).name ?? "")),
            );
            if (fresh.length > 0) {
              mcpClaudeTools = [...mcpClaudeTools, ...fresh];
              tools = [
                ...(BUILTIN_TOOLS_WITH_MCP_REQUEST as unknown as Array<Record<string, unknown>>),
                ...mcpClaudeTools,
              ];
              console.log(
                `[mcp-inject][${sessionId}] round=${round} added ${fresh.length} tool(s) after auto-connect — cache will rebuild next round`,
              );
              send({
                type: "mcp_tools_added",
                count: fresh.length,
                names: fresh.map((t) => String((t as { name?: unknown }).name ?? "")),
              });
            }
          }

          toolResults.push({ type: "tool_result", tool_use_id: id, content: result.text, is_error: result.isError });
        }

        messages.push({ role: "user", content: toolResults });

        // Phase 3-fix: reclassify mode and, if changed, append a
        // short natural-language nudge to the most recent user
        // message (the tool_results block we just pushed). Claude
        // sees it as soft guidance without the tools array changing
        // — cache prefix stays intact.
        const nextMode = classifyMode(toolTrace);
        if (nextMode !== finalMode) {
          const reason = toolTrace.slice(-5).map((e) => e.name + (e.isError ? "!" : "")).join(",");
          console.log(
            `[mode][${sessionId}] ${finalMode} → ${nextMode} (recent: ${reason}) — cache preserved`,
          );
          send({
            type: "mode_change",
            from: finalMode,
            to: nextMode,
            reason,
          });
          finalMode = nextMode;
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && Array.isArray(lastMsg.content)) {
            (lastMsg.content as Array<Record<string, unknown>>).push({
              type: "text",
              text: `[system nudge] Phase transitioned to "${nextMode}". ${MODE_NUDGE[nextMode]}`,
            });
          }
        }
      }
    }
  } catch (err) {
    send({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
  } finally {
    // Phase 1 baseline: total cache effectiveness per session.
    const totalBilled =
      totalInputTokens + totalCacheReadTokens + totalCacheCreationTokens;
    const sessionHitRate =
      totalBilled > 0 ? totalCacheReadTokens / totalBilled : 0;
    console.log(
      `[cache][${sessionId}] SESSION rounds=${round} input=${totalInputTokens} cache_read=${totalCacheReadTokens} cache_create=${totalCacheCreationTokens} output=${totalOutputTokens} hit=${(sessionHitRate * 100).toFixed(1)}%`
    );
    const totalOmitted = Object.values(totalOmittedCharsByTool).reduce((a, b) => a + b, 0);
    if (totalOmitted > 0) {
      console.log(
        `[truncate][${sessionId}] SESSION omitted_chars=${totalOmitted} by_tool=${JSON.stringify(totalOmittedCharsByTool)}`
      );
    }
    // Phase R: MCP overhead visibility — how much of this session's
    // input cost was spent shipping MCP tool definitions.
    if (mcpOverheadTokensHoisted > 0 && totalBilled > 0) {
      const pctOfTotal = ((mcpOverheadTokensHoisted * round) / totalBilled) * 100;
      console.log(
        `[mcp-overhead][${sessionId}] per_round=${mcpOverheadTokensHoisted} total_est=${mcpOverheadTokensHoisted * round} pct_of_session=${pctOfTotal.toFixed(1)}%`,
      );
    }
    send({
      type: "usage_summary",
      rounds: round,
      inputTokens: totalInputTokens,
      cacheReadTokens: totalCacheReadTokens,
      cacheCreationTokens: totalCacheCreationTokens,
      outputTokens: totalOutputTokens,
      hitRate: sessionHitRate,
      omittedCharsTotal: totalOmitted,
      omittedCharsByTool: totalOmittedCharsByTool,
      finalMode,
      summaryCount,
      ceilingHit: ceilingWarningFired,
      mcpOverheadTokensPerRound: mcpOverheadTokensHoisted,
      mcpOverheadTokensTotal: mcpOverheadTokensHoisted * round,
    });

    markComplete(sessionId);
    // Don't kill sandbox if dev server is running — let E2B timeout handle cleanup
    if (sandbox && !devServerDetected) {
      try { await Sandbox.kill(sandbox.sandboxId, { apiKey: E2B_API_KEY! }); } catch {}
    }
  }
}

// ─── Execute tool in E2B ───
interface ToolResult {
  text: string;
  isError: boolean;
  originalChars?: number;
  omittedChars?: number;
  /**
   * Tools to append to the agent's live tool array after this call
   * completes. Populated by `request_mcp` when auto-connect succeeds —
   * the newly-connected server's tools become available next round.
   */
  newlyAddedMCPTools?: Array<Record<string, unknown>>;
}

async function executeTool(sandbox: Sandbox, toolName: string, input: Record<string, unknown>, send: (e: Record<string, unknown>) => void, getDevDetected: () => boolean, setDevDetected: (v: boolean) => void, userId?: string, requestedMCP?: Set<string>): Promise<ToolResult> {
  const P = "/home/user/project";

  switch (toolName) {
    case "read_file": {
      const p = String(input.path ?? "");
      try {
        const content = await sandbox.files.read(`${P}/${p}`);
        send({ type: "file_read", filePath: p });
        // Phase 4-fix: files that are already in the sandbox don't
        // need stashing — the file itself IS the external memory.
        // We just return a card pointing to it so the context stays
        // compact for big files, and the agent knows to re-read
        // narrower slices if needed.
        if (content.length > STASH_THRESHOLD_CHARS * 2) {
          const lineCount = content.split("\n").length;
          const preview = content.slice(0, 300).replace(/\n/g, " ⏎ ");
          const card =
            `[large file — context preserved]\n` +
            `path: ${p}\n` +
            `size: ${content.length} chars · ${lineCount} lines\n` +
            `preview: ${preview}…\n\n` +
            `→ Too big to inline. Use run_command with grep/sed to read narrower slices:\n` +
            `  run_command { command: "sed -n '1,100p' ${p}" }\n` +
            `  run_command { command: "grep -n 'PATTERN' ${p}" }\n`;
          return {
            text: card,
            isError: false,
            originalChars: content.length,
            omittedChars: content.length - card.length,
          };
        }
        const t = truncateFileContent(content, p);
        return { text: t.text, isError: false, originalChars: t.originalChars, omittedChars: t.omittedChars };
      } catch { return { text: `File not found: ${p}`, isError: true }; }
    }
    case "write_file": {
      const p = String(input.path ?? "");
      const c = String(input.content ?? "");
      try {
        const dir = p.split("/").slice(0, -1).join("/");
        if (dir) await sandbox.commands.run(`mkdir -p ${P}/${dir}`, { timeoutMs: 5000 }).catch(() => {});
        await sandbox.files.write(`${P}/${p}`, c);
        send({
          type: "file_edit_auto",
          filePath: p,
          content: c,
          explanation: String(input.explanation ?? "File created"),
        });
        return { text: `Written: ${p}`, isError: false };
      } catch (e) { return { text: `Write failed: ${e instanceof Error ? e.message : ""}`, isError: true }; }
    }
    case "delete_file": {
      const p = String(input.path ?? "");
      try {
        await sandbox.commands.run(`rm -rf ${P}/${p}`, { timeoutMs: 5000 });
        send({ type: "file_delete", filePath: p });
        return { text: `Deleted: ${p}`, isError: false };
      } catch (e) { return { text: `Delete failed: ${e instanceof Error ? e.message : ""}`, isError: true }; }
    }
    case "rename_file": {
      const from = String(input.from ?? "");
      const to = String(input.to ?? "");
      try {
        const toDir = to.split("/").slice(0, -1).join("/");
        if (toDir) await sandbox.commands.run(`mkdir -p ${P}/${toDir}`, { timeoutMs: 5000 }).catch(() => {});
        await sandbox.commands.run(`mv ${P}/${from} ${P}/${to}`, { timeoutMs: 5000 });
        send({ type: "file_rename", from, to });
        return { text: `Renamed: ${from} → ${to}`, isError: false };
      } catch (e) { return { text: `Rename failed: ${e instanceof Error ? e.message : ""}`, isError: true }; }
    }
    case "list_files": {
      const dir = String(input.directory ?? "");
      const depth = Number(input.maxDepth ?? 10);
      try {
        const r = await sandbox.commands.run(`find ${P}/${dir} -maxdepth ${depth} -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | head -500`, { timeoutMs: 15000 });
        const t = truncateListFiles(r.stdout || "");
        return { text: t.text, isError: false, originalChars: t.originalChars, omittedChars: t.omittedChars };
      } catch { return { text: "list failed", isError: true }; }
    }
    case "search_files": {
      const q = String(input.query ?? "");
      const ext = String(input.fileExtensions ?? "");
      try {
        // Search all file types by default, or specific extensions if provided
        const includeFlags = ext
          ? ext.split(",").map((e: string) => `--include="*.${e.trim()}"`).join(" ")
          : "";
        const r = await sandbox.commands.run(`grep -r "${q}" ${P} ${includeFlags} -l 2>/dev/null | head -50`, { timeoutMs: 15000 });
        return { text: r.stdout || "No matches", isError: false };
      } catch { return { text: "search failed", isError: true }; }
    }
    case "run_command": {
      const cmd = String(input.command ?? "");
      send({ type: "command_start", command: cmd });

      // Dev server commands are long-running — run in background
      const isDevServer = /\b(dev|start|serve)\b/.test(cmd) && /\b(npm|pnpm|npx|yarn|node)\b/.test(cmd);

      try {
        if (isDevServer) {
          sandbox.commands.run(`cd ${P} && ${cmd}`, {
            timeoutMs: 300000, // 5 min
            onStdout: (data) => {
              const text = data.toString();
              send({ type: "command_output", stream: "stdout", data: text });
              const port = detectDevServerPort(text);
              if (port && !getDevDetected()) {
                setDevDetected(true);
                const publicHost = sandbox.getHost(port);
                send({ type: "devServer", url: `https://${publicHost}`, port, framework: "auto-detected" });
              }
            },
            onStderr: (data) => {
              const text = data.toString();
              send({ type: "command_output", stream: "stderr", data: text });
              const port = detectDevServerPort(text);
              if (port && !getDevDetected()) {
                setDevDetected(true);
                const publicHost = sandbox.getHost(port);
                send({ type: "devServer", url: `https://${publicHost}`, port, framework: "auto-detected" });
              }
            },
          }).catch(() => {});

          await new Promise(r => setTimeout(r, 5000));
          send({ type: "command_done", command: cmd, exitCode: 0 });
          return { text: `Dev server started in background: ${cmd}`, isError: false };
        }

        // Normal command
        const r = await sandbox.commands.run(`cd ${P} && ${cmd}`, {
          timeoutMs: 300000, // 5 min per command
          onStdout: (data) => send({ type: "command_output", stream: "stdout", data: data.toString() }),
          onStderr: (data) => send({ type: "command_output", stream: "stderr", data: data.toString() }),
        });
        send({ type: "command_done", command: cmd, exitCode: r.exitCode });
        const isError = r.exitCode !== 0;
        const combined = (r.stdout || "") + (r.stderr || "");
        // Phase 4-fix: stash huge outputs to sandbox filesystem and
        // return a compact card instead. The agent can always pull
        // the raw bytes back with read_file on demand.
        if (combined.length > STASH_THRESHOLD_CHARS * 2) {
          const stashed = await stashToSandbox({
            sandbox, tool: "run_command", ref: cmd.slice(0, 30), body: combined,
          });
          if (stashed) {
            return { text: stashed.card, isError, originalChars: stashed.originalChars, omittedChars: stashed.originalChars - stashed.card.length };
          }
        }
        const t = truncateCommandOutput(r.stdout || "", r.stderr || "", isError);
        return { text: t.text, isError, originalChars: t.originalChars, omittedChars: t.omittedChars };
      } catch (e) { return { text: `Failed: ${e instanceof Error ? e.message : ""}`, isError: true }; }
    }
    case "web_search": {
      const q = String(input.query ?? "");
      send({ type: "search_start", query: q });
      try {
        const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9090";
        const r = await fetch(`${url}/api/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, maxResults: 5 }), signal: AbortSignal.timeout(15000) });
        const d = await r.json();
        const results = (d.results ?? []) as Array<{ title: string; url: string; snippet: string }>;
        send({ type: "search_results", query: q, results });
        return { text: results.map((x, i: number) => `[${i+1}] ${x.title}\n${x.url}\n${x.snippet}`).join("\n\n") || "No results", isError: false };
      } catch {
        send({ type: "search_error", query: q });
        return { text: "Search failed", isError: true };
      }
    }
    case "browse_url": {
      const targetUrl = String(input.url ?? "");
      send({ type: "browse_start", url: targetUrl });
      try {
        const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9090";
        const r = await fetch(`${url}/api/browse`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: targetUrl }), signal: AbortSignal.timeout(30000) });
        const d = await r.json();

        if (d.screenshot) {
          send({
            type: "browser_screenshot",
            url: targetUrl,
            title: d.title ?? "",
            screenshotUrl: d.screenshot,
            description: d.description ?? "",
          });
        }

        const body = d.markdown ?? d.content ?? d.text ?? "";
        const vision = d.visionAnalysis ? `\n\n---\n**Vision analysis:**\n${d.visionAnalysis}` : "";
        // Phase 4-fix: stash big browse payloads to the sandbox so
        // the LLM context only holds a card + vision analysis.
        if (body.length > STASH_THRESHOLD_CHARS * 2) {
          const stashed = await stashToSandbox({
            sandbox, tool: "browse_url", ref: targetUrl.slice(0, 40), body,
          });
          if (stashed) {
            return {
              text: stashed.card + vision,
              isError: false,
              originalChars: stashed.originalChars,
              omittedChars: stashed.originalChars - stashed.card.length,
            };
          }
        }
        const t = truncateBrowseResult(body);
        const text = (t.text + vision) || "No content";
        return { text, isError: false, originalChars: t.originalChars, omittedChars: t.omittedChars };
      } catch { return { text: "Browse failed", isError: true }; }
    }
    case "request_mcp": {
      const serverId = String(input.serverId ?? "");
      const reason = String(input.reason ?? "");

      // Dedup: if the agent already asked for this server in the
      // current session, don't fire another event — just remind it
      // that the request is pending and to stop retrying.
      if (requestedMCP?.has(serverId)) {
        return {
          text: `Already requested ${serverId} in this session. The user has been asked once — do NOT call request_mcp again for the same server. Either wait for the connection (stop calling tools and emit a closing message) or proceed with a different approach.`,
          isError: false,
        };
      }

      // Zero-friction path: if the user previously stored a token
      // for this service (Figma/GitHub OAuth or a PAT entered in
      // Settings), auto-connect silently and tell the agent to
      // continue. The user never sees a modal.
      if (userId) {
        try {
          const { tryAutoConnect } = await import("@/lib/mcp/auto-connect");
          const auto = await tryAutoConnect(userId, serverId);
          if (auto.ok) {
            send({
              type: "mcp_auto_connected",
              serverId,
              toolCount: auto.toolCount ?? 0,
            });
            // Grab the just-connected server's Claude-shaped tools
            // and hand them back to the loop so they get appended to
            // the live tool array for the next round.
            const justConnectedTools = getClaudeTools(userId).filter((t) => {
              // Only add tools belonging to the server we just wired.
              // getClaudeTools returns ALL connected — filter by
              // checking against the adapter's own tool list.
              const srv = getConnectedServers(userId).find((s) => s.adapterId === serverId);
              return srv?.tools.some((tool) => tool.name === t.name) ?? false;
            });
            return {
              text: `Already connected to ${serverId} (${auto.toolCount ?? 0} tools available). The tools have been added to your available toolset — you can call them directly next round.`,
              isError: false,
              newlyAddedMCPTools: justConnectedTools as unknown as Array<Record<string, unknown>>,
            };
          }
        } catch (err) {
          console.warn(
            `[request_mcp] auto-connect failed for ${serverId}:`,
            err instanceof Error ? err.message : err,
          );
          // Fall through to the user-prompt flow below.
        }
      }

      // No stored credentials — surface the request to the UI so
      // the user can connect interactively. Record the serverId so
      // the dedup guard above catches retry loops.
      requestedMCP?.add(serverId);
      send({ type: "mcp_request", serverId, reason });
      return {
        text: `MCP connection requested: ${serverId}. Reason: ${reason}. The user has been asked to connect — stop calling tools and emit a short closing message explaining what you need.`,
        isError: false,
      };
    }
    default: {
      // Phase M: route unknown tool names to the MCP registry. If the
      // agent is calling e.g. `figma_get_file` or `github_list_files`,
      // the executeMCPTool helper auto-finds the owning adapter by
      // tool name and invokes it with the stored auth. Result shape
      // mirrors builtin tools: text body + isError flag + per-tool
      // truncation so big payloads don't blow context.
      if (!userId) {
        return {
          text: `Unknown tool: ${toolName}. MCP tools require a signed-in session; sign in and connect the relevant server in /integrations.`,
          isError: true,
        };
      }
      try {
        const mcpResult = await executeMCPTool(userId, toolName, input);
        // MCPToolResult.content is Array<{type:"text", text:string}>
        // Flatten to a single string for the agent's tool_result.
        const text = (mcpResult.content ?? [])
          .map((block) => (block && typeof block === "object" && "text" in block ? String((block as { text: unknown }).text ?? "") : ""))
          .filter(Boolean)
          .join("\n\n");
        if (mcpResult.isError) {
          return { text: text || `MCP tool ${toolName} reported an error.`, isError: true };
        }
        // Phase 4-fix: stash big MCP responses to the sandbox. MCP
        // payloads (Figma node trees, GitHub file listings, Notion
        // page dumps) can easily run 10~50KB and blow context. The
        // agent can re-read the raw JSON from the stashed file when
        // it actually needs deep inspection.
        if (text.length > STASH_THRESHOLD_CHARS * 2) {
          const stashed = await stashToSandbox({
            sandbox, tool: toolName, ref: JSON.stringify(input).slice(0, 30), body: text,
          });
          if (stashed) {
            return {
              text: stashed.card,
              isError: false,
              originalChars: stashed.originalChars,
              omittedChars: stashed.originalChars - stashed.card.length,
            };
          }
        }
        const truncated = truncateBrowseResult(text);
        return {
          text: truncated.text,
          isError: false,
          originalChars: truncated.originalChars,
          omittedChars: truncated.omittedChars,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          text: `MCP tool ${toolName} failed: ${msg}. The connection may have expired — consider calling request_mcp again or ask the user to reconnect from /integrations.`,
          isError: true,
        };
      }
    }
  }
}

// compressMessages now lives in @/lib/agent/context/compress (shared
// with the harness orchestration strategies).

async function callClaude(system: string, messages: unknown[], tools: unknown[]) {
  const maxRetries = 3;

  const systemWithCache = [{
    type: "text",
    text: system,
    cache_control: { type: "ephemeral" },
  }];

  const toolsWithCache = tools.map((tool, i) =>
    i === tools.length - 1
      ? { ...(tool as Record<string, unknown>), cache_control: { type: "ephemeral" } }
      : tool
  );

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 16384,
        system: systemWithCache,
        messages,
        tools: toolsWithCache,
      }),
    });

    if (res.ok) return res.json();

    const raw = await res.text();

    if ((res.status === 529 || res.status === 429) && attempt < maxRetries - 1) {
      const wait = (attempt + 1) * 3000;
      await new Promise(r => setTimeout(r, wait));
      continue;
    }

    let msg = `Claude API error (${res.status})`;
    try {
      const parsed = JSON.parse(raw);
      msg = parsed?.error?.message || msg;
    } catch { /* use default */ }
    if (res.status === 529) msg = "Claude is currently overloaded. Please try again in a moment.";
    if (res.status === 429) msg = "Rate limit exceeded. Please wait a moment and try again.";
    throw new Error(msg);
  }
  throw new Error("Max retries exceeded");
}

interface BuildPromptOpts {
  connectedMCP?: Array<{ adapterId: string; tools: Array<{ name: string; description: string }> }>;
}

function buildSystemPrompt(ctx?: Record<string, unknown>, opts?: BuildPromptOpts) {
  const lang = ctx?.lang === "ko" ? "Korean" : "English";
  const connected = opts?.connectedMCP ?? [];

  // Natural-language summary of every MCP the user has already
  // connected. Injected near the top so Claude sees the capabilities
  // BEFORE planning — that way `.meld/PLAN.md` can already reference
  // the relevant tools as concrete steps.
  const connectedBlock = connected.length === 0
    ? ""
    : `\n# Connected external systems (USE THESE FREELY)\n\n` +
      `You have direct access to the following MCP servers. Their tools are already in your tool list alongside the builtin ones — call them DIRECTLY whenever the task would benefit, without waiting for the user to ask. You do NOT need \`request_mcp\` for these; they are already wired in.\n\n` +
      connected
        .map(
          (s) =>
            `## ${s.adapterId}\n` +
            s.tools
              .slice(0, 12)
              .map((t) => `  - \`${t.name}\` — ${t.description}`)
              .join("\n") +
            (s.tools.length > 12 ? `\n  - (+${s.tools.length - 12} more)` : ""),
        )
        .join("\n\n") +
      `\n\nBe proactive. If the task is "build a landing page" and Figma is connected, read the user's design files to match their visual style. If GitHub is connected and the user is improving an existing project, inspect their repo structure first. Pull context from these servers WITHOUT being told — that's the whole point of having them connected.\n`;

  return `You are Meld AI — a fully autonomous coding agent running in an E2B cloud sandbox at /home/user/project.

You have COMPLETE freedom to:
- Create, read, write, delete, rename ANY file
- Run ANY shell command (npm, git, curl, python, etc.)
- Install ANY package or dependency
- Start dev servers, build projects, run tests
- Search the web for documentation or solutions
- Browse URLs for reference
${connectedBlock}
# PLAN-FIRST WORKFLOW (strictly required)

Your FIRST tool call on every new request MUST be \`write_file\` with path \`.meld/PLAN.md\`.
This file is your working checklist AND your session state. You will update it as you work.

## PLAN.md format

Write the plan as a Markdown checklist in ${lang}, like this:

\`\`\`markdown
# Plan

> <one-line restatement of the user's request in ${lang}>

## Tasks

- [ ] <first concrete step>
- [ ] <second concrete step>
- [ ] <third concrete step>
- [ ] Install dependencies
- [ ] Start dev server
- [ ] Verify the result

## Notes

<any assumptions, decisions, or open questions>
\`\`\`

Rules for the plan itself:
- 3–8 tasks. Each task should be a single concrete action, not vague ("구현한다" is too vague — say what file/feature you'll create).
- Always include "Install dependencies" and "Start dev server" as the last two technical tasks when building a web project.
- The plan goes in ${lang} because that's the user's language.

## Updating PLAN.md as you work

EVERY time you finish a task, IMMEDIATELY call \`write_file\` with path \`.meld/PLAN.md\` again, containing the FULL plan with the completed task flipped from \`- [ ]\` to \`- [x]\`. Do NOT wait to batch updates — one task done = one plan rewrite.

If mid-run you discover a task needs to be split, added, or reordered, rewrite the full plan with the new structure. Past completed tasks keep their \`[x]\`. This is how you keep your own state.

# Execution rules

- Write COMPLETE files — never use "// TODO" or "..." placeholders
- Always install dependencies before starting the dev server
- Always start the dev server after building so the user sees a live preview
- If something fails, debug and fix it autonomously — don't ask the user
- Be thorough in code, concise in explanations
- When the final plan item is \`[x]\`, emit your closing summary message

# Proactively suggesting NEW MCP connections

Beyond the servers already listed above, be PROACTIVE about proposing new
ones the user hasn't connected yet. If you determine the current task
would benefit meaningfully from a system the user hasn't wired up —
design files in Figma, issue context from Linear, deployment history
from Vercel, error traces from Sentry, database schema from Supabase,
email threads from Gmail, knowledge from Notion, etc. — you should
call \`request_mcp\` EVEN IF THE USER DIDN'T MENTION IT. Don't wait to
be told. If you think it would make the result meaningfully better,
propose it.

The user sees an inline card with your \`reason\` as the rationale.
They can accept or skip. If they skip, continue the task with what
you have; don't re-ask.

# When you need external data you can't reach

If the task genuinely requires reading data from an external system
you cannot access from the sandbox — Notion pages, a private GitHub
repo, a Supabase project, a Figma file, etc. — call the \`request_mcp\`
tool. Same goes for when you PROACTIVELY think a connected integration
would improve the result (see the section above).

## How \`request_mcp\` actually works (IMPORTANT)

The tool is smarter than it looks. When you call it with a serverId, the
server FIRST tries to auto-connect using a token the user has already
stored (from prior OAuth login or a PAT saved in Settings). If that
succeeds you'll get back:

  "Already connected to X (N tools available). Proceeding without user interaction."

That means KEEP GOING — on the next round call the real MCP tool. The
user never sees a modal.

Only when no stored credential exists does the result say something like
"MCP connection requested: X. Reason: ... The user has been asked to
connect ...". In THAT case, stop calling tools and emit a closing message
explaining what you need. A connection card is already on screen.

## Rules for \`request_mcp\`

- The \`reason\` argument should be ONE short sentence in ${lang} explaining
  WHY this specific service is needed for the current task. It is shown
  verbatim to the user on the connection card. Write it like you'd write
  a Slack message to a teammate — concrete and helpful. Examples:
    Good: "이 작업에는 Figma 파일의 실제 컴포넌트 스타일이 필요해서 Figma 연결이 필요해요."
    Bad:  "MCP required."
- Prefer \`web_search\` or \`browse_url\` for PUBLIC documentation — those
  never need credentials.
- Never call \`request_mcp\` twice for the same serverId in one session —
  if the first call didn't auto-connect, the second won't either.
- After inspecting the tool result, act based on which branch fired:
  auto-connected → continue immediately; user-prompt → stop and explain.

Respond in ${lang}.${ctx?.framework ? ` Framework: ${ctx.framework}.` : ""}${ctx?.category ? ` Category: ${ctx.category}.` : ""}`;
}

// Tool schemas live in @/lib/agent/tools/schemas (shared with the
// harness pipeline) and the per-mode subsets in @/lib/agent/tools/modes.
// The workspace loop picks a subset dynamically (see Phase 3 in the
// main loop).
