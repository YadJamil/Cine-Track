"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const BOOPED_KEY = "cinetrack:booped";
/** Celebration length before the gate dissolves. */
const CELEBRATE_MS = 950;
const FADE_MS = 350;

const HEARTS = [
  ["18%", "30%", "0ms"],
  ["70%", "22%", "120ms"],
  ["42%", "12%", "240ms"],
  ["82%", "48%", "90ms"],
  ["8%", "55%", "200ms"],
] as const;

/**
 * The boop gate: a full-screen cat that guards the app once per browser
 * session. Tapping its nose buzzes the device (where the platform allows it),
 * squishes the cat, floats a few hearts, then dissolves the gate.
 *
 * Guardrails, in order of importance:
 * - The nose is a real, auto-focused <button> — keyboard and screen-reader
 *   users boop with Enter. Escape skips the ceremony entirely. The gate can
 *   never lock anyone out.
 * - `prefers-reduced-motion` still gets a celebration, just a still one (happy
 *   face + hearts appear without bouncing), then a plain fade — motion is
 *   reduced, feedback is not removed.
 * - An inline script stamps `data-cat-booped` on <html> before first paint, so
 *   already-booped sessions never even see a flash of cat.
 *
 * public/shell.html (the offline fallback) carries an inline mirror of this
 * gate (same storage key, same guardrails) — keep the two in sync.
 */
export function CatBoopGate() {
  const [phase, setPhase] = useState<"idle" | "booped" | "leaving" | "gone">(
    "idle",
  );
  const [reduced, setReduced] = useState(false);
  const noseRef = useRef<HTMLButtonElement>(null);

  // Already booped this session? Unmount for real (CSS has it hidden already).
  useEffect(() => {
    try {
      if (sessionStorage.getItem(BOOPED_KEY)) setPhase("gone");
    } catch {
      /* storage blocked — keep the gate usable, it still boops away */
    }
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Focus the nose and lock scroll while the gate is up.
  useEffect(() => {
    if (phase !== "idle" && phase !== "booped") return;
    noseRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  function unlock(now = false) {
    try {
      sessionStorage.setItem(BOOPED_KEY, "1");
    } catch {
      /* fine — gate simply returns next session */
    }
    document.documentElement.setAttribute("data-cat-booped", "");
    if (now) {
      setPhase("gone");
    } else {
      setPhase("leaving");
      setTimeout(() => setPhase("gone"), FADE_MS);
    }
  }

  function boop() {
    if (phase !== "idle") return;
    // A soft double pulse — supported on Android; iOS Safari ignores it.
    navigator.vibrate?.([18, 40, 8]);
    // Always celebrate — reduced motion just gets a calmer, still version.
    setPhase("booped");
    setTimeout(() => unlock(), CELEBRATE_MS);
  }

  // Escape is the "I'm in a hurry" hatch — no ceremony, straight in.
  useEffect(() => {
    if (phase === "gone") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") unlock(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  if (phase === "gone") return null;
  const booped = phase === "booped" || phase === "leaving";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Boop the cat's nose to enter CineTrack"
      className={cn(
        "cat-boop-gate fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-background transition-opacity duration-300",
        phase === "leaving" && !reduced && "animate-[gate-out_350ms_ease-in_forwards]",
        phase === "leaving" && reduced && "opacity-0",
      )}
    >
      <div
        className={cn(
          "relative",
          !reduced && !booped && "animate-[cat-sway_3.5s_ease-in-out_infinite]",
          !reduced && booped && "animate-[boop-squish_500ms_ease-out]",
        )}
        style={{ transformOrigin: "50% 90%" }}
      >
        {/* Hearts burst out of the boop (float when animated, just appear when not) */}
        {booped ? (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {HEARTS.map(([left, top, delay]) => (
              <span
                key={`${left}-${top}`}
                className="absolute text-xl"
                style={
                  reduced
                    ? { left, top, opacity: 1 }
                    : {
                        left,
                        top,
                        opacity: 0,
                        animation: `heart-float 900ms ease-out ${delay} forwards`,
                      }
                }
              >
                💛
              </span>
            ))}
          </div>
        ) : null}

        <svg
          viewBox="0 0 200 170"
          className="w-56 sm:w-64"
          aria-hidden
          fill="none"
        >
          {/* Ears (wiggle from their bases on boop) */}
          <g
            className={
              !reduced && booped ? "animate-[ear-wiggle_600ms_ease-out]" : undefined
            }
            style={{ transformOrigin: "52px 62px" }}
          >
            <path d="M38 70 L48 14 L88 46 Z" className="fill-zinc-800" />
            <path d="M48 60 L54 28 L76 46 Z" className="fill-primary/80" />
          </g>
          <g
            className={
              !reduced && booped
                ? "animate-[ear-wiggle_600ms_ease-out_80ms]"
                : undefined
            }
            style={{ transformOrigin: "148px 62px" }}
          >
            <path d="M162 70 L152 14 L112 46 Z" className="fill-zinc-800" />
            <path d="M152 60 L146 28 L124 46 Z" className="fill-primary/80" />
          </g>

          {/* Head */}
          <circle cx="100" cy="100" r="66" className="fill-zinc-800" />

          {/* Eyes: bright cat eyes → happy arcs once booped */}
          {booped ? (
            <>
              <path
                d="M62 92 Q73 82 84 92"
                className="stroke-primary"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M116 92 Q127 82 138 92"
                className="stroke-primary"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              <ellipse cx="73" cy="92" rx="9" ry="12" className="fill-primary" />
              <ellipse cx="127" cy="92" rx="9" ry="12" className="fill-primary" />
              <ellipse cx="73" cy="92" rx="3" ry="9" className="fill-zinc-900" />
              <ellipse cx="127" cy="92" rx="3" ry="9" className="fill-zinc-900" />
            </>
          )}

          {/* Blush */}
          <circle
            cx="56"
            cy="112"
            r="7"
            className={cn(
              "fill-red-400 transition-opacity duration-300",
              booped ? "opacity-60" : "opacity-0",
            )}
          />
          <circle
            cx="144"
            cy="112"
            r="7"
            className={cn(
              "fill-red-400 transition-opacity duration-300",
              booped ? "opacity-60" : "opacity-0",
            )}
          />

          {/* Whiskers */}
          <g className="stroke-zinc-500" strokeWidth="2" strokeLinecap="round">
            <path d="M14 104 L52 108" />
            <path d="M16 120 L52 118" />
            <path d="M186 104 L148 108" />
            <path d="M184 120 L148 118" />
          </g>

          {/* Mouth: neutral ω → open happy */}
          {booped ? (
            <path
              d="M88 132 Q100 144 112 132"
              className="stroke-zinc-400"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M88 132 Q94 138 100 132 Q106 138 112 132"
              className="stroke-zinc-500"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </svg>

        {/* The nose itself: a real button, ≥44px tap target, centered on the
            SVG's nose position. */}
        <button
          ref={noseRef}
          type="button"
          onClick={boop}
          aria-label="Boop the cat's nose to enter"
          className={cn(
            "absolute left-1/2 top-[68%] size-12 -translate-x-1/2 -translate-y-1/2 rounded-full",
            "flex items-center justify-center outline-none focus:outline-none focus-visible:outline-none",
            "transition-transform hover:scale-110 active:scale-90",
          )}
        >
          <span
            aria-hidden
            className="block size-5 rounded-[45%_45%_60%_60%] bg-primary shadow-[0_0_14px] shadow-primary/40"
            style={{ clipPath: "polygon(0 18%, 100% 18%, 50% 100%)" }}
          />
        </button>
      </div>

      {booped ? (
        <p
          aria-hidden
          className="font-mono text-sm tracking-widest text-primary"
          style={
            reduced
              ? undefined
              : { animation: `purr-fade ${CELEBRATE_MS}ms ease-out forwards` }
          }
        >
          purrrrrr
        </p>
      ) : (
        <p className="animate-pulse text-sm text-muted-foreground">
          Boop the nose to enter
        </p>
      )}
    </div>
  );
}
