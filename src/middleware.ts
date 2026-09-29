import { type NextFetchEvent, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  return updateSession(request, event);
}

export const config = {
  matcher: [
    // Everything except static assets, images, and PWA files (manifest/SW/offline
    // must load without an auth redirect for installability).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|shell.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
