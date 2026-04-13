import { Webhooks } from "@polar-sh/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";

// 플랜별 크레딧 및 등급
const PLAN_CREDITS: Record<string, number> = { free: 50, pro: 500, unlimited: 2000 };
const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, unlimited: 2 };

type Plan = "free" | "pro" | "unlimited";

function getProductPlan(productId: string): Plan {
  if (productId === process.env.POLAR_PRO_PRODUCT_ID) return "pro";
  if (productId === process.env.POLAR_UNLIMITED_PRODUCT_ID) return "unlimited";
  if (productId === process.env.POLAR_STARTER_PRODUCT_ID) return "free";
  return "pro";
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOKS_SECRET!,

  // 결제 기록 + 크레딧 충전
  onOrderCreated: async (payload) => {
    const { customer, product, totalAmount, currency } = payload.data;
    const userId = customer.externalId;
    if (!userId || !product) return;

    const supabase = createAdminClient();
    const orderPlan = getProductPlan(product.id);

    // 1. payments 테이블에 결제 기록
    await supabase.from("payments").insert({
      user_id: userId,
      amount: totalAmount,
      currency,
      status: "succeeded",
      provider: "polar",
      provider_payment_id: payload.data.id,
      plan: orderPlan,
    });

    // 2. 크레딧 충전 판단
    const { data: user } = await supabase
      .from("users")
      .select("plan, credits")
      .eq("id", userId)
      .single();

    if (!user) return;

    const currentPlan = user.plan as Plan;
    const shouldCharge =
      currentPlan === orderPlan || // 갱신
      currentPlan === "free"; // 신규 구독

    if (shouldCharge) {
      const newCredits = user.credits + (PLAN_CREDITS[orderPlan] ?? 0);
      await supabase
        .from("users")
        .update({ credits: newCredits })
        .eq("id", userId);
    }
    // 플랜 변경 중 → subscription.updated에서 크레딧 처리
  },

  // 플랜 + 상태 업데이트
  onSubscriptionActive: async (payload) => {
    const { productId, customer } = payload.data;
    const userId = customer.externalId;
    if (!userId) return;

    const plan = getProductPlan(productId);
    const supabase = createAdminClient();

    await supabase
      .from("users")
      .update({
        plan,
        subscription_status: "active",
        polar_customer_id: customer.id,
        polar_subscription_id: payload.data.id,
      })
      .eq("id", userId);
  },

  // 취소 — 기간 끝까지 서비스 유지
  onSubscriptionCanceled: async (payload) => {
    const userId = payload.data.customer.externalId;
    if (!userId) return;

    const supabase = createAdminClient();
    await supabase
      .from("users")
      .update({ subscription_status: "canceled" })
      .eq("id", userId);
  },

  // 즉시 해지
  onSubscriptionRevoked: async (payload) => {
    const userId = payload.data.customer.externalId;
    if (!userId) return;

    const supabase = createAdminClient();
    await supabase
      .from("users")
      .update({
        plan: "free",
        subscription_status: "inactive",
        polar_subscription_id: null,
      })
      .eq("id", userId);
  },

  // 업그레이드/다운그레이드
  onSubscriptionUpdated: async (payload) => {
    const { productId, customer } = payload.data;
    const userId = customer.externalId;
    if (!userId) return;

    const newPlan = getProductPlan(productId);
    const supabase = createAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("plan, credits")
      .eq("id", userId)
      .single();

    if (!user) return;

    const currentPlan = user.plan as Plan;
    if (currentPlan === newPlan) return; // 변경 없음

    const isUpgrade =
      (PLAN_RANK[newPlan] ?? 0) > (PLAN_RANK[currentPlan] ?? 0);

    // 업그레이드: 차액 크레딧 충전 / 다운그레이드: 크레딧 유지
    const creditsDelta = isUpgrade
      ? (PLAN_CREDITS[newPlan] ?? 0) - (PLAN_CREDITS[currentPlan] ?? 0)
      : 0;

    await supabase
      .from("users")
      .update({
        plan: newPlan,
        credits: user.credits + creditsDelta,
      })
      .eq("id", userId);
  },
});
