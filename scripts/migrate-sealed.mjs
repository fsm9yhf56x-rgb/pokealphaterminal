// Schéma scellé : catalogue + prix courant + historique.
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  `CREATE TABLE IF NOT EXISTS k_sealed_products (
     id           text PRIMARY KEY,
     tcgplayer_id text NOT NULL,
     lang         text NOT NULL,
     name         text NOT NULL,
     set_name     text,
     set_id       text,
     product_type text,
     image_url    text,
     created_at   timestamptz NOT NULL DEFAULT now(),
     updated_at   timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_sealed_set  ON k_sealed_products (set_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sealed_lang ON k_sealed_products (lang)`,
  `CREATE INDEX IF NOT EXISTS idx_sealed_type ON k_sealed_products (product_type)`,
  `CREATE INDEX IF NOT EXISTS idx_sealed_name_trgm ON k_sealed_products USING gin (lower(name) gin_trgm_ops)`,
  `CREATE TABLE IF NOT EXISTS sealed_prices (
     sealed_id    text PRIMARY KEY REFERENCES k_sealed_products(id) ON DELETE CASCADE,
     market_eur   numeric,
     low_eur      numeric,
     market_usd   numeric,
     low_usd      numeric,
     currency_src text,
     sellers      integer,
     as_of        timestamptz,
     computed_at  timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS sealed_price_history (
     sealed_id     text NOT NULL REFERENCES k_sealed_products(id) ON DELETE CASCADE,
     snapshot_date date NOT NULL,
     market_eur    numeric,
     low_eur       numeric,
     market_usd    numeric,
     sellers       integer,
     PRIMARY KEY (sealed_id, snapshot_date)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_sealed_hist_date ON sealed_price_history (snapshot_date)`,
];

for (const s of statements) {
  await sql.query(s);
  console.log('ok:', s.split('\n')[0].slice(0, 56));
}
console.log('migrate-sealed: done');
