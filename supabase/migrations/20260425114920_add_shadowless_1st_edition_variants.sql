-- ═══════════════════════════════════════════════════════════
-- Add Shadowless / 1st Edition variant sets for vintage WOTC era
--
-- The TCG market treats these as distinct sets with distinct prices.
-- We clone all cards from the parent set, with the variant suffix.
-- Images are reused from parent set via normalizeSetId() in src/lib/images.ts.
-- ═══════════════════════════════════════════════════════════

-- 1. Insert 11 variant sets in tcg_sets
INSERT INTO tcg_sets (id, name, lang, total_cards, release_date) VALUES
  ('en-base1-shadowless',    'Base Set Shadowless',         'EN', 102, '1999-01-09'),
  ('en-base1-shadowless-ns', 'Base Set 1st Edition',         'EN', 102, '1999-01-09'),
  ('en-base2-1st',           'Jungle 1st Edition',           'EN',  64, '1999-06-16'),
  ('en-base3-1st',           'Fossil 1st Edition',           'EN',  62, '1999-10-10'),
  ('en-base5-1st',           'Team Rocket 1st Edition',      'EN',  83, '2000-04-24'),
  ('en-gym1-1st',            'Gym Heroes 1st Edition',       'EN', 132, '2000-08-14'),
  ('en-gym2-1st',            'Gym Challenge 1st Edition',    'EN', 132, '2000-10-16'),
  ('en-neo1-1st',            'Neo Genesis 1st Edition',      'EN', 111, '2000-12-16'),
  ('en-neo2-1st',            'Neo Discovery 1st Edition',    'EN',  75, '2001-06-01'),
  ('en-neo3-1st',            'Neo Revelation 1st Edition',   'EN',  66, '2001-09-21'),
  ('en-neo4-1st',            'Neo Destiny 1st Edition',      'EN', 113, '2002-02-28')
ON CONFLICT (id) DO NOTHING;

-- 2. Clone cards from parent sets to variant sets
-- Each INSERT creates ~100 rows by SELECTing from parent set and rewriting id/set_id

-- Base Set Shadowless (102 cards, parent: en-base1)
INSERT INTO tcg_cards (id, set_id, local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active)
SELECT 'en-base1-shadowless-' || local_id, 'en-base1-shadowless', local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active
FROM tcg_cards WHERE set_id = 'en-base1' ON CONFLICT (id) DO NOTHING;

-- Base Set 1st Edition Shadowless (102 cards, parent: en-base1)
INSERT INTO tcg_cards (id, set_id, local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active)
SELECT 'en-base1-shadowless-ns-' || local_id, 'en-base1-shadowless-ns', local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active
FROM tcg_cards WHERE set_id = 'en-base1' ON CONFLICT (id) DO NOTHING;

-- Jungle 1st Edition (64 cards, parent: en-base2)
INSERT INTO tcg_cards (id, set_id, local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active)
SELECT 'en-base2-1st-' || local_id, 'en-base2-1st', local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active
FROM tcg_cards WHERE set_id = 'en-base2' ON CONFLICT (id) DO NOTHING;

-- Fossil 1st Edition (62 cards, parent: en-base3)
INSERT INTO tcg_cards (id, set_id, local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active)
SELECT 'en-base3-1st-' || local_id, 'en-base3-1st', local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active
FROM tcg_cards WHERE set_id = 'en-base3' ON CONFLICT (id) DO NOTHING;

-- Team Rocket 1st Edition (83 cards, parent: en-base5)
INSERT INTO tcg_cards (id, set_id, local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active)
SELECT 'en-base5-1st-' || local_id, 'en-base5-1st', local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active
FROM tcg_cards WHERE set_id = 'en-base5' ON CONFLICT (id) DO NOTHING;

-- Gym Heroes 1st Edition (132 cards, parent: en-gym1)
INSERT INTO tcg_cards (id, set_id, local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active)
SELECT 'en-gym1-1st-' || local_id, 'en-gym1-1st', local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active
FROM tcg_cards WHERE set_id = 'en-gym1' ON CONFLICT (id) DO NOTHING;

-- Gym Challenge 1st Edition (132 cards, parent: en-gym2)
INSERT INTO tcg_cards (id, set_id, local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active)
SELECT 'en-gym2-1st-' || local_id, 'en-gym2-1st', local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active
FROM tcg_cards WHERE set_id = 'en-gym2' ON CONFLICT (id) DO NOTHING;

-- Neo Genesis 1st Edition (111 cards, parent: en-neo1)
INSERT INTO tcg_cards (id, set_id, local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active)
SELECT 'en-neo1-1st-' || local_id, 'en-neo1-1st', local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active
FROM tcg_cards WHERE set_id = 'en-neo1' ON CONFLICT (id) DO NOTHING;

-- Neo Discovery 1st Edition (75 cards, parent: en-neo2)
INSERT INTO tcg_cards (id, set_id, local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active)
SELECT 'en-neo2-1st-' || local_id, 'en-neo2-1st', local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active
FROM tcg_cards WHERE set_id = 'en-neo2' ON CONFLICT (id) DO NOTHING;

-- Neo Revelation 1st Edition (66 cards, parent: en-neo3)
INSERT INTO tcg_cards (id, set_id, local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active)
SELECT 'en-neo3-1st-' || local_id, 'en-neo3-1st', local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active
FROM tcg_cards WHERE set_id = 'en-neo3' ON CONFLICT (id) DO NOTHING;

-- Neo Destiny 1st Edition (113 cards, parent: en-neo4)
INSERT INTO tcg_cards (id, set_id, local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active)
SELECT 'en-neo4-1st-' || local_id, 'en-neo4-1st', local_id, name, lang, rarity, card_type, hp, has_image, image_synced_at, is_active
FROM tcg_cards WHERE set_id = 'en-neo4' ON CONFLICT (id) DO NOTHING;
