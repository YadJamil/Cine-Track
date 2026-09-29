"use client";

import Link from "next/link";
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
import { createClient } from "@/lib/supabase/client";
import { clientEnv } from "@/lib/env";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      String(form.get("email")),
      { redirectTo: `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/reset` },
    );
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSent(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          {sent
            ? "If that email exists, a reset link is on its way."
            : "Enter your email and we'll send you a reset link."}
        </CardDescription>
      </CardHeader>
      {!sent ? (
        <CardContent>
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
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="underline-offset-4 hover:underline"
              >
                Back to login
              </Link>
            </p>
          </form>
        </CardContent>
      ) : null}
    </Card>
  );
}
