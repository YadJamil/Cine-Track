"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Live unread counter via Supabase Realtime on the notifications table. */
export function NotificationBell({
  userId,
  initialUnread,
  className,
}: {
  userId: string;
  initialUnread: number;
  className?: string;
}) {
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    const supabase = createClient();
    // Unique topic per mount: supabase.channel() reuses a channel with the same
    // topic, and under React Strict Mode's double-invoke the reused channel is
    // already subscribed, so .on() throws "cannot add callbacks after
    // subscribe()". A per-mount nonce sidesteps the reuse entirely.
    const channel = supabase
      .channel(`notifications:${userId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => setUnread((n) => n + 1),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as { read?: boolean };
          const prev = payload.old as { read?: boolean };
          if (next.read && !prev.read) setUnread((n) => Math.max(0, n - 1));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link
      href="/notifications"
      aria-label={
        unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
      }
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-lg hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Bell className="size-5" aria-hidden />
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
