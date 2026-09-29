import { Skeleton } from "@/components/ui/skeleton";
import { PosterGridSkeleton } from "@/components/shared/poster-grid-skeleton";

export default function ProfileLoading() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6">
        <Skeleton className="h-40 w-full rounded-none md:h-52" />
        <div className="-mt-10 flex items-end gap-3 px-4 md:px-6">
          <Skeleton className="size-20 rounded-full md:size-24" />
          <div className="flex-1 space-y-2 pb-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
      <PosterGridSkeleton count={6} />
    </div>
  );
}
