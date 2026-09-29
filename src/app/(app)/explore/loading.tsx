import { CatLoader } from "@/components/cat/cat-loader";
import { Skeleton } from "@/components/ui/skeleton";

function RowSkeleton() {
  return (
    <div>
      <Skeleton className="mb-3 h-6 w-44" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="w-28 shrink-0 sm:w-32">
            <Skeleton className="aspect-[2/3] w-full rounded-lg" />
            <Skeleton className="mt-1.5 h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExploreLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <CatLoader label="Sniffing out shows…" />
      <Skeleton className="aspect-video w-full rounded-2xl sm:aspect-[21/9]" />
      <RowSkeleton />
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  );
}
