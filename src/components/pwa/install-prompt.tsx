"use client";

import { useEffect, useState } from "react";
import { Download, Plus, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  INSTALL_AVAILABLE_EVENT,
  INSTALL_EVENT_KEY,
} from "@/components/pwa/pwa-boot";

const DISMISS_KEY = "cinetrack:install-dismissed";

/** Chrome/Edge/Samsung Internet fire this; we defer it to trigger install on our button. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** The event `<PwaBoot>`'s inline script parked before hydration, if any. */
function capturedInstallEvent(): BeforeInstallPromptEvent | null {
  return (
    (window as unknown as Record<string, BeforeInstallPromptEvent | null>)[
      INSTALL_EVENT_KEY
    ] ?? null
  );
}

type Mode = "native" | "ios";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Prompts the user to install the PWA. Mobile only — desktop Chrome/Edge
 * already surface their own install affordance in the omnibox, so this
 * component stays out of the way there. Two paths, because platforms differ:
 * - Android (any Chromium-based browser) → native flow via `beforeinstallprompt`,
 *   a real "Install" button. Browsers that never fire that event (Firefox for
 *   Android, OEM forks without Google's install stack) simply never show this
 *   prompt at all — no manual "Add to Home Screen" instructions fallback,
 *   matching how desktop already stays silent when it can't drive install.
 * - iOS Safari (never exposes any install API) → step-by-step "Add to Home
 *   Screen", the only way to install there.
 * Hidden once installed, dismissed, or on desktop.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* ignore */
    }

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);

    if (!isIos && !isAndroid) return; // desktop: rely on the browser's own UI

    // `beforeinstallprompt` fires once per page load and is never replayed, and
    // this component mounts late (it's behind an auth-gated Suspense boundary),
    // so by now Chrome has usually already fired it. `<PwaBoot>` catches it from
    // an inline head script and parks it on `window` — read that first, and only
    // then listen, for the case where the criteria are still being evaluated.
    const adopt = () => {
      const e = capturedInstallEvent();
      if (!e) return;
      setDeferred(e);
      setMode("native");
      setOpen(true);
    };
    adopt();
    window.addEventListener(INSTALL_AVAILABLE_EVENT, adopt);

    const onInstalled = () => setOpen(false);
    window.addEventListener("appinstalled", onInstalled);

    if (isIos && isSafari) {
      // iOS gives no event — show manual Safari steps immediately.
      setMode("ios");
      setOpen(true);
    }
    // Android: wait for `beforeinstallprompt`. If it never fires, this
    // component stays closed — no instructions fallback.

    return () => {
      window.removeEventListener(INSTALL_AVAILABLE_EVENT, adopt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    setOpen(false);
    if (outcome === "dismissed") dismiss();
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
          <Download className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Install CineTrack</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add it to your home screen for a full-screen app, offline support and
            push notifications.
          </p>

          {mode === "ios" ? (
            <ol className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">1.</span> Navigate to the profile page
              </li>
              <li className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">2.</span> Tap the
                Share icon
                <Share className="size-3.5" aria-hidden />
                in the toolbar
              </li>
              <li className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">3.</span> Choose
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Plus className="size-3.5" aria-hidden /> Add to Home Screen
                </span>
              </li>
              <li>
                <span className="font-semibold text-foreground">4.</span> Tap Add
                — done!
              </li>
            </ol>
          ) : (
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={install}>
                <Download data-icon="inline-start" aria-hidden /> Install
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Not now
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
