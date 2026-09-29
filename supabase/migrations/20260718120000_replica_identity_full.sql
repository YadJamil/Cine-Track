-- Enable REPLICA IDENTITY FULL on public.notifications
-- This ensures payload.old contains all columns (specifically 'read') during UPDATE events,
-- preventing the client-side NotificationBell unread count desync.
alter table public.notifications replica identity full;
