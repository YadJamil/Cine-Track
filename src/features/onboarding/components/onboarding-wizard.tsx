"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Cake, Check, ShieldX, Tv } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { posterUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";
import {
  checkUsernameAvailable,
  claimIdentity,
  completeOnboarding,
  skipAgeGate,
  submitAgeGate,
} from "../actions";
import { MIN_SHOWS } from "../schemas";

type Suggestion = {
  tmdbId: number;
  name: string;
  posterPath: string | null;
  firstAirDate: string | null;
};

type Step = "age" | "identity" | "shows" | "blocked";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CURRENT_YEAR = new Date().getFullYear();
// Newest first — the likeliest birth years sit near the top of the list.
const YEARS = Array.from({ length: 120 }, (_, i) => CURRENT_YEAR - i);

export function OnboardingWizard({
  suggestions,
  initialUsername,
  initialStep = "age",
}: {
  suggestions: Suggestion[];
  initialUsername: string;
  initialStep?: Step;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialStep);
  const [pending, startTransition] = useTransition();

  // age step — three-part birthday picker
  const [bDay, setBDay] = useState<number | null>(null);
  const [bMonth, setBMonth] = useState<number | null>(null);
  const [bYear, setBYear] = useState<number | null>(null);
  const [marketing, setMarketing] = useState(false);

  // Feb/leap-aware day count; 31 until a month is picked.
  const daysInMonth = bMonth
    ? new Date(bYear ?? 2000, bMonth, 0).getDate()
    : 31;
  const birthday =
    bDay && bMonth && bYear
      ? `${bYear}-${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`
      : "";

  // identity step
  const [username, setUsername] = useState(
    initialUsername.startsWith("user_") ? "" : initialUsername,
  );
  const [displayName, setDisplayName] = useState("");
  const [availability, setAvailability] = useState<
    "unknown" | "checking" | "free" | "taken"
  >("unknown");

  // shows step
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setAvailability("unknown");
      return;
    }
    setAvailability("checking");
    const t = setTimeout(async () => {
      const res = await checkUsernameAvailable(username);
      setAvailability(res.ok && res.data ? "free" : "taken");
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  const stepIndex = { age: 0, identity: 1, shows: 2, blocked: 0 }[step];

  function submitAge(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitAgeGate({ birthday, marketingOptIn: marketing });
      if (!res.ok) {
        if (res.error === "UNDERAGE") setStep("blocked");
        else toast.error(res.error);
        return;
      }
      setStep("identity");
    });
  }

  function skipAge() {
    startTransition(async () => {
      const res = await skipAgeGate();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setStep("identity");
    });
  }

  function submitIdentity(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await claimIdentity({ username, displayName });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setStep("shows");
    });
  }

  function toggleShow(tmdbId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tmdbId)) next.delete(tmdbId);
      else next.add(tmdbId);
      return next;
    });
  }

  function finish() {
    startTransition(async () => {
      const res = await completeOnboarding({ tmdbIds: [...selected] });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("You're all set!");
      router.push("/");
      router.refresh();
    });
  }

  if (step === "blocked") {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader className="items-center text-center">
          <ShieldX className="size-10 text-destructive" aria-hidden />
          <CardTitle>Sorry, you can&apos;t use CineTrack yet</CardTitle>
          <CardDescription>
            You need to be at least 16 years old to create an account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Progress value={((stepIndex + 1) / 3) * 100} aria-label="Onboarding progress" />

      {step === "age" ? (
        <Card>
          <CardHeader>
            <Cake className="size-6 text-primary" aria-hidden />
            <CardTitle>First things first</CardTitle>
            <CardDescription>
              We ask your birthday once, to make sure CineTrack is for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitAge} className="flex flex-col gap-4">
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium leading-none">
                  Birthday
                </legend>
                <div className="grid grid-cols-[1fr_1.4fr_1.1fr] gap-2">
                  <Select
                    value={bDay !== null ? String(bDay) : null}
                    onValueChange={(v) => setBDay(Number(v))}
                  >
                    <SelectTrigger className="w-full" aria-label="Day">
                      <span
                        className={cn(
                          "flex-1 text-left",
                          bDay === null && "text-muted-foreground",
                        )}
                      >
                        {bDay ?? "Day"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                        (d) => (
                          <SelectItem key={d} value={String(d)}>
                            {d}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <Select
                    value={bMonth !== null ? String(bMonth) : null}
                    onValueChange={(v) => {
                      const m = Number(v);
                      setBMonth(m);
                      // Keep the day valid when the month shrinks (e.g. 31 → Feb).
                      const max = new Date(bYear ?? 2000, m, 0).getDate();
                      if (bDay !== null && bDay > max) setBDay(null);
                    }}
                  >
                    <SelectTrigger className="w-full" aria-label="Month">
                      <span
                        className={cn(
                          "flex-1 text-left",
                          bMonth === null && "text-muted-foreground",
                        )}
                      >
                        {bMonth !== null ? MONTHS[bMonth - 1] : "Month"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={m} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={bYear !== null ? String(bYear) : null}
                    onValueChange={(v) => {
                      const y = Number(v);
                      setBYear(y);
                      if (bMonth !== null && bDay !== null) {
                        const max = new Date(y, bMonth, 0).getDate();
                        if (bDay > max) setBDay(null);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full" aria-label="Year">
                      <span
                        className={cn(
                          "flex-1 text-left",
                          bYear === null && "text-muted-foreground",
                        )}
                      >
                        {bYear ?? "Year"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </fieldset>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={marketing}
                  onCheckedChange={(v) => setMarketing(v === true)}
                  className="mt-0.5"
                />
                <span className="text-muted-foreground">
                  Send me occasional news about shows I might like (optional)
                </span>
              </label>
              <Button type="submit" disabled={pending || !birthday}>
                {pending ? "Checking…" : "Continue"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={skipAge}
                disabled={pending}
              >
                Skip for now
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === "identity" ? (
        <Card>
          <CardHeader>
            <CardTitle>Claim your handle</CardTitle>
            <CardDescription>
              Your username is unique; your display name is how friends see you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitIdentity} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="e.g. nazjamil"
                  autoComplete="off"
                  aria-describedby="username-status"
                  required
                />
                <p id="username-status" className="min-h-4 text-xs" aria-live="polite">
                  {availability === "checking" ? (
                    <span className="text-muted-foreground">Checking…</span>
                  ) : availability === "free" ? (
                    <span className="text-green-500">@{username} is available</span>
                  ) : availability === "taken" ? (
                    <span className="text-destructive">That username is taken</span>
                  ) : username.length > 0 ? (
                    <span className="text-muted-foreground">
                      3–20 chars: a–z, 0–9, underscore
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Naza"
                  maxLength={50}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={pending || availability !== "free" || !displayName.trim()}
              >
                {pending ? "Saving…" : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === "shows" ? (
        <Card>
          <CardHeader>
            <Tv className="size-6 text-primary" aria-hidden />
            <CardTitle>What are you watching?</CardTitle>
            <CardDescription>
              Pick at least {MIN_SHOWS} shows to start tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Could not load suggestions — please reload the page.
              </p>
            ) : (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6" role="listbox" aria-label="Show suggestions" aria-multiselectable>
                {suggestions.map((s) => {
                  const isSelected = selected.has(s.tmdbId);
                  const poster = posterUrl(s.posterPath, "w342");
                  return (
                    <li key={s.tmdbId}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => toggleShow(s.tmdbId)}
                        className={cn(
                          "group relative block w-full overflow-hidden rounded-lg border-2 transition focus-visible:outline-2 focus-visible:outline-ring",
                          isSelected ? "border-primary" : "border-transparent",
                        )}
                      >
                        <div className="relative aspect-[2/3] bg-muted">
                          {poster ? (
                            <Image
                              src={poster}
                              alt={`${s.name} poster`}
                              fill
                              sizes="(max-width: 640px) 33vw, 120px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center p-1 text-center text-xs text-muted-foreground">
                              {s.name}
                            </span>
                          )}
                          {isSelected ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <Check className="size-8 text-primary" aria-hidden />
                            </span>
                          ) : null}
                        </div>
                        <span className="sr-only">{s.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button
              onClick={finish}
              disabled={pending || selected.size < MIN_SHOWS}
              size="lg"
            >
              {pending
                ? "Setting things up…"
                : selected.size < MIN_SHOWS
                  ? `Pick ${MIN_SHOWS - selected.size} more`
                  : `Start with ${selected.size} shows`}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
