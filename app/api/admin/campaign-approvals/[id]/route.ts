import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMarketingPrincipal } from "@/lib/marketing/auth";
import { deliverApprovedCampaign } from "@/lib/marketing/campaign-delivery";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const p = await getMarketingPrincipal(); if (!p?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const { data, error } = await supabaseAdmin.from("campaigns").select("*, creator:users!campaigns_created_by_fkey(full_name,email)").eq("id", id).maybeSingle();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : data ? NextResponse.json({ campaign: data }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const p = await getMarketingPrincipal(); if (!p?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params; const { action, reason } = await request.json();
  if (!["approve", "reject"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  if (action === "reject" && !String(reason || "").trim()) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  const { data: existing } = await supabaseAdmin.from("campaigns").select("approval_version").eq("id", id).eq("status", "pending_approval").maybeSingle();
  if (!existing) return NextResponse.json({ error: "Campaign was already reviewed" }, { status: 409 });
  const nextStatus = action === "approve" ? "sending" : "rejected";
  const { data } = await supabaseAdmin.from("campaigns").update({ status: nextStatus, reviewed_at: new Date().toISOString(), reviewed_by: p.id, rejection_reason: action === "reject" ? reason.trim() : null, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "pending_approval").eq("approval_version", existing.approval_version).select().maybeSingle();
  if (!data) return NextResponse.json({ error: "Campaign was already reviewed" }, { status: 409 });
  await supabaseAdmin.from("campaign_approval_events").insert({ campaign_id: id, version: existing.approval_version, action: action === "approve" ? "approved" : "rejected", actor_id: p.id, reason: action === "reject" ? reason.trim() : null });
  if (action === "approve") {
    try { await deliverApprovedCampaign(id, p.id); }
    catch (error: any) { return NextResponse.json({ campaign: { ...data, status: "failed" }, warning: error.message }, { status: 202 }); }
  }
  return NextResponse.json({ campaign: data });
}

