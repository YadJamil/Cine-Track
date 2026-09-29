import { SettingsNav } from "@/features/settings/components/settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <SettingsNav />
      <div>{children}</div>
    </div>
  );
}
