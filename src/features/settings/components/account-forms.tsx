"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeEmail,
  changePassword,
  changeUsername,
  deleteAccount,
} from "../actions";

export function AccountForms({
  email,
  username,
  providers,
}: {
  email: string;
  username: string;
  providers: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newUsername, setNewUsername] = useState(username);
  const [newEmail, setNewEmail] = useState(email);
  const [newPassword, setNewPassword] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Something went wrong");
      else {
        toast.success(done);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Connected providers</CardTitle>
          <CardDescription>
            Ways you can sign in to this account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Email only</p>
          ) : (
            providers.map((p) => (
              <Badge key={p} variant="secondary" className="capitalize">
                {p}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Username</CardTitle>
          <CardDescription>
            Your unique handle. Changing it changes your profile URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => changeUsername({ username: newUsername }), "Username updated");
            }}
          >
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
              aria-label="Username"
              className="max-w-56"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={pending || newUsername === username}
            >
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            We&apos;ll send confirmation links to both addresses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => changeEmail({ email: newEmail }),
                "Check both inboxes to confirm the change",
              );
            }}
          >
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              aria-label="Email"
              className="max-w-72"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={pending || newEmail === email}
            >
              Update
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>At least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => changePassword({ password: newPassword }), "Password updated");
              setNewPassword("");
            }}
          >
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              aria-label="New password"
              className="max-w-56"
              minLength={8}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={pending || newPassword.length < 8}
            >
              Change
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            Permanently removes your profile, watches, comments and
            followers. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
          >
            Delete my account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              Type <strong>DELETE</strong> to confirm. Everything is erased
              immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="confirm-delete">Confirmation</Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "DELETE" || pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await deleteAccount({ confirmation: confirmText });
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  window.location.href = "/login";
                });
              }}
            >
              {pending ? "Deleting…" : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
