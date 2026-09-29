"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Compass,
  Home,
  Settings,
  User,
} from "lucide-react";
import { CatTailWave } from "@/components/cat/cat-tail-wave";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

function useNavItems(username: string | null): {
  primary: NavItem[];
  mobile: NavItem[];
} {
  const profileHref = username ? `/profile/${username}` : "/login";
  const primary: NavItem[] = [
    { href: "/", label: "Watch Next", icon: Home, exact: true },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: profileHref, label: "Profile", icon: User },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  // Bottom tabs: Watch Next · Calendar · Explore · Profile.
  // Alerts (Notifications, which also hosts the Feed) live behind the bell
  // in the top bar.
  const mobile: NavItem[] = [
    { href: "/", label: "Watch Next", icon: Home, exact: true },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: profileHref, label: "Profile", icon: User },
  ];
  return { primary, mobile };
}

function isActive(pathname: string, item: NavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarNav({ username }: { username: string | null }) {
  const pathname = usePathname();
  const { primary } = useNavItems(username);
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {primary.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={isActive(pathname, item) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive(pathname, item)
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
        >
          <item.icon className="size-4" aria-hidden />
          {item.label}
        </Link>
      ))}
      {/* Decorative mascot chilling at the foot of the menu. */}
      <div className="pointer-events-none mt-3 pl-2">
        <CatTailWave className="w-14" />
      </div>
    </nav>
  );
}

export function BottomTabs({ username }: { username: string | null }) {
  const pathname = usePathname();
  const { mobile } = useNavItems(username);
  const ownProfilePath = username ? `/profile/${username}` : null;
  const { show: showBack, goBack } = useBackNavigation(ownProfilePath);
  return (
    // Floating "liquid glass" capsule (iOS App Store style): inset from the
    // screen edges, fully rounded, frosted — floats a small gap above the
    // home indicator. `will-change-transform` forces this onto its own
    // compositing layer, guarding against WebKit/iOS Safari bugs where
    // `position: fixed` elements can visually jump/reposition during
    // scroll. (The calendar page's mobile DayStrip used to trigger this via
    // CSS scroll-snap; that's been removed — see day-strip.tsx.)
    <nav
      aria-label="Main"
      className="fixed inset-x-6 bottom-[calc(env(safe-area-inset-bottom)*0.4+0.0625rem)] z-40 mx-auto flex max-w-md items-stretch gap-2 will-change-transform md:hidden"
    >
      {showBack ? (
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="flex size-12 shrink-0 animate-in items-center justify-center rounded-full border border-border/50 bg-background/80 text-muted-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_24px_-4px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-200 fade-in zoom-in-95 duration-200 hover:text-foreground active:scale-90 supports-[backdrop-filter]:bg-background/55"
        >
          <ArrowLeft className="size-4.5" aria-hidden />
        </button>
      ) : null}

      <ul className="grid min-w-0 flex-1 grid-cols-4 gap-1 rounded-full border border-border/50 bg-background/80 px-1.5 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_24px_-4px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-200 supports-[backdrop-filter]:bg-background/55">
        {mobile.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.label} className="flex min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-full border py-1 text-[9px] font-medium transition-all duration-300 ease-out active:scale-90",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "size-4 transition-transform duration-300 ease-out",
                    active && "scale-110",
                  )}
                  aria-hidden
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
