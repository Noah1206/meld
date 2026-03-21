import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// 서버사이드 전용: service role key로 RLS 우회
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, serviceKey);
}
