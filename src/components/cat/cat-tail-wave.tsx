import { cn } from "@/lib/utils";

/**
 * A little sitting cat whose tail swishes — a purely decorative nav mascot.
 *
 * Strictly cosmetic: `aria-hidden` (screen readers skip it) and the caller
 * always wraps it in `pointer-events-none` so it can never intercept a tap on a
 * nav item. Tail wave + blink freeze under `prefers-reduced-motion`
 * (see globals.css).
 */
export function CatTailWave({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-auto w-12", className)}
      aria-hidden
      focusable="false"
      fill="none"
    >
      {/* Tail — a stroked path that rotates about its base (bottom-left of its
          own bounding box, via transform-box: fill-box). */}
      <path
        className="cat-tail stroke-zinc-700"
        d="M45 54 Q64 49 55 28"
        strokeWidth="6"
        strokeLinecap="round"
        style={{
          transformBox: "fill-box",
          transformOrigin: "0% 100%",
          animation: "tail-wave 1.7s ease-in-out infinite",
        }}
      />

      {/* Sitting body */}
      <path d="M18 58 Q17 37 32 37 Q47 37 46 58 Z" className="fill-zinc-800" />
      {/* Front paws */}
      <ellipse cx="26" cy="57" rx="5" ry="3.5" className="fill-zinc-700" />
      <ellipse cx="38" cy="57" rx="5" ry="3.5" className="fill-zinc-700" />

      {/* Ears */}
      <path d="M20 26 L23 10 L34 22 Z" className="fill-zinc-800" />
      <path d="M44 26 L41 10 L30 22 Z" className="fill-zinc-800" />
      <path d="M23 22 L25 14 L31 21 Z" className="fill-primary/70" />
      <path d="M41 22 L39 14 L33 21 Z" className="fill-primary/70" />

      {/* Head */}
      <circle cx="32" cy="28" r="13" className="fill-zinc-800" />

      {/* Eyes (blink) + nose */}
      <g
        className="cat-blink"
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: "cat-blink 4.5s ease-in-out infinite",
        }}
      >
        <ellipse cx="26" cy="27" rx="2.4" ry="3.4" className="fill-primary" />
        <ellipse cx="38" cy="27" rx="2.4" ry="3.4" className="fill-primary" />
      </g>
      <path d="M30 33 L34 33 L32 36 Z" className="fill-primary/90" />

      {/* Whiskers */}
      <g className="stroke-zinc-600" strokeWidth="1.2" strokeLinecap="round">
        <path d="M12 31 L23 32" />
        <path d="M52 31 L41 32" />
      </g>
    </svg>
  );
}
