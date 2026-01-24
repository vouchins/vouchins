'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { CreatePostDialog } from '@/components/create-post-dialog';
import { PostCard } from '@/components/post-card';
import { CommentForm } from '@/components/comment-form';
import { ReportDialog } from '@/components/report-dialog';
import { supabase } from '@/lib/supabase/client';
import { MapPin, Building2 } from 'lucide-react';

interface Post {
  id: string;
  text: string;
  category: "housing" | "buy_sell" | "recommendations";
  housing_type?: "flatmates" | "rentals" | "sale" | "pg" | null;
  visibility: "company" | "all";
  image_urls: string[];
  is_flagged: boolean;
  flag_reasons: string[];
  created_at: string;
  user: {
    id: string;
    first_name: string;
    city: string;
    company: {
      name: string;
      domain: string; // <--- Add this line
    };
  };
  comments?: any[];
}

type FeedTab = 'city' | 'company';

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FeedTab>('city');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ postId?: string; commentId?: string }>({});

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push('/login'); return; }

      const { data: userData } = await supabase
        .from('users')
        .select(`*, company:companies(*)`)
        .eq('id', authUser.id)
        .maybeSingle();

      if (!userData) { router.push('/login'); return; }
      if (!userData.is_verified) { router.push('/verify-email'); return; }
      if (!userData.onboarded) { router.push('/onboarding'); return; }

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
      id,
      first_name,
      city,
      company_id,
      company:companies(name, domain) 
    ),
        comments(
          id,
          text,
          created_at,
          user:users!comments_user_id_fkey(first_name)
        )
      `)
      .eq('is_removed', false)
      .order('created_at', { ascending: false });

    // Tab Logic: Location vs Company
    if (activeTab === 'city') {
      // In a real app, you might filter by user.city here
      // query = query.eq('user.city', user.city); 
    } else {
      query = query.eq('visibility', 'company').eq('user.company_id', user.company_id);
    }

    // Category Logic
    if (activeCategory !== 'all') {
      query = query.eq('category', activeCategory);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching posts:', error);
      return;
    }
    setPosts(data || []);
  };

  useEffect(() => {
    if (user) { fetchPosts(); }
  }, [user, activeTab, activeCategory]);

  const handleReply = (postId: string) => {
    setActiveReplyPostId(activeReplyPostId === postId ? null : postId);
  };

  const handleReport = (postId: string) => {
    setReportTarget({ postId });
    setReportDialogOpen(true);
  };

  const handleCommentAdded = () => fetchPosts();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-600 font-medium">Loading your feed...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />

      {/* STICKY TAB NAVIGATION */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200">
        <div className="container mx-auto max-w-3xl flex">
          {/* City Tab */}
          <button
            onClick={() => setActiveTab("city")}
            className={`flex-1 py-4 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "city"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <MapPin className="h-4 w-4" />
            {user.city || "My City"}
          </button>

          {/* Company Tab */}
          <button
            onClick={() => setActiveTab("company")}
            className={`flex-1 py-4 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "company"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {/* Company Logo in Tab */}
            <div className="h-5 w-5 rounded bg-neutral-50 flex items-center justify-center overflow-hidden border border-neutral-100">
              {user.company?.domain ? (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${user.company.domain}&sz=32`}
                  alt=""
                  className="h-3.5 w-3.5 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <Building2 className="h-3 w-3 text-neutral-400" />
              )}
            </div>
            {user.company?.name || "My Company"}
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* HEADER & ACTION */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="min-w-0">
            {" "}
            {/* min-w-0 prevents text overflow issues in flex */}
            <h2 className="text-xl font-bold text-foreground truncate">
              {activeTab === "city"
                ? `Feed in ${user.city}`
                : `Inside ${user.company?.name}`}
            </h2>
          </div>

          <CreatePostDialog userId={user.id} onPostCreated={fetchPosts}>
            {/* The trigger button inside your dialog component */}
          </CreatePostDialog>
        </div>

        {/* CATEGORY PILLS */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {[
            { id: "all", label: "All Posts" },
            { id: "recommendations", label: "Recommendations" },
            { id: "housing", label: "Housing" },
            { id: "buy_sell", label: "Buy & Sell" },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* POSTS LIST */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center shadow-sm">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                No posts here yet
              </h3>
              <p className="text-sm text-neutral-500 max-w-xs mx-auto">
                Be the first to ask for a recommendation or share something with
                your {activeTab} community.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="transition-transform active:scale-[0.99]"
              >
                <PostCard
                  post={post}
                  currentUserId={user.id}
                  onReply={handleReply}
                  onReport={handleReport}
                  onPostUpdated={fetchPosts}
                />
                {activeReplyPostId === post.id && (
                  <div className="mt-1">
                    <CommentForm
                      postId={post.id}
                      userId={user.id}
                      onCommentAdded={handleCommentAdded}
                    />
                  </div>
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