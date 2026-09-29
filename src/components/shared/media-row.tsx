import Link from "next/link";
import type { Bucket } from "@/lib/supabase/database.types";
import { MediaPoster } from "./media-poster";
import { MediaTypeBadge } from "./media-type-badge";
import { PosterStatusDot } from "./show-status";

export type MediaRowItem = {
  key: string;
  href: string;
  title: string;
  posterUrl: string | null;
  subtitle?: string | null;
  /** Set on mixed shows+movies rows to render a small type tag. */
  mediaType?: "show" | "movie";
  /** Tracking status, if the viewer already has one for this show. */
  bucket?: Bucket | null;
};

export function MediaRow({
  heading,
  items,
  moreHref,
}: {
  heading: string;
  items: MediaRowItem[];
  /** When set, renders a "Show more" link beside the heading. */
  moreHref?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={heading}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{heading}</h2>
        {moreHref ? (
          <Link
            href={moreHref}
            className="shrink-0 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Show more →
          </Link>
        ) : null}
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
        <ul className="flex w-max gap-3">
          {items.map((item) => (
            <li key={item.key} className="w-28 shrink-0 sm:w-32">
              <MediaPoster
                href={item.href}
                title={item.title}
                posterUrl={item.posterUrl}
                subtitle={item.subtitle}
                badge={
                  <>
                    {item.mediaType ? (
                      <MediaTypeBadge mediaType={item.mediaType} />
                    ) : null}
                    {item.bucket ? <PosterStatusDot bucket={item.bucket} /> : null}
                  </>
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
