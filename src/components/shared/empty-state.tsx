import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { CatEmpty } from "@/components/cat/cat-empty";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  cat = false,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  /** Swap the icon for the curious-cat illustration. */
  cat?: boolean;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
      {cat ? (
        <CatEmpty />
      ) : (
        <Icon className="size-10 text-muted-foreground" aria-hidden />
      )}
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && actionHref ? (
        <Button render={<Link href={actionHref} />} size="sm" className="mt-2">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
