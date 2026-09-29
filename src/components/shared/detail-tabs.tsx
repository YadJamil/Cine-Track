"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export { Tabs as DetailTabs };

export function DetailTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      className={cn(
        "w-full justify-start gap-1 overflow-x-auto whitespace-nowrap bg-transparent p-0 border-b border-border/40 pb-2 h-auto! rounded-none! no-scrollbar",
        className,
      )}
      {...props}
    />
  );
}

export function DetailTabsTrigger({
  className,
  count,
  children,
  ...props
}: React.ComponentProps<typeof TabsTrigger> & { count?: number }) {
  return (
    <TabsTrigger
      className={cn(
        "group relative gap-2 px-3 py-1.5 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap text-muted-foreground/80 transition-all duration-300 hover:bg-accent/40 hover:text-foreground",
        "data-active:border-primary/20 data-active:bg-primary/10 data-active:text-primary data-active:shadow-[0_0_12px_color-mix(in_oklch,var(--primary)_8%,transparent)]",
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined ? (
        <span className="ml-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums bg-muted text-muted-foreground transition-all duration-300 group-data-active:bg-primary/20 group-data-active:text-primary">
          {count}
        </span>
      ) : null}
    </TabsTrigger>
  );
}

export function DetailTabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsContent>) {
  return (
    <TabsContent
      className={cn(
        "mt-4 data-open:animate-in data-open:fade-in-30 data-open:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  );
}
