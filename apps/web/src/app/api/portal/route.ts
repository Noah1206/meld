import { CustomerPortal } from "@polar-sh/nextjs";
import { getSessionFromRequest } from "@/lib/auth/session";

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox",
  returnUrl: process.env.NEXT_PUBLIC_APP_URL + "/dashboard",
  getExternalCustomerId: async (req) => {
    const session = await getSessionFromRequest(req);
    return session?.userId ?? "";
  },
});
