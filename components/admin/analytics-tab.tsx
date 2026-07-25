"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Eye,
  Loader2,
  MessageSquare,
  MousePointer2,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductSummary {
  totalUsers: number;
  verifiedUsers: number;
  newUsers7d: number;
  dau: number;
  wau: number;
  mau: number;
  stickiness: number;
  posts30d: number;
  comments30d: number;
  messages30d: number;
  vouches30d: number;
}

interface ProductTrendPoint {
  date: string;
  activeUsers: number;
  pageViews: number;
}

interface BlogSummary {
  views30d: number;
  readers30d: number;
  engagementRate: number;
  completionRate: number;
}

interface BlogPostMetric {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: string | null;
  totalViews: number;
  uniqueReaders: number;
  views7d: number;
  readers7d: number;
  views30d: number;
  readers30d: number;
  engaged30d: number;
  completed30d: number;
  engagementRate: number;
  completionRate: number;
}

interface BlogTrendPoint {
  date: string;
  views: number;
  readers: number;
}

interface AnalyticsResponse {
  product: {
    summary: ProductSummary;
    trend: ProductTrendPoint[];
  };
  blog: {
    summary: BlogSummary;
    posts: BlogPostMetric[];
    trend: BlogTrendPoint[];
  };
  generatedAt: string;
}

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-neutral-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
              {label}
            </p>
            <p className="mt-2 text-3xl font-black tracking-tight text-neutral-950">
              {typeof value === "number" ? compactNumber.format(value) : value}
            </p>
            <p className="mt-1 text-xs font-medium text-neutral-500">{detail}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-700">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatChartDate(value: string) {
  return format(parseISO(value), "MMM d");
}

export function AnalyticsTab() {
  const [days, setDays] = useState("30");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/analytics?days=${days}`);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "Unable to load analytics");
      }

      setAnalytics(body);
    } catch (loadError: any) {
      setError(loadError?.message || "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (loading && !analytics) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-center gap-3 text-sm font-semibold text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          Building analytics report...
        </div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <Button variant="outline" onClick={() => void loadAnalytics()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const { product, blog } = analytics;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-700" />
            <h2 className="text-xl font-black tracking-tight text-neutral-950">
              Product analytics
            </h2>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Registered-user activity and first-party blog performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void loadAnalytics()}
            disabled={loading}
            title="Refresh analytics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-black text-neutral-900">Audience health</h3>
          <p className="text-sm text-neutral-500">
            DAU, WAU and MAU count distinct signed-in members active in each rolling window.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="DAU"
            value={product.summary.dau}
            detail="Active today"
            icon={<Activity className="h-5 w-5" />}
          />
          <MetricCard
            label="WAU"
            value={product.summary.wau}
            detail="Active in the last 7 days"
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            label="MAU"
            value={product.summary.mau}
            detail="Active in the last 30 days"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <MetricCard
            label="Stickiness"
            value={`${product.summary.stickiness}%`}
            detail="DAU divided by MAU"
            icon={<MousePointer2 className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total members"
            value={product.summary.totalUsers}
            detail={`${compactNumber.format(product.summary.verifiedUsers)} verified`}
            icon={<UserCheck className="h-5 w-5" />}
          />
          <MetricCard
            label="New members"
            value={product.summary.newUsers7d}
            detail="Registered in the last 7 days"
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            label="Contributions"
            value={product.summary.posts30d + product.summary.comments30d}
            detail={`${product.summary.posts30d} posts, ${product.summary.comments30d} replies`}
            icon={<MessageSquare className="h-5 w-5" />}
          />
          <MetricCard
            label="Connections"
            value={product.summary.messages30d + product.summary.vouches30d}
            detail={`${product.summary.messages30d} messages, ${product.summary.vouches30d} vouches`}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
        </div>

        <Card className="border-neutral-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-black">
              Daily active users
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={product.trend}>
                <defs>
                  <linearGradient id="activeUsersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4338ca" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#4338ca" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  fontSize={11}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip labelFormatter={(value) => formatChartDate(String(value))} />
                <Area
                  type="monotone"
                  dataKey="activeUsers"
                  name="Active users"
                  stroke="#4338ca"
                  strokeWidth={2.5}
                  fill="url(#activeUsersGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-black text-neutral-900">Blog performance</h3>
          <p className="text-sm text-neutral-500">
            Engagement means at least 30 seconds on an article. Completion means reaching 80% scroll depth.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Blog views"
            value={blog.summary.views30d}
            detail="Last 30 days"
            icon={<Eye className="h-5 w-5" />}
          />
          <MetricCard
            label="Unique readers"
            value={blog.summary.readers30d}
            detail="Last 30 days"
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            label="Engagement"
            value={`${blog.summary.engagementRate}%`}
            detail="Readers active for 30 seconds"
            icon={<Activity className="h-5 w-5" />}
          />
          <MetricCard
            label="Completion"
            value={`${blog.summary.completionRate}%`}
            detail="Readers reaching 80% depth"
            icon={<BookOpen className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
          <Card className="border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-black">
                Views and readers
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={blog.trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                    fontSize={11}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip labelFormatter={(value) => formatChartDate(String(value))} />
                  <Line
                    type="monotone"
                    dataKey="views"
                    name="Views"
                    stroke="#4338ca"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="readers"
                    name="Unique readers"
                    stroke="#ea580c"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-black">
                Article leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead className="text-right">30d views</TableHead>
                      <TableHead className="text-right">Readers</TableHead>
                      <TableHead className="text-right">Engaged</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blog.posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div className="max-w-[260px]">
                            <Link
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              className="line-clamp-1 font-bold text-neutral-900 hover:text-indigo-700"
                            >
                              {post.title}
                            </Link>
                            <Badge
                              variant="secondary"
                              className="mt-1 px-1.5 py-0 text-[9px] uppercase"
                            >
                              {post.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {post.views30d}
                        </TableCell>
                        <TableCell className="text-right">
                          {post.readers30d}
                        </TableCell>
                        <TableCell className="text-right">
                          {post.engagementRate}%
                        </TableCell>
                        <TableCell className="text-right">
                          {post.completionRate}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {blog.posts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-neutral-500">
                          No blog posts found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <p className="text-right text-xs text-neutral-400">
        Updated {format(parseISO(analytics.generatedAt), "MMM d, yyyy 'at' h:mm a")}
      </p>
    </div>
  );
}
