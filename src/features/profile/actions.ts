"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { tvmaze } from "@/lib/tmdb/client";
import { pickLandscapeImage } from "@/lib/tmdb/images";
import { err, ok, type Result } from "@/lib/types";
import { isPresetAvatarId, presetAvatarPath } from "./preset-avatars";

const movieCoverSchema = z.object({
  movieId: z.number().int().positive(),
  movieSourceId: z.string().min(1),
});

/** Profile cover from a movie's wide backdrop (Cinemeta already gives landscape). */
export async function setCoverFromMovie(input: unknown): Promise<Result> {
  const parsed = movieCoverSchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Log in first.");

  const { data: movie } = await supabase
    .from("movies")
    .select("backdrop_path")
    .eq("id", parsed.data.movieId)
    .maybeSingle();
  if (!movie) return err("Movie not found");
  if (!movie.backdrop_path) return err("This movie has no landscape artwork.");

  const { error } = await supabase
    .from("profiles")
    .update({ cover_url: movie.backdrop_path, cover_show_id: null })
    .eq("id", user.id);
  if (error) return err(error.message);

  revalidatePath(`/movies/${parsed.data.movieSourceId}`);
  revalidatePath("/profile", "layout");
  return ok(undefined);
}

const coverSchema = z.object({
  showId: z.number().int().positive(),
  showTmdbId: z.number().int().positive(),
});

/** Parity with user_personal_data.cover: profile cover from show artwork. */
export async function setCoverFromShow(input: unknown): Promise<Result> {
  const parsed = coverSchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Log in first.");

  const { data: show } = await supabase
    .from("shows")
    .select("tmdb_id, backdrop_path")
    .eq("id", parsed.data.showId)
    .maybeSingle();
  if (!show) return err("Show not found");

  // Covers are a wide banner — never the portrait poster. TVmaze's base show has
  // no backdrop, so fetch a landscape "background" image from its images
  // endpoint (and cache it on the row for next time).
  let landscape = show.backdrop_path;
  if (!landscape) {
    try {
      landscape = pickLandscapeImage(await tvmaze.showImages(show.tmdb_id));
    } catch {
      landscape = null;
    }
    if (landscape) {
      await createServiceClient()
        .from("shows")
        .update({ backdrop_path: landscape })
        .eq("id", parsed.data.showId);
    }
  }
  if (!landscape) return err("This show has no landscape artwork to use.");

  const { error } = await supabase
    .from("profiles")
    .update({ cover_url: landscape, cover_show_id: parsed.data.showId })
    .eq("id", user.id);
  if (error) return err(error.message);

  revalidatePath(`/shows/${parsed.data.showTmdbId}`);
  revalidatePath("/profile", "layout");
  return ok(undefined);
}

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(50),
  bio: z.string().trim().max(500).optional(),
  gender: z.string().trim().max(30).optional(),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  isPublic: z.boolean(),
  // Preset avatar id chosen in the dialog; persisted together with the rest of
  // the form so nothing is saved until the user hits "Save changes".
  avatarId: z.string().nullish(),
});

export async function updateProfile(input: unknown): Promise<Result> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  // Only touch the avatar when a valid preset was selected — leave any existing
  // (e.g. legacy uploaded) avatar untouched otherwise.
  const avatarPatch =
    parsed.data.avatarId && isPresetAvatarId(parsed.data.avatarId)
      ? { avatar_url: presetAvatarPath(parsed.data.avatarId) }
      : {};

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio || null,
      gender: parsed.data.gender || null,
      birthday: parsed.data.birthday || null,
      is_public: parsed.data.isPublic,
      ...avatarPatch,
    })
    .eq("id", user.id);
  if (error) return err(error.message);

  revalidatePath("/profile", "layout");
  return ok(undefined);
}

const avatarSchema = z.object({
  kind: z.enum(["avatar", "cover"]),
});

/**
 * Uploads go straight from the browser to Storage (RLS: own folder only);
 * this action just records the public URL on the profile.
 */
export async function setProfileImage(
  input: unknown,
  publicUrl: string,
): Promise<Result> {
  const parsed = avatarSchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");
  if (!z.string().url().safeParse(publicUrl).success) return err("Invalid URL");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const patch =
    parsed.data.kind === "avatar"
      ? { avatar_url: publicUrl }
      : { cover_url: publicUrl, cover_show_id: null };
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
  if (error) return err(error.message);

  revalidatePath("/profile", "layout");
  return ok(undefined);
}
