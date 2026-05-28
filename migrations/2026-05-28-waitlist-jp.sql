-- Waitlist JP pricing (beta v0.9 : JP coupe, capture demande)
-- Source de verite locale. Brevo = consommateur best-effort (sync optionnel).
CREATE TABLE IF NOT EXISTS waitlist_jp (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  card_id     text,                 -- carte depuis laquelle l'inscription a eu lieu (contexte)
  source      text DEFAULT 'jp_pricing',
  brevo_synced boolean DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Dedup : 1 email = 1 inscription (re-inscription = no-op via ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_jp_email ON waitlist_jp (lower(email));

-- Pour le futur sync Brevo : retrouver les non-synces
CREATE INDEX IF NOT EXISTS idx_waitlist_jp_unsynced ON waitlist_jp (brevo_synced) WHERE brevo_synced = false;

COMMENT ON TABLE waitlist_jp IS 'Waitlist pour notifier les users quand le pricing JP arrive (v2.0). Capture en beta v0.9.';
