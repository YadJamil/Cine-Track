import { CatLoader } from "@/components/cat/cat-loader";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <CatLoader label="Checking the schedule…" />
      <div>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="sm:hidden">
          <div className="flex w-max gap-2 pb-1">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-[72px] w-11 shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
        <Skeleton className="hidden h-[420px] w-full rounded-xl sm:block" />
      </div>
      <div>
        <Skeleton className="mb-4 h-6 w-28" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
