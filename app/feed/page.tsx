'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { CreatePostDialog } from '@/components/create-post-dialog';
import { PostCard } from '@/components/post-card';
import { CommentForm } from '@/components/comment-form';
import { ReportDialog } from '@/components/report-dialog';
import { supabase } from '@/lib/supabase/client';
import { MapPin, Building2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      domain: string;
    };
  };
  comments?: any[];
}

type FeedTab = 'city' | 'company';

export default function FeedPage() {
  const router = useRouter();
  const isInitialMount = useRef(true); // Prevents the filter effect from firing on load
  
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>('city');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ postId?: string; commentId?: string }>({});

  const fetchPosts = useCallback(async (currentUser: any, tab: FeedTab, category: string) => {
    if (!currentUser) return;

    let query = supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey!inner(
          id, first_name, city, company_id,
          company:companies(name, domain) 
        ),
        comments(
          id, text, created_at,
          user:users!comments_user_id_fkey(id, first_name)
        )
      `)
      .eq('is_removed', false);

    if (tab === 'city') {
      query = query.eq('user.city', currentUser.city);
    } else {
      query = query
        .eq('visibility', 'company')
        .eq('user.company_id', currentUser.company_id);
    }

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feed:', error);
      return;
    }
    setPosts(data || []);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchPosts(user, activeTab, activeCategory);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Effect 1: Core Initialization (Runs exactly once)
  useEffect(() => {
    const initPage = async () => {
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
      await fetchPosts(userData, activeTab, activeCategory);
      setLoading(false);
      
      // Allow filter effect to work for future tab/category changes
      isInitialMount.current = false;
    };

    initPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Effect 2: Filter Change Effect (Skips initial mount and loading state)
  useEffect(() => {
    if (isInitialMount.current || loading) return;

    if (user) {
      fetchPosts(user, activeTab, activeCategory);
    }
  }, [activeTab, activeCategory, fetchPosts]); 

  const handleReply = (postId: string) => {
    setActiveReplyPostId(activeReplyPostId === postId ? null : postId);
  };

  const handleReport = (postId: string) => {
    setReportTarget({ postId });
    setReportDialogOpen(true);
  };

  const handleCommentAdded = () => fetchPosts(user, activeTab, activeCategory);

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

      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200">
        <div className="container mx-auto max-w-3xl flex">
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

          <button
            onClick={() => setActiveTab("company")}
            className={`flex-1 py-4 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "company"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <div className="h-5 w-5 rounded bg-neutral-50 flex items-center justify-center overflow-hidden border border-neutral-100">
              {user.company?.domain ? (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${user.company.domain}&sz=32`}
                  alt=""
                  className="h-3.5 w-3.5 object-contain"
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
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">
              {activeTab === "city" ? `Feed in ${user.city}` : `Inside ${user.company?.name}`}
            </h2>
            {/* <Button
              variant="ghost"
              size="icon"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 text-neutral-400 hover:text-indigo-600 rounded-full"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
            </Button> */}
          </div>
          <CreatePostDialog userId={user.id} onPostCreated={() => fetchPosts(user, activeTab, activeCategory)} />
        </div>

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
                  isActive ? "bg-primary text-primary-foreground border-primary" : "bg-white text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center shadow-sm">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">No posts here yet</h3>
              <p className="text-sm text-neutral-500 max-w-xs mx-auto">
                Be the first to share something with your {activeTab} community.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="transition-transform active:scale-[0.99]">
                <PostCard
                  post={post}
                  currentUserId={user.id}
                  onReply={handleReply}
                  onReport={handleReport}
                  onPostUpdated={() => fetchPosts(user, activeTab, activeCategory)}
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