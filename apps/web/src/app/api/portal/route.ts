import { Polar } from "@polar-sh/sdk";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox",
});

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session?.userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { customerPortalUrl } = await polar.customerSessions.create({
      externalCustomerId: session.userId,
      returnUrl: process.env.NEXT_PUBLIC_APP_URL + "/project/workspace",
    });
    return NextResponse.redirect(customerPortalUrl);
  } catch {
    // Polar에 고객이 없는 경우 (무료 플랜) → 가격 페이지로 이동
    return NextResponse.redirect(new URL("/pricing", req.url));
  }
}
