import { router, protectedProcedure, z } from "../server";
import { buildCodeEditPrompt } from "@/lib/ai/prompts";
import { createProvider } from "@/lib/ai/provider";
import { Octokit } from "@octokit/rest";

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
        // Phase 4: 프레임워크/의존성 컨텍스트
        framework: z.string().optional(),
        dependencies: z.array(z.string()).optional(),
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
      } = input;

      const llm = createProvider(providerType);

      const promptContext = (framework || dependencies?.length)
        ? { framework, dependencies }
        : undefined;

      // 로컬 모드: currentCode가 직접 전달된 경우
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
            explanation: "AI 응답을 파싱할 수 없어 원본 응답을 반환합니다.",
          };
        }
      }

      // GitHub 연결이 없으면 AI에게 직접 코드 생성 요청
      if (!githubOwner || !githubRepo || !filePath) {
        const { system, user } = buildCodeEditPrompt(
          figmaNodeName,
          figmaNodeType,
          command,
          "// 파일이 아직 연결되지 않았습니다",
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
            explanation: "AI 응답을 파싱할 수 없어 원본 응답을 반환합니다.",
          };
        }
      }

      // GitHub에서 파일 내용 가져오기
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
        currentCode = "// 파일을 찾을 수 없습니다";
      }

      // GitHub 모드: package.json에서 프레임워크/의존성 자동 추출
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

            // 주요 UI/유틸 라이브러리만 추출 (너무 많으면 토큰 낭비)
            const keyDeps = depNames.filter(d =>
              !d.startsWith("@types/") && !d.startsWith("eslint")
            ).slice(0, 20);

            ghContext = { framework: detectedFramework, dependencies: keyDeps };
          }
        } catch {
          // package.json을 못 읽으면 무시
        }
      }

      // LLM API 호출
      const { system, user } = buildCodeEditPrompt(
        figmaNodeName,
        figmaNodeType,
        command,
        currentCode,
        filePath,
        ghContext,
      );

      const response = await llm.call(system, user);

      try {
        return JSON.parse(response);
      } catch {
        return {
          filePath,
          original: "",
          modified: response,
          explanation: "AI 응답을 파싱할 수 없어 원본 응답을 반환합니다.",
        };
      }
    }),
});
