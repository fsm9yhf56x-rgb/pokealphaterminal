-- Ajoute le modèle 3 forfaits (free / pro / premium) à profiles.
-- is_pro est conservé en legacy, synchronisé via trigger le temps de la transition.

BEGIN;

-- 1. Colonne plan
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

-- 2. Contrainte de valeurs
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro', 'premium'));

-- 3. Backfill : is_pro=true → 'pro' (premium = nouveau palier, personne encore)
UPDATE profiles SET plan = 'pro'  WHERE is_pro = true  AND plan = 'free';
UPDATE profiles SET plan = 'free' WHERE is_pro = false AND plan IS DISTINCT FROM 'premium';

-- 4. Sync is_pro depuis plan (legacy compat : is_pro = plan ∈ {pro, premium})
--    Trigger bidirectionnel léger : toute écriture de plan met is_pro à jour.
CREATE OR REPLACE FUNCTION sync_is_pro_from_plan()
RETURNS trigger AS $$
BEGIN
  NEW.is_pro := (NEW.plan IN ('pro', 'premium'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_is_pro ON profiles;
CREATE TRIGGER trg_sync_is_pro
  BEFORE INSERT OR UPDATE OF plan ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_is_pro_from_plan();

COMMIT;

-- Vérif (à lancer après) :
--   SELECT plan, is_pro, count(*) FROM profiles GROUP BY 1,2 ORDER BY 1;
