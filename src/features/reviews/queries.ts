import { createClient } from "@/lib/supabase/server";

export type ReviewWithAuthor = {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  rating: number;
  body: string | null;
  createdAt: string;
};

export async function getReviews(
  target: { showId: number } | { movieId: number },
  limit = 30,
): Promise<{ reviews: ReviewWithAuthor[]; average: number | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("reviews")
    .select("id, user_id, rating, body, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  query =
    "showId" in target
      ? query.eq("show_id", target.showId)
      : query.eq("movie_id", target.movieId);

  const { data: reviews, error } = await query;
  if (error) throw new Error(`reviews: ${error.message}`);
  if (!reviews || reviews.length === 0) return { reviews: [], average: null };

  const authorIds = [...new Set(reviews.map((r) => r.user_id))];
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", authorIds);
  const authorById = new Map((authors ?? []).map((a) => [a.id, a]));

  const average =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return {
    average: Math.round(average * 10) / 10,
    reviews: reviews.map((r) => {
      const author = authorById.get(r.user_id);
      return {
        id: r.id,
        userId: r.user_id,
        username: author?.username ?? "unknown",
        displayName: author?.display_name ?? null,
        avatarUrl: author?.avatar_url ?? null,
        rating: r.rating,
        body: r.body,
        createdAt: r.created_at,
      };
    }),
  };
}
