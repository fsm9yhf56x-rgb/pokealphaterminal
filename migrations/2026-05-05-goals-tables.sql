-- Goals tables for Objectifs feature
-- Run when Supabase BDD is unblocked

CREATE TABLE IF NOT EXISTS goal_targets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric        text NOT NULL CHECK (metric IN ('portfolio_value', 'cards_count', 'roi_pct', 'graded_count')),
  target_value  numeric NOT NULL,
  unit          text,
  label         text,
  deadline      date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_wishlist (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_name     text NOT NULL,
  set_id        text,
  set_name      text,
  card_number   text,
  lang          text,
  rarity        text,
  priority      int NOT NULL DEFAULT 1 CHECK (priority IN (1, 2, 3)),
  target_price  numeric,
  notes         text,
  acquired      boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_targets_user ON goal_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_wishlist_user ON goal_wishlist(user_id) WHERE NOT acquired;

ALTER TABLE goal_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users see own targets" ON goal_targets FOR ALL USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users see own wishlist" ON goal_wishlist FOR ALL USING (user_id = auth.uid());
