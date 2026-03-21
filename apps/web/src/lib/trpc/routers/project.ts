import { router, protectedProcedure, z } from "../server";
import { createAdminClient } from "@/lib/supabase/admin";

export const projectRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
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
    .mutation(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: ctx.user.id,
          name: input.name,
          figma_file_key: input.figmaFileKey,
          figma_file_name: input.figmaFileName,
          github_owner: input.githubOwner,
          github_repo: input.githubRepo,
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .single();

      if (error) return null;
      return data;
    }),
});
