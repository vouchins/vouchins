import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Anonymous traffic belongs in PostHog, not registered-user activity.
    if (!user) {
      return new NextResponse(null, { status: 204 });
    }

    const body = await request.json().catch(() => ({}));
    const path =
      typeof body.path === "string" && body.path.startsWith("/")
        ? body.path.slice(0, 500)
        : null;

    const { error } = await supabaseAdmin.rpc("record_user_activity", {
      p_user_id: user.id,
      p_path: path,
    });

    if (error) {
      console.error("Failed to record user activity:", error);
      return NextResponse.json(
        { error: "Unable to record activity" },
        { status: 500 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Activity analytics endpoint failed:", error);
    return NextResponse.json(
      { error: "Unable to record activity" },
      { status: 500 },
    );
  }
}
