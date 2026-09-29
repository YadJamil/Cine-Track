"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Wrong email or password."
          : error.message,
      );
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Log in to keep tracking your shows.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {OAUTH_ENABLED ? (
          <>
            <OAuthButtons next={next} />
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link
            href="/signup"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
