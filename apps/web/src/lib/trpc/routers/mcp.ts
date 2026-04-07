import { router, protectedProcedure, z } from "../server";
import {
  getPresets,
  registerCustomAdapter,
  connectServer,
  disconnectServer,
  getConnectedServers,
  executeTool,
  getClaudeTools,
  gatherContextMesh,
  contextMeshToPrompt,
  executeFidelityTool,
  getFidelityTools,
  getBuiltinChains,
  executeChain,
  suggestChains,
  getAvailableToolsForChaining,
} from "@/lib/mcp";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshFigmaToken } from "@/lib/auth/figma";

export const mcpRouter = router({
  // ─── #1 Open MCP Hub ──────────────────────────────

  // List available MCP server presets
  presets: protectedProcedure.query(() => {
    return getPresets();
  }),

  // Connect to an MCP server (generic — any server)
  connect: protectedProcedure
    .input(z.object({
      adapterId: z.string(),
      // Pass token directly, or use user's OAuth token
      token: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Token resolution: direct param > DB lookup (session token may be stale)
      let token = input.token;
      if (!token) {
        if (input.adapterId === "figma") {
          // Always fetch latest token from DB (handles stale session after Electron OAuth)
          const supabase = createAdminClient();
          const { data } = await supabase
            .from("users")
            .select("figma_access_token")
            .eq("id", ctx.user.id)
            .single();
          token = data?.figma_access_token || ctx.user.figmaAccessToken;
          if (!token) throw new Error("LOGIN_REQUIRED:figma");
        } else if (input.adapterId === "github") {
          if (!ctx.user.githubAccessToken) throw new Error("LOGIN_REQUIRED:github");
          token = ctx.user.githubAccessToken;
        } else {
          // Try to get token from DB for OAuth services
          const supabase = createAdminClient();
          const tokenColumn = `${input.adapterId}_access_token`;
          const { data } = await supabase
            .from("users")
            .select(tokenColumn)
            .eq("id", ctx.user.id)
            .single();
          const dbToken = data?.[tokenColumn as keyof typeof data] as string | null;
          if (dbToken) {
            token = dbToken;
          } else if (!token) {
            throw new Error("TOKEN_REQUIRED");
          }
        }
      }

      // Attempt connection — on failure, refresh Figma token and retry
      console.log(`[mcp.connect] adapterId=${input.adapterId} token=${token ? token.slice(0, 10) + "..." : "null"}`);
      try {
        return await connectServer(ctx.user.id, input.adapterId, { type: "bearer", token });
      } catch (err) {
        console.error(`[mcp.connect] connectServer failed:`, err instanceof Error ? err.message : err);
        if (input.adapterId === "figma" && !input.token) {
          // Attempt token refresh
          const supabase = createAdminClient();
          const { data } = await supabase
            .from("users")
            .select("figma_refresh_token")
            .eq("id", ctx.user.id)
            .single();
          console.log(`[mcp.connect] refresh_token exists: ${!!data?.figma_refresh_token}`);
          if (data?.figma_refresh_token) {
            try {
              const refreshed = await refreshFigmaToken(data.figma_refresh_token);
              await supabase.from("users").update({
                figma_access_token: refreshed.accessToken,
                figma_refresh_token: refreshed.refreshToken,
              }).eq("id", ctx.user.id);
              return await connectServer(ctx.user.id, input.adapterId, { type: "bearer", token: refreshed.accessToken });
            } catch (refreshErr) {
              console.error(`[mcp.connect] refresh failed:`, refreshErr instanceof Error ? refreshErr.message : refreshErr);
            }
          }
        }
        throw err;
      }
    }),

  // Disconnect MCP server
  disconnect: protectedProcedure
    .input(z.object({ adapterId: z.string() }))
    .mutation(({ input, ctx }) => {
      disconnectServer(ctx.user.id, input.adapterId);
      return { success: true };
    }),

  // List connected servers + tools
  servers: protectedProcedure.query(({ ctx }) => {
    return getConnectedServers(ctx.user.id);
  }),

  // Register custom MCP server
  registerCustom: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      endpoint: z.string().url(),
      icon: z.string().optional(),
    }))
    .mutation(({ input }) => {
      return registerCustomAdapter(input);
    }),

  // ─── Tool Execution ────────────────────────────────────

  executeTool: protectedProcedure
    .input(z.object({
      toolName: z.string(),
      args: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ input, ctx }) => {
      // Fidelity tools use a separate executor
      if (input.toolName.startsWith("fidelity_")) {
        return executeFidelityTool(ctx.user.id, input.toolName, input.args);
      }
      return executeTool(ctx.user.id, input.toolName, input.args);
    }),

  // Tool list for Claude (connected servers + fidelity)
  claudeTools: protectedProcedure.query(({ ctx }) => {
    const tools = getClaudeTools(ctx.user.id);
    // Also add Fidelity tools
    for (const ft of getFidelityTools()) {
      tools.push({
        name: ft.name,
        description: ft.description,
        input_schema: {
          type: "object",
          properties: ft.inputSchema.properties,
          required: ft.inputSchema.required,
        },
      });
    }
    return tools;
  }),

  // ─── #3 Context Mesh ──────────────────────────────

  contextMesh: protectedProcedure
    .input(z.object({
      hints: z.record(z.string(), z.string()).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const mesh = await gatherContextMesh(ctx.user.id, input?.hints);
      return {
        ...mesh,
        promptText: contextMeshToPrompt(mesh),
      };
    }),

  // ─── #4 Tool Chain Builder ────────────────────────

  // List available chains
  chains: protectedProcedure.query(({ ctx }) => {
    return suggestChains(ctx.user.id);
  }),

  // List all built-in chains
  builtinChains: protectedProcedure.query(() => {
    return getBuiltinChains();
  }),

  // Execute chain
  executeChain: protectedProcedure
    .input(z.object({
      chainId: z.string(),
      input: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ input, ctx }) => {
      const allChains = getBuiltinChains();
      const chain = allChains.find((c) => c.id === input.chainId);
      if (!chain) throw new Error(`Chain not found: ${input.chainId}`);
      return executeChain(ctx.user.id, chain, input.input);
    }),

  // List tools available for chaining
  chainableTools: protectedProcedure.query(({ ctx }) => {
    return getAvailableToolsForChaining(ctx.user.id);
  }),
});
