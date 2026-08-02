import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMarketingPrincipal } from "@/lib/marketing/auth";

const editable = ["title", "body", "target_type", "recipient_group_id", "recipient_group_name"] as const;
function values(body: any) { const out: any = {}; for (const k of editable) if (k in body) out[k] = body[k]; return out; }
async function validAudience(id: string) {
  if (["default_all", "default_verified", "default_email", "default_google", "default_linkedin"].includes(id)) return true;
  if (id?.startsWith("default_company_")) {
    const { count } = await supabaseAdmin.from("companies").select("id", { count: "exact", head: true }).eq("id", id.slice("default_company_".length));
    return Boolean(count);
  }
  if (id?.startsWith("default_location_")) {
    try {
      const location = decodeURIComponent(id.slice("default_location_".length)).trim();
      if (!location) return false;
      const { count } = await supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("is_active", true).eq("city", location);
      return Boolean(count);
    } catch {
      return false;
    }
  }
  const { count } = await supabaseAdmin.from("user_groups").select("id", { count: "exact", head: true }).eq("id", id);
  return Boolean(count);
}

export async function GET() {
  const p = await getMarketingPrincipal(); if (!p) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let q = supabaseAdmin.from("campaigns").select("*").order("created_at", { ascending: false });
  if (!p.isAdmin) q = q.eq("created_by", p.id);
  const { data, error } = await q; return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ campaigns: data });
}
export async function POST(req: Request) {
  const p = await getMarketingPrincipal(); if (!p) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json(); const input = values(body);
  if (!input.title || !input.body || !["email", "notification"].includes(input.target_type) || !await validAudience(input.recipient_group_id)) return NextResponse.json({ error: "Invalid campaign" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("campaigns").insert({ ...input, status: "draft", created_by: p.id }).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ campaign: data }, { status: 201 });
}
export async function PATCH(req: Request) {
  const p = await getMarketingPrincipal(); if (!p) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json(); const input = values(body);
  if (input.recipient_group_id && !await validAudience(input.recipient_group_id)) return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  let q = supabaseAdmin.from("campaigns").update({ ...input, updated_at: new Date().toISOString() }).eq("id", body.id).in("status", ["draft", "rejected"]);
  if (!p.isAdmin) q = q.eq("created_by", p.id);
  const { data, error } = await q.select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return data ? NextResponse.json({ campaign: data }) : NextResponse.json({ error: "Campaign is not editable" }, { status: 409 });
}
export async function DELETE(req: Request) {
  const p = await getMarketingPrincipal(); if (!p) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  let q = supabaseAdmin.from("campaigns").delete().eq("id", id || "").neq("status", "sending"); if (!p.isAdmin) q = q.eq("created_by", p.id);
  const { data, error } = await q.select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return data ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Not found or currently sending" }, { status: 409 });
}
