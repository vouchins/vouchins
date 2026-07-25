import { createHmac, randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const VISITOR_COOKIE = "vouchins_blog_visitor";
const ALLOWED_EVENTS = new Set(["view", "engaged", "completed"]);

function getReferrerHost(request: Request) {
  const referrer = request.headers.get("referer");
  if (!referrer) return null;

  try {
    const host = new URL(referrer).hostname.toLowerCase();
    const requestHost = new URL(request.url).hostname.toLowerCase();
    return host === requestHost ? null : host;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const postId = typeof body.postId === "string" ? body.postId : "";
    const eventType =
      typeof body.eventType === "string" && ALLOWED_EVENTS.has(body.eventType)
        ? body.eventType
        : "view";

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const { data: post } = await supabaseAdmin
      .from("blog_posts")
      .select("id")
      .eq("id", postId)
      .eq("status", "published")
      .maybeSingle();

    if (!post) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cookieStore = await cookies();
    let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
    let setVisitorCookie = false;

    if (!visitorId) {
      visitorId = randomUUID();
      setVisitorCookie = true;
    }

    const visitorIdentity = user ? `user:${user.id}` : `visitor:${visitorId}`;
    const visitorHash = createHmac(
      "sha256",
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
      .update(visitorIdentity)
      .digest("hex");

    const { error } = await supabaseAdmin.rpc("record_blog_activity", {
      p_blog_post_id: post.id,
      p_visitor_hash: visitorHash,
      p_user_id: user?.id ?? null,
      p_event_type: eventType,
      p_referrer_host: getReferrerHost(request),
    });

    if (error) {
      console.error("Failed to record blog analytics:", error);
      return NextResponse.json(
        { error: "Unable to record blog activity" },
        { status: 500 },
      );
    }

    const response = new NextResponse(null, { status: 204 });
    if (setVisitorCookie) {
      response.cookies.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Blog analytics endpoint failed:", error);
    return NextResponse.json(
      { error: "Unable to record blog activity" },
      { status: 500 },
    );
  }
}
