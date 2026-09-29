import { Film, Tv } from "lucide-react";

/**
 * Corner tag for mixed shows+movies rows — opposite corner from
 * PosterStatusDot (top-right) so both can render together without collision.
 */
export function MediaTypeBadge({ mediaType }: { mediaType: "show" | "movie" }) {
  const Icon = mediaType === "show" ? Tv : Film;
  const label = mediaType === "show" ? "TV show" : "Movie";
  return (
    <span
      title={label}
      className="absolute top-1.5 left-1.5 inline-flex size-5 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/10 backdrop-blur-sm"
    >
      <Icon className="size-3" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
