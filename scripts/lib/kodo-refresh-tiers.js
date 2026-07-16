/**
 * Kodo Engine — priorisation du rafraichissement des prix.
 *
 * Module PARTAGE par tous les ingests (EN/JP, FR, et les suivants) : la
 * fraicheur est une propriete du moteur, pas une option de chaque script.
 * C'est la base de l'API B2B / oracle -> une seule regle, une seule verite.
 *
 * ── LE PROBLEME QU'IL CORRIGE ──────────────────────────────────────────────
 * La selection partait de price_matrix et triait par as_of (date du dernier
 * SUCCES). Deux consequences :
 *   1. price_matrix contient 41k cartes EN/JP dont 20k seulement interrogeables
 *      (le reste = reliquats de sources mortes). Elles portaient le as_of le plus
 *      vieux, raflaient les 1500 places chaque nuit sans produire un seul appel
 *      -> mesure reelle : "cartes: 1500 | rows: 2 | req: 2". 1 carte/nuit.
 *   2. Une carte que la source ignore n'a jamais de as_of recent -> elle reste
 *      eternellement la plus vieille. Boucle sterile.
 * Ici : l'univers = source_refs (cartes REELLEMENT interrogeables), et la
 * rotation se fait sur la TENTATIVE (kodo_refresh_state), pas sur le succes.
 *
 * ── LES TIERS ──────────────────────────────────────────────────────────────
 * Le quota PokeTrace (10 000 req/jour) ne permet pas de tout rafraichir chaque
 * nuit. On arrete donc de traiter 33 000 cartes a egalite :
 *
 *   TIER 1 — quotidien. Cartes detenues en portfolio (TOUS plans, Free inclus :
 *            un Free qui voit un prix faux ne s'abonne jamais), cartes en
 *            wishlist, et cartes >= 20 EUR (les emblematiques, ce qu'on regarde
 *            en arrivant).
 *   TIER 2 — rotation. Rares, holos, tout le reste.
 *   TIER 3 — communes / peu communes : 1 fois par an. Leur prix ne bouge pas,
 *            elles comptent pour le master set, pas pour la valeur.
 *
 * Dans chaque tier : la carte la moins recemment TENTEE passe en premier.
 */

// Raretes "basses" : le libelle brut, car k_cards.rarity_normalized est NULL
// sur 30 190 lignes (inexploitable en l'etat).
const LOW_RARITIES = ['Common', 'Commune', 'Uncommon', 'Peu Commune']

// Portee des identifiants source selon l'ingest.
const ID_SCOPES = {
  any: 'COALESCE(sr.poketrace_us_holo_id, sr.poketrace_us_id, sr.poketrace_eu_holo_id, sr.poketrace_eu_id)',
  us: 'COALESCE(sr.poketrace_us_holo_id, sr.poketrace_us_id)',
  eu: 'COALESCE(sr.poketrace_eu_holo_id, sr.poketrace_eu_id)',
}

/**
 * Selectionne les cartes a rafraichir, par ordre de priorite.
 *
 * @param {object} sql      client neon
 * @param {object} opts
 * @param {string[]} opts.prefixes   ex ['en-%','jp-%','ja-%'] ou ['fr-%']
 * @param {number} opts.budget       nombre de cartes max
 * @param {string} [opts.idScope]    'any' | 'us' | 'eu'  (defaut 'any')
 * @param {number} [opts.hotEur]     seuil Tier 1 par valeur (defaut 20)
 * @param {number} [opts.coldDays]   cadence Tier 3 en jours (defaut 365)
 * @returns {Promise<Array<{kodo_card_id: string, tier: number}>>}
 */
async function selectRefreshBatch(sql, opts) {
  const prefixes = opts.prefixes
  const budget = opts.budget
  const idScope = ID_SCOPES[opts.idScope || 'any']
  const hotEur = opts.hotEur != null ? opts.hotEur : 20
  const coldDays = opts.coldDays != null ? opts.coldDays : 365

  const rows = await sql.query(
    `
    WITH last_seen AS (
      SELECT kodo_card_id, MAX(as_of) AS as_of
      FROM price_matrix
      WHERE kodo_card_id LIKE ANY($1)
      GROUP BY kodo_card_id
    ),
    detenues AS (
      SELECT DISTINCT k_card_id AS id FROM portfolio_cards WHERE k_card_id IS NOT NULL
    ),
    suivies AS (
      SELECT DISTINCT lower(lang) || '-' || set_id || '-' || card_number AS id
      FROM goal_wishlist
      WHERE set_id IS NOT NULL AND card_number IS NOT NULL AND acquired = false
    ),
    univers AS (
      SELECT sr.kodo_card_id,
             -- Rotation sur la TENTATIVE. Au 1er run le tracker est vide :
             -- on repart de l'age reel de la donnee (as_of), puis il prend le relais.
             COALESCE(rs.last_attempt_at, ls.as_of, '1970-01-01'::timestamptz) AS last_attempt,
             CASE
               WHEN d.id IS NOT NULL OR w.id IS NOT NULL THEN 1
               WHEN ps.fair_value_eur >= $2 THEN 1
               WHEN kc.rarity = ANY($3) THEN 3
               ELSE 2
             END AS tier
      FROM source_refs sr
      JOIN k_cards kc ON kc.id = sr.kodo_card_id
      LEFT JOIN last_seen ls ON ls.kodo_card_id = sr.kodo_card_id
      LEFT JOIN price_signals ps
        ON ps.print_id = kc.print_id AND lower(ps.lang) = lower(kc.lang)
      LEFT JOIN detenues d ON d.id = sr.kodo_card_id
      LEFT JOIN suivies w ON w.id = sr.kodo_card_id
      LEFT JOIN kodo_refresh_state rs ON rs.kodo_card_id = sr.kodo_card_id
      WHERE sr.kodo_card_id LIKE ANY($1)
        AND ${idScope} IS NOT NULL
    )
    SELECT kodo_card_id, tier
    FROM univers
    WHERE tier < 3
       OR last_attempt < now() - ($4 || ' days')::interval
    ORDER BY tier ASC, last_attempt ASC
    LIMIT $5
    `,
    [prefixes, hotEur, LOW_RARITIES, String(coldDays), budget],
  )
  return rows
}

/**
 * Journalise les tentatives. A appeler par lots, apres traitement.
 * `ok` distingue "la source a repondu" de "aucune donnee" : c'est ce qui
 * permet de reperer les cartes durablement muettes (misses) sans jamais les
 * bloquer dans la rotation.
 *
 * @param {object} sql
 * @param {Array<{id: string, ok: boolean}>} results
 */
async function markAttempts(sql, results) {
  if (!results || !results.length) return
  const ids = results.map(r => r.id)
  const oks = results.map(r => Boolean(r.ok))
  await sql.query(
    `
    INSERT INTO kodo_refresh_state (kodo_card_id, last_attempt_at, last_success_at, attempts, misses)
    SELECT x.id, now(), CASE WHEN x.ok THEN now() END, 1, CASE WHEN x.ok THEN 0 ELSE 1 END
    FROM unnest($1::text[], $2::boolean[]) AS x(id, ok)
    ON CONFLICT (kodo_card_id) DO UPDATE SET
      last_attempt_at = now(),
      last_success_at = COALESCE(EXCLUDED.last_success_at, kodo_refresh_state.last_success_at),
      attempts        = kodo_refresh_state.attempts + 1,
      misses          = kodo_refresh_state.misses + CASE WHEN EXCLUDED.last_success_at IS NULL THEN 1 ELSE 0 END
    `,
    [ids, oks],
  )
}

/** Repartition du lot par tier, pour les logs. */
function tierSummary(batch) {
  const t = { 1: 0, 2: 0, 3: 0 }
  for (const r of batch) t[r.tier] = (t[r.tier] || 0) + 1
  return 'T1(chaud):' + t[1] + ' T2(rotation):' + t[2] + ' T3(communes):' + t[3]
}

module.exports = { selectRefreshBatch, markAttempts, tierSummary, LOW_RARITIES }
