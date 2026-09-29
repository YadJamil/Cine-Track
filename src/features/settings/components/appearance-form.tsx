"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";
import { Monitor, Moon, Sun, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { updateSettings } from "../actions";

const THEMES = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Monitor },
] as const;

const ACCENTS = [
  { key: "yellow", label: "Amber", color: "bg-[oklch(0.879_0.169_96.7)]" },
  { key: "cyan", label: "Cyan", color: "bg-[oklch(0.72_0.15_195)]" },
  { key: "rose", label: "Rose", color: "bg-[oklch(0.65_0.22_18)]" },
  { key: "violet", label: "Violet", color: "bg-[oklch(0.65_0.21_285)]" },
  { key: "emerald", label: "Emerald", color: "bg-[oklch(0.74_0.16_145)]" },
] as const;

export function AppearanceForm() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [accent, setAccent] = useState<string>("yellow");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("cinetrack.accent");
      if (stored) {
        setAccent(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function pickTheme(next: "light" | "dark" | "system") {
    setTheme(next);
    startTransition(async () => {
      await updateSettings({ theme: next });
    });
  }

  function pickAccent(colorId: string) {
    setAccent(colorId);
    try {
      localStorage.setItem("cinetrack.accent", colorId);
      if (colorId === "yellow") {
        document.documentElement.removeAttribute("data-accent");
      } else {
        document.documentElement.setAttribute("data-accent", colorId);
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme Mode</CardTitle>
          <CardDescription>
            Choose your preferred light or dark mode theme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Theme" className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={mounted && theme === t.key}
                onClick={() => pickTheme(t.key)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring cursor-pointer select-none active:scale-[0.98]",
                  mounted && theme === t.key
                    ? "border-primary bg-primary/10"
                    : "border-border/60 hover:bg-accent/40",
                )}
              >
                <t.icon className="size-5" aria-hidden />
                {t.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accent Color</CardTitle>
          <CardDescription>
            Personalize the color of buttons, badges, highlights, and status rings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {ACCENTS.map((acc) => {
              const isActive = accent === acc.key;
              return (
                <button
                  key={acc.key}
                  type="button"
                  onClick={() => pickAccent(acc.key)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all duration-300 cursor-pointer select-none active:scale-[0.98]",
                    isActive
                      ? "border-primary bg-primary/10 shadow-[0_4px_12px_rgba(var(--primary),0.04)]"
                      : "border-border/60 hover:bg-accent/40",
                  )}
                >
                  <span className={cn("size-6 rounded-full border border-black/10 flex items-center justify-center shadow-inner relative transition-transform duration-300", acc.color, isActive && "scale-110")}>
                    {isActive && (
                      <Check className="size-3.5 text-primary-foreground drop-shadow-sm font-black" aria-hidden />
                    )}
                  </span>
                  {acc.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
