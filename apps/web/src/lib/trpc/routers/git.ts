import { router, protectedProcedure, z } from "../server";

export const gitRouter = router({
  commitAndPush: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        filePath: z.string(),
        original: z.string(),
        modified: z.string(),
        commitMessage: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Phase 5에서 구현
      // 1. GitHub API로 파일 업데이트
      // 2. edit_history에 기록
      // 3. 커밋 SHA 반환
      return { commitSha: "" };
    }),
});
