import { deleteSession } from "@/lib/auth/session";

// POST /api/auth/logout → 세션 삭제
export async function POST() {
  await deleteSession();
  return Response.json({ ok: true });
}
