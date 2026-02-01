import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AdminStatsProps {
  pendingReports: number;
  flaggedPosts: number;
  pendingWaitlist: number;
  totalUsers: number;
}

export function AdminStats({
  pendingReports,
  flaggedPosts,
  pendingWaitlist,
  totalUsers,
}: AdminStatsProps) {
  const stats = [
    {
      label: "Total Users",
      value: totalUsers,
      description: "Verified platform members",
      primary: false,
    },
    {
      label: "Content Integrity",
      value: pendingReports,
      description: "Pending user reports",
      primary: false,
    },
    {
      label: "Automated Safety",
      value: flaggedPosts,
      description: "Auto-flagged violations",
      primary: false,
    },
    {
      label: "Access Management",
      value: pendingWaitlist,
      description: "Pending manual approvals",
      primary: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className={`border-none shadow-sm bg-white ${stat.primary ? "ring-1 ring-primary/10" : ""}`}
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
              {stat.label}
            </CardDescription>
            <CardTitle
              className={`text-4xl font-bold ${stat.primary ? "text-primary" : "text-neutral-900"}`}
            >
              {stat.value}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 font-medium">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
