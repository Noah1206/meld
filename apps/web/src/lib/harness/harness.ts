// runHarness — the thin center of the Anthropic harness architecture.
//
// Knows nothing about Claude, E2B, Supabase, or MCP. It:
//   1. Creates a session
//   2. Acquires a sandbox
//   3. Asks orchestration "what next?" in a loop
//   4. Calls the model when told to
//   5. Dispatches tool_use blocks to the tool provider
//   6. Appends everything to the session
//   7. Releases the sandbox when done
//
// Every concrete choice (which model, which tools, which sandbox provider,
// which orchestration strategy) comes from HarnessConfig.

import type {
  HarnessConfig,
  HarnessResult,
  HarnessEvent,
  Message,
  ToolExecutionContext,
  ToolExecutionResult,
  RoundResult,
  ToolUseContentBlock,
} from "./types";

export interface RunHarnessOptions {
  /** If provided, resume this existing session instead of creating a new one. */
  sessionId?: string;
  /** External signal to cancel the loop. */
  signal?: AbortSignal;
}

export async function runHarness(
  config: HarnessConfig,
  options: RunHarnessOptions = {}
): Promise<HarnessResult> {
  // ─── 1. Session ─────────────────────────────────
  const session = options.sessionId
    ? await resumeOrCreate(config, options.sessionId)
    : await config.session.create({
        userId: config.userId,
        agentId: config.agentId,
        prompt: config.initialPrompt,
      });

  const emit = (type: HarnessEvent["type"], payload: Record<string, unknown> = {}) => {
    const event: HarnessEvent = { type, timestamp: Date.now(), ...payload };
    void config.session.append(session.id, event);
  };

  // ─── 2. Sandbox ─────────────────────────────────
  let sandboxHandle;
  try {
    sandboxHandle = await config.sandbox.acquire(config.sandboxConfig);
    emit("sandbox_acquired", { sandboxId: sandboxHandle.id });

    // P1-2: If the session store has a saved sandbox snapshot for
    // this resumed session, restore it BEFORE the model sees any
    // files. This gives us "pick up where you left off" — the
    // working tree is byte-identical to when the session last
    // checkpointed. Non-resume calls (fresh sessions) skip this.
    if (
      options.sessionId &&
      config.session.loadSandboxSnapshot &&
      sandboxHandle.restoreSnapshot
    ) {
      try {
        const snap = await config.session.loadSandboxSnapshot(session.id);
        if (snap) {
          await sandboxHandle.restoreSnapshot(snap.data);
          emit("sandbox_restored", {
            sessionId: session.id,
            sizeBytes: snap.sizeBytes,
            capturedAt: snap.capturedAt,
          });
        }
      } catch (err) {
        // Non-fatal: log and continue with a clean sandbox.
        emit("thinking", {
          content: `Snapshot restore failed: ${err instanceof Error ? err.message : String(err)}. Continuing with fresh sandbox.`,
        });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emit("error", { message: `Sandbox acquire failed: ${message}` });
    await config.session.markComplete(session.id, "error");
    return { sessionId: session.id, status: "error", error: message };
  }

  // ─── 3. Main loop ───────────────────────────────
  let state = config.orchestration.initialState({
    systemPrompt: config.systemPrompt,
    userPrompt: config.initialPrompt,
  });
  let lastRound: RoundResult | null = null;
  let finalMessage = "";
  let outcome: HarnessResult["status"] = "completed";
  let outcomeError: string | undefined;
  let devServerKeepAlive = false;

  // P1-2 Phase 3: periodic mid-run sandbox snapshots. Every 5 minutes
  // we dump the sandbox tree and save it to the session store so a
  // crash / timeout / browser refresh can resume from the most recent
  // checkpoint instead of losing the whole session.
  const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
  let lastSnapshotAt = Date.now();
  const maybeCheckpointSandbox = async (trigger: "periodic") => {
    if (
      !sandboxHandle ||
      !sandboxHandle.dumpSnapshot ||
      !config.session.saveSandboxSnapshot
    ) {
      return;
    }
    try {
      const dumped = await sandboxHandle.dumpSnapshot();
      await config.session.saveSandboxSnapshot(
        session.id,
        dumped.data,
        dumped.sizeBytes,
      );
      lastSnapshotAt = Date.now();
      emit("sandbox_snapshot_saved", {
        sessionId: session.id,
        sizeBytes: dumped.sizeBytes,
        trigger,
      });
    } catch (err) {
      // Non-fatal, just log.
      emit("thinking", {
        content: `Periodic snapshot failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  };

  try {
    // Listen for dev_server_detected on the emit stream — if one comes up,
    // we keep the sandbox alive instead of killing it on release.
    const origAppend = config.session.append.bind(config.session);
    config.session.append = async (sid, event) => {
      if (event.type === "dev_server_detected") devServerKeepAlive = true;
      return origAppend(sid, event);
    };

    while (true) {
      if (options.signal?.aborted) {
        outcome = "cancelled";
        emit("cancelled", {});
        break;
      }

      const decision = config.orchestration.nextStep(state, lastRound);

      if (decision.type === "stop") {
        emit("round_completed", { round: state.round, reason: decision.reason });
        break;
      }

      if (decision.type === "compress") {
        state = config.orchestration.compress(state);
        emit("thinking", { content: `Compressing history (${decision.reason})` });
        continue;
      }

      emit("round_started", { round: state.round + 1 });

      const tools = await config.tools.list(config.userId);

      const response = await config.model.complete({
        system: config.systemPrompt,
        messages: state.messages,
        tools: tools.map(t => t.def),
        maxTokens: config.maxTokens,
      });

      // Extract text + tool_use blocks
      for (const block of response.content) {
        if (block.type === "text" && block.text) {
          emit("message", { content: block.text });
          finalMessage = block.text;
        }
      }

      const toolCalls = response.content.filter(
        (b): b is ToolUseContentBlock => b.type === "tool_use"
      );

      const toolResults: Array<{ callId: string; result: ToolExecutionResult }> = [];

      for (const call of toolCalls) {
        emit("tool_call", { toolName: call.name, input: call.input, callId: call.id });

        const ctx: ToolExecutionContext = {
          sandbox: sandboxHandle,
          emit: (e: HarnessEvent) => void config.session.append(session.id, e),
          userId: config.userId,
          sessionId: session.id,
        };

        let result: ToolExecutionResult;
        try {
          result = await executeTool(config, call, ctx);
        } catch (err) {
          result = {
            text: err instanceof Error ? err.message : String(err),
            isError: true,
          };
        }

        emit("tool_result", {
          toolName: call.name,
          callId: call.id,
          result: result.text.slice(0, 500),
          isError: result.isError,
        });

        toolResults.push({ callId: call.id, result });
      }

      lastRound = { response, toolResults };
      state = config.orchestration.onRoundComplete(state, lastRound);
      emit("round_completed", { round: state.round });

      // P1-2 Phase 3: if 5 minutes have passed since the last
      // checkpoint, snapshot now. Runs between rounds so we never
      // interrupt an in-flight model call or tool execution.
      if (Date.now() - lastSnapshotAt >= SNAPSHOT_INTERVAL_MS) {
        await maybeCheckpointSandbox("periodic");
      }
    }
  } catch (err) {
    outcome = "error";
    outcomeError = err instanceof Error ? err.message : String(err);
    emit("error", { message: outcomeError });
  } finally {
    // P1-2: Before releasing the sandbox, checkpoint it to the
    // session store. This is the ONLY place we persist snapshots —
    // periodic mid-run snapshots (Phase 3) also pipe through the
    // same `session.saveSandboxSnapshot` call.
    if (
      sandboxHandle &&
      sandboxHandle.dumpSnapshot &&
      config.session.saveSandboxSnapshot
    ) {
      try {
        const dumped = await sandboxHandle.dumpSnapshot();
        await config.session.saveSandboxSnapshot(
          session.id,
          dumped.data,
          dumped.sizeBytes,
        );
        emit("sandbox_snapshot_saved", {
          sessionId: session.id,
          sizeBytes: dumped.sizeBytes,
          trigger: "session_end",
        });
      } catch (err) {
        // Non-fatal — the session still completes even if snapshot
        // fails. Future resumes will just get a fresh sandbox.
        emit("thinking", {
          content: `Final snapshot failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    if (sandboxHandle && !devServerKeepAlive) {
      try {
        await config.sandbox.release(sandboxHandle);
        emit("sandbox_released", { sandboxId: sandboxHandle.id });
      } catch {
        // ignore cleanup errors
      }
    }
    await config.session.markComplete(session.id, outcome);
    emit("done", { summary: outcome });
  }

  return {
    sessionId: session.id,
    status: outcome,
    finalMessage,
    error: outcomeError,
  };
}

// ─── Tool dispatch ──────────────────────────────────

async function executeTool(
  config: HarnessConfig,
  call: ToolUseContentBlock,
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const tools = await config.tools.list(config.userId);
  const tool = tools.find(t => t.def.name === call.name);
  if (!tool) {
    return { text: `Unknown tool: ${call.name}`, isError: true };
  }
  return tool.execute(ctx, call.input);
}

// ─── Resume (future) ───────────────────────────────

async function resumeOrCreate(config: HarnessConfig, sessionId: string) {
  const existing = await config.session.resume(sessionId);
  if (existing) {
    // Return an ad-hoc handle matching the snapshot.
    return {
      id: existing.id,
      userId: existing.userId,
      agentId: existing.agentId,
    };
  }
  return config.session.create({
    userId: config.userId,
    agentId: config.agentId,
    prompt: config.initialPrompt,
  });
}

// Expose Message type for downstream consumers.
export type { Message };
