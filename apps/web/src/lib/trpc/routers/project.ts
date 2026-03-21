import { router, protectedProcedure, z } from "../server";

export const projectRouter = router({
  list: protectedProcedure.query(async () => {
    // TODO: Supabase에서 프로젝트 목록 조회
    return [];
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        figmaFileKey: z.string(),
        figmaFileName: z.string().optional(),
        githubOwner: z.string().optional(),
        githubRepo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Supabase에 프로젝트 생성
      return { id: crypto.randomUUID(), ...input };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      // TODO: Supabase에서 프로젝트 조회
      return null;
    }),
});
