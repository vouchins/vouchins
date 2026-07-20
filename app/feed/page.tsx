import { redirect } from "next/navigation";
import { FeedClient } from "@/app/feed/feed-client";
import { getFeedPage, getFeedUser, INITIAL_FEED_LIMIT } from "@/lib/feed/data";
import type { FeedTab } from "@/lib/feed/types";
import { createServerSupabase } from "@/lib/supabase/server";
import { UserProvider } from "@/components/user-provider";

interface FeedPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function stringParam(params: Record<string, string | string[] | undefined>, key: string, fallback: string) {
  const value = params[key];
  return typeof value === "string" ? value : fallback;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const supabase = await createServerSupabase();
  const [{ data: auth }, params] = await Promise.all([supabase.auth.getUser(), searchParams]);
  if (!auth.user) redirect("/login");

  const user = await getFeedUser(supabase, auth.user.id);
  if (!user) redirect("/login");
  if (!user.onboarded) redirect("/onboarding");

  const tab: FeedTab = stringParam(params, "tab", "city") === "company" ? "company" : "city";
  const category = stringParam(params, "category", "all");
  const subCategory = stringParam(params, "sub_category", "all");
  const search = stringParam(params, "q", "");
  const city = stringParam(params, "city", user.city || "All Cities");
  const initialFeed = await getFeedPage(supabase, user, {
    tab, category, subCategory, search, city, limit: INITIAL_FEED_LIMIT,
  });

  return (
    <UserProvider initialUser={user}>
      <FeedClient initialUser={user} initialFeed={initialFeed} initialFilters={{ tab, category, subCategory, search, city }} />
    </UserProvider>
  );
}
