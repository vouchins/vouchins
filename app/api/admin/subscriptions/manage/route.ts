import { NextResponse } from "next/server";
import { requireActiveAdmin } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireActiveAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { action, userId, planType = 'jobs_pro', durationDays = 30, reason = '' } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: "Missing or invalid userId" }, { status: 400 });
    }

    if (action === 'grant') {
      const validPlans = ['jobs_pro', 'premium_bundle', 'accelerator_pro'];
      const resolvedPlan = validPlans.includes(planType) ? planType : 'jobs_pro';
      const days = Math.max(1, Math.min(3650, Number(durationDays) || 30));

      // Verify target user exists
      const { data: targetUser, error: userError } = await supabaseAdmin
        .from("users")
        .select("id, email, full_name")
        .eq("id", userId)
        .maybeSingle();

      if (userError || !targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Check for existing active subscription
      const { data: existingSub } = await supabaseAdmin
        .from("subscriptions")
        .select("id, current_period_end, status")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = new Date();
      let newPeriodEnd: Date;

      if (existingSub && new Date(existingSub.current_period_end) > now) {
        // Extend existing subscription duration
        newPeriodEnd = new Date(new Date(existingSub.current_period_end).getTime() + days * 24 * 60 * 60 * 1000);
      } else {
        newPeriodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      }

      const noteStr = reason ? ` [Reason: ${reason.slice(0, 100)}]` : '';
      const auditId = `admin_${auth.profile.id}_${Date.now()}${noteStr}`;

      if (existingSub) {
        const { data: updatedSub, error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            plan_type: resolvedPlan,
            status: 'active',
            current_period_end: newPeriodEnd.toISOString(),
            payment_provider: 'manual_admin',
            external_subscription_id: auditId,
            updated_at: now.toISOString(),
          })
          .eq("id", existingSub.id)
          .select()
          .single();

        if (updateError) throw updateError;

        return NextResponse.json({
          success: true,
          message: `Extended Pro access for ${targetUser.email} until ${newPeriodEnd.toLocaleDateString()}`,
          subscription: updatedSub,
        });
      } else {
        const { data: newSub, error: insertError } = await supabaseAdmin
          .from("subscriptions")
          .insert({
            user_id: userId,
            plan_type: resolvedPlan,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: newPeriodEnd.toISOString(),
            payment_provider: 'manual_admin',
            external_subscription_id: auditId,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return NextResponse.json({
          success: true,
          message: `Granted ${days} days of Pro access to ${targetUser.email}`,
          subscription: newSub,
        });
      }
    } else if (action === 'revoke') {
      const now = new Date();
      const { error: revokeError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: 'canceled',
          current_period_end: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("user_id", userId)
        .in("status", ["active", "trialing"]);

      if (revokeError) throw revokeError;

      return NextResponse.json({
        success: true,
        message: "Pro subscription successfully canceled/revoked.",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Expected 'grant' or 'revoke'." },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[Admin Subscriptions] Manage error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to manage subscription" },
      { status: 500 }
    );
  }
}

