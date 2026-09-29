"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <TriangleAlert className="size-10 text-destructive" aria-hidden />
      <div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {error.digest ? `Error ${error.digest}. ` : ""}
          Try again — if it keeps happening, reload the page.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
