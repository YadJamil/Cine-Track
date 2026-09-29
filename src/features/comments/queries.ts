import { createClient } from "@/lib/supabase/server";

export type CommentWithMeta = {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  body: string;
  containsSpoiler: boolean;
  createdAt: string;
  likeCount: number;
  likedByViewer: boolean;
};

type Target =
  | { episodeId: number }
  | { showId: number }
  | { movieId: number };

export async function getComments(
  target: Target,
  viewerId: string | null,
  limit = 50,
): Promise<CommentWithMeta[]> {
  const supabase = await createClient();

  let query = supabase
    .from("comments")
    .select("id, user_id, body, contains_spoiler, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if ("episodeId" in target) query = query.eq("episode_id", target.episodeId);
  else if ("showId" in target)
    query = query.eq("show_id", target.showId).is("episode_id", null);
  else query = query.eq("movie_id", target.movieId);

  const { data: comments, error } = await query;
  if (error) throw new Error(`comments: ${error.message}`);
  if (!comments || comments.length === 0) return [];

  const commentIds = comments.map((c) => c.id);
  const authorIds = [...new Set(comments.map((c) => c.user_id))];

  const [{ data: likes }, { data: authors }] = await Promise.all([
    supabase
      .from("comment_likes")
      .select("comment_id, user_id")
      .in("comment_id", commentIds),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", authorIds),
  ]);

  const authorById = new Map((authors ?? []).map((a) => [a.id, a]));
  const likesByComment = new Map<string, { count: number; viewer: boolean }>();
  for (const like of likes ?? []) {
    const entry = likesByComment.get(like.comment_id) ?? {
      count: 0,
      viewer: false,
    };
    entry.count += 1;
    if (viewerId && like.user_id === viewerId) entry.viewer = true;
    likesByComment.set(like.comment_id, entry);
  }

  return comments.map((c) => {
    const author = authorById.get(c.user_id);
    const likeMeta = likesByComment.get(c.id);
    return {
      id: c.id,
      userId: c.user_id,
      username: author?.username ?? "unknown",
      displayName: author?.display_name ?? null,
      avatarUrl: author?.avatar_url ?? null,
      body: c.body,
      containsSpoiler: c.contains_spoiler,
      createdAt: c.created_at,
      likeCount: likeMeta?.count ?? 0,
      likedByViewer: likeMeta?.viewer ?? false,
    };
  });
}
