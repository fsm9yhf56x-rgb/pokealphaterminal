import { sql } from '@/lib/db/sql'
import { getCardImageUrl, cardImageCandidates, type Lang } from '@/lib/images'
import { resolveScan, type ScanCandidate, type ResolveResult } from './resolve-query'
import setIndexRaw from './set-index.json'
const _norm = (x: string) => String(x).toLowerCase().replace(/[^a-z0-9]/g, '')
const _totalOf = new Map((setIndexRaw as any[]).map((e) => [_norm(e.id), e.printedTotal]))

/**
 * Résolution depuis les LIGNES OCR BRUTES. Le client ne devine plus rien :
 * le serveur teste chaque ligne plausible comme nom contre le catalogue
 * (pg_trgm), croise avec chaque numéro détecté, consulte d'abord la mémoire
 * collective (scan_aliases), puis score et tranche. 22 311 cartes pour
 * discriminer : "Amulette Miraculeuse" ne matche rien, "Altaria" matche.
 */
export interface RawLine { text: string; y?: number; h?: number }

const TEMPLATE = /(?:^|\b)(pv|hp|faiblesse|weakness|r[ée]sistance|retraite|retreat|talent|ability|illus|niveau|stage|basic|base|[ée]nergie|energy|d[ée]g[âa]ts|damage|attaques?|[ée]volution|evolves|pok[ée]mon|objet|item|supporter|dresseur|trainer)\b/i

const fixDigits = (t: string) => t.replace(/[Il|]/g, '1').replace(/[oO]/g, '0')

export function extractNumbers(lines: RawLine[]): Array<{ n: string; t: number | null }> {
  const out: Array<{ n: string; t: number | null }> = []
  const seen = new Set<string>()
  for (const l of lines) {
    const t = fixDigits(l.text).replace(/\s+/g, '')
    for (const m of t.matchAll(/(\d{1,3})[/⁄∕\\](\d{1,3})/g)) {
      const n = Number(m[1]); const tot = Number(m[2])
      if (n > 0 && tot > 0 && tot < 1000 && n <= tot + 60) {
        const k = `${n}/${tot}`
        if (!seen.has(k)) { seen.add(k); out.push({ n: String(n), t: tot }) }
      }
    }
  }
  if (!out.length) for (const l of lines) {
    const m = l.text.trim().match(/^([A-Z]{0,3}\s?\d{1,3})$/)
    if (m) {
      const n = m[1].replace(/\s/g, '').replace(/^0+(?=\d)/, '')
      if (!seen.has(n)) { seen.add(n); out.push({ n, t: null }) }
    }
  }
  return out.slice(0, 3)
}

export function nameCandidates(lines: RawLine[]): string[] {
  const seen = new Set<string>(); const out: string[] = []
  const ban = new Set<string>()
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^(talent|ability|pouvoir)\b/i.test(lines[i].text.trim())) ban.add(lines[i + 1].text)
  }
  const sorted = [...lines].sort((a, b) => (b.h ?? 0) - (a.h ?? 0))
  for (const l of sorted) {
    if (ban.has(l.text)) continue
    let t = l.text.split(/\b(?:NIV|LV|Niv|Lv|STADE|STAGE)\.?\s*\d+/)[0]
    t = t.replace(/\d+\s*(PV|HP)\b.*$/i, '')
    t = t.replace(/[^\p{L}\p{M}\s'’.\-–—]/gu, ' ').replace(/\s+/g, ' ').trim()
    if (t.length < 3 || t.length > 26) continue
    const words = t.split(' ').filter(Boolean)
    if (!words.length || words.length > 4) continue
    if (words.length === 1 && TEMPLATE.test(words[0])) continue
    if (words.every((w) => TEMPLATE.test(w))) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key); out.push(t)
    if (out.length >= 5) break
  }
  return out
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

export function aliasKeys(names: string[], nums: Array<{ n: string; t: number | null }>): string[] {
  const keys: string[] = []
  for (const x of nums) if (x.t) keys.push(`nt:${x.n}/${x.t}`)
  for (const nm of names) for (const x of nums) keys.push(`name:${norm(nm)}#${x.n}`)
  return keys.slice(0, 12)
}

type CardRow = {
  id: string; print_id: string; lang: string; name_localized: string | null
  rarity: string | null; has_image: boolean
  set_id: string; number: string; variant: string | null; name_en: string | null
}

async function candidateById(id: string): Promise<ScanCandidate | null> {
  const rows = (await sql`
    SELECT kc.id, kc.print_id, kc.lang, kc.name_localized, kc.rarity, kc.has_image,
           kp.set_id, kp.number, kp.variant, kp.name_en
    FROM k_cards kc JOIN k_prints kp ON kp.id = kc.print_id
    WHERE kc.id = ${id} LIMIT 1`) as CardRow[]
  if (!rows.length) return null
  const r = rows[0]; const lang = String(r.lang || 'en')
  const primary = getCardImageUrl({ lang: lang as Lang, setId: r.set_id, localId: r.number })
  const imgs = cardImageCandidates({ lang: lang as Lang, setId: r.set_id, localId: r.number })
  return {
    kCardId: r.id, printId: r.print_id, lang: lang.toUpperCase(),
    name: r.name_localized || r.name_en || null, nameEn: r.name_en || null,
    rarity: r.rarity || null, variant: r.variant || null,
    setId: r.set_id, number: r.number, year: null, series: null,
    hasImage: r.has_image === true, image: primary || (imgs[0] ?? null),
    imageCandidates: imgs, matchKind: 'exact', similarity: null,
  }
}

export async function resolveFromLines(
  lines: RawLine[], lang?: string | null,
): Promise<ResolveResult & { via?: string }> {
  const nums = extractNumbers(lines)
  const names = nameCandidates(lines)
  const query = { name: names[0] ?? null, number: nums[0]?.n ?? null, lang: (lang as any) ?? null, total: nums[0]?.t ?? null }

  // 1) MÉMOIRE COLLECTIVE — une lecture déjà confirmée par un humain gagne.
  const keys = aliasKeys(names, nums)
  if (keys.length) {
    const al = (await sql`
      SELECT k_card_id, confirmations FROM scan_aliases
      WHERE read_key = ANY(${keys})
        AND (read_key LIKE 'nt:%' OR confirmations >= 2)
      ORDER BY (read_key LIKE 'nt:%') DESC, confirmations DESC, last_seen DESC LIMIT 1`) as Array<{ k_card_id: string; confirmations: number }>
    if (al.length) {
      const c = await candidateById(al[0].k_card_id)
      if (c) return { status: 'match', query, card: c, candidates: [c], via: 'alias' }
    }
  }

  // 2) CHAQUE nom plausible × CHAQUE numéro, en parallèle, sur le résolveur éprouvé.
  const jobs: Promise<ResolveResult | null>[] = []
  for (const nm of names.slice(0, 4)) {
    for (const x of (nums.length ? nums : [])) {
      jobs.push(resolveScan({ name: nm, number: x.n, lang: lang ?? null, total: x.t }).catch(() => null))
    }
    if (!nums.length) jobs.push(resolveScan({ name: nm, number: null, lang: lang ?? null, total: null }).catch(() => null))
  }
  const results = jobs.length ? await Promise.all(jobs) : []

  // 3) SCORE : exactitude du nom > similarité, bonus total et langue.
  let best: { score: number; res: ResolveResult } | null = null
  for (const res of results) {
    if (!res || res.status !== 'match' || !res.card) continue
    const sim = res.card.similarity ?? 1
    // Le bonus TOTAL n'est accordé que si le total du SET du candidat le
    // confirme ; un total contredit PÉNALISE — un nom de voisine (Scyther,
    // total 165) ne peut plus battre la vraie carte (Durant, 163).
    const tOk = res.query.total ? _totalOf.get(_norm(res.card.setId)) === res.query.total : null
    const score =
      (res.card.matchKind === 'exact' ? 1.3 : sim) +
      (tOk === true ? 0.5 : tOk === false ? -0.6 : 0) +
      (lang && res.card.lang?.toLowerCase() === String(lang).toLowerCase() ? 0.2 : 0)
    if (!best || score > best.score) best = { score, res }
  }
  if (best) {
    // AUTO-APPRENTISSAGE : un match exact (nom+numéro+total concordants) est
    // une certitude — le serveur s'enseigne lui-même, sans humain. Les cas
    // ambigus restent les seuls à exiger une confirmation.
    if (best.res.card && best.res.card.matchKind === 'exact' && best.res.query.total) {
      const c = best.res.card
      // GARDE ANTI-POISON : un alias nt:{n}/{t} n'est écrit que si le total
      // du set du candidat vaut t — un nom voisin dans le champ ne peut plus
      // empoisonner le couple numéro/total d'une autre carte.
      const okKeys = aliasKeys(names, nums).slice(0, 4).filter((k) => {
        const m = k.match(/^nt:\d+\/(\d+)$/)
        return !m || _totalOf.get(_norm(c.setId)) === Number(m[1])
      })
      for (const k of okKeys) {
        sql`INSERT INTO scan_aliases (read_key, k_card_id) VALUES (${k}, ${c.kCardId})
            ON CONFLICT (read_key, k_card_id)
            DO UPDATE SET confirmations = scan_aliases.confirmations + 1, last_seen = now()`.catch(() => {})
      }
    }
    return { ...best.res, via: 'name' }
  }
  for (const res of results) {
    if (res?.status === 'ambiguous' && res.candidates.length) return { ...res, via: 'ambiguous' }
  }
  return { status: 'not_found', query, candidates: [], via: 'none' }
}
