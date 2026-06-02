import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Flag, AlertTriangle, Clock } from "lucide-react";

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
      icon: <Users className="h-5 w-5 text-indigo-500" />,
      bg: "bg-indigo-50/40",
      border: "border-indigo-100",
    },
    {
      label: "Content Integrity",
      value: pendingReports,
      description: "Pending user reports",
      icon: <Flag className="h-5 w-5 text-red-500" />,
      bg: "bg-red-50/40",
      border: "border-red-100",
    },
    {
      label: "Automated Safety",
      value: flaggedPosts,
      description: "Auto-flagged violations",
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      bg: "bg-amber-50/40",
      border: "border-amber-100",
    },
    {
      label: "Manual Approvals",
      value: pendingWaitlist,
      description: "Pending identity verifications",
      icon: <Clock className="h-5 w-5 text-primary" />,
      bg: "bg-primary/5",
      border: "border-primary/10",
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mb-10">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className={`border ${stat.border} shadow-sm bg-white hover:shadow-md hover:scale-[1.02] transition-all duration-300 group`}
        >
          <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1 text-left">
              <CardDescription className="text-[10px] uppercase tracking-wider font-black text-neutral-400 group-hover:text-neutral-500 transition-colors">
                {stat.label}
              </CardDescription>
              <CardTitle
                className={`text-3xl font-black ${stat.highlight ? "text-primary" : "text-neutral-900"}`}
              >
                {stat.value}
              </CardTitle>
            </div>
            <div className={`p-2.5 rounded-xl ${stat.bg} border ${stat.border}`}>
              {stat.icon}
            </div>
          </CardHeader>
          <CardContent className="text-left">
            <p className="text-xs text-neutral-500 font-medium">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
