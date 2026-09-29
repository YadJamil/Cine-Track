import { Skeleton } from "@/components/ui/skeleton";
import { EpisodeRowsSkeleton } from "@/components/shared/poster-grid-skeleton";

export default function ShowLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6">
        <Skeleton className="aspect-[16/7] min-h-56 w-full rounded-none" />
        <div className="-mt-20 flex items-end gap-4 px-4 md:px-6">
          <Skeleton className="aspect-[2/3] w-28 rounded-lg md:w-36" />
          <div className="flex-1 space-y-2 pb-1">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-1.5 w-40 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="size-8" />
        <Skeleton className="size-8" />
        <Skeleton className="size-8" />
      </div>
      <Skeleton className="h-4 w-2/3" />
      <EpisodeRowsSkeleton count={6} />
    </div>
  );
}
