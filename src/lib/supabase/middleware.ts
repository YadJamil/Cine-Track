import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clientEnv } from "@/lib/env";
import type { Database } from "./database.types";

// Cache: onboarding_completed never flips back to false once true, so once a
// request confirms it we skip the DB round-trip on every subsequent request.
const ONBOARDING_COOKIE = "ob_ok";

const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/auth",
  "/shows",
  "/movies",
  "/episodes",
  "/profile",
  // Machine-to-machine endpoint: the DB's pg_net trigger POSTs here with no
  // auth cookies; the route guards itself with the x-push-secret header. An
  // auth redirect would bounce the dispatch to /login and silently kill push.
  "/api/push",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function updateSession(request: NextRequest, event: NextFetchEvent) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and auth.getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthScreen =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");

  if (!user) {
    if (isPublicPath(pathname)) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in: keep auth screens out of the way
  if (isAuthScreen) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Onboarding gate + daily connection log (throttled by cookie, once per UTC day)
  const today = new Date().toISOString().slice(0, 10);
  const needsDailyLog = request.cookies.get("ep_dc")?.value !== today;

  if (needsDailyLog) {
    // Fire-and-forget: the insert's result doesn't affect this response, so
    // don't make every first-request-of-the-day pay for a blocking DB round
    // trip. waitUntil keeps the function alive long enough to finish it.
    event.waitUntil(
      Promise.resolve(
        supabase.from("user_daily_connections").insert({ user_id: user.id }),
      ).then(() => undefined), // conflict (already logged today) is fine
    );
    response.cookies.set("ep_dc", today, {
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
    });
  }

  const onboardingKnownComplete =
    request.cookies.get(ONBOARDING_COOKIE)?.value === "1";

  if (!pathname.startsWith("/onboarding") && !pathname.startsWith("/auth")) {
    if (!onboardingKnownComplete) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!settings || !settings.onboarding_completed) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        url.search = "";
        return NextResponse.redirect(url);
      }
      response.cookies.set(ONBOARDING_COOKIE, "1", {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
  } else if (pathname.startsWith("/onboarding")) {
    if (onboardingKnownComplete) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    const { data: settings } = await supabase
      .from("user_settings")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle();
    if (settings?.onboarding_completed) {
      response.cookies.set(ONBOARDING_COOKIE, "1", {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
