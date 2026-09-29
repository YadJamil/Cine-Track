"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Bell, Calendar, Palette, Shield, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const PANES = [
  { href: "/settings/account", label: "Account", icon: User },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings/appearance", label: "Appearance", icon: Palette },
  { href: "/settings/privacy", label: "Privacy", icon: Shield },
  { href: "/settings/data", label: "Data", icon: Database },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Settings sections"
      className="w-full flex justify-start overflow-x-auto gap-1 bg-transparent p-0 border-b border-border/40 pb-2 h-auto! rounded-none! no-scrollbar"
    >
      {PANES.map((p) => {
        const isActive = pathname === p.href;
        const Icon = p.icon;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-2 px-3 py-1.5 transition-all duration-300 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap text-muted-foreground/80 active:scale-95 cursor-pointer select-none",
              "hover:bg-accent/40 hover:text-foreground",
              isActive
                ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_12px_rgba(251,215,55,0.08)] font-semibold"
                : ""
            )}
          >
            <Icon className={cn("size-4 shrink-0 transition-transform duration-300", isActive && "scale-110")} />
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
