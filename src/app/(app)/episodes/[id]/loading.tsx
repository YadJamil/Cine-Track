import { Skeleton } from "@/components/ui/skeleton";

export default function EpisodeLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Skeleton className="h-4 w-32" />
      <div className="flex flex-col gap-4 sm:flex-row">
        <Skeleton className="aspect-video w-full rounded-xl sm:w-72" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-10 w-44" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-full" />
        ))}
      </div>
    </div>
  );
}
