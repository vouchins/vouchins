'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');

        const { data: userData } = await supabase
          .from('users')
          .select('is_verified, onboarded')
          .eq('id', user.id)
          .maybeSingle();

        if (userData?.is_verified) {
          if (userData.onboarded) {
            router.push('/feed');
          } else {
            router.push('/onboarding');
          }
        }
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('is_verified, onboarded')
            .eq('id', session.user.id)
            .maybeSingle();

          if (userData?.is_verified) {
            if (userData.onboarded) {
              router.push('/feed');
            } else {
              router.push('/onboarding');
            }
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleResendEmail = async () => {
    setLoading(true);
    setError('');
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;

      setResendSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to resend email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg border border-neutral-200 p-8">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center">
              <Mail className="h-8 w-8 text-neutral-600" />
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-neutral-900 text-center mb-2">
            Verify your email
          </h1>

          <p className="text-neutral-600 text-center mb-6">
            We sent a verification link to
            <br />
            <span className="font-medium text-neutral-900">{email}</span>
          </p>

          {resendSuccess && (
            <Alert className="mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Verification email sent successfully!
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <p className="text-sm text-neutral-600 text-center">
              Click the link in the email to verify your account. You may need
              to check your spam folder.
            </p>

            <Button
              onClick={handleResendEmail}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? 'Sending...' : 'Resend verification email'}
            </Button>

            <Button
              onClick={() => router.push('/login')}
              variant="ghost"
              className="w-full"
            >
              Back to login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
