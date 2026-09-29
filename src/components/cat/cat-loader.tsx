import { cn } from "@/lib/utils";

/**
 * An alert cat batting a spinning ball of yarn — a loading state that reads as
 * *activity* (the app is busy fetching), not a nap. The yarn is the spinner;
 * under reduced motion everything freezes into a calm, still scene.
 */
export function CatLoader({
  label = "Fetching…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("cat-loader flex items-center gap-3", className)}
    >
      <div className="relative">
        <svg viewBox="0 0 96 44" className="w-16" aria-hidden fill="none">
          {/* Tail flicking up behind the cat */}
          <path
            className="cat-tail-flick stroke-zinc-800"
            style={{ transformBox: "fill-box", transformOrigin: "100% 100%" }}
            d="M14 36 Q2 32 8 20 Q10 13 17 16"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          {/* Seated body */}
          <path
            className="fill-zinc-800"
            d="M11 40 Q7 22 22 15 Q34 8 43 17 Q49 24 45 34 L45 40 Z"
          />
          {/* Head */}
          <circle cx="43" cy="14" r="9" className="fill-zinc-800" />
          {/* Ears */}
          <path d="M35 7 L37 15 L42 11 Z" className="fill-zinc-800" />
          <path d="M51 7 L49 15 L44 11 Z" className="fill-zinc-800" />
          {/* Open, alert eyes */}
          <circle cx="40" cy="14" r="1.6" className="fill-amber-300" />
          <circle cx="47" cy="14" r="1.6" className="fill-amber-300" />
          {/* Nose */}
          <path d="M42 17.5 L45 17.5 L43.5 19.2 Z" className="fill-zinc-500" />
          {/* Front paw reaching out to bat the yarn */}
          <path
            className="cat-paw-bat stroke-zinc-800"
            style={{ transformBox: "fill-box", transformOrigin: "0% 60%" }}
            d="M45 31 Q56 31 62 26"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Loose thread trailing from the ball to the paw (stays put) */}
          <path
            className="stroke-amber-400"
            d="M67 31 Q64 29 62 26"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Ball of yarn — spins as the actual loading indicator */}
          <g
            className="cat-yarn"
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          >
            <circle cx="74" cy="31" r="7.5" className="fill-amber-400" />
            <path
              className="stroke-amber-700"
              d="M68 28 Q74 34.5 80 30"
              strokeWidth="1.1"
            />
            <path
              className="stroke-amber-700"
              d="M68 33.5 Q74 27 80 32"
              strokeWidth="1.1"
            />
            <path
              className="stroke-amber-700"
              d="M71 24.5 Q78.5 31 76 38"
              strokeWidth="1.1"
            />
            <path
              className="stroke-amber-700"
              d="M69 37 Q66 30 72 24.5"
              strokeWidth="1.1"
            />
          </g>
        </svg>
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
