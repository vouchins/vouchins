'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import {
  isCorporateEmail,
  extractDomainFromEmail,
  deriveCompanyNameFromDomain,
  validateFirstName,
} from '@/lib/auth/validation';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateFirstName(firstName)) {
      setError('First name must be between 2-50 characters');
      setLoading(false);
      return;
    }

    if (!isCorporateEmail(email)) {
      setError(
        'Please use your corporate email. Personal email domains (Gmail, Yahoo, etc.) are not allowed.'
      );
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const domain = extractDomainFromEmail(email);
        const companyName = deriveCompanyNameFromDomain(domain);

        let companyId: string;
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('domain', domain)
          .maybeSingle();

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert({ domain, name: companyName })
            .select('id')
            .single();

          if (companyError) throw companyError;
          companyId = newCompany.id;
        }

        const { error: userError } = await supabase.from('users').insert({
          id: authData.user.id,
          email,
          first_name: firstName,
          company_id: companyId,
        });

        if (userError) throw userError;

        router.push('/verify-email');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-10 w-10 text-neutral-700" />
          </div>
          <h1 className="text-3xl font-semibold text-neutral-900 mb-2">
            Join Vouchins
          </h1>
          <p className="text-neutral-600">
            A trusted community for corporate employees
          </p>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="email">Corporate Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="mt-1.5"
              />
              <p className="text-xs text-neutral-500 mt-1.5">
                Use your work email. Personal emails are not allowed.
              </p>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                required
                minLength={8}
                className="mt-1.5"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-neutral-600">Already have an account? </span>
            <Link
              href="/login"
              className="text-neutral-900 font-medium hover:underline"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
