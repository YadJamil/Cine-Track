import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "127.0.0.1";

const nextConfig: NextConfig = {
  experimental: {
    // Next's default (0s) treats every dynamic route as uncacheable on the
    // client, so navigating back re-fetches from the server every time —
    // the "back doesn't feel instant" complaint. Almost every route here is
    // dynamic (per-user data), so bump the client router cache window;
    // mutations already call revalidatePath, which busts this regardless.
    staleTimes: { dynamic: 30 },
  },
  images: {
    // Source URLs (TVmaze/Cinemeta) are already sized appropriately for where
    // they're rendered (see src/lib/tmdb/mappers.ts), so Vercel/Next never
    // needs to re-transform them — this avoids the per-image, per-breakpoint
    // billed Image Optimization pipeline entirely.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "static.tvmaze.com" },
      { protocol: "https", hostname: "images.metahub.space" },
      { protocol: "https", hostname: "live.metahub.space" },
      { protocol: "https", hostname: "m.media-amazon.com" }, // Cinemeta catalog posters
      { protocol: "https", hostname: supabaseHost },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default withSerwist(nextConfig);
