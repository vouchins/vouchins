import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyJobsAccess } from "@/lib/jobs/auth-guard";
import {
  consumeEntitlement,
  markUsageCompleted,
  quotaDeniedResponse,
  refundEntitlement,
  resolveIdempotencyKey,
} from "@/lib/jobs/entitlements";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { insiderId, jobId, jobTitle, companyName, resumeId, note } = body;

    if (!insiderId || !companyName) {
      return NextResponse.json(
        { error: "Insider ID and company name are required" },
        { status: 400 }
      );
    }

    let callingUserId: string | null = null;

    // 1. Authenticate user via cookies
    try {
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

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser?.id) {
        callingUserId = authUser.id;
      }
    } catch {
      // Cookie read fallback
    }

    // Fallback to Bearer token / auth guard if cookie auth is unpopulated
    if (!callingUserId) {
      const guard = await verifyJobsAccess(request);
      if (guard.userId) {
        callingUserId = guard.userId;
      }
    }

    if (!callingUserId) {
      return NextResponse.json(
        {
          error: "You must be signed in to connect with insiders.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    // 2. Strict verification check: only verified or admin users can connect with insiders
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email, is_verified, is_admin, company:companies(name)")
      .eq("id", callingUserId)
      .maybeSingle();

    if (userError || (!userData?.is_verified && !userData?.is_admin)) {
      return NextResponse.json(
        {
          error: "Connecting with company insiders requires a verified corporate account. Please verify your work email to continue.",
          code: "VERIFICATION_REQUIRED",
        },
        { status: 403 }
      );
    }

    const idem = resolveIdempotencyKey(request);
    if (!idem.ok) {
      return NextResponse.json({ error: idem.error }, { status: 400 });
    }
    const requestId = idem.key;

    // Duplicate-job / insider referral check before consuming quota
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insiderId);
    if (isUuid && jobId) {
      const msgQuery = supabaseAdmin.from("messages") as any;
      if (typeof msgQuery?.select === "function") {
        const { data: existingReq } = await msgQuery
          .select("id")
          .eq("sender_id", callingUserId)
          .eq("receiver_id", insiderId)
          .ilike("text", `%Job ID / Requisition: ${jobId}%`)
          .limit(1)
          .maybeSingle();

        if (existingReq?.id) {
          return NextResponse.json(
            {
              error: "You have already requested a referral from this insider for this role.",
              code: "DUPLICATE_REFERRAL",
            },
            { status: 409 }
          );
        }
      }
    }

    const refGate = await consumeEntitlement(callingUserId, "referral_request", requestId);
    if (!refGate.allowed) {
      return quotaDeniedResponse(refGate);
    }

    // 3. Resolve candidate's verified resume URL
    let resumeUrl = '';
    try {
      let query = supabaseAdmin
        .from('job_resumes')
        .select('id, custom_slug, is_primary')
        .eq('user_id', callingUserId);

      if (resumeId) {
        query = query.eq('id', resumeId);
      } else {
        query = query.order('is_primary', { ascending: false }).order('updated_at', { ascending: false });
      }

      const { data: resumeRecord } = await query.limit(1).maybeSingle();
      if (resumeRecord) {
        const slugOrId = resumeRecord.custom_slug || resumeRecord.id;
        resumeUrl = `https://www.vouchins.com/resume/${slugOrId}`;
      }
    } catch (resErr) {
      console.warn("Could not fetch candidate resume link for referral:", resErr);
    }

    // Format comprehensive internal referral payload with Job ID and Candidate Resume
    const messageLines = [
      `[Internal Referral Request · ${companyName}]`,
      jobTitle ? `Target Role: ${jobTitle}` : null,
      jobId ? `Job ID / Requisition: ${jobId}` : null,
      resumeUrl ? `Candidate Resume: ${resumeUrl}` : null,
      '',
      note || "Hi, I noticed the open role at your company and would love to connect regarding an internal referral.",
    ].filter((line) => line !== null);

    const fullMessageText = messageLines.join('\n');

    // 4. Dispatch connection / message to insider if registered
    if (isUuid) {
      try {
        const { error: msgErr } = await supabaseAdmin.from("messages").insert({
          sender_id: callingUserId,
          receiver_id: insiderId,
          text: fullMessageText,
        });
        if (msgErr) {
          await refundEntitlement(callingUserId, "referral_request", requestId, "db_insert_error");
          throw msgErr;
        }
      } catch (msgErr) {
        console.warn("Could not insert message directly into messages table:", msgErr);
      }
    }

    await markUsageCompleted(callingUserId, "referral_request", requestId);

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

