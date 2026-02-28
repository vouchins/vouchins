"use server";

import { createClient } from "@supabase/supabase-js";
import { sendResetPasswordEmail } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ResetResponse = {
  success: boolean;
  error?: string;
};

export async function requestPasswordReset(identifier: string): Promise<ResetResponse> {
  try {
    // 1. Simplified fetch focusing only on the primary email
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("email", identifier)
      .maybeSingle(); // This works perfectly when the column has a UNIQUE constraint

    // 2. Log any unexpected DB errors to your terminal
    if (profileError) {
      console.error("Database Fetch Error:", profileError.message);
      return { success: true }; // Return true for security/enumeration prevention
    }

    if (!userProfile) {
      console.log(`No user found for email: ${identifier}`);
      return { success: true };
    }

    // 3. Generate the Supabase Auth Link
    const { data, error: authError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: userProfile.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
      },
    });

    if (authError) throw authError;

    // 4. Send the email via SES/Nodemailer
    console.log(`Sending reset email to: ${userProfile.email}`);
    await sendResetPasswordEmail(userProfile.email, data.properties.action_link);

    return { success: true };
  } catch (err: any) {
    console.error("Reset Action Error:", err.message);
    return { success: false, error: "Could not process request." };
  }
}