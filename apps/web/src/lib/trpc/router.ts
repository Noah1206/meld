import { router } from "./server";
import { figmaRouter } from "./routers/figma";
import { aiRouter } from "./routers/ai";
import { gitRouter } from "./routers/git";
import { projectRouter } from "./routers/project";

export const appRouter = router({
  figma: figmaRouter,
  ai: aiRouter,
  git: gitRouter,
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
