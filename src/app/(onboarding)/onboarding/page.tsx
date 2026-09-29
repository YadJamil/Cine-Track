import type { Metadata } from "next";
import { Logo } from "@/components/shared/logo";
import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard";
import { ONBOARDING_SEED_IDS } from "@/features/onboarding/schemas";
import { requireUser, createClient } from "@/lib/supabase/server";
import { tvmaze } from "@/lib/tmdb/client";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, birthday")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_settings")
      .select("is_valid_age")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  let initialStep: "age" | "identity" | "shows" = "age";
  if (settings?.is_valid_age && profile?.birthday) {
    const hasCustomUsername =
      profile?.username && !profile.username.startsWith("user_");
    initialStep = hasCustomUsername ? "shows" : "identity";
  }

  // Curated TVmaze shows for the picker. The list exceeds TVmaze's ~20 req/10s
  // burst limit on a cold cache, so retry the failed ids once; anything still
  // failing is dropped (the wizard shows the rest). Warm loads are all cached.
  const results = await Promise.allSettled(
    ONBOARDING_SEED_IDS.map((id) => tvmaze.showSummary(id)),
  );
  const shows = results.flatMap((r) =>
    r.status === "fulfilled" ? [r.value] : [],
  );
  const failedIds = ONBOARDING_SEED_IDS.filter(
    (id) => !shows.some((s) => s.id === id),
  );
  if (failedIds.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const retried = await Promise.allSettled(
      failedIds.map((id) => tvmaze.showSummary(id)),
    );
    for (const r of retried) {
      if (r.status === "fulfilled") shows.push(r.value);
    }
  }
  const byId = new Map(shows.map((s) => [s.id, s]));
  const suggestions = ONBOARDING_SEED_IDS.flatMap((id) => {
    const s = byId.get(id);
    return s
      ? [
          {
            tmdbId: s.id,
            name: s.name,
            posterPath: s.image?.medium ?? s.image?.original ?? null,
            firstAirDate: s.premiered ?? null,
          },
        ]
      : [];
  });

  return (
    <main className="min-h-svh p-4 py-8">
      <div className="mx-auto mb-8 flex max-w-2xl justify-center">
        <Logo />
      </div>
      <OnboardingWizard
        suggestions={suggestions}
        initialUsername={profile?.username ?? ""}
        initialStep={initialStep}
      />
    </main>
  );
}
