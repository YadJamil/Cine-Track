"use client";

import { ListVideo } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaPoster } from "@/components/shared/media-poster";
import {
  BUCKET_META,
  BUCKET_ORDER,
  PosterStatusDot,
} from "@/components/shared/show-status";
import { posterUrl } from "@/lib/tmdb/images";
import type { ProgressRow } from "../queries";

export function BucketTabs({ rows }: { rows: ProgressRow[] }) {
  return (
    <Tabs defaultValue="watching">
      <TabsList className="w-full justify-start overflow-x-auto gap-1 bg-transparent p-0 border-b border-border/40 pb-2 h-auto! rounded-none! no-scrollbar">
        {BUCKET_ORDER.map((bucket) => {
          const count = rows.filter((r) => r.bucket === bucket).length;
          return (
            <TabsTrigger
              key={bucket}
              value={bucket}
              className={cn(
                "group relative gap-2 px-3 py-1.5 transition-all duration-300 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap text-muted-foreground/80",
                "hover:bg-accent/40 hover:text-foreground",
                // Custom color configurations per bucket state when active
                bucket === "watching" && "data-active:bg-primary/10 data-active:text-primary data-active:border-primary/20 data-active:shadow-[0_0_12px_rgba(251,215,55,0.08)]",
                bucket === "up_to_date" && "data-active:bg-emerald-500/10 data-active:text-emerald-400 data-active:border-emerald-500/20 data-active:shadow-[0_0_12px_rgba(16,185,129,0.08)]",
                bucket === "completed" && "data-active:bg-purple-500/10 data-active:text-purple-400 data-active:border-purple-500/20 data-active:shadow-[0_0_12px_rgba(168,85,247,0.08)]",
                bucket === "watchlist" && "data-active:bg-sky-500/10 data-active:text-sky-400 data-active:border-sky-500/20 data-active:shadow-[0_0_12px_rgba(14,165,233,0.08)]",
                bucket === "watch_later" && "data-active:bg-orange-500/10 data-active:text-orange-400 data-active:border-orange-500/20 data-active:shadow-[0_0_12px_rgba(249,115,22,0.08)]",
                bucket === "stopped" && "data-active:bg-zinc-500/10 data-active:text-zinc-300 data-active:border-zinc-500/20"
              )}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full transition-all duration-300 group-data-active:scale-125 group-data-active:shadow-[0_0_8px_currentColor]",
                  BUCKET_META[bucket].dot
                )}
                aria-hidden
              />
              {BUCKET_META[bucket].label}
              <span
                className={cn(
                  "ml-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums transition-all duration-300 bg-muted text-muted-foreground",
                  bucket === "watching" && "group-data-active:bg-primary/20 group-data-active:text-primary",
                  bucket === "up_to_date" && "group-data-active:bg-emerald-500/20 group-data-active:text-emerald-400",
                  bucket === "completed" && "group-data-active:bg-purple-500/20 group-data-active:text-purple-400",
                  bucket === "watchlist" && "group-data-active:bg-sky-500/20 group-data-active:text-sky-400",
                  bucket === "watch_later" && "group-data-active:bg-orange-500/20 group-data-active:text-orange-400",
                  bucket === "stopped" && "group-data-active:bg-zinc-500/20 group-data-active:text-zinc-300"
                )}
              >
                {count}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
      {BUCKET_ORDER.map((bucket) => {
        const items = rows.filter((r) => r.bucket === bucket);
        const meta = BUCKET_META[bucket];
        return (
          <TabsContent key={bucket} value={bucket} className="mt-4 transition-all duration-300 data-open:animate-in data-open:fade-in-30 data-open:slide-in-from-bottom-2">
            {items.length === 0 ? (
              <EmptyState
                icon={ListVideo}
                cat
                title={`Nothing in ${meta.label.toLowerCase()}`}
                description="The cat checked twice — shows land here as you follow and watch."
              />
            ) : (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {items.map((r) => (
                  <MediaPoster
                    key={r.show_id}
                    href={`/shows/${r.tmdb_id}`}
                    title={r.name}
                    posterUrl={posterUrl(r.poster_path)}
                    subtitle={`${r.watched_count}/${r.aired_count} episodes`}
                    progress={
                      r.aired_count > 0
                        ? (r.watched_count / r.aired_count) * 100
                        : 0
                    }
                    badge={<PosterStatusDot bucket={r.bucket} />}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
