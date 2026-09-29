import { CatLoader } from "@/components/cat/cat-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { PosterGridSkeleton } from "@/components/shared/poster-grid-skeleton";

export default function HomeLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <CatLoader label="Rounding up your shows…" />
      <div>
        <Skeleton className="mb-4 h-7 w-36" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="flex items-center gap-3 p-3">
                <Skeleton className="h-1.5 flex-1 rounded-full" />
                <Skeleton className="size-9 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="mb-4 h-6 w-28" />
        <PosterGridSkeleton count={6} />
      </div>
    </div>
  );
}
