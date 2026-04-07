import { router, protectedProcedure, z } from "../server";
import { buildCodeEditPrompt } from "@/lib/ai/prompts";
import { createProvider } from "@/lib/ai/provider";
import { Octokit } from "@octokit/rest";
import { getClaudeTools, getFidelityTools, gatherContextMesh, contextMeshToPrompt } from "@/lib/mcp";

export const aiRouter = router({
  editCode: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        figmaNodeId: z.string(),
        figmaNodeName: z.string().optional(),
        figmaNodeType: z.string().optional(),
        command: z.string(),
        filePath: z.string().optional(),
        githubOwner: z.string().optional(),
        githubRepo: z.string().optional(),
        githubBranch: z.string().optional(),
        provider: z.enum(["claude", "chatgpt", "gemini"]).default("claude"),
        currentCode: z.string().optional(),
        // Phase 4: Framework/dependency context
        framework: z.string().optional(),
        dependencies: z.array(z.string()).optional(),
        // Design system context (DESIGN.md)
        designSystemMd: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const {
        command,
        figmaNodeName = "Unknown",
        figmaNodeType = "FRAME",
        filePath,
        githubOwner,
        githubRepo,
        githubBranch = "main",
        provider: providerType,
        currentCode: providedCode,
        framework,
        dependencies,
        designSystemMd,
      } = input;

      const llm = createProvider(providerType);

      const promptContext = (framework || dependencies?.length || designSystemMd)
        ? { framework, dependencies, designSystemMd }
        : undefined;

      // Local mode: currentCode provided directly
      if (providedCode !== undefined && filePath) {
        const { system, user } = buildCodeEditPrompt(
          figmaNodeName,
          figmaNodeType,
          command,
          providedCode,
          filePath,
          promptContext,
        );

        const response = await llm.call(system, user);

        try {
          return JSON.parse(response);
        } catch {
          return {
            filePath,
            original: providedCode,
            modified: response,
            explanation: "Could not parse AI response; returning raw output.",
          };
        }
      }

      // No GitHub connection — ask AI to generate code directly
      if (!githubOwner || !githubRepo || !filePath) {
        const { system, user } = buildCodeEditPrompt(
          figmaNodeName,
          figmaNodeType,
          command,
          "// File not yet connected",
          filePath ?? "components/Unknown.tsx",
          promptContext,
        );

        const response = await llm.call(system, user);

        try {
          return JSON.parse(response);
        } catch {
          return {
            filePath: filePath ?? "",
            original: "",
            modified: response,
            explanation: "Could not parse AI response; returning raw output.",
          };
        }
      }

      // Fetch file content from GitHub
      const octokit = new Octokit({ auth: ctx.user.githubAccessToken });
      let currentCode = "";

      try {
        const { data } = await octokit.repos.getContent({
          owner: githubOwner,
          repo: githubRepo,
          path: filePath,
          ref: githubBranch,
        });

        if ("content" in data && data.content) {
          currentCode = Buffer.from(data.content, "base64").toString("utf-8");
        }
      } catch {
        currentCode = "// File not found";
      }

      // GitHub mode: auto-detect framework/dependencies from package.json
      let ghContext = promptContext;
      if (!ghContext) {
        try {
          const { data: pkgData } = await octokit.repos.getContent({
            owner: githubOwner,
            repo: githubRepo,
            path: "package.json",
            ref: githubBranch,
          });
          if ("content" in pkgData && pkgData.content) {
            const pkgJson = JSON.parse(Buffer.from(pkgData.content, "base64").toString("utf-8"));
            const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
            const depNames = Object.keys(allDeps);

            let detectedFramework = "unknown";
            if (allDeps["next"]) detectedFramework = "Next.js";
            else if (allDeps["react"]) detectedFramework = "React";
            else if (allDeps["vue"]) detectedFramework = "Vue";
            else if (allDeps["@angular/core"]) detectedFramework = "Angular";
            else if (allDeps["svelte"]) detectedFramework = "Svelte";

            // Extract only key UI/utility libraries (too many wastes tokens)
            const keyDeps = depNames.filter(d =>
              !d.startsWith("@types/") && !d.startsWith("eslint")
            ).slice(0, 20);

            ghContext = { framework: detectedFramework, dependencies: keyDeps, designSystemMd };
          }
        } catch {
          // Ignore if package.json is unreadable
        }
      }

      // LLM API call — MCP Context Mesh + tool_use
      const { system, user } = buildCodeEditPrompt(
        figmaNodeName,
        figmaNodeType,
        command,
        currentCode,
        filePath,
        ghContext,
      );

      // #3 Context Mesh: Gather context from all connected MCP servers
      const mesh = await gatherContextMesh(ctx.user.id, {
        ...(githubOwner && githubRepo ? { github: `${githubOwner}/${githubRepo}` } : {}),
      });
      const meshContext = contextMeshToPrompt(mesh);
      const enrichedSystem = meshContext
        ? `${system}\n\n${meshContext}`
        : system;

      // Merge MCP + Fidelity tools
      const mcpTools = getClaudeTools(ctx.user.id);
      for (const ft of getFidelityTools()) {
        mcpTools.push({
          name: ft.name,
          description: ft.description,
          input_schema: { type: "object", properties: ft.inputSchema.properties, required: ft.inputSchema.required },
        });
      }

      const hasMCPTools = mcpTools.length > 0 && llm.callWithTools;
      const response = hasMCPTools
        ? await llm.callWithTools!(enrichedSystem, user, mcpTools, ctx.user.id)
        : await llm.call(enrichedSystem, user);

      try {
        return JSON.parse(response);
      } catch {
        return {
          filePath,
          original: "",
          modified: response,
          explanation: "Could not parse AI response; returning raw output.",
        };
      }
    }),
});
