import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: users, error } = await supabaseAdmin.from("users").select("id").eq("is_active", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const failures: string[] = [];
  for (const user of users ?? []) {
    const { error: recomputeError } = await supabaseAdmin.rpc("recompute_user_reputation", {
      p_user_id: user.id,
    });
    if (recomputeError) failures.push(user.id);
  }
  return NextResponse.json({ processed: users?.length ?? 0, failures });
}
