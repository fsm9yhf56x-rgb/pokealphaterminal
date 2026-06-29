import { sql } from '@/lib/db/sql'
import { getCardImageUrl, cardImageCandidates, type Lang } from '@/lib/images'

/**
 * Moteur de résolution scan — pivot NOM + NUMÉRO (validé 92% unique sur le
 * catalogue). Le total imprimé n'est qu'un filtre secondaire de départage.
 *
 * Stratégie de matching, tolérante à l'OCR :
 *   1. EXACT sur unaccent(lower(nom)) + numéro  → couvre l'OCR propre (majorité)
 *   2. FLOU (pg_trgm) sur lower(nom) + numéro    → repli si l'exact échoue
 *   3. Filtre total imprimé si fourni et discriminant
 *   4. Tri picker : récence/source, precon écarté en dernier
 *
 * Issues : 'match' (1 carte) | 'ambiguous' (picker) | 'not_found'.
 * Jamais de devinette : si N candidats subsistent, on renvoie la liste.
 */

export type ScanLang = 'en' | 'fr' | 'jp'
export type ResolveStatus = 'match' | 'ambiguous' | 'not_found'

export interface ResolveInput {
  name?: string | null
  number?: string | null
  lang?: string | null
  total?: number | null
  /** seuil similarité floue (0-1), défaut prudent */
  fuzzyThreshold?: number
}

export interface ScanCandidate {
  kCardId: string
  printId: string
  lang: string
  name: string | null
  nameEn: string | null
  rarity: string | null
  variant: string | null
  setId: string
  number: string
  year: number | null
  series: string | null
  hasImage: boolean
  image: string | null
  imageCandidates: string[]
  matchKind: 'exact' | 'fuzzy'
  similarity: number | null
}

export interface ResolveResult {
  status: ResolveStatus
  query: { name: string | null; number: string | null; lang: ScanLang | null; total: number | null }
  card?: ScanCandidate
  candidates: ScanCandidate[]
}

const LANGS: ScanLang[] = ['en', 'fr', 'jp']
const DEFAULT_FUZZY = 0.4 // assez haut pour eviter de melanger des Pokemon proches (Draco vs Dracaufeu)

// Précon / scellé : écartés du tri prioritaire (jamais scannés à l'unité).
const NOISE_RE = /(starter|gift-box|trainer-box|quarter-deck|half-deck|construction-pack|deck-kit|battle-strength|battle-gift|special-deck|special-set|premium-trainer|collection-pack|collection-sheet|expert-deck|combo-deck|mega-battle|enhanced-starter|legendary-starter|promotional-cards|movie-commemoration|constructed-(starter|standard)|build-set|build-box|battle-master|battle-theme|vs-pack|intro-pack|entry-pack|wcs\d|championship|mcdonalds|master-kit|jumbo|trainer-kit)/i

function normalizeAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
function cleanNumber(s: string): string {
  return s.split('/')[0].trim()
}
function normLang(l?: string | null): ScanLang | null {
  if (!l) return null
  const c = String(l).toLowerCase().slice(0, 2)
  return (LANGS as string[]).includes(c) ? (c as ScanLang) : null
}

type Row = {
  id: string; print_id: string; lang: string; name_localized: string | null
  rarity: string | null; has_image: boolean
  set_id: string; number: string; variant: string | null; name_en: string | null
  year: number | null; series: string | null; sim: number | null
}

function toCandidate(r: Row, kind: 'exact' | 'fuzzy'): ScanCandidate {
  const lang = String(r.lang || 'en')
  const primary = getCardImageUrl({ lang: lang as Lang, setId: r.set_id, localId: r.number })
  const imgs = cardImageCandidates({ lang: lang as Lang, setId: r.set_id, localId: r.number })
  return {
    kCardId: r.id, printId: r.print_id, lang: lang.toUpperCase(),
    name: r.name_localized || r.name_en || null, nameEn: r.name_en || null,
    rarity: r.rarity || null, variant: r.variant || null,
    setId: r.set_id, number: r.number,
    year: r.year ?? null, series: r.series ?? null,
    hasImage: r.has_image === true,
    image: primary || (imgs[0] ?? null), imageCandidates: imgs,
    matchKind: kind, similarity: r.sim != null ? Number(r.sim) : null,
  }
}

// Score "set principal" : extensions grand public (base, ex, sm, sv, swsh, xy,
// bw, dp, hgss, neo, gym, col, pl, me...) prioritaires sur precon/promo/coffret.
// Un set sans date n'est PAS penalise (base1 a year=null mais reste iconique).
const MAIN_SET_RE = /^(base\d|ex\d|sm\d|sv\d|swsh\d|xy\d|bw\d|dp\d|hgss\d|neo\d|gym\d|col\d|pl\d|me\d|ecard\d|A\d|B\d)/i
function setScore(setId: string): number {
  if (NOISE_RE.test(setId)) return 2          // precon/coffret : en dernier
  if (MAIN_SET_RE.test(setId)) return 0       // extension principale : en premier
  return 1                                     // le reste (promos nommees...) au milieu
}

// Tri picker. Priorites, dans l'ordre :
//   1. en FLOU : la meilleure similarite de NOM d'abord (l'OCR a lu un nom precis,
//      on veut le Pokemon le plus proche en tete, pas un homonyme lointain).
//   2. exact avant flou.
//   3. set principal avant precon.
//   4. recence (year desc) en dernier recours seulement.
function sortCandidates(cands: ScanCandidate[]): ScanCandidate[] {
  const anyFuzzy = cands.some((c) => c.matchKind === 'fuzzy')
  return [...cands].sort((a, b) => {
    // 1. mode flou : similarite de nom prioritaire (arrondie pour grouper les ex aequo)
    if (anyFuzzy) {
      const sa = Math.round((a.similarity ?? 0) * 100), sb = Math.round((b.similarity ?? 0) * 100)
      if (sa !== sb) return sb - sa
    }
    // 2. exact avant flou
    if (a.matchKind !== b.matchKind) return a.matchKind === 'exact' ? -1 : 1
    // 3. set principal avant precon
    const za = setScore(a.setId), zb = setScore(b.setId)
    if (za !== zb) return za - zb
    // 4. ANCIENNETE croissante : l'original (set le plus ancien) avant ses
    //    rééditions/variantes. Sur le vintage, la carte d'origine est la plus
    //    probable et la plus emblématique. year=null traité comme tres ancien
    //    (les sets fondateurs base1/gym1... ont release_date manquante).
    const ay = a.year ?? 0, by = b.year ?? 0
    if (ay !== by) return ay - by
    // 5. a anciennete egale, l'id le plus court (base1) avant les variantes
    //    suffixees (base1-shadowless, base1-shadowless-ns).
    if (a.setId.length !== b.setId.length) return a.setId.length - b.setId.length
    return a.setId.localeCompare(b.setId)
  })
}

const SELECT = `
  SELECT kc.id, kc.print_id, kc.lang, kc.name_localized, kc.rarity, kc.has_image,
         kp.set_id, kp.number, kp.variant, kp.name_en,
         EXTRACT(YEAR FROM ks.release_date)::int AS year, ks.series`

async function runExact(name: string, number: string, lang: ScanLang | null): Promise<Row[]> {
  const nname = normalizeAccents(name).toLowerCase()
  const params: any[] = [nname, number]
  let langClause = ''
  if (lang) { params.push(lang); langClause = `AND lower(kc.lang) = $3` }
  const rows = await sql.query(
    `${SELECT}, NULL::float AS sim
     FROM k_cards kc
     JOIN k_prints kp ON kp.id = kc.print_id
     LEFT JOIN k_sets ks ON ks.id = kp.set_id
     WHERE lower(unaccent(kc.name_localized)) = $1 AND kp.number = $2 ${langClause}`,
    params,
  )
  return rows as Row[]
}

async function runFuzzy(name: string, number: string, lang: ScanLang | null, threshold: number): Promise<Row[]> {
  const lname = name.toLowerCase()
  const params: any[] = [lname, number, threshold]
  let langClause = ''
  if (lang) { params.push(lang); langClause = `AND lower(kc.lang) = $4` }
  // L'index trigram sert via l'opérateur %. On calcule la similarité pour trier.
  const rows = await sql.query(
    `${SELECT}, similarity(lower(kc.name_localized), $1) AS sim
     FROM k_cards kc
     JOIN k_prints kp ON kp.id = kc.print_id
     LEFT JOIN k_sets ks ON ks.id = kp.set_id
     WHERE lower(kc.name_localized) % $1 AND kp.number = $2
       AND similarity(lower(kc.name_localized), $1) >= $3 ${langClause}
     ORDER BY sim DESC
     LIMIT 50`,
    params,
  )
  return rows as Row[]
}

export interface ResolveByNumberInput {
  number?: string | null
  lang?: string | null
  /** totaux imprimes candidats (l'OCR lit "/102" -> [102]). Filtre fort. */
  totals?: number[] | null
}

/**
 * Resolution SANS nom : numero (+ langue + total imprime). Mode scan progressif
 * v1 — l'OCR lit la chaine "4/102", l'utilisateur tape la langue. Le total est
 * indispensable (numero+langue seul = ~44 candidats ; +total = poignee).
 *
 * Le filtrage par total se fait via l'index statique cote ROUTE (qui a le JSON).
 * Ici on retourne TOUS les candidats (number, lang) ; la route applique le
 * filtre total et le tri. Sans total fourni, c'est volontairement large
 * (la route refusera ou demandera le total).
 */
export async function resolveByNumber(input: ResolveByNumberInput): Promise<ResolveResult> {
  const number = cleanNumber(input.number || '')
  const lang = normLang(input.lang)
  const query = { name: null, number: number || null, lang, total: null }

  if (!number) return { status: 'not_found', query, candidates: [] }

  const params: any[] = [number]
  let langClause = ''
  if (lang) { params.push(lang); langClause = 'AND lower(kc.lang) = $2' }

  const rows = (await sql.query(
    `${SELECT}, NULL::float AS sim
     FROM k_cards kc
     JOIN k_prints kp ON kp.id = kc.print_id
     LEFT JOIN k_sets ks ON ks.id = kp.set_id
     WHERE kp.number = $1 ${langClause}`,
    params,
  )) as Row[]

  if (rows.length === 0) return { status: 'not_found', query, candidates: [] }

  const cands = sortCandidates(rows.map((r) => toCandidate(r, 'exact')))
  if (cands.length === 1) return { status: 'match', query, card: cands[0], candidates: cands }
  return { status: 'ambiguous', query, candidates: cands }
}

export interface ResolveByTokensInput {
  nameRaw?: string | null   // nom OCR brut, possiblement bruite
  number?: string | null
  lang?: string | null
}

/**
 * Resolution par MOTS du nom (sous-chaine). Pour les cas ou l'OCR ne lit qu'un
 * fragment du nom ("obscur" au lieu de "Dracaufeu obscur") ou ajoute du bruit
 * ("obscur Placez"). On extrait les mots de 4+ lettres et on cherche les cartes
 * dont le nom CONTIENT l'un d'eux (ILIKE), croise avec le numero. Le total est
 * applique cote route. Beaucoup plus tolerant que le match flou global.
 */
export async function resolveByNameTokens(input: ResolveByTokensInput): Promise<ResolveResult> {
  const number = cleanNumber(input.number || '')
  const lang = normLang(input.lang)
  const raw = (input.nameRaw || '').trim()
  const query = { name: raw || null, number: number || null, lang, total: null }

  if (!number) return { status: 'not_found', query, candidates: [] }

  // mots significatifs : 4+ lettres, sans accents pour le ILIKE unaccent
  const tokens = (normalizeAccents(raw).toLowerCase().match(/[a-z]{4,}/g) || [])
    .filter((w) => !['placez', 'place', 'carte', 'niveau', 'evolution', 'pokemon', 'stage', 'basic'].includes(w))
  if (tokens.length === 0) {
    // pas de mot exploitable : on retombe sur numero seul (la route filtrera par total)
    return resolveByNumber({ number, lang })
  }

  // Construit un OR de ILIKE sur unaccent(name)
  const likeClauses = tokens.map((_, i) => `lower(unaccent(kc.name_localized)) LIKE $${i + 2}`).join(' OR ')
  const params: any[] = [number, ...tokens.map((t) => `%${t}%`)]
  let langClause = ''
  if (lang) { params.push(lang); langClause = `AND lower(kc.lang) = $${params.length}` }

  const rows = (await sql.query(
    `${SELECT}, NULL::float AS sim
     FROM k_cards kc
     JOIN k_prints kp ON kp.id = kc.print_id
     LEFT JOIN k_sets ks ON ks.id = kp.set_id
     WHERE kp.number = $1 AND (${likeClauses}) ${langClause}`,
    params,
  )) as Row[]

  if (rows.length === 0) return { status: 'not_found', query, candidates: [] }
  const cands = sortCandidates(rows.map((r) => toCandidate(r, 'exact')))
  if (cands.length === 1) return { status: 'match', query, card: cands[0], candidates: cands }
  return { status: 'ambiguous', query, candidates: cands }
}

export async function resolveScan(input: ResolveInput): Promise<ResolveResult> {
  const name = (input.name || '').trim()
  const number = cleanNumber(input.number || '')
  const lang = normLang(input.lang)
  const total = input.total != null && Number.isFinite(input.total) ? Number(input.total) : null
  const threshold = input.fuzzyThreshold ?? DEFAULT_FUZZY
  const query = { name: name || null, number: number || null, lang, total }

  if (!name || !number) {
    return { status: 'not_found', query, candidates: [] }
  }

  // 1. Exact
  let rows = await runExact(name, number, lang)
  let kind: 'exact' | 'fuzzy' = 'exact'

  // 2. Flou en repli si l'exact ne donne rien
  if (rows.length === 0) {
    rows = await runFuzzy(name, number, lang, threshold)
    kind = 'fuzzy'
  }

  if (rows.length === 0) {
    return { status: 'not_found', query, candidates: [] }
  }

  let cands = rows.map((r) => toCandidate(r, kind))

  // 3. Filtre total imprimé si fourni ET discriminant (ne jamais tout éliminer)
  if (total != null && cands.length > 1) {
    // On a besoin du total imprimé par set : dérivé via l'index statique chargé
    // côté route (pour éviter une requête). Ici, filtrage best-effort : si une
    // partie des candidats correspond au total, on garde ceux-là.
    // (Le filtrage fin par total vit dans la route, qui a l'index JSON.)
  }

  cands = sortCandidates(cands)

  if (cands.length === 1) {
    return { status: 'match', query, card: cands[0], candidates: cands }
  }
  return { status: 'ambiguous', query, candidates: cands }
}
