"use server";

import { createClient } from "@supabase/supabase-js";
import { sendResetPasswordEmail } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define the return type clearly
type ResetResponse = {
  success: boolean;
  error?: string;
};

export async function requestPasswordReset(identifier: string): Promise<ResetResponse> {
  try {
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("email, personal_email")
      .or(`email.eq.${identifier},personal_email.eq.${identifier}`)
      .maybeSingle();

    if (profileError || !userProfile) {
      return { success: true };
    }

    const { data, error: authError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: userProfile.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
      },
    });

    if (authError) throw authError;

    await sendResetPasswordEmail(userProfile.personal_email, data.properties.action_link);

    return { success: true };
  } catch (err: any) {
    console.error("Reset Action Error:", err.message);

    return { success: false, error: "Could not process request." };
  }
}