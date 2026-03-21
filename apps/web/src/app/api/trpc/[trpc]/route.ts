import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/lib/trpc/router";
import type { Context } from "@/lib/trpc/server";
import { getSessionFromRequest } from "@/lib/auth/session";

async function createContext(req: Request): Promise<Context> {
  const session = await getSessionFromRequest(req);
  if (!session) return {};
  return {
    user: {
      id: session.userId,
      githubAccessToken: session.githubAccessToken,
      figmaAccessToken: session.figmaAccessToken ?? "",
    },
  };
}

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
  });
}

export { handler as GET, handler as POST };
