/**
 * A cat peering into an empty box, for empty states. Static on purpose —
 * empty states are read, not watched.
 */
export function CatEmpty() {
  return (
    <svg viewBox="0 0 120 84" className="w-24" aria-hidden fill="none">
      {/* The empty box */}
      <path
        d="M28 52 L92 52 L86 78 L34 78 Z"
        className="fill-zinc-900 stroke-zinc-700"
        strokeWidth="2"
      />
      <path d="M28 52 L20 44 L84 44 L92 52" className="stroke-zinc-700" strokeWidth="2" />

      {/* Cat leaning over the rim */}
      <circle cx="60" cy="34" r="18" className="fill-zinc-800" />
      <path d="M46 22 L48 8 L60 18 Z" className="fill-zinc-800" />
      <path d="M74 22 L72 8 L60 18 Z" className="fill-zinc-800" />
      <path d="M50 20 L51 12 L58 18 Z" className="fill-primary/70" />
      <path d="M70 20 L69 12 L62 18 Z" className="fill-primary/70" />
      {/* Wide curious eyes looking down */}
      <circle cx="53" cy="34" r="4.5" className="fill-primary" />
      <circle cx="67" cy="34" r="4.5" className="fill-primary" />
      <circle cx="53" cy="36" r="2" className="fill-zinc-900" />
      <circle cx="67" cy="36" r="2" className="fill-zinc-900" />
      {/* Nose + mouth */}
      <path d="M58 41 L62 41 L60 44 Z" className="fill-primary" />
      {/* Paws on the rim */}
      <ellipse cx="48" cy="52" rx="5" ry="3" className="fill-zinc-700" />
      <ellipse cx="72" cy="52" rx="5" ry="3" className="fill-zinc-700" />
      {/* Question mark */}
      <text
        x="97"
        y="34"
        className="fill-zinc-600"
        fontSize="18"
        fontFamily="var(--font-geist-mono)"
      >
        ?
      </text>
    </svg>
  );
}
