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

    const finalCity = city === 'Other' ? customCity.trim() : city;

    if (!finalCity) {
      setError('Please select or enter your city');
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
          is_verified: true,
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

          <p className="text-neutral-600 text-center mb-8">
           {"Let's complete your profile to get started"}
          </p>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="city">Your City</Label>
              <Select value={city} onValueChange={setCity}>
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
                <Label htmlFor="customCity">Enter your city</Label>
                <Input
                  id="customCity"
                  type="text"
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder="Enter city name"
                  required
                  className="mt-1.5"
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Completing...' : 'Complete Setup'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
