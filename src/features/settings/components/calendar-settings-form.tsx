"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { posterUrl } from "@/lib/tmdb/images";
import { updateSettings } from "../actions";

export function CalendarSettingsForm({
  backwardDays,
  excludedShowIds,
  shows,
}: {
  backwardDays: number;
  excludedShowIds: number[];
  shows: { id: number; name: string; poster_path: string | null }[];
}) {
  const router = useRouter();
  const [excluded, setExcluded] = useState<Set<number>>(
    new Set(excludedShowIds),
  );
  const [, startTransition] = useTransition();

  function save(patch: Record<string, unknown>) {
    startTransition(async () => {
      const res = await updateSettings(patch);
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }

  function toggleExcluded(showId: number, exclude: boolean) {
    const next = new Set(excluded);
    if (exclude) next.add(showId);
    else next.delete(showId);
    setExcluded(next);
    save({ excluded_show_ids: [...next] });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Calendar window</CardTitle>
          <CardDescription>
            How many past days the agenda shows (export default: 1).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            defaultValue={String(backwardDays)}
            onValueChange={(v) => {
              if (v !== null) save({ calendar_backward_days: Number(v) });
            }}
          >
            <SelectTrigger className="w-40" aria-label="Backward days">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 7, 14, 30].map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} day{d === 1 ? "" : "s"} back
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Excluded shows</CardTitle>
          <CardDescription>
            Excluded shows are hidden from your calendar and airing reminders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Follow some shows first.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {shows.map((s) => {
                const poster = posterUrl(s.poster_path, "w154");
                const isExcluded = excluded.has(s.id);
                return (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-2 text-sm">
                      <span className="relative block h-10 w-7 shrink-0 overflow-hidden rounded-sm bg-muted">
                        {poster ? (
                          <Image
                            src={poster}
                            alt=""
                            fill
                            sizes="28px"
                            className="object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {isExcluded ? "Excluded" : "Shown"}
                      </span>
                      <Switch
                        checked={!isExcluded}
                        onCheckedChange={(shown) =>
                          toggleExcluded(s.id, !shown)
                        }
                        aria-label={`Show ${s.name} on calendar`}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
