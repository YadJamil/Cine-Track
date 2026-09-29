import { Clapperboard } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 font-semibold", className)}
      aria-label="CineTrack home"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Clapperboard className="size-4" aria-hidden />
      </span>
      <span className="text-lg tracking-tight">CineTrack</span>
    </Link>
  );
}
