import { Webhooks } from "@polar-sh/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";

const PRODUCT_TO_PLAN: Record<string, string> = {
  [process.env.POLAR_PRO_PRODUCT_ID!]: "pro",
  [process.env.POLAR_UNLIMITED_PRODUCT_ID!]: "unlimited",
};

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  onSubscriptionActive: async (payload) => {
    const { productId, customer } = payload.data;
    const plan = (PRODUCT_TO_PLAN[productId] ?? "pro") as "pro" | "unlimited";
    const externalId = customer.externalId;
    if (!externalId) return;

    const supabase = createAdminClient();
    await supabase
      .from("users")
      .update({
        plan,
        polar_customer_id: customer.id,
        polar_subscription_id: payload.data.id,
      })
      .eq("id", externalId);
  },

  onSubscriptionCanceled: async (payload) => {
    const externalId = payload.data.customer.externalId;
    if (!externalId) return;

    const supabase = createAdminClient();
    await supabase
      .from("users")
      .update({ plan: "free", polar_subscription_id: null })
      .eq("id", externalId);
  },

  onSubscriptionRevoked: async (payload) => {
    const externalId = payload.data.customer.externalId;
    if (!externalId) return;

    const supabase = createAdminClient();
    await supabase
      .from("users")
      .update({ plan: "free", polar_subscription_id: null })
      .eq("id", externalId);
  },
});
