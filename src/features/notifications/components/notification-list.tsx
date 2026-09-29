"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Award,
  Bell,
  CalendarClock,
  Heart,
  MessageSquare,
  Newspaper,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Tables, NotificationType } from "@/lib/supabase/database.types";
import { markAllNotificationsRead, markNotificationRead } from "../actions";

const actorSchema = z.array(
  z.object({
    name: z.string().nullish(),
    username: z.string().nullish(),
    avatar_url: z.string().nullish(),
  }),
);

const ICONS: Record<NotificationType, typeof Bell> = {
  comment_like: Heart,
  friend_comment: MessageSquare,
  new_follower: UserPlus,
  badge_unlock: Award,
  episode_airing: CalendarClock,
  news: Newspaper,
  marketing: Newspaper,
  system: Bell,
};

export function NotificationList({
  notifications,
  unreadCount,
}: {
  notifications: Tables<"notifications">[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function open(n: Tables<"notifications">) {
    startTransition(async () => {
      if (!n.read) await markNotificationRead(n.id);
      if (n.url) router.push(n.url);
      else router.refresh();
    });
  }

  function markAll() {
    startTransition(async () => {
      const res = await markAllNotificationsRead();
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {unreadCount > 0 ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={markAll}
            disabled={pending}
          >
            Mark all as read ({unreadCount})
          </Button>
        </div>
      ) : null}
      <ul className="flex flex-col gap-1.5">
        {notifications.map((n) => {
          const actors = actorSchema.safeParse(n.actors);
          const actor = actors.success ? actors.data[0] : undefined;
          const Icon = ICONS[n.type] ?? Bell;
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => open(n)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/60",
                  !n.read && "border-primary/40 bg-primary/5",
                )}
              >
                {actor ? (
                  <UserAvatar
                    username={actor.username ?? "?"}
                    displayName={actor.name}
                    avatarUrl={actor.avatar_url}
                    className="size-9"
                  />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-4" aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">
                    {actor?.name ? (
                      <strong className="font-medium">{actor.name} </strong>
                    ) : null}
                    {n.title && !actor?.name ? (
                      <strong className="font-medium">{n.title} </strong>
                    ) : null}
                    {n.body}
                  </span>
                  <time
                    dateTime={n.created_at}
                    className="text-xs text-muted-foreground"
                  >
                    {relativeTime(n.created_at)}
                  </time>
                </span>
                {!n.read ? (
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                    aria-label="Unread"
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/settings/notifications" className="hover:underline">
          Notification settings
        </Link>
      </p>
    </div>
  );
}
