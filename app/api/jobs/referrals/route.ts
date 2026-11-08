import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { insiderId, jobId, companyName, note } = body;

    if (!insiderId || !companyName) {
      return NextResponse.json(
        { error: "Insider ID and company name are required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in to connect with insiders.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    // 2. Strict verification check: only verified users can connect with insiders
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email, is_verified, company:companies(name)")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.is_verified) {
      return NextResponse.json(
        {
          error: "Connecting with company insiders requires a verified corporate account. Please verify your work email to continue.",
          code: "VERIFICATION_REQUIRED",
        },
        { status: 403 }
      );
    }

    // 3. Dispatch connection / message to insider if registered
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insiderId);
    if (isUuid) {
      try {
        await supabaseAdmin.from("messages").insert({
          sender_id: user.id,
          receiver_id: insiderId,
          text: `[Internal Referral Request · ${companyName}]\n\n${note || "Hi, I noticed the open role at your company and would love to connect regarding an internal referral."}`,
        });
      } catch (msgErr) {
        console.warn("Could not insert message directly into messages table:", msgErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Referral request dispatched directly to insider! They have been notified on Vouchins.`,
    });
  } catch (error: any) {
    console.error("POST /api/jobs/referrals error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit referral request" },
      { status: 500 }
    );
  }
}

