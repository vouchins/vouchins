import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const normalizedEmail = email ? email.trim().toLowerCase() : "";

  console.log(`[AUTH] Login attempt for: "${normalizedEmail}"`);

  const supabase = await createServerSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    console.error(`[AUTH] Supabase login error for "${normalizedEmail}":`, error);
    if (
      error.message?.includes("fetch failed") ||
      (error as any).cause?.code === "ENOTFOUND"
    ) {
      return NextResponse.json(
        { error: "Authentication service unreachable. Please ensure network access." },
        { status: 503 }
      );
    }

    // Check if account exists but uses OAuth (Google / LinkedIn) without an email password
    if (
      error.message?.toLowerCase().includes("invalid login credentials") ||
      (error as any).code === "invalid_credentials"
    ) {
      try {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const existing = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        );
        if (existing) {
          const providers: string[] = existing.app_metadata?.providers || [];
          if (!providers.includes("email") && providers.length > 0) {
            const providerNames = providers
              .map((p) => (p === "linkedin_oidc" ? "LinkedIn" : p.charAt(0).toUpperCase() + p.slice(1)))
              .join(" or ");
            return NextResponse.json(
              {
                error: `This account was registered with ${providerNames}. Please use the ${providerNames} button above to sign in, or set a password via Forgot Password.`,
              },
              { status: 401 }
            );
          }
        }
      } catch (adminErr) {
        console.error("[AUTH] Error checking user providers:", adminErr);
      }
    }

    return NextResponse.json(
      { error: error.message || "Invalid email or password" },
      { status: 401 }
    );
  }

  console.log(`[AUTH] Successful login for: "${normalizedEmail}"`);
  return NextResponse.json({ success: true });
}

