import { router, protectedProcedure, z } from "../server";
import { FigmaClient } from "@/lib/figma/client";
import { refreshFigmaToken } from "@/lib/auth/figma";
import { createAdminClient } from "@/lib/supabase/admin";

/** 토큰 만료 시 refresh → 재시도. 성공하면 새 토큰을 DB에 저장. */
async function withTokenRefresh<T>(
  userId: string,
  token: string,
  action: (client: FigmaClient) => Promise<T>,
): Promise<T> {
  try {
    return await action(new FigmaClient(token));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("접근 권한") && !msg.includes("403")) throw err;

    // DB에서 refresh token 가져오기
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("users")
      .select("figma_refresh_token")
      .eq("id", userId)
      .single();

    if (!data?.figma_refresh_token) {
      throw new Error("Figma 토큰이 만료되었습니다. Dashboard에서 Figma를 다시 연결해주세요.");
    }

    // 토큰 갱신
    const refreshed = await refreshFigmaToken(data.figma_refresh_token);

    // DB 업데이트
    await supabase
      .from("users")
      .update({
        figma_access_token: refreshed.accessToken,
        figma_refresh_token: refreshed.refreshToken,
      })
      .eq("id", userId);

    // 새 토큰으로 재시도
    return await action(new FigmaClient(refreshed.accessToken));
  }
}

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

      const fileData = await withTokenRefresh(
        ctx.user.id,
        ctx.user.figmaAccessToken,
        (client) => client.getFile(parsed.fileKey),
      );

      return {
        fileKey: parsed.fileKey,
        fileName: fileData.name,
        document: fileData.document,
      };
    }),

  getImages: protectedProcedure
    .input(z.object({ fileKey: z.string(), nodeIds: z.array(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      const images = await withTokenRefresh(
        ctx.user.id,
        ctx.user.figmaAccessToken,
        (client) => client.getImages(input.fileKey, input.nodeIds),
      );
      return { images };
    }),

  loadByKey: protectedProcedure
    .input(z.object({ fileKey: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user.figmaAccessToken) {
        throw new Error("Figma 계정을 먼저 연결하세요.");
      }

      const fileData = await withTokenRefresh(
        ctx.user.id,
        ctx.user.figmaAccessToken,
        (client) => client.getFile(input.fileKey),
      );

      return {
        fileKey: input.fileKey,
        fileName: fileData.name,
        document: fileData.document,
      };
    }),

  sync: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Supabase에서 프로젝트 정보 조회 후 Figma 재동기화
      return { success: true };
    }),
});
