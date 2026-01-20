'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, ExternalLink, MessageCircle } from 'lucide-react';

export default function UserProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          city,
          created_at,
          linkedin_url,
          company:companies(name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        router.push('/feed');
        return;
      }

      setUser(data);
      setLoading(false);
    };

    fetchProfile();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading profile...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-white border rounded-lg p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-full bg-neutral-200 flex items-center justify-center text-lg font-semibold text-neutral-700">
              {user.first_name.charAt(0)}
            </div>

            <div>
              <h1 className="text-xl font-semibold text-neutral-900">
                {user.first_name}
              </h1>

              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Building2 className="h-4 w-4" />
                {user.company?.name}
              </div>

              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <MapPin className="h-4 w-4" />
                {user.city}
              </div>
            </div>
          </div>

          {/* LinkedIn */}
          {user.linkedin_url && (
            <a
              href={user.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:underline mb-6"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              LinkedIn Profile
            </a>
          )}

          {/* Action */}
          <div className="mb-6">
            <Button
              className="w-full"
              onClick={() => router.push(`/messages/${user.id}`)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
          </div>

          {/* Meta */}
          <div className="text-sm text-neutral-600">
            Member since{" "}
            {new Date(user.created_at).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
