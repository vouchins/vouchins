import { Navigation } from "@/components/navigation";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <><Navigation/><main className="mx-auto max-w-3xl space-y-4 p-6"><Skeleton className="h-9 w-40"/><Skeleton className="h-96 w-full"/></main></>; }
