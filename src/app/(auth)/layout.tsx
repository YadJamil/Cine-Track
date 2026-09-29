import { Logo } from "@/components/shared/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-4">
      <Logo />
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
