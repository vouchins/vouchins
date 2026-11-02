import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { name, email, type, message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Feedback message is required." },
        { status: 400 }
      );
    }

    // Try to get authenticated user if name or email are not supplied
    if (!name || !email) {
      try {
        const supabase = await createServerSupabase();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          if (!email) email = user.email;
          if (!name) name = user.user_metadata?.full_name || user.email?.split("@")[0];
        }
      } catch {
        // Continue with defaults
      }
    }

    const feedbackPayload = {
      name: (name && name.trim()) || "Jobs Candidate",
      email: (email && email.trim()) || "anonymous@vouchins.com",
      type: (type && type.trim()) || "Jobs Platform",
      message: message.trim(),
      status: "pending",
    };

    // Insert into public.feedback table so admin dashboard can immediately view and action it
    const { data, error } = await supabaseAdmin
      .from("feedback")
      .insert(feedbackPayload)
      .select()
      .single();

    if (error) {
      console.error("Failed to insert feedback:", error);
      throw error;
    }

    return NextResponse.json({ success: true, feedback: data });
  } catch (error: any) {
    console.error("Feedback submission error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
