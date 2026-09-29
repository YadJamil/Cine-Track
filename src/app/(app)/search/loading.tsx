import { CatLoader } from "@/components/cat/cat-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { PosterGridSkeleton } from "@/components/shared/poster-grid-skeleton";

export default function SearchLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <CatLoader label="Digging around…" />
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-64" />
      <PosterGridSkeleton count={12} />
    </div>
  );
}
