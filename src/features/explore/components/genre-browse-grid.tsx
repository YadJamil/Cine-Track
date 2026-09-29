"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MediaPoster } from "@/components/shared/media-poster";
import { MediaTypeBadge } from "@/components/shared/media-type-badge";
import type { MediaRowItem } from "@/components/shared/media-row";
import { PosterStatusDot } from "@/components/shared/show-status";
import { loadMoreGenreItems } from "../actions";

const PAGE_SIZE = 24;

export function GenreBrowseGrid({
  genre,
  initial,
}: {
  genre: string;
  initial: MediaRowItem[];
}) {
  const [items, setItems] = useState(initial);
  const [exhausted, setExhausted] = useState(initial.length < PAGE_SIZE);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const res = await loadMoreGenreItems({ genre, offset: items.length });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setItems((prev) => [...prev, ...res.data]);
      if (res.data.length < PAGE_SIZE) setExhausted(true);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => (
          <MediaPoster
            key={item.key}
            href={item.href}
            title={item.title}
            posterUrl={item.posterUrl}
            subtitle={item.subtitle}
            badge={
              <>
                {item.mediaType ? <MediaTypeBadge mediaType={item.mediaType} /> : null}
                {item.bucket ? <PosterStatusDot bucket={item.bucket} /> : null}
              </>
            }
          />
        ))}
      </div>
      {!exhausted ? (
        <Button
          variant="outline"
          onClick={loadMore}
          disabled={pending}
          className="self-center"
        >
          {pending ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
