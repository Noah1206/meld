import { initTRPC } from "@trpc/server";
import { z } from "zod/v4";

// Context type - 나중에 인증 추가
export interface Context {
  user?: {
    id: string;
    githubAccessToken: string;
    figmaAccessToken: string;
  };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// 인증된 사용자만 접근 가능한 프로시저
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new Error("Unauthorized");
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export { z };
