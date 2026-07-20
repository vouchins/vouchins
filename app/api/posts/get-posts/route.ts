import { NextResponse } from "next/server";
import { decodeFeedCursor, getFeedPage, getFeedUser, NEXT_FEED_LIMIT } from "@/lib/feed/data";
import type { FeedTab } from "@/lib/feed/types";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await getFeedUser(supabase, auth.user.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const tab: FeedTab = searchParams.get("tab") === "company" ? "company" : "city";
    const result = await getFeedPage(supabase, user, {
      tab,
      category: searchParams.get("category") || "all",
      subCategory: searchParams.get("subCategory") || "all",
      search: searchParams.get("query") || "",
      city: searchParams.get("city") || "All Cities",
      cursor: decodeFeedCursor(searchParams.get("cursor")),
      limit: NEXT_FEED_LIMIT,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load feed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
