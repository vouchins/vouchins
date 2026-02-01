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
import { AlertTriangle } from "lucide-react";

interface FlaggedPost {
  id: string;
  text: string;
  flag_reasons: string[];
  user_id: string;
  user: { first_name: string; email: string; company: { name: string } };
}

interface FlaggedTabProps {
  posts: FlaggedPost[];
  onRemovePost: (postId: string) => void;
  onSuspendUser: (userId: string) => void;
}

export function FlaggedTab({
  posts,
  onRemovePost,
  onSuspendUser,
}: FlaggedTabProps) {
  return (
    <div className="space-y-4 outline-none">
      {posts.map((post) => (
        <Card key={post.id} className="bg-white">
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <CardTitle className="text-base font-bold">
                {post.user.first_name}
              </CardTitle>
              <Badge variant="destructive">Auto-Flagged</Badge>
            </div>
            <CardDescription>
              {post.user.email} • {post.user.company.name}
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
      ))}
    </div>
  );
}
