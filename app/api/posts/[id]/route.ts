import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function maskName(name: string) {
  if (!name) return "Verified Professional";
  return name
    .split(" ")
    .map((p) => {
      if (p.length <= 2) return p;
      return p[0] + "*".repeat(p.length - 2) + p.slice(-1);
    })
    .join(" ");
}

function stripContactDetails(text: string) {
  if (!text) return "";
  // Redact phone numbers (standard Indian 10 digits with optional +91/91, and formatted numbers)
  const phoneRegex = /(?:\+?91[\s-]?)?[6-9]\d{9}|[6-9]\d{2}[\s-]\d{3}[\s-]\d{4}|\b\d{5}[\s-]?\d{5}\b/g;
  let redacted = text.replace(phoneRegex, "[Verify corporate email to view contact info]");
  
  // Redact emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  redacted = redacted.replace(emailRegex, "[Verify corporate email to view contact info]");

  // Redact WhatsApp / wa.me links
  const whatsappRegex = /(?:https?:\/\/)?(?:api\.)?whatsapp\.com\/[^\s]+|(?:https?:\/\/)?wa\.me\/[^\s]+/gi;
  redacted = redacted.replace(whatsappRegex, "[Verify corporate email to view contact info]");

  return redacted;
}

function getPublicPreviewText(text: string) {
  if (!text) return "";
  
  // First clip to 50 characters
  let clipped = text;
  if (text.length > 50) {
    clipped = text.substring(0, 50) + "...";
  }
  
  // Redact phone numbers and emails
  return stripContactDetails(clipped);
}

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
            try {
              cookieStore.set({ name, value, ...options });
            } catch (e) {
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch (e) {
            }
          },
        },
      }
    );

    const { data: { user: authUser } } = await supabase.auth.getUser();

    const { data: post, error } = await supabaseAdmin
      .from("posts")
      .select(`
        *,
        user:users!posts_user_id_fkey(
          id,
          full_name,
          city,
          avatar_url,
          company_id,
          company:companies!users_company_id_fkey(
            id,
            name,
            domain
          )
        ),
        comments(
          id,
          text,
          created_at,
          user:users!comments_user_id_fkey(
            id,
            full_name,
            avatar_url,
            company:companies!users_company_id_fkey(
              id,
              name
            )
          )
        )
      `)
      .eq("id", postId)
      .eq("is_removed", false)
      .maybeSingle();

    if (error || !post) {
      return NextResponse.json({ error: "Post is deleted or unavailable" }, { status: 404 });
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
      if (!userData) {
        return NextResponse.json(
          { error: "Unauthorized: Please log in to view this company-only post" },
          { status: 403 }
        );
      }
      
      const authorCompanyId = post.user?.company_id;
      if (!userData.is_verified || userData.company_id !== authorCompanyId) {
        return NextResponse.json(
          { error: "Forbidden: This post is restricted to verified employees of the author's company" },
          { status: 403 }
        );
      }
    }

    // Sort comments by created_at ascending
    if (post.comments) {
      post.comments.sort(
        (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    const isPublicPost = post.visibility === "public";

    // Security guard rails:
    
    // Case 1: User is NOT logged in
    if (!userData) {
      if (isPublicPost) {
        // Public post: return full text with contact details stripped for SEO & public readers
        const publicPost = {
          ...post,
          text: stripContactDetails(post.text),
          image_urls: post.image_urls || [],
          comments: [], // Comments are gated
          user: post.user ? {
            ...post.user,
            full_name: maskName(post.user.full_name),
            email: undefined,
          } : null,
        };
        return NextResponse.json({
          post: publicPost,
          isLoggedIn: false,
          isVerified: false,
          isPublicPost: true,
          isTruncated: false,
        });
      }

      // Verified Network post: Truncate the text and redact sensitive details
      const truncatedPost = {
        ...post,
        text: getPublicPreviewText(post.text),
        image_urls: [], // Clear attachments
        comments: [],   // Clear comments
        user: post.user ? {
          ...post.user,
          full_name: maskName(post.user.full_name),
          email: undefined,
        } : null,
      };
      return NextResponse.json({
        post: truncatedPost,
        isLoggedIn: false,
        isVerified: false,
        isPublicPost: false,
        isTruncated: true,
      });
    }

    // Case 2: User is logged in but NOT verified
    if (!userData.is_verified) {
      if (isPublicPost) {
        // Public post: return full text with contact details stripped
        const publicPost = {
          ...post,
          text: stripContactDetails(post.text),
          image_urls: post.image_urls || [],
          comments: [], // Comments are gated
          user: post.user ? {
            ...post.user,
            full_name: maskName(post.user.full_name),
            email: undefined,
          } : null,
        };
        return NextResponse.json({
          post: publicPost,
          isLoggedIn: true,
          isVerified: false,
          isPublicPost: true,
          isTruncated: false,
        });
      }

      // Verified Network post: Unverified user sees a truncated version
      const truncatedPost = {
        ...post,
        text: getPublicPreviewText(post.text),
        image_urls: [], // Clear attachments
        comments: [],   // Clear comments
        user: post.user ? {
          ...post.user,
          full_name: maskName(post.user.full_name),
          email: undefined,
        } : null,
      };
      return NextResponse.json({
        post: truncatedPost,
        isLoggedIn: true,
        isVerified: false,
        isPublicPost: false,
        isTruncated: true,
      });
    }

    // Case 3: User is logged in AND verified
    return NextResponse.json({
      post,
      isLoggedIn: true,
      isVerified: true,
      isPublicPost,
      isTruncated: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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
            try {
              cookieStore.set({ name, value, ...options });
            } catch (e) {}
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch (e) {}
          },
        },
      }
    );

    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized: Please log in" }, { status: 401 });
    }

    // Check post exists and ownership
    const { data: post, error: fetchError } = await supabaseAdmin
      .from("posts")
      .select("id, user_id, is_removed")
      .eq("id", postId)
      .maybeSingle();

    if (fetchError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if user is admin
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", authUser.id)
      .maybeSingle();

    const isOwner = post.user_id === authUser.id;
    const isAdmin = !!userData?.is_admin;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: You cannot delete this post" }, { status: 403 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("posts")
      .update({ is_removed: true, updated_at: new Date().toISOString() })
      .eq("id", postId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
