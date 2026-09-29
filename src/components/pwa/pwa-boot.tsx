/**
 * Inline, render-blocking PWA bootstrap. Everything here has to run before
 * React hydrates, so it can't live in a `useEffect`:
 *
 * - **Capturing `beforeinstallprompt`.** Chrome fires it exactly once per page
 *   load, the moment installability criteria are met, and never replays it. Our
 *   `<InstallPrompt>` sits behind an auth-gated Suspense boundary (it waits on a
 *   Supabase `getUser()` round-trip), so a listener attached in its effect
 *   routinely misses the event on a fresh load — the prompt then stays silent
 *   until some *later* page load happens to lose the race the other way. Parking
 *   the event on `window` from here means it's already waiting whenever the
 *   component mounts.
 * - **Registering the service worker.** Chrome won't fire `beforeinstallprompt`
 *   at all until a SW with a fetch handler controls the page, so registering
 *   after hydration pushes the whole install flow a page load later.
 */

/** Set by the inline script below; read by `<InstallPrompt>` when it mounts. */
export const INSTALL_EVENT_KEY = "__ctInstallEvent";
/** Fired on `window` when the script parks a fresh `beforeinstallprompt`. */
export const INSTALL_AVAILABLE_EVENT = "ct:install-available";

const CAPTURE_INSTALL_EVENT = `
window.${INSTALL_EVENT_KEY} = null;
window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  window.${INSTALL_EVENT_KEY} = e;
  window.dispatchEvent(new Event("${INSTALL_AVAILABLE_EVENT}"));
});
window.addEventListener("appinstalled", function () {
  window.${INSTALL_EVENT_KEY} = null;
});
`;

// Dev serves the committed public/sw.js too, and its precaching breaks HMR.
const REGISTER_SW = `
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(function () {});
}
`;

export function PwaBoot() {
  const source =
    CAPTURE_INSTALL_EVENT +
    (process.env.NODE_ENV === "production" ? REGISTER_SW : "");

  return <script dangerouslySetInnerHTML={{ __html: `try{${source}}catch(e){}` }} />;
}
