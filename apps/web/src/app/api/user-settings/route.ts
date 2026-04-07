import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// GET — load user settings
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", session.userId)
    .single();

  if (error && error.code === "PGRST116") {
    // No row yet — return defaults
    return NextResponse.json({
      custom_instructions: "",
      pinned_files: [],
      context_sources: {},
      installed_skills: [],
      skill_contents: {},
      skill_commands: {},
      chain_depth: 2,
      auto_chain: true,
      auto_approve: false,
    });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — save user settings (upsert)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: session.userId,
      custom_instructions: body.custom_instructions ?? "",
      pinned_files: body.pinned_files ?? [],
      context_sources: body.context_sources ?? {},
      installed_skills: body.installed_skills ?? [],
      skill_contents: body.skill_contents ?? {},
      skill_commands: body.skill_commands ?? {},
      chain_depth: body.chain_depth ?? 2,
      auto_chain: body.auto_chain ?? true,
      auto_approve: body.auto_approve ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
