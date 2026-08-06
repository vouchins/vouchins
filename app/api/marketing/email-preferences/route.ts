import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emailFromPreferenceToken } from "@/lib/marketing/email-preferences";

function resolveEmail(request: Request) {
  return emailFromPreferenceToken(new URL(request.url).searchParams.get("token") || "");
}

export async function GET(request: Request) {
  const email = resolveEmail(request);
  if (!email) return NextResponse.json({ error: "Invalid preference link" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("campaign_email_unsubscribes").select("email").eq("email", email).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ email, unsubscribed: Boolean(data) });
}

export async function POST(request: Request) {
  const email = resolveEmail(request);
  if (!email) return NextResponse.json({ error: "Invalid preference link" }, { status: 400 });
  const { action } = await request.json();
  if (action === "unsubscribe") {
    const { error } = await supabaseAdmin.from("campaign_email_unsubscribes").upsert({ email, unsubscribed_at: new Date().toISOString() }, { onConflict: "email" });
    if (!error) {
      await Promise.all([
        supabaseAdmin.from("users").update({ pref_email_campaigns: false }).eq("email", email),
        supabaseAdmin.from("users").update({ pref_email_campaigns: false }).eq("personal_email", email),
      ]);
    }
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ email, unsubscribed: true });
  }
  if (action === "subscribe") {
    const { error } = await supabaseAdmin.from("campaign_email_unsubscribes").delete().eq("email", email);
    if (!error) {
      await Promise.all([
        supabaseAdmin.from("users").update({ pref_email_campaigns: true }).eq("email", email),
        supabaseAdmin.from("users").update({ pref_email_campaigns: true }).eq("personal_email", email),
      ]);
    }
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ email, unsubscribed: false });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
