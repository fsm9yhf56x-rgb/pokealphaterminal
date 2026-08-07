// src/lib/cards/card-seo.ts
// Ce qu'un robot doit pouvoir lire sur une fiche carte SANS executer de
// JavaScript. Les robots des assistants (OAI-SearchBot, Claude-SearchBot,
// PerplexityBot) n'en executent pas : une page rendue cote client leur apparait
// vide. Les 45 468 fiches annoncaient toutes le meme titre, "Kodo Cards".
//
// Ce module ne sert PAS l'affichage — CardDetailPage continue de s'en charger.
// Il alimente uniquement generateMetadata et le JSON-LD.

export const SITE = 'https://kodocards.com'

export interface CardSeo {
  id: string
  printId: string
  name: string
  lang: 'fr' | 'en' | 'jp'
  number: string | null
  rarity: string | null
  setId: string | null
  setName: string | null
  imageUrl: string | null
  /** Cote du MARCHE de la carte. EN/JP -> US converti, FR -> Cardmarket.
   *  cote_fr_eur n'est jamais servie pour une carte EN ou JP : c'est le prix
   *  d'un autre marche pour le meme print. */
  price: number | null
  gradeEvPsa10: number | null
  computedAt: string | null
}

/** 'None', 'none', '' : valeurs poubelle de la source. Une rarete absente
 *  vaut mieux qu'une rarete fausse dans un titre. */
function cleanRarity(v: unknown): string | null {
  const s = v == null ? '' : String(v).trim()
  if (!s || /^none$/i.test(s) || /^unknown$/i.test(s)) return null
  return s
}

export async function getCardSeo(id: string): Promise<CardSeo | null> {
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(process.env.DATABASE_URL as string)

  // Le join price_signals porte sur print_id ET lang : sans lang, une fiche FR
  // sans cote heriterait du prix EN.
  const rows = await sql.query(
    `SELECT c.id, c.print_id, c.name_localized, c.lang, c.image_url, c.has_image,
            p.number, p.set_id, p.rarity AS print_rarity, c.rarity AS card_rarity,
            s.fair_value_eur, s.grade_ev_psa10_eur, s.computed_at,
            ks.name AS set_name, ks.name_fr AS set_name_fr
       FROM k_cards c
       JOIN k_prints p ON p.id = c.print_id
       LEFT JOIN k_sets ks ON ks.id = p.set_id
       LEFT JOIN price_signals s ON s.print_id = c.print_id AND s.lang = c.lang
      WHERE c.id = $1
      LIMIT 1`,
    [id]
  )
  if (!rows.length) return null
  const r = rows[0] as Record<string, unknown>

  const lang = String(r.lang).toLowerCase() as 'fr' | 'en' | 'jp'
  const setName = lang === 'fr' && r.set_name_fr
    ? String(r.set_name_fr)
    : r.set_name ? String(r.set_name) : null

  return {
    id: String(r.id),
    printId: String(r.print_id),
    name: String(r.name_localized || ''),
    lang,
    number: r.number == null ? null : String(r.number),
    rarity: cleanRarity(r.card_rarity) || cleanRarity(r.print_rarity),
    setId: r.set_id == null ? null : String(r.set_id),
    setName,
    imageUrl: r.image_url ? String(r.image_url) : null,
    price: r.fair_value_eur == null ? null : Number(r.fair_value_eur),
    gradeEvPsa10: r.grade_ev_psa10_eur == null ? null : Number(r.grade_ev_psa10_eur),
    computedAt: (r.computed_at as string) ?? null,
  }
}

/**
 * Versions d'une meme carte dans une autre langue, POUR hreflang.
 *
 * Deux regles strictes :
 *  1. On ne declare qu'une alternative reellement indexable — has_image ET une
 *     cote. Annoncer une equivalence vers une page que le sitemap n'inclut pas
 *     envoie un signal contradictoire : le site dit a Google "voici la version
 *     anglaise" tout en refusant de la lister.
 *  2. Le code de langue japonais est 'ja', pas 'jp'. 'jp' est un code de PAYS.
 *     Google ignore silencieusement une balise mal formee — l'erreur ne se voit
 *     jamais, elle coute juste tout le benefice.
 *
 * Mesure au 07/08 : 22 372 prints existent en deux langues, mais seules 6 062
 * paires ont leurs DEUX faces cotees. Les autres n'ont pas de balise, et c'est
 * un etat valide.
 */
export async function getCardAlternates(printId: string, selfLang: string): Promise<Record<string, string>> {
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(process.env.DATABASE_URL as string)

  const rows = await sql.query(
    `SELECT c.id, c.lang
       FROM k_cards c
       JOIN price_signals s ON s.print_id = c.print_id AND s.lang = c.lang
      WHERE c.print_id = $1
        AND c.has_image = true
        AND s.fair_value_eur IS NOT NULL`,
    [printId]
  )
  // Une seule face indexable = pas de paire. Une balise hreflang solitaire ne
  // veut rien dire : elle doit toujours designer un ensemble.
  if (rows.length < 2) return {}

  const out: Record<string, string> = {}
  for (const r of rows as Record<string, unknown>[]) {
    const l = String(r.lang).toLowerCase()
    const tag = l === 'jp' ? 'ja' : l
    out[tag] = `${SITE}/cartes/${encodeURIComponent(String(r.id))}`
  }
  // x-default : la version servie a un visiteur dont la langue ne correspond a
  // aucune des notres. Le francais, coherent avec le positionnement.
  if (out['fr']) out['x-default'] = out['fr']
  else if (out['en']) out['x-default'] = out['en']

  // La page doit se declarer elle-meme : un ensemble hreflang qui s'ignore est
  // rejete par Google.
  void selfLang
  return out
}

const LANG_LABEL: Record<string, string> = { fr: 'française', en: 'anglaise', jp: 'japonaise' }

/** Titre de page. Il doit distinguer la fiche des 45 467 autres : nom, numero,
 *  serie et langue. Sans le numero, dix Dracaufeu portent le meme titre. */
export function cardTitle(c: CardSeo): string {
  const parts = [c.name]
  if (c.number) parts.push('#' + c.number)
  if (c.setName) parts.push('· ' + c.setName)
  return parts.join(' ')
}

/** Description. Le prix y figure quand il existe : c'est ce qui fait cliquer
 *  depuis une page de resultats, et ce qu'un assistant reprend en citant. */
export function cardDescription(c: CardSeo): string {
  const langue = LANG_LABEL[c.lang] || ''
  const base = `${c.name}${c.number ? ' n°' + c.number : ''}${c.setName ? ', ' + c.setName : ''} — carte Pokémon ${langue}`
  const marche = c.lang === 'fr' ? 'sur le marché français' : 'sur le marché américain, converti en euros'
  if (c.price != null && c.price > 0) {
    const p = c.price >= 100 ? Math.round(c.price) : Math.round(c.price * 100) / 100
    return `${base}. Cote actuelle : ${p} € ${marche}. Historique de prix, versions gradées et suivi de collection sur Kodo Cards.`
  }
  return `${base}. Suivez sa cote, son historique de prix et ses versions gradées sur Kodo Cards.`
}
