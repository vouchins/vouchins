import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  EyeOff,
  RefreshCw,
  Search,
  Trash2,
  UserX,
} from "lucide-react";
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
  onAction: (
    action: "ignore" | "remove" | "suspend",
    postIds: string[],
  ) => Promise<boolean>;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export function FlaggedTab({
  posts,
  onAction,
  onRefresh,
  loading,
}: FlaggedTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const filteredPosts = posts.filter((post) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (post.text || "").toLowerCase().includes(searchLower) ||
      (post.user?.full_name || "").toLowerCase().includes(searchLower) ||
      (post.user?.email || "").toLowerCase().includes(searchLower)
    );
  });
  const filteredIds = useMemo(
    () => filteredPosts.map((post) => post.id),
    [filteredPosts],
  );
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someFilteredSelected = filteredIds.some((id) => selectedIds.has(id));

  useEffect(() => {
    const availableIds = new Set(posts.map((post) => post.id));
    setSelectedIds(
      (current) =>
        new Set(Array.from(current).filter((id) => availableIds.has(id))),
    );
  }, [posts]);

  const togglePost = (postId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      checked ? next.add(postId) : next.delete(postId);
      return next;
    });
  };

  const toggleFiltered = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      filteredIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const runAction = async (
    action: "ignore" | "remove" | "suspend",
    postIds: string[],
  ) => {
    setPendingAction(action);
    const completed = await onAction(action, postIds);
    if (completed) {
      setSelectedIds((current) => {
        const next = new Set(current);
        postIds.forEach((id) => next.delete(id));
        return next;
      });
    }
    setPendingAction(null);
  };

  return (
    <div className="space-y-4 outline-none">
      <div className="flex flex-wrap items-center gap-2 mb-4">
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
        {filteredPosts.length > 0 && (
          <label className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-600 shadow-sm">
            <Checkbox
              checked={
                allFilteredSelected
                  ? true
                  : someFilteredSelected
                    ? "indeterminate"
                    : false
              }
              onCheckedChange={(checked) => toggleFiltered(checked === true)}
              aria-label="Select all visible flagged posts"
            />
            Select visible
          </label>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
          <span className="mr-auto text-xs font-bold text-indigo-800">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={pendingAction !== null}
            onClick={() => runAction("ignore", Array.from(selectedIds))}
          >
            <EyeOff className="mr-2 h-4 w-4" />
            Ignore
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pendingAction !== null}
            onClick={() => runAction("suspend", Array.from(selectedIds))}
          >
            <UserX className="mr-2 h-4 w-4" />
            Suspend Users
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pendingAction !== null}
            onClick={() => runAction("remove", Array.from(selectedIds))}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove Content
          </Button>
        </div>
      )}

      {filteredPosts.length === 0 ? (
        <Card className="border-dashed border-2 py-12 text-center text-neutral-500 text-sm bg-white">
          <CardContent>No flagged posts found.</CardContent>
        </Card>
      ) : (
        filteredPosts.map((post) => (
        <Card key={post.id} className="bg-white">
          <CardHeader className="pb-2">
            <div className="flex justify-between gap-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedIds.has(post.id)}
                  onCheckedChange={(checked) =>
                    togglePost(post.id, checked === true)
                  }
                  aria-label={`Select post by ${post.user.full_name}`}
                />
                <CardTitle className="text-base font-bold">
                  {post.user.full_name}
                </CardTitle>
              </div>
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
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pendingAction !== null}
                onClick={() => runAction("ignore", [post.id])}
              >
                <EyeOff className="mr-2 h-4 w-4" />
                Ignore
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={pendingAction !== null}
                onClick={() => runAction("remove", [post.id])}
              >
                Remove Content
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pendingAction !== null}
                onClick={() => runAction("suspend", [post.id])}
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
