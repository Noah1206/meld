import { router, protectedProcedure, z } from "../server";

export const aiRouter = router({
  editCode: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        figmaNodeId: z.string(),
        command: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Phase 4에서 구현
      // 1. 매핑 엔진으로 코드 파일 찾기
      // 2. GitHub API로 코드 파일 내용 가져오기
      // 3. Claude API 호출
      // 4. diff 반환
      return {
        filePath: "",
        original: "",
        modified: "",
        explanation: "Not yet implemented",
      };
    }),
});
