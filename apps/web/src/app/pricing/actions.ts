"use server";

import { Polar } from "@polar-sh/sdk";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN! });

const PRODUCT_MAP: Record<string, string | undefined> = {
  pro: process.env.POLAR_PRO_PRODUCT_ID,
  unlimited: process.env.POLAR_UNLIMITED_PRODUCT_ID,
};

export async function createCheckout(plan: string) {
  const productId = PRODUCT_MAP[plan];
  if (!productId) {
    throw new Error(`Unknown plan: ${plan}`);
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

  const checkout = await polar.checkouts.create({
    products: [productId],
    successUrl,
    customerEmail,
    externalCustomerId,
  });

  redirect(checkout.url);
}
