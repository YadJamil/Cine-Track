import Image from "next/image";
import Link from "next/link";
import { backdropUrl } from "@/lib/tmdb/images";

type SpotlightItem = {
  href: string;
  title: string;
  posterUrl: string | null;
  subtitle?: string | null;
  backdropPath: string | null;
  voteAverage: number | null;
};

/** #1 trending show, big and link-through — no client state needed. */
export function SpotlightHero({ item }: { item: SpotlightItem }) {
  const backdrop = backdropUrl(item.backdropPath);
  return (
    <Link
      href={item.href}
      aria-label={item.title}
      className="group relative block overflow-hidden rounded-2xl border bg-card"
    >
      <div className="relative aspect-video bg-muted sm:aspect-[21/9]">
        {backdrop ? (
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : item.posterUrl ? (
          <Image src={item.posterUrl} alt="" fill className="object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary drop-shadow">
            Trending now
          </p>
          <p className="text-xl font-bold drop-shadow sm:text-2xl">{item.title}</p>
          {item.subtitle || item.voteAverage ? (
            <p className="mt-0.5 text-sm text-white/85 drop-shadow">
              {[
                item.subtitle,
                item.voteAverage ? `★ ${item.voteAverage.toFixed(1)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
