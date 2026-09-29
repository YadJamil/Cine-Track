import type { Metadata } from "next";
import { Logo } from "@/components/shared/logo";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-4">
      <Logo />
      <div className="w-full max-w-sm">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
