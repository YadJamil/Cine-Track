"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

/** [ASSUMPTION A9] synopsis blurred until watched or revealed */
export function SpoilerSynopsis({
  text,
  blur,
}: {
  text: string;
  blur: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const blurred = blur && !revealed;
  return (
    <div className="relative max-w-3xl">
      <p
        className={cn(
          "text-sm text-muted-foreground",
          blurred && "select-none blur-sm",
        )}
        aria-hidden={blurred}
      >
        {text}
      </p>
      {blurred ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-medium"
        >
          <Eye className="size-3.5" aria-hidden /> Synopsis hidden — tap to
          reveal
        </button>
      ) : null}
    </div>
  );
}
