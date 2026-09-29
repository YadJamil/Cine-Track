import { CatLoader } from "@/components/cat/cat-loader";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <CatLoader label="Fetching your alerts…" />
      <Skeleton className="h-7 w-40" />
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
