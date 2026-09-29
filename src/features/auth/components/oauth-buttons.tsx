"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { clientEnv } from "@/lib/env";

// Flip to `true` to bring Google/Apple sign-in back on the login + signup forms.
export const OAUTH_ENABLED = true;

// The export proves multi-provider accounts (apple + native on one user).
export function OAuthButtons({ next = "/" }: { next?: string }) {
  const [pending, setPending] = useState<"google" | "apple" | null>(null);

  async function signInWith(provider: "google" | "apple") {
    setPending(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      toast.error(`Could not start ${provider} sign-in: ${error.message}`);
      setPending(null);
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending !== null}
        onClick={() => signInWith("google")}
        className="w-full"
      >
        {pending === "google" ? "Redirecting…" : "Google"}
      </Button>
    </div>
  );
}
