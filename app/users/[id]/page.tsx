'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PostCard } from '@/components/post-card';
import {
  Building2,
  MapPin,
  ExternalLink,
  MessageCircle,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { Navigation } from '@/components/navigation';

export default function UserProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState('');

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setMe(user);

      const { data: profileData } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          city,
          created_at,
          linkedin_url,
          bio,
          company:companies(name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (!profileData) {
        router.push('/feed');
        return;
      }

      setProfile(profileData);
      setBioDraft(profileData.bio || '');

      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          user:users!posts_user_id_fkey(
            id,
            first_name,
            city,
            company:companies(name)
          ),
          comments(
            id,
            text,
            created_at,
            user:users!comments_user_id_fkey(first_name)
          )
        `)
        .eq('user_id', id)
        .eq('is_removed', false)
        .order('created_at', { ascending: false });

      setPosts(postsData || []);
      setLoading(false);
    };

    load();
  }, [id, router]);

  const saveBio = async () => {
    await supabase
      .from('users')
      .update({ bio: bioDraft.trim() })
      .eq('id', me.id);

    setProfile({ ...profile, bio: bioDraft.trim() });
    setEditingBio(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        Loading profile…
      </div>
    );
  }

  if (!profile) return null;

  const isOwner = me?.id === profile.id;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* ---------------- Profile Card ---------------- */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-full bg-neutral-200 flex items-center justify-center text-lg font-semibold text-neutral-700">
              {profile.first_name.charAt(0)}
            </div>

            <div>
              <h1 className="text-xl font-semibold text-neutral-900">
                {profile.first_name}
              </h1>

              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Building2 className="h-4 w-4" />
                {profile.company?.name}
              </div>

              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <MapPin className="h-4 w-4" />
                {profile.city}
              </div>
            </div>
          </div>

          {/* ---------------- Bio ---------------- */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-neutral-900">About</h3>

              {isOwner && !editingBio && (
                <button
                  onClick={() => setEditingBio(true)}
                  className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>

            {editingBio ? (
              <>
                <Textarea
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value.slice(0, 300))}
                  placeholder="Write a short bio about yourself…"
                  className="mt-1"
                />

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-neutral-500">
                    {bioDraft.length}/300
                  </span>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveBio}>
                      <Check className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setBioDraft(profile.bio || '');
                        setEditingBio(false);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                {profile.bio || (
                  <span className="text-neutral-400">
                    No bio added yet.
                  </span>
                )}
              </p>
            )}
          </div>

          {/* ---------------- LinkedIn ---------------- */}
          {profile.linkedin_url && (
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:underline mb-4"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              LinkedIn Profile
            </a>
          )}

          {isOwner === false && (
            <Button
              className="w-full"
              onClick={() => router.push(`/messages/${profile.id}`)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
          )}
          {/* Meta */}
          <div className="text-sm text-neutral-600 mt-4">
            Member since{" "}
            {new Date(me.created_at).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>

        

        {/* ---------------- User Posts ---------------- */}
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            Posts by {profile.first_name}
          </h2>

          {posts.length === 0 ? (
            <div className="bg-white border rounded-lg p-8 text-center text-sm text-neutral-600">
              No posts yet.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={me.id}
                  onReply={() => {}}
                  onReport={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
