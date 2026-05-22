import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const postId = resolvedParams.id;

    if (!postId) {
      return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Read-only context for getting user, but setting/removing cookies satisfies type definitions
            try {
              cookieStore.set({ name, value, ...options });
            } catch (e) {
              // Ignore cookie write errors on read-only requests
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch (e) {
              // Ignore cookie write errors on read-only requests
            }
          },
        },
      }
    );

    // Get current user session if it exists (might be null)
    const { data: { user: authUser } } = await supabase.auth.getUser();

    // Fetch the post from database using supabaseAdmin to bypass RLS.
    // Fetch author details, company details, and comments
    const { data: post, error } = await supabaseAdmin
      .from("posts")
      .select(`
        *,
        user:users!posts_user_id_fkey(
          id,
          full_name,
          email,
          city,
          avatar_url,
          vouch_points,
          is_admin,
          company_id,
          company:companies(name, domain)
        ),
        comments(
          id,
          text,
          created_at,
          user:users!comments_user_id_fkey(
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq("id", postId)
      .eq("is_removed", false)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Sort comments by created_at ascending
    if (post.comments) {
      post.comments.sort(
        (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    // Get active user data if logged in
    let userData = null;
    if (authUser) {
      const { data } = await supabaseAdmin
        .from("users")
        .select("id, city, company_id, is_verified, is_admin")
        .eq("id", authUser.id)
        .maybeSingle();
      userData = data;
    }

    // Enforce company visibility restriction:
    if (post.visibility === "company") {
      // If not logged in
      if (!userData) {
        return NextResponse.json(
          { error: "Unauthorized: Please log in to view this company-only post" },
          { status: 403 }
        );
      }
      
      // If logged in but unverified or company mismatch
      const authorCompanyId = post.user?.company_id;
      if (!userData.is_verified || userData.company_id !== authorCompanyId) {
        return NextResponse.json(
          { error: "Forbidden: This post is restricted to verified employees of the author's company" },
          { status: 403 }
        );
      }
    }

    // Security guard rails:
    
    // Case 1: User is NOT logged in
    if (!userData) {
      const isAuthorAdmin = post.user?.is_admin;
      if (isAuthorAdmin) {
        // Non-logged-in user CAN see posts made by Admin fully
        return NextResponse.json({ post, isLoggedIn: false });
      } else {
        // Non-logged-in user opens non-admin post:
        // Truncate the text to 150 characters and clear attachments/comments
        const truncatedPost = {
          ...post,
          text: post.text && post.text.length > 150 ? post.text.substring(0, 150) + "..." : post.text,
          image_urls: [], // Clear attachments
          comments: [],   // Clear comments
        };
        return NextResponse.json({ post: truncatedPost, isLoggedIn: false, isTruncated: true });
      }
    }

    // Case 2: User is logged in but NOT verified
    if (!userData.is_verified) {
      const isAuthorAdmin = post.user?.is_admin;
      if (isAuthorAdmin) {
        // Unverified user can see posts made by Admin fully
        return NextResponse.json({ post, isLoggedIn: true, isVerified: false });
      } else {
        // Unverified user sees a truncated version of standard posts (same as feed restriction)
        const truncatedPost = {
          ...post,
          text: post.text && post.text.length > 150 ? post.text.substring(0, 150) + "..." : post.text,
          image_urls: [], // Clear attachments
          comments: [],   // Clear comments
        };
        return NextResponse.json({ post: truncatedPost, isLoggedIn: true, isVerified: false, isTruncated: true });
      }
    }

    // Case 3: User is logged in AND verified
    return NextResponse.json({ post, isLoggedIn: true, isVerified: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
