"use server";

import { Polar } from "@polar-sh/sdk";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const PRODUCT_MAP: Record<string, string | undefined> = {
  pro: process.env.POLAR_PRO_PRODUCT_ID,
  unlimited: process.env.POLAR_UNLIMITED_PRODUCT_ID,
};

export async function createCheckout(plan: string) {
  const productId = PRODUCT_MAP[plan];
  if (!productId) {
    console.error(`[Polar] Missing product ID for plan: ${plan}`);
    console.error(`[Polar] POLAR_PRO_PRODUCT_ID=${process.env.POLAR_PRO_PRODUCT_ID ? "set" : "MISSING"}`);
    console.error(`[Polar] POLAR_UNLIMITED_PRODUCT_ID=${process.env.POLAR_UNLIMITED_PRODUCT_ID ? "set" : "MISSING"}`);
    redirect("/pricing?error=invalid_plan");
  }

  if (!process.env.POLAR_ACCESS_TOKEN) {
    console.error("[Polar] POLAR_ACCESS_TOKEN is not set");
    redirect("/pricing?error=config");
  }

  // 로그인 유저면 email + userId 주입
  let customerEmail: string | undefined;
  let externalCustomerId: string | undefined;

  const session = await getSession();
  if (session) {
    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", session.userId)
      .single();

    if (user) {
      externalCustomerId = user.id;
      if (user.email) customerEmail = user.email;
    }
  }

  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?checkout_id={CHECKOUT_ID}`;

  let checkoutUrl: string;
  try {
    const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN });
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl,
      customerEmail,
      externalCustomerId,
    });
    checkoutUrl = checkout.url;
  } catch (err) {
    console.error("[Polar] Checkout creation failed:", err);
    redirect("/pricing?error=checkout_failed");
  }

  redirect(checkoutUrl);
}
