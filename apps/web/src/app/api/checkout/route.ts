import { NextRequest, NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { getSessionFromRequest } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const PRODUCT_MAP: Record<string, string | undefined> = {
  pro: process.env.POLAR_PRO_PRODUCT_ID,
  unlimited: process.env.POLAR_UNLIMITED_PRODUCT_ID,
};

// GET /api/checkout?plan=pro → 로그인 확인 후 Polar 체크아웃으로 리디렉트
export async function GET(req: NextRequest) {
  const plan = req.nextUrl.searchParams.get("plan");
  const productId = plan ? PRODUCT_MAP[plan] : undefined;

  if (!plan || !productId) {
    return NextResponse.redirect(new URL("/pricing?error=invalid_plan", req.url));
  }

  // 로그인 필수
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.redirect(
      new URL(`/login?redirect_to=${encodeURIComponent(`/api/checkout?plan=${plan}`)}`, req.url),
    );
  }

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", session.userId)
    .single();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
      server: (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox",
    });

    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?checkout_id={CHECKOUT_ID}`,
      customerEmail: user.email ?? undefined,
      externalCustomerId: user.id,
      allowDiscountCodes: false,
    });

    return NextResponse.redirect(checkout.url);
  } catch (err) {
    console.error("[Polar] Checkout creation failed:", err);
    return NextResponse.redirect(new URL("/pricing?error=checkout_failed", req.url));
  }
}
