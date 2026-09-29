import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";
import type { Database } from "./database.types";

// Cached per-request: a page render fans out into many independent Server
// Components (layout + nested Suspense boundaries + the page itself), each
// of which calls createClient()/getUser(). auth.getUser() always hits the
// Supabase Auth server over the network (by design, to revalidate the
// token), so without this cache a single navigation could fire five or more
// redundant round trips. React's cache() dedupes same-request calls to one.
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component: middleware refreshes sessions instead.
          }
        },
      },
    },
  );
});

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** For pages that must be signed in; middleware normally guarantees this. */
export async function requireUser() {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
