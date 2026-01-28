import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Admin key is required
    )

    const { waitlistId } = await req.json()

    // 1. Fetch waitlist details
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .eq('id', waitlistId)
      .single()

    if (fetchError || !entry) throw new Error('Waitlist entry not found')

    // 2. Find the user in Auth
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    const targetUser = users.users.find(u => u.email === entry.corporate_email)

    if (!targetUser) throw new Error('User not found in Auth system')

    // 3. Confirm the user (Bypasses OTP)
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { email_confirm: true }
    )
    if (confirmError) throw confirmError

    // 4. Update Waitlist Status
    await supabaseAdmin
      .from('waitlist')
      .update({ status: 'approved' })
      .eq('id', waitlistId)

    // 5. Trigger Email to Gmail (Optional: Use Resend or Postmark here)
    // console.log(`Sending approval email to ${entry.personal_email}...`)

    return new Response(JSON.stringify({ message: 'User approved successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})