'use server';

import { supabase } from '@/lib/supabase/client';
import { cookies } from 'next/headers';

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();

  if (!session?.user) {
    return null;
  }

  const { data: user } = await supabase
    .from('users')
    .select(`
      *,
      company:companies(*)
    `)
    .eq('id', session.user.id)
    .maybeSingle();

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function requireVerified() {
  const user = await requireAuth();

  if (!user.is_verified) {
    throw new Error('Email not verified');
  }

  return user;
}

export async function requireOnboarded() {
  const user = await requireVerified();

  if (!user.onboarded) {
    throw new Error('Onboarding not completed');
  }

  return user;
}
