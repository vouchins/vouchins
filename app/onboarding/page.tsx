'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { INDIAN_CITIES } from '@/lib/constants';
import { Input } from '@/components/ui/input';

export default function OnboardingPage() {
  const router = useRouter();

  const [city, setCity] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('is_verified, onboarded')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData?.is_verified) {
        router.push('/verify-email');
        return;
      }

      if (userData?.onboarded) {
        router.push('/feed');
        return;
      }

      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!agreed) {
      setError('You must agree to the community guidelines to continue.');
      setSubmitting(false);
      return;
    }

    const finalCity = city === 'Other' ? customCity.trim() : city;

    if (!finalCity) {
      setError('Please select or enter your city.');
      setSubmitting(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          city: finalCity,
          onboarded: true,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      router.push('/feed');
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg border border-neutral-200 p-8">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-neutral-600" />
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-neutral-900 text-center mb-2">
            Welcome to Vouchins
          </h1>

          <p className="text-neutral-600 text-center mb-6">
            Let’s complete your profile to get started
          </p>

          {/* Community Guidelines */}
          <div className="bg-neutral-50 border rounded-md p-4 text-sm text-neutral-700 mb-6">
            <p className="font-medium mb-2">Community Guidelines</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Be respectful and professional towards other members</li>
              <li>No harassment, hate speech, or abusive behavior</li>
              <li>No illegal activities, scams, or spam content</li>
              <li>Violations may result in content removal or account suspension</li>
            </ul>

            <div className="flex items-start gap-2 mt-4">
              <input
                id="agree"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1"
              />
              <Label htmlFor="agree" className="text-sm cursor-pointer">
                I understand and agree to follow these guidelines
              </Label>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>Your City</Label>
              <Select
                value={city}
                onValueChange={setCity}
                disabled={!agreed}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select your city" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {city === 'Other' && (
              <div>
                <Label>Enter your city</Label>
                <Input
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder="Enter city name"
                  disabled={!agreed}
                  className="mt-1.5"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!agreed || submitting}
            >
              {submitting ? 'Completing...' : 'Complete Setup'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
