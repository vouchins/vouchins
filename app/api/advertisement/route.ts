import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Priority Weights for Weighted Random Selection
const PRIORITY_WEIGHTS: Record<string, number> = {
  PREMIUM: 40,
  HIGH: 30,
  MEDIUM: 20,
  LOW: 10,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placement = searchParams.get("placement");
  const limit = parseInt(searchParams.get("limit") || "1");

  if (!placement || !['inline', 'left_sidebar', 'right_sidebar'].includes(placement)) {
    return NextResponse.json({ error: "Invalid placement" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
      },
    }
  );

  // 1. Fetch all currently active and valid ads for this placement
  // Utilizing our `idx_ads_serving` index
  const { data: activeAds, error } = await supabase
    .from("ads")
    .select("id, title, description, media_url, target_url, priority")
    .eq("status", "active")
    .eq("placement", placement)
    .lte("start_date", new Date().toISOString())
    .gte("end_date", new Date().toISOString());

  if (error || !activeAds || activeAds.length === 0) {
    return NextResponse.json({ ads: [] });
  }

  // 2. Algorithm: Weighted Random Selection
  const selectedAds = selectWeightedAds(activeAds, limit);

  // Optional: Async trigger to log impression (Fire and Forget)
  // supabase.from('ad_impressions').insert(selectedAds.map(ad => ({ ad_id: ad.id, interaction_type: 'view' })));

  return NextResponse.json({ ads: selectedAds });
}

/**
 * Selects ads based on priority weight to ensure higher-paying ads get more visibility,
 * while maintaining randomness to prevent ad fatigue.
 */
function selectWeightedAds(ads: any[], limit: number) {
  let weightedPool: any[] = [];

  // Populate pool based on weights
  ads.forEach((ad) => {
    const weight = PRIORITY_WEIGHTS[ad.priority] || 10;
    for (let i = 0; i < weight; i++) {
      weightedPool.push(ad);
    }
  });

  const result = new Set();
  while (result.size < limit && weightedPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * weightedPool.length);
    result.add(weightedPool[randomIndex]);
    // Remove chosen ad from pool to prevent duplicates in the same response
    weightedPool = weightedPool.filter((ad) => ad.id !== weightedPool[randomIndex].id);
  }
  return Array.from(result);
}