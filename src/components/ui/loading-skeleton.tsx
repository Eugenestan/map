import { cn } from "@/lib/cn";

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-zinc-200", className)} />
  );
}

export function PlaceCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
      <LoadingSkeleton className="h-5 w-3/4" />
      <LoadingSkeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <LoadingSkeleton className="h-6 w-20 rounded-full" />
        <LoadingSkeleton className="h-6 w-24 rounded-full" />
      </div>
      <LoadingSkeleton className="h-4 w-full" />
    </div>
  );
}
