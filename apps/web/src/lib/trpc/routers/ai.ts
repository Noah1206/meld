import { router, protectedProcedure, z } from "../server";
import { callClaude, buildCodeEditPrompt } from "@/lib/anthropic/client";
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
        // 직접 파일 경로를 전달할 수도 있음
        filePath: z.string().optional(),
        githubOwner: z.string().optional(),
        githubRepo: z.string().optional(),
        githubBranch: z.string().optional(),
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
      } = input;

      // GitHub 연결이 없으면 AI에게 직접 코드 생성 요청
      if (!githubOwner || !githubRepo || !filePath) {
        const { system, user } = buildCodeEditPrompt(
          figmaNodeName,
          figmaNodeType,
          command,
          "// 파일이 아직 연결되지 않았습니다",
          filePath ?? "components/Unknown.tsx"
        );

        const response = await callClaude(system, [
          { role: "user", content: user },
        ]);

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

      // Claude API 호출
      const { system, user } = buildCodeEditPrompt(
        figmaNodeName,
        figmaNodeType,
        command,
        currentCode,
        filePath
      );

      const response = await callClaude(system, [
        { role: "user", content: user },
      ]);

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
