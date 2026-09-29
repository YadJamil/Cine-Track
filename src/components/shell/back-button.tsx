"use client";

import { ArrowLeft } from "lucide-react";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { cn } from "@/lib/utils";

/**
 * Desktop sidebar only — the mobile back affordance lives in the bottom tab
 * bar instead (see BottomTabs in app-nav.tsx) so it's reachable by thumb.
 * Standalone/installed mode (manifest `display: "standalone"`, the Capacitor
 * Android wrapper) has no browser chrome, so there's no back affordance
 * without this.
 */
export function BackButton({
  className,
  ownProfilePath,
}: {
  className?: string;
  ownProfilePath?: string | null;
}) {
  const { show, goBack } = useBackNavigation(ownProfilePath);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
    >
      <ArrowLeft className="size-5" aria-hidden />
    </button>
  );
}
