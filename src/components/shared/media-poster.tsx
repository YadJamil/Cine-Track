import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function MediaPoster({
  href,
  title,
  posterUrl,
  subtitle,
  progress,
  badge,
  className,
}: {
  href: string;
  title: string;
  posterUrl: string | null;
  subtitle?: string | null;
  /** 0–100; renders a progress bar under the poster */
  progress?: number;
  /** Rendered over the poster's top-right corner (e.g. a status dot). */
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group block focus-visible:outline-2 focus-visible:outline-ring rounded-lg",
        className,
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={`${title} poster`}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-muted-foreground">
            {title}
          </span>
        )}
        {typeof progress === "number" ? (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        ) : null}
        {badge}
      </div>
      <p className="mt-1.5 line-clamp-1 text-sm font-medium">{title}</p>
      {subtitle ? (
        <p className="line-clamp-1 text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
    </Link>
  );
}
