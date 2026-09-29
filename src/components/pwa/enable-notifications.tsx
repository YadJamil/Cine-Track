"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clientEnv } from "@/lib/env";
import {
  savePushSubscription,
  sendTestPush,
} from "@/features/notifications/push-actions";

const DISMISS_KEY = "cinetrack:push-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** VAPID public keys are URL-safe base64; the browser wants a Uint8Array. */
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * navigator.serviceWorker.ready, but rejects with "sw-timeout" instead of
 * hanging forever if no service worker ever activates — otherwise the button
 * would sit on "Enabling…" indefinitely after permission is granted.
 */
function serviceWorkerReady(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("sw-timeout")), timeoutMs),
    ),
  ]);
}

/**
 * Asks for notification permission the first time someone opens the installed
 * PWA, then subscribes them to Web Push so alerts arrive while the app is
 * closed. Deliberately narrow so it never nags:
 * - only inside the installed app (standalone display mode),
 * - only if permission is still undecided,
 * - only once VAPID + push support exist,
 * - and it remembers a dismissal.
 */
export function EnableNotifications() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (typeof Notification === "undefined") return;
    if (!isStandalone()) return; // only prompt inside the installed app
    if (Notification.permission !== "default") return; // already granted/denied
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        dismiss();
        return;
      }
      const reg = await serviceWorkerReady();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
        ),
      });
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        userAgent: navigator.userAgent,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setOpen(false);
      toast.success("Notifications on! 🐾");
      // Immediate proof it works, even with the app in the background.
      await sendTestPush();
    } catch (e) {
      toast.error(
        e instanceof Error && e.message === "sw-timeout"
          ? "Service worker isn't ready yet — reload the app and try again."
          : "Could not enable notifications.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-sm rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur md:inset-x-auto md:right-4 md:bottom-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Bell className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Turn on notifications?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Get a nudge when a new episode of a show you follow airs — even when
            CineTrack isn&apos;t open.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={enable} disabled={busy}>
              {busy ? "Enabling…" : "Enable"}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss} disabled={busy}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
