import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FlaggedPost {
  id: string;
  text: string;
  flag_reasons: string[];
  user_id: string;
  user: { full_name: string; email: string; company: { name: string } | null };
}

interface FlaggedTabProps {
  posts: FlaggedPost[];
  onRemovePost: (postId: string) => void;
  onSuspendUser: (userId: string) => void;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export function FlaggedTab({
  posts,
  onRemovePost,
  onSuspendUser,
  onRefresh,
  loading,
}: FlaggedTabProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPosts = posts.filter((post) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (post.text || "").toLowerCase().includes(searchLower) ||
      (post.user?.full_name || "").toLowerCase().includes(searchLower) ||
      (post.user?.email || "").toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4 outline-none">
      {/* Search & Refresh Bar */}
      <div className="flex items-center gap-2 mb-4 justify-start">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search flagged content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-white shadow-sm rounded-lg text-xs"
          />
        </div>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
            className="h-9 px-3 border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-lg shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      {filteredPosts.length === 0 ? (
        <Card className="border-dashed border-2 py-12 text-center text-neutral-500 text-sm bg-white">
          <CardContent>No flagged posts found.</CardContent>
        </Card>
      ) : (
        filteredPosts.map((post) => (
        <Card key={post.id} className="bg-white">
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <CardTitle className="text-base font-bold">
                {post.user.full_name}
              </CardTitle>
              <Badge variant="destructive">Auto-Flagged</Badge>
            </div>
            <CardDescription>
              {post.user.email} • {post.user.company?.name || "No Company"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert
              variant="destructive"
              className="bg-red-50/50 border-red-100"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs font-medium">
                Flag Reasons: {post.flag_reasons.join(", ")}
              </AlertDescription>
            </Alert>
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100 text-sm whitespace-pre-wrap italic">
              "{post.text}"
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onRemovePost(post.id)}
              >
                Remove Content
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSuspendUser(post.user_id)}
              >
                Suspend User
              </Button>
            </div>
          </CardContent>
        </Card>
        ))
      )}
    </div>
  );
}
