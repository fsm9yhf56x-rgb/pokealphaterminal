/**
 * ORDONNANCEUR DE RAFRAICHISSEMENT — scellé, sous contrainte de budget eBay.
 *
 * Le quota Browse est de 5 000 appels/jour et ne bougera pas : eBay a refusé
 * l'extension le 31/07 ("not expanding partnerships with affiliates focused on
 * trading cards"). La couverture FR + EN + JP doit donc tenir dans cette
 * enveloppe. Gratter des appels ne suffit pas — il faut CHOISIR quoi rafraîchir.
 *
 * PRINCIPE : un score de priorité, pas une rotation. Une rotation par jour de
 * mois sert toujours les mêmes séries aux mêmes moments et ignore que certaines
 * bougent tous les jours quand d'autres dorment un mois. Le score, lui,
 * s'auto-régule : ce qui n'est pas servi ce soir voit son âge croître et remonte
 * mécaniquement demain. Aucune série ne peut être oubliée indéfiniment.
 *
 * TROIS FACTEURS, tous mesurés, aucun arbitraire :
 *   - VALEUR   : la somme des cotes de la série. Se tromper de 10 % sur un
 *                display à 2 000 EUR coûte 200 EUR de crédibilité, sur un
 *                booster à 5 EUR cela ne se voit pas.
 *   - AGE      : heures depuis le dernier passage. Facteur dominant — c'est lui
 *                qui garantit qu'aucune série ne décroche.
 *   - MOUVEMENT: amplitude des variations récentes. Un marché qui bouge doit
 *                être suivi de près ; un marché mort peut attendre.
 *
 * Le score est logarithmique sur la valeur : sans cela, un seul display vintage
 * à 30 000 EUR écraserait 170 séries modernes et les affamerait.
 */

/** Budget par défaut. 5 000 moins une réserve de 10 % pour les reprises. */
export const BUDGET_DEFAUT = Number(process.env.KODO_EBAY_BUDGET || 4500);

/** Coût d'un passage de recherche sur une série (4 requêtes). */
export const COUT_RECHERCHE = 4;

/**
 * Classe les séries par priorité de rafraîchissement.
 *
 * Une seule requête SQL, pas de N+1 : le classement de 625 séries doit coûter
 * un aller-retour, pas 625.
 *
 * @returns {Promise<Array<{set_id: string, score: number, age_h: number, valeur: number}>>}
 */
export async function planifierRecherche(sql, { lang = 'fr', budget = 0 } = {}) {
  const max = Math.max(0, Math.floor(budget / COUT_RECHERCHE));
  if (max === 0) return [];

  const rows = await sql`
    WITH serie AS (
      SELECT
        p.kodo_set_id AS set_id,
        COALESCE(SUM(sp.market_eur), 0)::numeric AS valeur,
        COUNT(*)::int AS produits,
        -- Proxy du dernier passage : chaque run met a jour last_seen_at sur les
        -- annonces qu'il revoit. Evite une table de log supplementaire.
        MAX(a.last_seen_at) AS vu_le,
        -- Amplitude relative des variations sur 14 jours. NULL si pas
        -- d'historique : une serie neuve ne doit pas etre penalisee.
        (SELECT MAX(ABS(h2.market_eur - h1.market_eur) / NULLIF(h1.market_eur, 0))
           FROM sealed_price_history h1
           JOIN sealed_price_history h2
             ON h2.sealed_id = h1.sealed_id
            AND h2.snapshot_date > h1.snapshot_date
          WHERE h1.sealed_id = ANY(ARRAY_AGG(p.id))
            AND h1.snapshot_date > now() - interval '14 days'
            AND h1.market_eur > 0) AS mouvement
      FROM k_sealed_products p
      LEFT JOIN sealed_prices sp ON sp.sealed_id = p.id
      LEFT JOIN sealed_asks_raw a ON a.sealed_id = p.id
      WHERE lower(p.lang) = lower(${lang})
        AND p.kodo_set_id IS NOT NULL
        AND p.source IN ('ebay_fr', 'ebay_us')
      GROUP BY p.kodo_set_id
    )
    SELECT
      set_id,
      valeur,
      produits,
      COALESCE(EXTRACT(EPOCH FROM (now() - vu_le)) / 3600, 720)::numeric AS age_h,
      COALESCE(mouvement, 0)::numeric AS mouvement,
      -- Score. Le log ecrase les ecarts de valeur (un display a 30 000 EUR ne
      -- doit pas affamer 170 series modernes), l'age est lineaire donc dominant,
      -- le mouvement double la priorite d'un marche actif.
      (
        ln(1 + COALESCE(valeur, 0))
        * (1 + COALESCE(EXTRACT(EPOCH FROM (now() - vu_le)) / 86400, 30))
        * (1 + LEAST(COALESCE(mouvement, 0), 1) * 2)
      )::numeric AS score
    FROM serie
    ORDER BY score DESC
    LIMIT ${max}
  `;

  return rows.map((r) => ({
    set_id: String(r.set_id),
    score: Number(r.score),
    age_h: Number(r.age_h),
    valeur: Number(r.valeur),
    produits: Number(r.produits),
    mouvement: Number(r.mouvement),
  }));
}

/**
 * Classe les annonces a verifier par RISQUE.
 *
 * Une annonce deja verifiee ne l'est jamais deux fois : elle ne change pas de
 * nature. Son prix peut bouger, elle reste le meme produit dans la meme langue.
 * C'est ce qui fait passer le cout du STOCK (10 000 annonces) au FLUX (les
 * nouvelles), et ce qui rend les trois langues tenables sans un appel de plus.
 *
 * Le risque n'est pas uniforme : une annonce tres en dessous des autres est
 * presque toujours un intrus (demi-display titre "DISPLAY", produit japonais,
 * lot vendu a la piece). Une annonce dans la moyenne merite rarement un appel.
 */
export async function planifierVerification(sql, { lang = 'fr', budget = 0, topN = 8 } = {}) {
  const max = Math.max(0, Math.floor(budget));
  if (max === 0) return [];

  const rows = await sql`
    WITH medianes AS (
      -- PERCENTILE_CONT est un agregat ordonne : PostgreSQL refuse OVER
      -- (PARTITION BY) dessus. On le calcule dans un CTE avec GROUP BY, puis on
      -- joint. La mediane porte sur TOUTES les annonces du produit, pas
      -- seulement les non verifiees, sinon la reference derive a chaque passe.
      SELECT sealed_id,
             PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) AS mediane
        FROM sealed_asks_raw
       WHERE excluded = false AND price > 0
         AND last_seen_at > now() - interval '3 days'
       GROUP BY sealed_id
    ),
    candidates AS (
      SELECT
        a.item_id,
        a.sealed_id,
        a.price,
        a.title,
        p.sku,
        sp.market_eur,
        -- Rang par prix croissant dans le produit : on ne verifie que ce qui
        -- sera AFFICHE (les topN moins cheres) et qui porte un lien sortant.
        ROW_NUMBER() OVER (PARTITION BY a.sealed_id ORDER BY a.price ASC) AS rang,
        -- Ecart a la mediane du produit. Plus l'annonce est basse, plus elle
        -- risque de decrire autre chose.
        a.price / NULLIF(m.mediane, 0) AS ratio
      FROM sealed_asks_raw a
      JOIN k_sealed_products p ON p.id = a.sealed_id
      LEFT JOIN sealed_prices sp ON sp.sealed_id = a.sealed_id
      LEFT JOIN medianes m ON m.sealed_id = a.sealed_id
      WHERE lower(a.lang) = lower(${lang})
        AND a.excluded = false
        AND a.verified_at IS NULL
        AND a.price > 0
        AND a.last_seen_at > now() - interval '3 days'
    )
    SELECT item_id, sealed_id, price, title, sku, ratio,
      (
        ln(1 + COALESCE(market_eur, price))
        * (1 + GREATEST(0, 1 - COALESCE(ratio, 1)) * 3)
      )::numeric AS risque
    FROM candidates
    WHERE rang <= ${topN}
    ORDER BY risque DESC
    LIMIT ${max}
  `;

  return rows.map((r) => ({
    item_id: String(r.item_id),
    sealed_id: String(r.sealed_id),
    price: Number(r.price),
    title: String(r.title || ''),
    sku: String(r.sku || ''),
    risque: Number(r.risque),
  }));
}

/**
 * Repartit le budget entre recherche et verification.
 *
 * La recherche passe en premier : sans elle, pas de nouvelles annonces, et une
 * verification parfaite sur un catalogue perime ne sert a rien. La verification
 * prend ce qui reste — et comme elle est incrementale, ce reste suffit une fois
 * l'amorcage passe.
 */
export function repartir(budgetTotal, { seriesAServir = 0, minVerification = 300 } = {}) {
  // La recherche prend ce dont elle a BESOIN, pas un pourcentage arbitraire.
  // Une part fixe casse dans les deux sens : elle gaspille quand le catalogue
  // est petit (48 series FR = 192 appels, on en reservait 2700) et elle etrangle
  // quand il grossit. Le catalogue se remplit au fil des decouvertes eBay : la
  // repartition doit suivre sans qu'on y touche.
  const besoin = seriesAServir * COUT_RECHERCHE;
  const plafond = Math.max(0, budgetTotal - minVerification);
  const recherche = Math.min(besoin, plafond);
  return {
    recherche,
    verification: budgetTotal - recherche,
    // Vrai quand le budget ne suffit plus a couvrir toutes les series en une
    // nuit : le score prend alors le relais et les moins prioritaires attendent
    // le lendemain, ou leur age les fera remonter.
    sature: besoin > plafond,
  };
}

/**
 * Lit le quota Browse REEL et en deduit le budget utilisable.
 *
 * Le quota est partage par toute l'application : Ed1 FR, Graded FR (CCC + PSA),
 * le scelle FR puis EN tirent sur la meme enveloppe. Un budget code en dur casse
 * des qu'un horaire bouge ou que le catalogue grossit. On lit donc ce qui reste
 * au moment de l'execution.
 *
 * @param reservePart part du restant laissee aux etapes SUIVANTES du meme job.
 *        0.5 pour le FR (l'EN tourne juste apres), 0.1 pour la derniere etape.
 */
export async function budgetDisponible(tk, { reservePart = 0.5, plancher = 300 } = {}) {
  try {
    const r = await fetch('https://api.ebay.com/developer/analytics/v1_beta/rate_limit/', {
      headers: { Authorization: 'Bearer ' + tk },
    });
    if (!r.ok) return { budget: plancher, restant: null, source: 'plancher (quota illisible)' };
    const j = await r.json();
    let rate = null;
    for (const api of (j.rateLimits || [])) {
      for (const res of (api.resources || [])) {
        if (String(res.name || '') !== 'buy.browse') continue;
        for (const rt of (res.rates || [])) rate = rt;
      }
    }
    if (!rate) return { budget: plancher, restant: null, source: 'plancher (buy.browse absent)' };
    const restant = Number(rate.remaining || 0);
    // Marge de securite : on ne descend jamais le quota a zero, un 429 en fin de
    // job laisse les dernieres series sans donnees fraiches.
    const utilisable = Math.max(0, Math.floor(restant * (1 - reservePart)) - 200);
    return { budget: Math.max(plancher, utilisable), restant, source: 'mesure' };
  } catch {
    return { budget: plancher, restant: null, source: 'plancher (erreur reseau)' };
  }
}

/** Marque une annonce comme verifiee. Definitif : une annonce ne change pas de nature. */
export async function marquerVerifiee(sql, itemId, reason = null) {
  await sql`
    UPDATE sealed_asks_raw
       SET verified_at = now(), verify_reason = ${reason}
     WHERE item_id = ${itemId}
  `;
}
