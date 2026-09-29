import { CatLoader } from "@/components/cat/cat-loader";
import { Skeleton } from "@/components/ui/skeleton";

export default function FeedLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <CatLoader label="Catching up on friends…" />
      <Skeleton className="h-7 w-20" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
