'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { CreatePostDialog } from '@/components/create-post-dialog';
import { FilterBar } from '@/components/filter-bar';
import { PostCard } from '@/components/post-card';
import { CommentForm } from '@/components/comment-form';
import { ReportDialog } from '@/components/report-dialog';
import { supabase } from '@/lib/supabase/client';

interface Post {
  id: string;
  text: string;
  category: 'housing' | 'buy_sell' | 'recommendations';
  visibility: 'company' | 'all';
  image_url: string | null;
  is_flagged: boolean;
  flag_reasons: string[];
  created_at: string;
  user: {
    first_name: string;
    city: string;
    company: {
      name: string;
    };
  };
  comments?: any[];
}

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>({});
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(
    null
  );
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    postId?: string;
    commentId?: string;
  }>({});

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('id', authUser.id)
        .maybeSingle();

      if (!userData) {
        router.push('/login');
        return;
      }

      if (!userData.is_verified) {
        router.push('/verify-email');
        return;
      }

      if (!userData.onboarded) {
        router.push('/onboarding');
        return;
      }

      setUser(userData);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const fetchPosts = async () => {
    if (!user) return;

    let query = supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(
          first_name,
          city,
          company:companies(name)
        ),
        comments(
          id,
          text,
          created_at,
          user:users!comments_user_id_fkey(
            first_name
          )
        )
      `)
      .eq('is_removed', false)
      .order('created_at', { ascending: false });

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.visibility === 'company') {
      query = query.eq('visibility', 'company');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return;
    }

    setPosts(data || []);
  };

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, filters]);

  const handleReply = (postId: string) => {
    setActiveReplyPostId(activeReplyPostId === postId ? null : postId);
  };

  const handleReport = (postId: string) => {
    setReportTarget({ postId });
    setReportDialogOpen(true);
  };

  const handleCommentAdded = () => {
    fetchPosts();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation user={user} />

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900">Feed</h2>
            <p className="text-sm text-neutral-600 mt-1">
              What your community needs
            </p>
          </div>
          <CreatePostDialog userId={user.id} onPostCreated={fetchPosts} />
        </div>

        <FilterBar onFilterChange={setFilters} />

        <div className="mt-6 space-y-4">
          {posts.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
              <p className="text-neutral-600">
                No posts yet. Be the first to post!
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id}>
                <PostCard
                  post={post}
                  currentUserId={user.id}
                  onReply={handleReply}
                  onReport={handleReport}
                />
                {activeReplyPostId === post.id && (
                  <CommentForm
                    postId={post.id}
                    userId={user.id}
                    onCommentAdded={handleCommentAdded}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        postId={reportTarget.postId}
        commentId={reportTarget.commentId}
        userId={user.id}
      />
    </div>
  );
}
