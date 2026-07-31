import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedIconProps {
  className?: string;
  label?: string;
}

export function VerifiedIcon({
  className,
  label = "Verified member",
}: VerifiedIconProps) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      title={label}
      aria-label={label}
      role="img"
    >
      <ShieldCheck
        aria-hidden="true"
        className={cn("h-4 w-4 fill-blue-50 text-blue-600", className)}
      />
    </span>
  );
}
