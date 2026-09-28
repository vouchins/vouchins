import { NextResponse } from "next/server";
import { sendApprovalEmail, sendRejectionEmail } from "@/lib/email";
import { requireActiveAdmin } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;
    const { user } = auth;

    const { waitlistId, notes, action, domain } = await req.json();

    if (!waitlistId || !action) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
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
