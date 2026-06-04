-- Streak de visites — Neon + Better Auth (remplace localStorage pka_streak_v1)
-- Pattern aligne sur les tables metier : user_id = user.id (text, Better Auth).
-- Pas de RLS (Neon direct) : la securite se fait cote route /api/streak.
-- 1 ligne par utilisateur (UNIQUE).

CREATE TABLE IF NOT EXISTS user_streaks (
  user_id       text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  current       integer NOT NULL DEFAULT 1,
  longest       integer NOT NULL DEFAULT 1,
  total_visits  integer NOT NULL DEFAULT 1,
  last_visit    date    NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
