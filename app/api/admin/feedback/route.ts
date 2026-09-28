import { NextResponse } from "next/server";
import { requireActiveAdmin } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

    const { data, error } = await supabaseAdmin
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ feedback: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

    const body = await request.json();
    const { feedbackId, status } = body;

    if (!feedbackId || !status) {
      return NextResponse.json({ error: "Missing parameters." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("feedback")
      .update({ status })
      .eq("id", feedbackId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update feedback" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  return POST(request);
}
