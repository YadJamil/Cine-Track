import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { PwaBoot } from "@/components/pwa/pwa-boot";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CineTrack",
    template: "CineTrack · %s",
  },
  description:
    "Track TV shows and movies, never miss an episode, and see your watching stats.",
  applicationName: "CineTrack",
  appleWebApp: {
    capable: true,
    title: "CineTrack",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#131315" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Required for env(safe-area-inset-*) to report real values (notch/home
  // indicator) instead of always resolving to 0 — without this, content is
  // free to render edge-to-edge under the home indicator on iOS in
  // standalone/installed mode, and the bottom nav's safe-area padding below
  // is silently a no-op.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const acc = localStorage.getItem("cinetrack.accent");
                if (acc) {
                  document.documentElement.setAttribute("data-accent", acc);
                }
              } catch (e) {}
            `,
          }}
        />
        {/*
          iOS reads apple-mobile-web-app-title / the manifest at the moment
          "Add to Home Screen" is invoked. Without this preload the manifest
          request doesn't start until the browser gets around to it, so on a
          brand-new tab (e.g. right after login) A2HS can catch it mid-flight
          and fall back to the current page's <title> — self-corrects after
          any later navigation once the manifest is cached.
        */}
        <link rel="preload" href="/manifest.webmanifest" as="fetch" crossOrigin="anonymous" />
        <PwaBoot />
      </head>
      <body className="antialiased">
        {/* Dark by default — the exported user had is_using_dark_mode=1 */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          {/* Root-level and un-Suspended on purpose: this has to be able to
              render on the first page a visitor lands on (usually /login),
              with nothing awaiting a server round-trip in front of it. */}
          <InstallPrompt />
          {/* Every success in the app is now a happy cat; every error, a
              startled one. One line, zero per-call-site changes. */}
          <Toaster
            position="bottom-center"
            toastOptions={{
              unstyled: true,
              classNames: {
                toast: "w-full sm:w-[356px] flex items-center gap-3 rounded-2xl p-4 text-sm font-semibold border backdrop-blur-md transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.5)] select-none",
                title: "text-sm font-bold tracking-tight text-foreground",
                description: "text-xs font-medium text-muted-foreground mt-0.5",
                success: "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.05)]",
                error: "bg-destructive/10 border-destructive/20 text-destructive shadow-[0_0_20px_rgba(239,68,68,0.05)]",
                info: "bg-zinc-950/80 border-zinc-900 text-foreground",
                warning: "bg-amber-950/20 border-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.05)]",
                actionButton: "ml-auto shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-black bg-primary text-primary-foreground hover:opacity-95 active:scale-95 transition-all cursor-pointer",
                cancelButton: "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-black bg-zinc-900 text-muted-foreground hover:bg-zinc-800 hover:text-foreground active:scale-95 transition-all cursor-pointer",
              }
            }}
            icons={{
              success: (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)] text-xs">
                  <span aria-hidden>😺</span>
                </div>
              ),
              error: (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20 shadow-[0_0_8px_rgba(239,68,68,0.1)] text-xs">
                  <span aria-hidden>🙀</span>
                </div>
              ),
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
