import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const requestedIds = Array.isArray((body as { postIds?: unknown })?.postIds)
    ? (body as { postIds: unknown[] }).postIds
    : [];
  const postIds = Array.from(
    new Set(requestedIds.filter((id): id is string => typeof id === "string" && UUID_PATTERN.test(id))),
  ).slice(0, 50);
  if (postIds.length === 0) return NextResponse.json({ recorded: 0 });

  const { error } = await supabase.from("post_views").upsert(
    postIds.map((postId) => ({ post_id: postId, user_id: auth.user!.id })),
    { onConflict: "post_id,user_id", ignoreDuplicates: true },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recorded: postIds.length });
}
