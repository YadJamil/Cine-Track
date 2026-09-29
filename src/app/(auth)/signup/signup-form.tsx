"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  OAuthButtons,
  OAUTH_ENABLED,
} from "@/features/auth/components/oauth-buttons";
import { createClient } from "@/lib/supabase/client";
import { clientEnv } from "@/lib/env";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/onboarding`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // Existing confirmed accounts come back with an empty identities array
    if (data.user && data.user.identities?.length === 0) {
      setError("An account with this email already exists. Try logging in.");
      setLoading(false);
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <MailCheck className="size-8 text-primary" aria-hidden />
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            We sent a confirmation link to <strong>{sentTo}</strong>. Click it
            to activate your account, then come back to pick your first shows.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Track every show and never miss an episode.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {OAUTH_ENABLED ? (
          <>
            <OAuthButtons next="/onboarding" />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Separator className="flex-1" /> or <Separator className="flex-1" />
            </div>
          </>
        ) : null}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Sign up"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
