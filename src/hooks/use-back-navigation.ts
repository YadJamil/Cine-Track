"use client";

import { usePathname, useRouter } from "next/navigation";

// The bottom-tab/sidebar root of each primary section: no back affordance
// there, since those are peer destinations, not drill-downs (matches the
// tab-root convention of most mobile apps). Everything else — show detail,
// episode, someone else's profile, settings, stats, etc. — gets one.
const ROOT_PATHS = new Set(["/", "/calendar", "/explore"]);

export function useBackNavigation(ownProfilePath?: string | null) {
  const pathname = usePathname();
  const router = useRouter();
  // Own profile is a tab-bar root too (reachable directly from the bottom
  // tabs / sidebar), just not a static path like the others — it's keyed to
  // the signed-in user's username. Someone else's profile at the same
  // `/profile/[username]` route shape is still a genuine drill-down and
  // keeps its back button.
  const show = !ROOT_PATHS.has(pathname) && pathname !== ownProfilePath;

  const goBack = () => {
    // Deep links (e.g. a push notification opening straight into a detail
    // page) have no prior in-app history to pop — fall back to Home instead
    // of a dead click.
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  return { show, goBack };
}
