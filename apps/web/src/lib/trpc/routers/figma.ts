import { router, protectedProcedure, z } from "../server";
import { FigmaClient } from "@/lib/figma/client";

export const figmaRouter = router({
  loadFile: protectedProcedure
    .input(z.object({ figmaUrl: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const parsed = FigmaClient.extractFileKey(input.figmaUrl);
      if (!parsed) {
        throw new Error("Invalid Figma URL");
      }

      if (!ctx.user.figmaAccessToken) {
        throw new Error("Figma 계정을 먼저 연결하세요. Dashboard에서 'Figma 연결' 버튼을 클릭하세요.");
      }

      const client = new FigmaClient(ctx.user.figmaAccessToken);
      const fileData = await client.getFile(parsed.fileKey);

      return {
        fileKey: parsed.fileKey,
        fileName: fileData.name,
        document: fileData.document,
      };
    }),

  getImages: protectedProcedure
    .input(z.object({ fileKey: z.string(), nodeIds: z.array(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      const client = new FigmaClient(ctx.user.figmaAccessToken);
      const images = await client.getImages(input.fileKey, input.nodeIds);
      return { images };
    }),

  sync: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Supabase에서 프로젝트 정보 조회 후 Figma 재동기화
      return { success: true };
    }),
});
