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
    `SELECT c.id, c.name_localized, c.lang, c.image_url, c.has_image,
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
