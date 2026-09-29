import { Skeleton } from "@/components/ui/skeleton";

export function PosterGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="aspect-[2/3] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function EpisodeRowsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-2">
          <Skeleton className="h-14 w-24 shrink-0 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="size-9 rounded-full" />
        </div>
      ))}
    </div>
  );
}
