import { router, protectedProcedure, z } from "../server";
import { Octokit } from "@octokit/rest";
import { createAdminClient } from "@/lib/supabase/admin";

export const gitRouter = router({
  // 파일 목록 가져오기 (매핑용)
  listFiles: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string().optional(),
        path: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const octokit = new Octokit({ auth: ctx.user.githubAccessToken });
      const { data } = await octokit.git.getTree({
        owner: input.owner,
        repo: input.repo,
        tree_sha: input.branch ?? "main",
        recursive: "1",
      });

      return data.tree
        .filter((item) => item.type === "blob" && item.path)
        .map((item) => item.path!);
    }),

  // 파일 내용 읽기
  getFileContent: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        path: z.string(),
        branch: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const octokit = new Octokit({ auth: ctx.user.githubAccessToken });
      const { data } = await octokit.repos.getContent({
        owner: input.owner,
        repo: input.repo,
        path: input.path,
        ref: input.branch ?? "main",
      });

      if ("content" in data && data.content) {
        return {
          content: Buffer.from(data.content, "base64").toString("utf-8"),
          sha: data.sha,
        };
      }

      throw new Error("파일 내용을 읽을 수 없습니다");
    }),

  // 커밋 & 푸시
  commitAndPush: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        owner: z.string(),
        repo: z.string(),
        branch: z.string().optional(),
        filePath: z.string(),
        content: z.string(),
        commitMessage: z.string(),
        // edit_history용 메타데이터
        figmaNodeId: z.string().optional(),
        figmaNodeName: z.string().optional(),
        originalContent: z.string().optional(),
        userCommand: z.string().optional(),
        aiExplanation: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const octokit = new Octokit({ auth: ctx.user.githubAccessToken });
      const branch = input.branch ?? "main";

      // 1. 현재 파일 SHA 가져오기 (업데이트용)
      let sha: string | undefined;
      try {
        const { data } = await octokit.repos.getContent({
          owner: input.owner,
          repo: input.repo,
          path: input.filePath,
          ref: branch,
        });
        if ("sha" in data) sha = data.sha;
      } catch {
        // 새 파일 생성
      }

      // 2. 파일 업데이트 (커밋)
      const { data } = await octokit.repos.createOrUpdateFileContents({
        owner: input.owner,
        repo: input.repo,
        path: input.filePath,
        message: input.commitMessage,
        content: Buffer.from(input.content).toString("base64"),
        branch,
        sha,
      });

      const commitSha = data.commit.sha ?? "";

      // 3. edit_history에 기록
      const supabase = createAdminClient();
      await supabase.from("edit_history").insert({
        project_id: input.projectId,
        user_id: ctx.user.id,
        figma_node_id: input.figmaNodeId,
        figma_node_name: input.figmaNodeName,
        file_path: input.filePath,
        original_content: input.originalContent,
        modified_content: input.content,
        user_command: input.userCommand,
        ai_explanation: input.aiExplanation,
        commit_sha: commitSha,
        status: "pushed",
      });

      return { commitSha };
    }),
});
