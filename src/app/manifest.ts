import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CineTrack — track what you watch",
    short_name: "CineTrack",
    description:
      "Track TV shows and movies, never miss an episode, and see your watching stats.",
    id: "/",
    // Keep the installed app on its canonical URL. `shell.html` is reserved
    // for the service worker's offline fallback, never the PWA launch URL.
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#141416",
    theme_color: "#141416",
    categories: ["entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
