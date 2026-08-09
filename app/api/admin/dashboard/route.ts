import { NextResponse } from "next/server";
import { requireActiveAdmin } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const usersQuery = () => supabaseAdmin.from("users").select("id, full_name, email, personal_email, linkedin_url, is_active, is_admin, is_marketing_manager, is_verified, onboarded, created_at, company:companies(id, name)").order("created_at", { ascending: false });

async function counts() {
  const results = await Promise.all([
    supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).eq("is_flagged", true).eq("is_removed", false),
    supabaseAdmin.from("manual_verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("feedback").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("recruiters").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("companies").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("campaigns").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("blog_posts").select("id", { count: "exact", head: true }),
  ]);
  const error = results.find((result) => result.error)?.error;
  if (error) throw error;
  const keys = ["users", "reports", "flagged", "waitlist", "feedback", "recruiters", "companies", "campaigns", "blog"];
  return Object.fromEntries(keys.map((key, index) => [key, results[index].count ?? 0]));
}

export async function GET(request: Request) {
  const auth = await requireActiveAdmin();
  if (auth.response) return auth.response;
  try {
    const resource = new URL(request.url).searchParams.get("resource") || "overview";
    if (resource === "overview") {
      const [dbCounts, users] = await Promise.all([counts(), usersQuery()]);
      if (users.error) throw users.error;
      return NextResponse.json({ profile: auth.profile, dbCounts, users: users.data ?? [] });
    }
    let query;
    if (resource === "users") query = usersQuery();
    else if (resource === "reports") query = supabaseAdmin.from("reports").select("*, reporter:users!reports_reporter_id_fkey(full_name,email), post:posts(id,text,is_removed,user:users!posts_user_id_fkey(id,full_name,email,is_active,is_admin)), comment:comments(id,post_id,text,is_removed,user:users!comments_user_id_fkey(id,full_name,email,is_active,is_admin)), reported_user:users!reports_reported_user_id_fkey(id,full_name,email,is_active,is_admin,company:companies(name))").order("created_at", { ascending: false });
    else if (resource === "flagged") query = supabaseAdmin.from("posts").select("*, user:users!posts_user_id_fkey(full_name,email,company:companies(name))").eq("is_flagged", true).eq("is_removed", false).order("created_at", { ascending: false });
    else if (resource === "waitlist") query = supabaseAdmin.from("manual_verification_requests").select("*, user:users!manual_verification_requests_user_id_fkey(id,full_name,city,email,personal_email,linkedin_url)").order("created_at", { ascending: false });
    else if (resource === "feedback") query = supabaseAdmin.from("feedback").select("*").order("created_at", { ascending: false });
    else if (resource === "blog") query = supabaseAdmin.from("blog_posts").select("*").order("created_at", { ascending: false });
    else if (resource === "recruiters") query = supabaseAdmin.from("recruiters").select("*").order("created_at", { ascending: false });
    else if (resource === "companies") query = supabaseAdmin.from("companies").select("*").order("name");
    else if (resource === "campaign-options") {
      const [users, companies] = await Promise.all([
        supabaseAdmin.from("users").select("id, full_name, email, city, is_verified, company:companies(id, name)").order("full_name"),
        supabaseAdmin.from("companies").select("id, name").order("name"),
      ]);
      if (users.error || companies.error) throw users.error || companies.error;
      return NextResponse.json({ users: users.data ?? [], companies: companies.data ?? [] });
    }
    else if (resource === "counts") return NextResponse.json({ data: await counts() });
    else return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error("Admin dashboard query failed", error);
    return NextResponse.json({ error: "Unable to load admin data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireActiveAdmin();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === "update-recruiter") {
      if (!body.id || !["approved", "rejected", "suspended"].includes(body.status)) return NextResponse.json({ error: "Invalid recruiter update" }, { status: 400 });
      const { error } = await supabaseAdmin.from("recruiters").update({ status: body.status }).eq("id", body.id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }
    if (body.action === "create-blog") {
      const { error } = await supabaseAdmin.from("blog_posts").insert({ ...body.values, author_id: auth.user.id, published_at: body.values?.status === "published" ? new Date().toISOString() : null });
      if (error) throw error;
      return NextResponse.json({ success: true });
    }
    if (body.action === "update-blog") {
      const values = { ...body.values };
      if (values.status === "published" && !values.published_at) values.published_at = new Date().toISOString();
      const { error } = await supabaseAdmin.from("blog_posts").update(values).eq("id", body.id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }
    if (body.action === "delete-blog") {
      const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", body.id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Admin dashboard mutation failed", error);
    return NextResponse.json({ error: "Admin action failed" }, { status: 500 });
  }
}
