import type { Metadata } from "next";
import { BucketTabs } from "@/features/tracking/components/bucket-tabs";
import { WatchNextGrid } from "@/features/tracking/components/watch-next-grid";
import { getShowProgress, getWatchNext } from "@/features/tracking/queries";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Watch Next" };

export default async function HomePage() {
  const user = await requireUser();
  const [watchNext, progress] = await Promise.all([
    getWatchNext(user.id),
    getShowProgress(user.id),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section aria-labelledby="watch-next-heading">
        <div className="mb-4">
          <h1 id="watch-next-heading" className="text-xl font-semibold">
            Watch Next
          </h1>
          {watchNext.length > 0 ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {watchNext.length} show{watchNext.length === 1 ? " has" : "s have"}{" "}
              episodes ready for you
            </p>
          ) : null}
        </div>
        <WatchNextGrid rows={watchNext} />
      </section>

      <section aria-labelledby="my-shows-heading">
        <h2 id="my-shows-heading" className="mb-4 text-lg font-semibold">
          My shows
        </h2>
        <BucketTabs rows={progress} />
      </section>
    </div>
  );
}
