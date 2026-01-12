'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Flag,
  AlertTriangle,
  UserX,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [flaggedPosts, setFlaggedPosts] = useState<any[]>([]);

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

      if (!userData || !userData.is_admin) {
        router.push('/feed');
        return;
      }

      setUser(userData);
      await fetchReports();
      await fetchFlaggedPosts();
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const fetchReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:users!reports_reporter_id_fkey(first_name, email),
        post:posts(
          id,
          text,
          user:users!posts_user_id_fkey(first_name, email)
        ),
        comment:comments(
          id,
          text,
          user:users!comments_user_id_fkey(first_name, email)
        )
      `)
      .order('created_at', { ascending: false });

    setReports(data || []);
  };

  const fetchFlaggedPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(
          first_name,
          email,
          company:companies(name)
        )
      `)
      .eq('is_flagged', true)
      .eq('is_removed', false)
      .order('created_at', { ascending: false });

    setFlaggedPosts(data || []);
  };

  const handleReviewReport = async (
    reportId: string,
    status: 'reviewed' | 'dismissed'
  ) => {
    if (!user) return;

    const { error } = await supabase
      .from('reports')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (!error) {
      await fetchReports();
    }
  };

  const handleRemovePost = async (postId: string) => {
    const { error } = await supabase
      .from('posts')
      .update({ is_removed: true })
      .eq('id', postId);

    if (!error) {
      await fetchFlaggedPosts();
      await fetchReports();
    }
  };

  const handleDisableUser = async (userId: string) => {
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', userId);

    if (!error) {
      await fetchReports();
      await fetchFlaggedPosts();
    }
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

  const pendingReports = reports.filter((r) => r.status === 'pending');

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation user={user} />

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-neutral-900">
            Admin Dashboard
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            Moderate content and manage reports
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600">
                Pending Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-neutral-900">
                {pendingReports.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600">
                Flagged Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-neutral-900">
                {flaggedPosts.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600">
                Total Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-neutral-900">
                {reports.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reports">
              <Flag className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="flagged">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Auto-Flagged
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-4">
            {reports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-neutral-600">No reports yet</p>
                </CardContent>
              </Card>
            ) : (
              reports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center space-x-2">
                          <span>Report from {report.reporter.first_name}</span>
                          <Badge
                            variant={
                              report.status === 'pending'
                                ? 'default'
                                : report.status === 'reviewed'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {report.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {formatDistanceToNow(new Date(report.created_at), {
                            addSuffix: true,
                          })}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-700 mb-1">
                        Reason
                      </p>
                      <p className="text-sm text-neutral-600">
                        {report.reason}
                      </p>
                    </div>

                    {report.post && (
                      <div>
                        <p className="text-sm font-medium text-neutral-700 mb-1">
                          Reported Post
                        </p>
                        <div className="bg-neutral-50 p-3 rounded border border-neutral-200">
                          <p className="text-xs text-neutral-500 mb-1">
                            By {report.post.user.first_name} (
                            {report.post.user.email})
                          </p>
                          <p className="text-sm text-neutral-800">
                            {report.post.text.substring(0, 200)}
                            {report.post.text.length > 200 && '...'}
                          </p>
                        </div>
                      </div>
                    )}

                    {report.comment && (
                      <div>
                        <p className="text-sm font-medium text-neutral-700 mb-1">
                          Reported Comment
                        </p>
                        <div className="bg-neutral-50 p-3 rounded border border-neutral-200">
                          <p className="text-xs text-neutral-500 mb-1">
                            By {report.comment.user.first_name} (
                            {report.comment.user.email})
                          </p>
                          <p className="text-sm text-neutral-800">
                            {report.comment.text}
                          </p>
                        </div>
                      </div>
                    )}

                    {report.status === 'pending' && (
                      <div className="flex space-x-2 pt-2">
                        {report.post && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemovePost(report.post.id)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Remove Post
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleReviewReport(report.id, 'reviewed')
                          }
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Reviewed
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleReviewReport(report.id, 'dismissed')
                          }
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="flagged" className="space-y-4">
            {flaggedPosts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-neutral-600">No flagged posts</p>
                </CardContent>
              </Card>
            ) : (
              flaggedPosts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Post by {post.user.first_name}
                        </CardTitle>
                        <CardDescription>
                          {post.user.email} · {post.user.company.name}
                        </CardDescription>
                      </div>
                      <Badge variant="destructive">Auto-flagged</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {post.flag_reasons.join(', ')}
                        </AlertDescription>
                      </Alert>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-neutral-700 mb-2">
                        Post Content
                      </p>
                      <div className="bg-neutral-50 p-4 rounded border border-neutral-200">
                        <p className="text-sm text-neutral-800 whitespace-pre-wrap">
                          {post.text}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemovePost(post.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Remove Post
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDisableUser(post.user_id)}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Disable User
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
