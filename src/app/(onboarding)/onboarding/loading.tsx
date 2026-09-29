import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <main className="min-h-svh p-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Skeleton className="mx-auto h-8 w-32" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </main>
  );
}
