import { NextResponse } from 'next/server'
import { newsSlug } from '@/lib/news-slug'

/**
 * Actu TCG Pokémon — fil de titres 100% cartes, cohérent et en français.
 * Sources : PokeGuardian + PokeBeach (références mondiales TCG, via Google News).
 * Mise en français (générée une fois, puis cache news_cache) :
 *   1) si ANTHROPIC_API_KEY présente -> Claude Haiku (titre FR court + résumé FR riche) ;
 *   2) sinon -> traduction GRATUITE Google (sans clé) du titre + résumé éditorial générique.
 * Reformulation/traduction = contenu légitimement nôtre. Aucune source citée, aucun lien sortant.
 * On n'utilise jamais le lien (redirection Google) : lecture sur notre page /actu.
 * Cache route 30 min.
 */
export const revalidate = 1800
export const maxDuration = 30

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// Résumé éditorial générique quand on n'a pas de moteur de résumé (mode traduction gratuite).
const GENERIC_FR = 'Une actualité du marché des cartes Pokémon, suivie par Kodo Wire.'

const FEEDS = [
  'https://news.google.com/rss/search?q=site:pokeguardian.com&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:pokebeach.com&hl=en-US&gl=US&ceid=US:en',
]

function decode(s: string): string {
  s = s.replace(/&amp;/g, '&')
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)) } catch { return _ } })
  s = s.replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(parseInt(d, 10)) } catch { return _ } })
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
}
function clean(s: string): string {
  return decode(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`))
  return (m ? m[1] : '').replace(/<!\[CDATA\[|\]\]>/g, '')
}

type Raw = { titleEn: string; date: string; ts: number }

async function fetchFeed(url: string): Promise<Raw[]> {
  try {
    const res = await fetch(url, { next: { revalidate }, headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml' }, redirect: 'follow' })
    if (!res.ok) return []
    const xml = await res.text()
    const out: Raw[] = []
    for (const block of xml.split('<item>').slice(1)) {
      const titleEn = clean(tag(block, 'title')).replace(/\s+[-–—]\s+[^-–—]+$/, '').trim()
      if (!titleEn || titleEn.length < 8) continue
      const dateStr = (tag(block, 'pubDate') || tag(block, 'dc:date') || tag(block, 'published')).trim()
      const ts = new Date(dateStr).getTime() || 0
      out.push({ titleEn, date: dateStr, ts })
    }
    return out
  } catch {
    return []
  }
}

/* ── Moteur 1 : Claude Haiku (si clé) — titre FR + résumé FR ──────────── */

function buildPrompt(title: string): string {
  return `Tu es l'éditeur de Kodo Cards, plateforme française dédiée aux cartes Pokémon (TCG). À partir du seul titre d'actualité ci-dessous (en anglais), produis :
- "titre" : une version française courte et fidèle du titre (12 mots maximum). Garde les noms de sets, produits et cartes en anglais. N'invente rien.
- "resume" : 1 à 2 phrases en français qui reformulent l'information, pour des collectionneurs/investisseurs. N'invente aucun fait, chiffre, date ou nom absent du titre.
Réponds UNIQUEMENT par un JSON valide, sans texte autour, sans balises : {"titre":"...","resume":"..."}

Titre : ${title}`
}

async function reformulate(title: string): Promise<{ titre: string; resume: string } | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.NEWS_SUMMARY_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 260,
        messages: [{ role: 'user', content: buildPrompt(title) }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    let text = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join(' ').trim()
      : ''
    text = text.replace(/```json|```/g, '').trim()
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return null
    const obj = JSON.parse(m[0])
    const titre = typeof obj.titre === 'string' ? obj.titre.trim() : ''
    const resume = typeof obj.resume === 'string' ? obj.resume.trim() : ''
    if (!titre || !resume) return null
    return { titre, resume }
  } catch {
    return null
  }
}

/* ── Moteur 2 : traduction GRATUITE Google (sans clé) ─────────────────── */

async function translateFR(text: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url, { next: { revalidate }, headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    const data: any = await res.json()
    const segs = Array.isArray(data?.[0]) ? data[0] : []
    const out = segs.map((s: any) => (Array.isArray(s) ? s[0] : '')).join('').trim()
    return out || null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const all = (await Promise.all(FEEDS.map(fetchFeed))).flat()

    const seen = new Set<string>()
    const uniq = all.filter(i => {
      const k = i.titleEn.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60)
      if (!k || seen.has(k)) return false
      seen.add(k)
      return true
    })
    uniq.sort((a, b) => b.ts - a.ts)
    const picked = uniq.slice(0, 18).map(r => ({
      titleEn: r.titleEn,
      date: r.date,
      ts: r.ts,
      slug: newsSlug(r.titleEn),
      title: r.titleEn as string,
      summary: null as string | null,
    }))

    try {
      const { sql } = await import('@/lib/db/sql')
      const slugs = picked.map(p => p.slug)
      const existing = new Set<string>()
      const cTitle: Record<string, string> = {}
      const cSum: Record<string, string | null> = {}
      try {
        const rows: any[] = await sql.query('SELECT slug, title, summary FROM news_cache WHERE slug = ANY($1)', [slugs])
        for (const r of rows) { existing.add(r.slug); cTitle[r.slug] = r.title; cSum[r.slug] = r.summary }
      } catch {}

      const insert = async (slug: string, title: string, summary: string, ts: number) => {
        try {
          await sql.query(
            'INSERT INTO news_cache (slug, title, summary, image, news_date) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO NOTHING',
            [slug, title, summary, null, ts ? new Date(ts) : null],
          )
        } catch {}
      }

      await Promise.all(picked.map(async p => {
        if (existing.has(p.slug)) {
          if (cTitle[p.slug]) p.title = cTitle[p.slug]
          p.summary = cSum[p.slug]
          return
        }
        // 1) Haiku (titre + résumé riches) si une clé est dispo
        const fr = await reformulate(p.titleEn)
        if (fr) {
          p.title = fr.titre
          p.summary = fr.resume
          await insert(p.slug, fr.titre, fr.resume, p.ts)
          return
        }
        // 2) sinon, traduction gratuite du titre + résumé générique
        const t = await translateFR(p.titleEn)
        if (t) {
          p.title = t
          p.summary = GENERIC_FR
          await insert(p.slug, t, GENERIC_FR, p.ts)
          return
        }
        // 3) sinon : on garde le titre anglais, pas d'insert (réessai au prochain run)
      }))
    } catch {}

    return NextResponse.json({
      items: picked.map(({ title, date, slug, summary }) => ({ title, date, slug, summary })),
      count: uniq.length,
    })
  } catch (e: any) {
    return NextResponse.json({ items: [], error: String(e?.message || e) })
  }
}
