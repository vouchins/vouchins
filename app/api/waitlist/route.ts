import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // Send email to connect@vouchins.com (use a real email service in production)
  // For demo: log to console
  console.log(`Waitlist request: ${email}`);

  // TODO: Integrate with SendGrid, Resend, or SMTP for real email delivery

  return NextResponse.json({ success: true });
}
