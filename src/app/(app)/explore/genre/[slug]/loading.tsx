import { CatLoader } from "@/components/cat/cat-loader";
import { PosterGridSkeleton } from "@/components/shared/poster-grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExploreGenreLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <CatLoader label="Sniffing out shows…" />
      <Skeleton className="h-7 w-56" />
      <PosterGridSkeleton count={24} />
    </div>
  );
}
