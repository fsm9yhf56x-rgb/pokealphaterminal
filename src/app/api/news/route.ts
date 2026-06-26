import { NextResponse } from 'next/server'
import { newsSlug } from '@/lib/news-slug'

/**
 * Actu TCG Pokémon — fil de titres 100% cartes, en français, AVEC vignette.
 * Sources : flux RSS NATIFS (titre + image) :
 *   - PrimeTimePokemon (EN, TCG-pur, media:thumbnail Blogger)
 *   - PokeBeach front-page (EN, TCG-pur, <img> dans description)
 *   - Pokelite (FR, collection/marché, featured image WordPress)
 *   - Pokemon-France (FR, généraliste -> filtré JCC, featured image WordPress)
 * Mise en français (générée 1x puis cache news_cache) :
 *   1) si ANTHROPIC_API_KEY -> Claude Haiku (titre FR + résumé FR) ;
 *   2) sinon -> traduction GRATUITE Google du titre + résumé éditorial générique.
 * Reformulation/traduction = contenu légitimement nôtre. Aucune source, aucun lien sortant.
 * L'image vient du flux source (vignette éditoriale), affichée sur notre fil + page /actu.
 * Cache route 30 min.
 */
export const revalidate = 1800
export const maxDuration = 30

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const GENERIC_FR = 'Une actualité du marché des cartes Pokémon, suivie par Kodo Wire.'

// Mots-clés TCG génériques (sources généralistes Pokémon : on garde le volet cartes).
const TCG_KEYS = /\b(tcg|jcc|carte|cartes|card|cards|booster|boosters|extension|set|coffret|etb|elite trainer|scellé|scelle|sealed|psa|gradation|graded|illustration rare|secret rare|alt art|chase|pull|display|ev\d|sv\d{2,}|mega[- ]?évolution|mega[- ]?evolution)\b/i
// Garde-fou POKÉMON : sources multi-TCG (Pokelite couvre aussi Riftbound/LoL, One Piece...).
// Doit mentionner Pokémon OU un terme exclusivement Pokémon. Exclut les autres licences TCG.
const POKEMON_KEYS = /\b(pok[ée]mon|pok[ée]|jcc|tcg pok|dracaufeu|charizard|pikachu|mewtwo|rayquaza|évoli|eevee|ex |[- ]ex\b|méga[- ]|mega[- ]ex|scarlet|violet|écarlate|paldea|sv\d|me\d|nintendo)\b/i
const NOT_POKEMON = /\b(league of legends|riftbound|one piece|yu-?gi-?oh|magic the gathering|mtg|lorcana|disney lorcana|digimon|flesh and blood|star wars unlimited|gundam|weiss schwarz|dragon ball)\b/i

type Feed = { url: string; tcgOnly: boolean; lang: 'fr' | 'en' }

// tcgOnly:false = source déjà 100% TCG -> on prend tout ; true = généraliste -> on filtre.
const FEEDS: Feed[] = [
  { url: 'https://primetimepokemon.blogspot.com/feeds/posts/default?alt=rss', tcgOnly: false, lang: 'en' },
  { url: 'https://www.pokebeach.com/forums/forum/front-page-news.18/index.rss', tcgOnly: false, lang: 'en' },
  { url: 'https://www.pokelite.fr/feed/', tcgOnly: true, lang: 'fr' },
  { url: 'https://www.pokemon-france.com/feed/', tcgOnly: true, lang: 'fr' },
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

/* ── Extraction d'image, par ordre de fiabilité ───────────────────────── */
function extractImage(block: string): string | null {
  // 1) media:thumbnail / media:content (Blogger=PrimeTime, certains WP)
  let m = block.match(/<media:(?:thumbnail|content)[^>]*\burl="([^"]+)"/i)
  if (m) {
    let u = m[1]
    // Blogger sert du /s72-c/ (72px carré) -> on élargit à /s1600/ (pleine def)
    u = u.replace(/\/s\d+(?:-c)?\//, '/s1600/')
    return u
  }
  // 2) <enclosure url="..." type="image/...">
  m = block.match(/<enclosure[^>]*\burl="([^"]+)"[^>]*type="image\//i)
  if (m) return m[1]
  // 3) 1er <img src> dans content:encoded ou description (WordPress=Pokelite/PF, PokeBeach)
  const html = decode(tag(block, 'content:encoded') || tag(block, 'description') || '')
  m = html.match(/<img[^>]*\bsrc="([^"]+)"/i)
  if (m) return m[1]
  return null
}

type Raw = { titleEn: string; date: string; ts: number; image: string | null; lang: 'fr' | 'en' }

async function fetchFeed(feed: Feed): Promise<Raw[]> {
  try {
    const res = await fetch(feed.url, { next: { revalidate }, headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml' }, redirect: 'follow' })
    if (!res.ok) return []
    const xml = await res.text()
    const out: Raw[] = []
    for (const block of xml.split('<item>').slice(1)) {
      const titleEn = clean(tag(block, 'title')).replace(/\s+[-–—]\s+[^-–—]+$/, '').trim()
      if (!titleEn || titleEn.length < 8) continue
      // Filtre sur les sources généralistes / multi-TCG (titre + catégories).
      if (feed.tcgOnly) {
        const cats = decode((block.match(/<category[^>]*>([\s\S]*?)<\/category>/gi) || []).join(' '))
        const hay = titleEn + ' ' + cats
        // Exclut explicitement les autres licences TCG (LoL Riftbound, One Piece, MTG...)
        if (NOT_POKEMON.test(hay)) continue
        // Doit être identifiable Pokémon ET toucher au volet cartes/TCG
        if (!POKEMON_KEYS.test(hay)) continue
        if (!TCG_KEYS.test(hay)) continue
      }
      const dateStr = (tag(block, 'pubDate') || tag(block, 'dc:date') || tag(block, 'published')).trim()
      const ts = new Date(dateStr).getTime() || 0
      out.push({ titleEn, date: dateStr, ts, image: extractImage(block), lang: feed.lang })
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
      image: r.image as string | null,
      lang: r.lang as 'fr' | 'en',
    }))

    try {
      const { sql } = await import('@/lib/db/sql')
      const slugs = picked.map(p => p.slug)
      const existing = new Set<string>()
      const cTitle: Record<string, string> = {}
      const cSum: Record<string, string | null> = {}
      const cImg: Record<string, string | null> = {}
      try {
        const rows: any[] = await sql.query('SELECT slug, title, summary, image FROM news_cache WHERE slug = ANY($1)', [slugs])
        for (const r of rows) { existing.add(r.slug); cTitle[r.slug] = r.title; cSum[r.slug] = r.summary; cImg[r.slug] = r.image }
      } catch {}

      const insert = async (slug: string, title: string, summary: string, image: string | null, ts: number) => {
        try {
          await sql.query(
            'INSERT INTO news_cache (slug, title, summary, image, news_date) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO NOTHING',
            [slug, title, summary, image, ts ? new Date(ts) : null],
          )
        } catch {}
      }

      await Promise.all(picked.map(async p => {
        if (existing.has(p.slug)) {
          if (cTitle[p.slug]) p.title = cTitle[p.slug]
          p.summary = cSum[p.slug]
          // image cachée prioritaire ; sinon on garde celle du flux courant
          if (cImg[p.slug]) p.image = cImg[p.slug]
          return
        }
        // 1) Haiku (titre + résumé riches) si une clé est dispo
        const fr = await reformulate(p.titleEn)
        if (fr) {
          p.title = fr.titre
          p.summary = fr.resume
          await insert(p.slug, fr.titre, fr.resume, p.image, p.ts)
          return
        }
        // 2) sinon, traduction gratuite du titre + résumé générique
        const t = await translateFR(p.titleEn)
        if (t) {
          p.title = t
          p.summary = GENERIC_FR
          await insert(p.slug, t, GENERIC_FR, p.image, p.ts)
          return
        }
        // 3) sinon : titre anglais, pas d'insert (réessai au prochain run)
      }))
    } catch {}

    return NextResponse.json({
      items: picked.map(({ title, date, slug, summary, image, lang }) => ({ title, date, slug, summary, image, lang })),
      count: uniq.length,
    })
  } catch (e: any) {
    return NextResponse.json({ items: [], error: String(e?.message || e) })
  }
}
