import type { Metadata } from "next";
import { BellOff, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { FeedList } from "@/features/social/components/feed-list";
import { createClient, requireUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const defaultTab = params.tab === "feed" ? "feed" : "alerts";

  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: notifications, error: notificationsError }, { data: events, error: feedError }] =
    await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.rpc("fn_activity_feed", {
        p_user_id: user.id,
        p_limit: 30,
        p_before: null,
      }),
    ]);
  if (notificationsError) throw new Error(notificationsError.message);
  if (feedError) throw new Error(feedError.message);

  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Notifications</h1>
      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full justify-start gap-1 bg-transparent p-0 border-b border-border/40 pb-2 h-auto! rounded-none!">
          <TabsTrigger
            value="alerts"
            className="group relative gap-2 px-3 py-1.5 rounded-lg border border-transparent text-sm font-medium data-active:bg-primary/10 data-active:text-primary data-active:border-primary/20"
          >
            Alerts
            {unreadCount > 0 ? (
              <span
                className={cn(
                  "ml-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums bg-muted text-muted-foreground",
                  "group-data-active:bg-primary/20 group-data-active:text-primary",
                )}
              >
                {unreadCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="feed"
            className="gap-2 px-3 py-1.5 rounded-lg border border-transparent text-sm font-medium data-active:bg-primary/10 data-active:text-primary data-active:border-primary/20"
          >
            Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-4">
          {!notifications || notifications.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title="No notifications"
              description="Likes, new followers, badge unlocks and airing reminders show up here."
            />
          ) : (
            <NotificationList
              notifications={notifications}
              unreadCount={unreadCount}
            />
          )}
        </TabsContent>

        <TabsContent value="feed" className="mt-4">
          {!events || events.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Your feed is quiet"
              description="Follow friends to see what they're watching — or start watching something yourself."
              actionLabel="Find people"
              actionHref="/search"
            />
          ) : (
            <FeedList initial={events} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
