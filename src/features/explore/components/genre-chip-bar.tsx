import Link from "next/link";
import { BUCKET_META } from "@/components/shared/show-status";
import { cn } from "@/lib/utils";
import { genreSlug } from "../genre-map";

// Reuse the same accent palette as BucketTabs so this visually rhymes with
// the rest of the app instead of inventing new colors.
const ACCENTS = [
  BUCKET_META.watching.badge,
  BUCKET_META.up_to_date.badge,
  BUCKET_META.completed.badge,
  BUCKET_META.watchlist.badge,
  BUCKET_META.watch_later.badge,
];

export function GenreChipBar({ genres }: { genres: string[] }) {
  if (genres.length === 0) return null;
  return (
    <nav aria-label="Browse by genre" className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
      <ul className="flex w-max gap-2 pb-1">
        {genres.map((genre, i) => (
          <li key={genre}>
            <Link
              href={`/explore/genre/${genreSlug(genre)}`}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors hover:brightness-110",
                ACCENTS[i % ACCENTS.length],
              )}
            >
              {genre}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
