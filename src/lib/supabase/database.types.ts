// Hand-maintained mirror of supabase/migrations (regenerate with
// `supabase gen types typescript --local` once a local stack is available;
// shapes verified against scripts/db-smoke-test.sql).
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MediaType = "show" | "movie";
export type BulkWatchType = "unitary" | "season" | "show" | "fill_previous";
export type NotificationType =
  | "comment_like"
  | "friend_comment"
  | "new_follower"
  | "badge_unlock"
  | "episode_airing"
  | "news"
  | "marketing"
  | "system";
export type ReactionType = "good" | "fun" | "wow" | "sad" | "soso" | "bad";
export type Bucket =
  | "watching"
  | "up_to_date"
  | "completed"
  | "watchlist"
  | "watch_later"
  | "stopped";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          cover_url: string | null;
          cover_show_id: number | null;
          bio: string | null;
          gender: string | null;
          birthday: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          cover_url?: string | null;
          cover_show_id?: number | null;
          bio?: string | null;
          gender?: string | null;
          birthday?: string | null;
          is_public?: boolean;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          cover_url?: string | null;
          cover_show_id?: number | null;
          bio?: string | null;
          gender?: string | null;
          birthday?: string | null;
          is_public?: boolean;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          locale: string;
          timezone: string;
          theme: string;
          notify_comment_likes: boolean;
          notify_friend_comments: boolean;
          notify_new_followers: boolean;
          notify_badge_unlocks: boolean;
          notify_news: boolean;
          notify_episode_airing: boolean;
          airing_offset_minutes: number;
          calendar_backward_days: number;
          excluded_show_ids: number[];
          marketing_opt_in: boolean;
          is_valid_age: boolean;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          locale?: string;
          timezone?: string;
          theme?: string;
          notify_comment_likes?: boolean;
          notify_friend_comments?: boolean;
          notify_new_followers?: boolean;
          notify_badge_unlocks?: boolean;
          notify_news?: boolean;
          notify_episode_airing?: boolean;
          airing_offset_minutes?: number;
          calendar_backward_days?: number;
          excluded_show_ids?: number[];
          marketing_opt_in?: boolean;
          is_valid_age?: boolean;
          onboarding_completed?: boolean;
        };
        Update: {
          locale?: string;
          timezone?: string;
          theme?: string;
          notify_comment_likes?: boolean;
          notify_friend_comments?: boolean;
          notify_new_followers?: boolean;
          notify_badge_unlocks?: boolean;
          notify_news?: boolean;
          notify_episode_airing?: boolean;
          airing_offset_minutes?: number;
          calendar_backward_days?: number;
          excluded_show_ids?: number[];
          marketing_opt_in?: boolean;
          is_valid_age?: boolean;
          onboarding_completed?: boolean;
        };
        Relationships: [];
      };
      shows: {
        Row: {
          id: number;
          tmdb_id: number;
          name: string;
          original_name: string | null;
          overview: string | null;
          poster_path: string | null;
          backdrop_path: string | null;
          first_air_date: string | null;
          status: string | null;
          in_production: boolean | null;
          episode_runtime: number | null;
          genres: Json;
          networks: Json;
          origin_country: string[] | null;
          original_language: string | null;
          number_of_seasons: number | null;
          number_of_episodes: number | null;
          popularity: number | null;
          vote_average: number | null;
          synced_at: string;
          created_at: string;
        };
        Insert: {
          tmdb_id: number;
          name: string;
          original_name?: string | null;
          overview?: string | null;
          poster_path?: string | null;
          backdrop_path?: string | null;
          first_air_date?: string | null;
          status?: string | null;
          in_production?: boolean | null;
          episode_runtime?: number | null;
          genres?: Json;
          networks?: Json;
          origin_country?: string[] | null;
          original_language?: string | null;
          number_of_seasons?: number | null;
          number_of_episodes?: number | null;
          popularity?: number | null;
          vote_average?: number | null;
          synced_at?: string;
        };
        Update: {
          name?: string;
          original_name?: string | null;
          overview?: string | null;
          poster_path?: string | null;
          backdrop_path?: string | null;
          first_air_date?: string | null;
          status?: string | null;
          in_production?: boolean | null;
          episode_runtime?: number | null;
          genres?: Json;
          networks?: Json;
          origin_country?: string[] | null;
          original_language?: string | null;
          number_of_seasons?: number | null;
          number_of_episodes?: number | null;
          popularity?: number | null;
          vote_average?: number | null;
          synced_at?: string;
        };
        Relationships: [];
      };
      seasons: {
        Row: {
          id: number;
          show_id: number;
          tmdb_id: number | null;
          season_number: number;
          name: string | null;
          overview: string | null;
          poster_path: string | null;
          air_date: string | null;
          episode_count: number | null;
        };
        Insert: {
          show_id: number;
          tmdb_id?: number | null;
          season_number: number;
          name?: string | null;
          overview?: string | null;
          poster_path?: string | null;
          air_date?: string | null;
          episode_count?: number | null;
        };
        Update: {
          name?: string | null;
          overview?: string | null;
          poster_path?: string | null;
          air_date?: string | null;
          episode_count?: number | null;
        };
        Relationships: [];
      };
      episodes: {
        Row: {
          id: number;
          show_id: number;
          season_id: number | null;
          tmdb_id: number | null;
          season_number: number;
          episode_number: number;
          name: string | null;
          overview: string | null;
          still_path: string | null;
          air_date: string | null;
          runtime: number | null;
        };
        Insert: {
          show_id: number;
          season_id?: number | null;
          tmdb_id?: number | null;
          season_number: number;
          episode_number: number;
          name?: string | null;
          overview?: string | null;
          still_path?: string | null;
          air_date?: string | null;
          runtime?: number | null;
        };
        Update: {
          name?: string | null;
          overview?: string | null;
          still_path?: string | null;
          air_date?: string | null;
          runtime?: number | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
        };
        Update: {
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      movies: {
        Row: {
          id: number;
          source_id: string;
          title: string;
          original_title: string | null;
          overview: string | null;
          poster_path: string | null;
          backdrop_path: string | null;
          release_date: string | null;
          runtime: number | null;
          genres: Json;
          popularity: number | null;
          vote_average: number | null;
          synced_at: string;
          created_at: string;
        };
        Insert: {
          source_id: string;
          title: string;
          original_title?: string | null;
          overview?: string | null;
          poster_path?: string | null;
          backdrop_path?: string | null;
          release_date?: string | null;
          runtime?: number | null;
          genres?: Json;
          popularity?: number | null;
          vote_average?: number | null;
          synced_at?: string;
        };
        Update: {
          title?: string;
          overview?: string | null;
          poster_path?: string | null;
          backdrop_path?: string | null;
          release_date?: string | null;
          runtime?: number | null;
          genres?: Json;
          popularity?: number | null;
          vote_average?: number | null;
          synced_at?: string;
        };
        Relationships: [];
      };
      user_shows: {
        Row: {
          user_id: string;
          show_id: number;
          is_followed: boolean;
          is_favorited: boolean;
          is_for_later: boolean;
          is_archived: boolean;
          followed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          show_id: number;
          is_followed?: boolean;
          is_favorited?: boolean;
          is_for_later?: boolean;
          is_archived?: boolean;
          followed_at?: string | null;
        };
        Update: {
          is_followed?: boolean;
          is_favorited?: boolean;
          is_for_later?: boolean;
          is_archived?: boolean;
          followed_at?: string | null;
        };
        Relationships: [];
      };
      episode_watches: {
        Row: {
          id: string;
          user_id: string;
          episode_id: number;
          show_id: number;
          watched_at: string;
          bulk_type: BulkWatchType;
          runtime_seconds: number;
        };
        Insert: {
          user_id: string;
          episode_id: number;
          show_id: number;
          watched_at?: string;
          bulk_type?: BulkWatchType;
          runtime_seconds?: number;
        };
        Update: {
          watched_at?: string;
        };
        Relationships: [];
      };
      movie_watches: {
        Row: {
          id: string;
          user_id: string;
          movie_id: number;
          watched_at: string;
          runtime_seconds: number;
        };
        Insert: {
          user_id: string;
          movie_id: number;
          watched_at?: string;
          runtime_seconds?: number;
        };
        Update: {
          watched_at?: string;
        };
        Relationships: [];
      };
      user_daily_connections: {
        Row: { user_id: string; day: string; created_at: string };
        Insert: { user_id: string; day?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      show_addiction_scores: {
        Row: {
          user_id: string;
          show_id: number;
          daily_score: number;
          weekly_score: number;
          monthly_score: number;
          last_action_at: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      follows: {
        Row: {
          follower_id: string;
          followee_id: string;
          affinity: number;
          created_at: string;
        };
        Insert: { follower_id: string; followee_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          media_type: MediaType;
          show_id: number | null;
          episode_id: number | null;
          movie_id: number | null;
          body: string;
          contains_spoiler: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          media_type: MediaType;
          show_id?: number | null;
          episode_id?: number | null;
          movie_id?: number | null;
          body: string;
          contains_spoiler?: boolean;
        };
        Update: { body?: string; contains_spoiler?: boolean };
        Relationships: [];
      };
      comment_likes: {
        Row: { comment_id: string; user_id: string; created_at: string };
        Insert: { comment_id: string; user_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          media_type: MediaType;
          show_id: number | null;
          movie_id: number | null;
          rating: number;
          body: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          media_type: MediaType;
          show_id?: number | null;
          movie_id?: number | null;
          rating: number;
          body?: string | null;
        };
        Update: { rating?: number; body?: string | null };
        Relationships: [];
      };
      episode_reactions: {
        Row: {
          user_id: string;
          episode_id: number;
          reaction: ReactionType;
          created_at: string;
        };
        Insert: { user_id: string; episode_id: number; reaction: ReactionType };
        Update: { reaction?: ReactionType };
        Relationships: [];
      };
      lists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          is_public: boolean;
          ordering: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          description?: string | null;
          is_public?: boolean;
          ordering?: number;
        };
        Update: {
          name?: string;
          description?: string | null;
          is_public?: boolean;
          ordering?: number;
        };
        Relationships: [];
      };
      list_items: {
        Row: {
          id: string;
          list_id: string;
          media_type: MediaType;
          show_id: number | null;
          movie_id: number | null;
          position: number;
          created_at: string;
        };
        Insert: {
          list_id: string;
          media_type: MediaType;
          show_id?: number | null;
          movie_id?: number | null;
          position?: number;
        };
        Update: { position?: number };
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string | null;
          body: string | null;
          actors: Json;
          data: Json;
          url: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: never;
        Update: { read?: boolean };
        Relationships: [];
      };
      badges: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          sort: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      user_badges: {
        Row: { user_id: string; badge_id: string; unlocked_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      data_export_requests: {
        Row: {
          id: string;
          user_id: string;
          status: "pending" | "processing" | "done" | "error";
          storage_path: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string };
        Update: {
          status?: "pending" | "processing" | "done" | "error";
          storage_path?: string | null;
          error_message?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      v_user_show_progress: {
        Row: {
          user_id: string;
          show_id: number;
          tmdb_id: number;
          name: string;
          poster_path: string | null;
          backdrop_path: string | null;
          status: string | null;
          is_followed: boolean;
          is_favorited: boolean;
          is_for_later: boolean;
          is_archived: boolean;
          watched_count: number;
          aired_count: number;
          last_watched_at: string | null;
          bucket: Bucket;
          genres: Json;
        };
        Relationships: [];
      };
      v_user_statistics: {
        Row: {
          user_id: string;
          shows_followed: number;
          episodes_watched: number;
          seconds_watched: number;
          movies_watched: number;
          movie_seconds_watched: number;
          following_count: number;
          followers_count: number;
          comments_count: number;
          reviews_count: number;
          badges_count: number;
        };
        Relationships: [];
      };
      mv_trending_shows: {
        Row: {
          show_id: number;
          tmdb_id: number;
          name: string;
          poster_path: string | null;
          backdrop_path: string | null;
          first_air_date: string | null;
          vote_average: number | null;
          recent_follows: number;
          recent_watchers: number;
          recent_watches: number;
          trend_score: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      mark_watched: {
        Args: {
          p_show_id: number;
          p_mode: BulkWatchType;
          p_episode_id?: number | null;
          p_season_number?: number | null;
        };
        Returns: Database["public"]["Tables"]["episode_watches"]["Row"][];
      };
      unmark_watched: {
        Args: { p_episode_id: number };
        Returns: undefined;
      };
      unmark_season: {
        Args: { p_show_id: number; p_season_number: number };
        Returns: undefined;
      };
      fn_stats_by_month: {
        Args: { p_user_id: string; p_media: MediaType };
        Returns: { month: string; count: number; hours: number }[];
      };
      fn_stats_by_week: {
        Args: { p_user_id: string; p_media: MediaType };
        Returns: { week: string; count: number; hours: number }[];
      };
      fn_biggest_marathons: {
        Args: { p_user_id: string };
        Returns: {
          show_id: number;
          show_tmdb_id: number;
          show_name: string;
          poster_path: string | null;
          episodes: number;
          day: string;
        }[];
      };
      fn_next_episode: {
        Args: { p_user_id: string; p_show_id: number };
        Returns: Database["public"]["Tables"]["episodes"]["Row"][];
      };
      fn_watch_next: {
        Args: { p_user_id: string };
        Returns: {
          show_id: number;
          show_tmdb_id: number;
          show_name: string;
          poster_path: string | null;
          backdrop_path: string | null;
          episode_id: number;
          season_number: number;
          episode_number: number;
          episode_name: string | null;
          episode_air_date: string | null;
          episode_runtime: number | null;
          watched_count: number;
          aired_count: number;
          last_watched_at: string | null;
        }[];
      };
      fn_upcoming_calendar: {
        Args: { p_user_id: string; p_from: string; p_to: string };
        Returns: {
          episode_id: number;
          show_id: number;
          show_tmdb_id: number;
          show_name: string;
          poster_path: string | null;
          still_path: string | null;
          season_number: number;
          episode_number: number;
          episode_name: string | null;
          air_date: string;
          runtime: number | null;
          is_watched: boolean;
        }[];
      };
      fn_activity_feed: {
        Args: { p_user_id: string; p_limit?: number; p_before?: string | null };
        Returns: {
          event_type: "watch" | "movie_watch" | "follow" | "review" | "badge";
          actor_id: string;
          actor_username: string;
          actor_display_name: string | null;
          actor_avatar_url: string | null;
          created_at: string;
          payload: Json;
        }[];
      };
      fn_search_users: {
        Args: { p_query: string; p_limit?: number };
        Returns: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          is_public: boolean;
        }[];
      };
      fn_affinity: {
        Args: { p_a: string; p_b: string };
        Returns: number;
      };
      fn_check_badges: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      fn_recompute_addiction_scores: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      fn_refresh_affinities: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      fn_refresh_trending: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      fn_notify_airing_episodes: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      media_type: MediaType;
      bulk_watch_type: BulkWatchType;
      notification_type: NotificationType;
      reaction_type: ReactionType;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
export type Functions<T extends keyof Database["public"]["Functions"]> =
  Database["public"]["Functions"][T];
