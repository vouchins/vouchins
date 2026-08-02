import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMarketingPrincipal } from "@/lib/marketing/auth";

const BLOG_FIELDS = ["title", "slug", "excerpt", "content", "cover_image_url", "status"] as const;
function cleanBlog(input: any) {
  const output: Record<string, unknown> = {};
  for (const field of BLOG_FIELDS) if (field in (input || {})) output[field] = input[field];
  if (output.status && !["draft", "published"].includes(String(output.status))) throw new Error("Invalid status");
  return output;
}

export async function GET() {
  const principal = await getMarketingPrincipal();
  if (!principal) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let query = supabaseAdmin.from("blog_posts").select("*").order("updated_at", { ascending: false });
  if (!principal.isAdmin) query = query.eq("author_id", principal.id);
  const { data, error } = await query;
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ posts: data });
}

export async function POST(request: Request) {
  const principal = await getMarketingPrincipal();
  if (!principal) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const values = cleanBlog(await request.json());
    const { data, error } = await supabaseAdmin.from("blog_posts").insert({
      ...values, author_id: principal.id,
      published_at: values.status === "published" ? new Date().toISOString() : null,
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ post: data }, { status: 201 });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  const principal = await getMarketingPrincipal();
  if (!principal) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json();
    const values = cleanBlog(body);
    delete (values as any).id;
    if (values.status === "published") (values as any).published_at = new Date().toISOString();
    if (values.status === "draft") (values as any).published_at = null;
    let query = supabaseAdmin.from("blog_posts").update({ ...values, updated_at: new Date().toISOString() }).eq("id", body.id);
    if (!principal.isAdmin) query = query.eq("author_id", principal.id);
    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ post: data });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const principal = await getMarketingPrincipal();
  if (!principal) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  let query = supabaseAdmin.from("blog_posts").delete().eq("id", id);
  if (!principal.isAdmin) query = query.eq("author_id", principal.id);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

