"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updatePrivacy, updateSettings } from "../actions";

export function PrivacyForm({
  isPublic,
  marketingOptIn,
}: {
  isPublic: boolean;
  marketingOptIn: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy</CardTitle>
        <CardDescription>Control who sees your activity.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            Public profile
            <span className="block text-xs text-muted-foreground">
              When off, only you can see your shows, stats and activity.
            </span>
          </span>
          <Switch
            defaultChecked={isPublic}
            onCheckedChange={(v) => {
              startTransition(async () => {
                const res = await updatePrivacy({ isPublic: v });
                if (!res.ok) toast.error(res.error);
                else router.refresh();
              });
            }}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            Marketing emails
            <span className="block text-xs text-muted-foreground">
              Occasional recommendations and product news.
            </span>
          </span>
          <Switch
            defaultChecked={marketingOptIn}
            onCheckedChange={(v) => {
              startTransition(async () => {
                const res = await updateSettings({ marketing_opt_in: v });
                if (!res.ok) toast.error(res.error);
                else router.refresh();
              });
            }}
          />
        </label>
      </CardContent>
    </Card>
  );
}
