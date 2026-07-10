import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { transporter } from "@/lib/email";
import { getTargetNotificationEmail } from "@/lib/email-notifications";

export async function GET(req: Request) {
  try {
    // 1. Authenticate and Authorize the Admin
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
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify admin status
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch campaigns
    const { data: campaigns, error: fetchError } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;

    return NextResponse.json({ success: true, campaigns });
  } catch (err: any) {
    console.error("Error fetching campaigns:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate and Authorize the Admin
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
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify admin status
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, body, targetType, recipientGroupId, recipientGroupName, status } = await req.json();

    if (!title || !body || !targetType || !recipientGroupId || !recipientGroupName) {
      return NextResponse.json({ error: "Missing required campaign fields" }, { status: 400 });
    }

    // Create campaign record
    const { data: campaign, error: createError } = await supabaseAdmin
      .from("campaigns")
      .insert({
        title: title.trim(),
        body: body.trim(),
        target_type: targetType,
        recipient_group_id: recipientGroupId,
        recipient_group_name: recipientGroupName,
        status: status === "sent" ? "sending" : "draft",
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) throw createError;

    // If it's a draft, stop here
    if (status === "draft") {
      return NextResponse.json({ success: true, campaign });
    }

    // 2. Resolve users for target group
    let targetUsers: any[] = [];

    if (recipientGroupId === "default_all") {
      const { data } = await supabaseAdmin
        .from("users")
        .select("id, email, personal_email, full_name, company:companies(domain)")
        .eq("is_active", true);
      targetUsers = data || [];
    } else if (recipientGroupId === "default_verified") {
      const { data } = await supabaseAdmin
        .from("users")
        .select("id, email, personal_email, full_name, company:companies(domain)")
        .eq("is_active", true)
        .eq("is_verified", true);
      targetUsers = data || [];
    } else if (recipientGroupId === "default_email") {
      // Find users with 'email' provider
      const { data: providers } = await supabaseAdmin
        .from("user_identity_providers")
        .select("user_id")
        .eq("provider", "email");
      const userIds = providers?.map((p: any) => p.user_id) || [];
      if (userIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("users")
          .select("id, email, personal_email, full_name, company:companies(domain)")
          .eq("is_active", true)
          .in("id", userIds);
        targetUsers = data || [];
      }
    } else if (recipientGroupId === "default_google") {
      // Find users with 'google' provider
      const { data: providers } = await supabaseAdmin
        .from("user_identity_providers")
        .select("user_id")
        .eq("provider", "google");
      const userIds = providers?.map((p: any) => p.user_id) || [];
      if (userIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("users")
          .select("id, email, personal_email, full_name, company:companies(domain)")
          .eq("is_active", true)
          .in("id", userIds);
        targetUsers = data || [];
      }
    } else if (recipientGroupId === "default_linkedin") {
      // Find users with 'linkedin' or 'linkedin_oidc' provider
      const { data: providers } = await supabaseAdmin
        .from("user_identity_providers")
        .select("user_id")
        .ilike("provider", "linkedin%");
      const userIds = providers?.map((p: any) => p.user_id) || [];
      if (userIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("users")
          .select("id, email, personal_email, full_name, company:companies(domain)")
          .eq("is_active", true)
          .in("id", userIds);
        targetUsers = data || [];
      }
    } else if (recipientGroupId.startsWith("default_company_")) {
      const companyId = recipientGroupId.replace("default_company_", "");
      const { data } = await supabaseAdmin
        .from("users")
        .select("id, email, personal_email, full_name, company:companies(domain)")
        .eq("is_active", true)
        .eq("company_id", companyId);
      targetUsers = data || [];
    } else if (recipientGroupId === "manual_emails") {
      const emails = (recipientGroupName || "")
        .split(",")
        .map((e: string) => e.trim())
        .filter((e: string) => e.includes("@"));

      if (emails.length > 0) {
        // Query users matching these email addresses in parallel to pull their names and details if registered
        const [resEmail, resPersonal] = await Promise.all([
          supabaseAdmin
            .from("users")
            .select("id, email, personal_email, full_name, company:companies(domain)")
            .eq("is_active", true)
            .in("email", emails),
          supabaseAdmin
            .from("users")
            .select("id, email, personal_email, full_name, company:companies(domain)")
            .eq("is_active", true)
            .in("personal_email", emails),
        ]);

        const dbUsers = [...(resEmail.data || []), ...(resPersonal.data || [])];

        targetUsers = emails.map((email: string) => {
          const match = dbUsers.find(
            (u: any) =>
              u.email?.toLowerCase() === email.toLowerCase() ||
              u.personal_email?.toLowerCase() === email.toLowerCase()
          );
          return {
            id: match?.id || null,
            email: email,
            full_name: match?.full_name || "",
            company: match?.company || null,
          };
        });
      }
    } else {
      // Custom Group (UUID)
      const { data: members } = await supabaseAdmin
        .from("user_group_members")
        .select("user_id")
        .eq("group_id", recipientGroupId);
      const userIds = members?.map((m: any) => m.user_id) || [];
      if (userIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("users")
          .select("id, email, personal_email, full_name, company:companies(domain)")
          .eq("is_active", true)
          .in("id", userIds);
        targetUsers = data || [];
      }
    }

    if (targetUsers.length === 0) {
      await supabaseAdmin
        .from("campaigns")
        .update({ status: "sent", sent_count: 0, updated_at: new Date().toISOString() })
        .eq("id", campaign.id);
      return NextResponse.json({ success: true, campaign: { ...campaign, status: "sent", sent_count: 0 } });
    }

    // 3. Dispatch deliveries in background / chunks to prevent API timeout
    // For notifications: Batch insert
    if (targetType === "notification") {
      const notificationRows = targetUsers
        .filter((targetUser: any) => !!targetUser.id) // Only registered users can get in-app notifications
        .map((targetUser: any) => {
          const userFullName = targetUser.full_name || "there";
          const personalizedTitle = title.trim()
            .replace(/\{\{name\}\}/gi, userFullName)
            .replace(/\{name\}/gi, userFullName)
            .replace(/\{\{full_name\}\}/gi, userFullName)
            .replace(/\{full_name\}/gi, userFullName);

          const personalizedBody = body.trim()
            .replace(/\{\{name\}\}/gi, userFullName)
            .replace(/\{name\}/gi, userFullName)
            .replace(/\{\{full_name\}\}/gi, userFullName)
            .replace(/\{full_name\}/gi, userFullName);

          return {
            user_id: targetUser.id,
            actor_id: user.id, // Admin who sent it
            type: "SYSTEM_ANNOUNCEMENT",
            entity_id: campaign.id,
            entity_type: "campaign",
            metadata: {
              title: personalizedTitle,
              message: personalizedBody,
            },
            is_read: false,
          };
        });

      // Insert notifications in batches of 50
      const batchSize = 50;
      for (let i = 0; i < notificationRows.length; i += batchSize) {
        const chunk = notificationRows.slice(i, i + batchSize);
        const { error: notifErr } = await supabaseAdmin
          .from("notifications")
          .insert(chunk);
        if (notifErr) {
          console.error("Error inserting notification batch:", notifErr);
        }
      }
    }

    // For emails: SMTP sending
    if (targetType === "email") {
      const sesFromEmail = process.env.SES_FROM_EMAIL;
      if (!sesFromEmail) {
        throw new Error("SES_FROM_EMAIL is not configured on the server.");
      }

      // Dispatch emails in sequential chunks to prevent overloading/timeouts
      for (const targetUser of targetUsers) {
        const targetEmail = getTargetNotificationEmail(targetUser) || targetUser.email;
        if (!targetEmail) continue;

        const userFullName = targetUser.full_name || "there";
        const personalizedSubject = title.trim()
          .replace(/\{\{name\}\}/gi, userFullName)
          .replace(/\{name\}/gi, userFullName)
          .replace(/\{\{full_name\}\}/gi, userFullName)
          .replace(/\{full_name\}/gi, userFullName);

        const personalizedBody = body
          .replace(/\{\{name\}\}/gi, userFullName)
          .replace(/\{name\}/gi, userFullName)
          .replace(/\{\{full_name\}\}/gi, userFullName)
          .replace(/\{full_name\}/gi, userFullName);

        // Resolve application base URL to load the public logo image dynamically
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vouchins.com";
        // If appUrl points to localhost, fall back to Github raw content URL so logo displays in test emails
        const logoUrl = (appUrl.includes("localhost") || appUrl.includes("127.0.0.1"))
          ? "https://raw.githubusercontent.com/vouchins/vouchins/main/public/images/logo.png"
          : `${appUrl}/images/logo.png`;

        // Wrap email in visual container matching Vouchins branding (pure white logo image on Vouchins brand blue background)
        const formattedHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; color: #334155; line-height: 1.7; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
            <div style="background-color: #ffffff; padding: 24px; text-align: center; border-bottom: 3px solid #4FD1C5;">
              <img src="${logoUrl}" alt="Vouchins" style="height: 36px; max-height: 36px; display: block; margin: auto; border: 0;" />
            </div>
            <div style="padding: 40px 32px; background-color: #ffffff;">
              <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; letter-spacing: -0.02em;">${personalizedSubject}</h2>
              <div style="color: #334155; font-size: 15px; line-height: 1.7; font-weight: 400;">
                ${personalizedBody}
              </div>
            </div>
            <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; font-weight: 500;">
              <p style="margin: 0 0 8px 0; color: #64748b;">You received this announcement from the Vouchins Admin Console.</p>
              <p style="margin: 0;">&copy; 2026 Vouchins. All rights reserved.</p>
            </div>
          </div>
        `;

        try {
          await transporter.sendMail({
            from: `Vouchins <${sesFromEmail}>`,
            to: targetEmail,
            subject: personalizedSubject,
            html: formattedHtml,
          });
        } catch (mailErr) {
          console.error(`Failed to send email to ${targetEmail}:`, mailErr);
          // Continue to next user even if one fails
        }
      }
    }

    // Update campaign status
    const { data: finalCampaign, error: updateError } = await supabaseAdmin
      .from("campaigns")
      .update({
        status: "sent",
        sent_count: targetUsers.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaign.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, campaign: finalCampaign });
  } catch (err: any) {
    console.error("Error creating/sending campaign:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    // 1. Authenticate and Authorize the Admin
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
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify admin status
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Extract id from search parameters
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing campaign id" }, { status: 400 });
    }

    // 3. Delete campaign row
    const { error: deleteError } = await supabaseAdmin
      .from("campaigns")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting campaign:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
