-- Idempotent seed: static badge catalog (also inserted by migration; kept here so
-- `supabase db reset` on a pruned catalog always restores it).
insert into public.badges (id, name, description, icon, sort) values
  ('first_episode',        'First Step',      'Watch your first episode',                 'play',      10),
  ('ep_100',               'Century',         'Watch 100 episodes',                       'award',     20),
  ('ep_1000',              'Binge Lord',      'Watch 1,000 episodes',                     'crown',     30),
  ('first_show_completed', 'Finisher',        'Watch every aired episode of a show',      'check',     40),
  ('marathon_10',          'Marathoner',      'Watch 10+ episodes of one show in a day',  'zap',       50),
  ('streak_7',             'One Week Streak', 'Open Episode 7 days in a row',             'flame',     60),
  ('streak_30',            'One Month Streak','Open Episode 30 days in a row',            'flame',     70),
  ('first_friend',         'Social Animal',   'Follow your first friend',                 'users',     80),
  ('first_review',         'Critic',          'Write your first review',                  'star',      90),
  ('night_owl',            'Night Owl',       'Watch an episode between midnight and 4am','moon',     100)
on conflict (id) do nothing;
