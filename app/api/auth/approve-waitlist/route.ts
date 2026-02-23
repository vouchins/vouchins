import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendApprovalEmail, sendRejectionEmail } from "@/lib/email";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { waitlistId, notes, action, domain } = await req.json();

    if (!waitlistId || !action) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    /* ---------------- AUTH CHECK ---------------- */

    const cookieStore = await cookies();

    const supabaseUser = createServerClient(
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

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ---------------- SERVICE ROLE CLIENT ---------------- */

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    /* ---------------- ADMIN CHECK ---------------- */

    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ---------------- REJECTION FLOW ---------------- */

    if (action === "reject") {
      const { error } = await supabaseAdmin.rpc(
        "reject_manual_verification",
        {
          p_waitlist_id: waitlistId,
          p_admin_id: user.id,
          p_notes: notes || null,
        }
      );

      if (error) throw error;

      // Fetch email after successful transaction
      const { data: entry } = await supabaseAdmin
        .from("manual_verification_requests")
        .select("email")
        .eq("id", waitlistId)
        .single();

      if (entry?.email) {
        try {
          await sendRejectionEmail(entry.email);
        } catch (e) {
          console.error("Rejection email failed:", e);
        }
      }

      return NextResponse.json({
        message: "User rejected and notified.",
      });
    }

    /* ---------------- APPROVAL FLOW (ATOMIC) ---------------- */

    const { error } = await supabaseAdmin.rpc(
      "approve_manual_verification",
      {
        p_waitlist_id: waitlistId,
        p_admin_id: user.id,
        p_notes: notes || null,
        p_domain: domain || null,
      }
    );

    if (error) throw error;

    // Fetch email after successful transaction
    const { data: entry } = await supabaseAdmin
      .from("manual_verification_requests")
      .select("email")
      .eq("id", waitlistId)
      .single();

    if (entry?.email) {
      try {
        await sendApprovalEmail(entry.email);
      } catch (e) {
        console.error("Approval email failed:", e);
      }
    }

    return NextResponse.json({
      message: "User approved. Account provisioned successfully.",
    });

  } catch (error: any) {
    console.error("Manual Approval API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
