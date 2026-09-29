import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CatBoopGate } from "@/components/cat/cat-boop-gate";
import { CatTailWave } from "@/components/cat/cat-tail-wave";
import { EnableNotifications } from "@/components/pwa/enable-notifications";
import { Logo } from "@/components/shared/logo";
import { UserAvatar } from "@/components/shared/user-avatar";
import { BottomTabs, SidebarNav } from "@/components/shell/app-nav";
import { BackButton } from "@/components/shell/back-button";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { CommandSearch } from "@/features/search/components/command-search";
import { createClient } from "@/lib/supabase/server";

// 1. Sidebar Component (performs fetching)
async function SidebarContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null = null;
  let unread = 0;

  if (user) {
    const [{ data: p }, { count }] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false),
    ]);
    profile = p;
    unread = count ?? 0;
  }

  const username = profile?.username ?? null;

  return (
    <>
      <SidebarNav username={username} />
      <div className="mt-auto">
        {user && profile ? (
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${profile.username}`}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1.5 hover:bg-accent"
            >
              <UserAvatar
                username={profile.username}
                displayName={profile.display_name}
                avatarUrl={profile.avatar_url}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {profile.display_name || profile.username}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{profile.username}
                </span>
              </span>
            </Link>
            <NotificationBell userId={user.id} initialUnread={unread} />
          </div>
        ) : (
          <Button render={<Link href="/login" />} className="w-full">
            Log in
          </Button>
        )}
      </div>
    </>
  );
}

// 2. Mobile Header Component (performs fetching)
async function MobileHeaderContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let unread = 0;
  if (user) {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false);
    unread = count ?? 0;
  }

  return (
    <div className="flex items-center gap-1">
      <CommandSearch />
      {user ? (
        <NotificationBell userId={user.id} initialUnread={unread} />
      ) : (
        <Button
          render={<Link href="/login" />}
          size="sm"
          variant="outline"
        >
          Log in
        </Button>
      )}
    </div>
  );
}

// 2b. Back Button Component (performs fetching)
async function BackButtonContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    username = p?.username ?? null;
  }

  return (
    <BackButton ownProfilePath={username ? `/profile/${username}` : null} />
  );
}

// 3. Bottom Tabs Component (performs fetching)
async function BottomTabsContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    username = p?.username ?? null;
  }

  return <BottomTabs username={username} />;
}

// 4. Notification Prompt Component (performs fetching)
// The install prompt lives in the root layout instead — it has to be reachable
// on the very first page a visitor sees, including /login. Enabling push
// genuinely needs an account, so that one stays gated here.
async function PushPromptContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return <EnableNotifications />;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh md:grid md:grid-cols-[240px_1fr]">
      {/* Stamp <html data-cat-booped> before paint so a session that already
          booped never sees the gate flash (CSS hides it instantly). */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem("cinetrack:booped"))document.documentElement.setAttribute("data-cat-booped","")}catch(e){}`,
        }}
      />
      <CatBoopGate />

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh flex-col gap-6 border-r p-4 md:flex">
        <div className="flex items-center gap-1.5">
          <Suspense fallback={<div className="size-9 shrink-0" />}>
            <BackButtonContent />
          </Suspense>
          <Logo />
        </div>
        <CommandSearch />
        <Suspense
          fallback={
            <div className="flex flex-1 flex-col gap-6 animate-pulse">
              <div className="space-y-2 mt-4">
                <div className="h-9 w-full rounded-lg bg-zinc-900" />
                <div className="h-9 w-full rounded-lg bg-zinc-900" />
                <div className="h-9 w-full rounded-lg bg-zinc-900" />
              </div>
              <div className="mt-auto h-12 w-full rounded-lg bg-zinc-900" />
            </div>
          }
        >
          <SidebarContent />
        </Suspense>
      </aside>

      <div className="flex min-h-svh flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/95 px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
          <div className="flex items-center gap-1.5">
            <Logo />
            {/* Tail-wave mascot lounging beside the brand. Decorative only. */}
            <CatTailWave className="pointer-events-none -my-1 w-9 shrink-0" />
          </div>
          <Suspense
            fallback={
              <div className="flex items-center gap-2 animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-zinc-900" />
                <div className="h-8 w-8 rounded-lg bg-zinc-900" />
              </div>
            }
          >
            <MobileHeaderContent />
          </Suspense>
        </header>

        <main className="flex-1 p-4 pb-16 md:p-6 md:pb-6">{children}</main>
      </div>

      <Suspense
        fallback={
          <div className="fixed inset-x-6 bottom-[calc(env(safe-area-inset-bottom)*0.4+0.0625rem)] z-40 mx-auto h-14 max-w-md rounded-full border border-border/50 bg-background/80 backdrop-blur-2xl md:hidden animate-pulse" />
        }
      >
        <BottomTabsContent />
      </Suspense>

      <Suspense fallback={null}>
        <PushPromptContent />
      </Suspense>
    </div>
  );
}
