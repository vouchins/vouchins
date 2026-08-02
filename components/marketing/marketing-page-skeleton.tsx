import { Navigation } from "@/components/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export function MarketingPageSkeleton() {
  return <><Navigation/><main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8"><div className="flex items-center justify-between gap-4"><div className="space-y-2"><Skeleton className="h-8 w-64"/><Skeleton className="h-4 w-80 max-w-full"/></div><Skeleton className="h-9 w-24"/></div><Skeleton className="h-10 w-full max-w-lg"/><div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-64"/><Skeleton className="h-64"/></div></main></>;
}
