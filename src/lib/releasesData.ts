/**
 * releasesData - source unique du calendrier des sorties (fusion TCGdex + PPT).
 * Utilise par /api/releases ET la page /releases. Cote serveur uniquement
 * (la cle PPT ne doit jamais partir au navigateur).
 */

export type Lang = 'FR' | 'EN' | 'JP'
export type ReleaseSet = {
  name: string
  slug: string
  pptId: string
  series: string
  lang: Lang
  releaseDate: string
  releaseDateLocale: string
  imageUrl: string | null
  daysUntil: number
  isReleased: boolean
}

const TCGDEX: Record<Lang, string> = {
  FR: 'https://api.tcgdex.net/v2/fr/sets',
  EN: 'https://api.tcgdex.net/v2/en/sets',
  JP: 'https://api.tcgdex.net/v2/ja/sets',
}
// La liste /sets de TCGdex n'est PAS triee chronologiquement (surtout JA:
// la serie M est rangee avant SV). Le tail seul rate donc des sets recents.
// On force l'inclusion des sets de la serie de la generation courante.
const TCGDEX_SERIES: Record<Lang, string> = {
  FR: 'https://api.tcgdex.net/v2/fr/series',
  EN: 'https://api.tcgdex.net/v2/en/series',
  JP: 'https://api.tcgdex.net/v2/ja/series',
}
const CURRENT_SERIES: Record<Lang, string[]> = { FR: ['me'], EN: ['me'], JP: ['M'] }

function norm(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}
function localeDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

async function fetchTcgdex(lang: Lang): Promise<ReleaseSet[]> {
  try {
    const list: { id: string }[] = await fetch(TCGDEX[lang], { next: { revalidate: 21600 } }).then(r => r.json())
    const ids = new Set(list.slice(-16).map(x => x.id))
    // Sets des series de la generation courante (fix tail non chronologique)
    for (const serieId of CURRENT_SERIES[lang]) {
      try {
        const serie = await fetch(TCGDEX_SERIES[lang] + '/' + serieId, { next: { revalidate: 21600 } }).then(r => r.json())
        for (const st of (serie.sets || [])) ids.add(st.id)
      } catch {}
    }
    const tail = [...ids].map(id => ({ id }))
    const now = Date.now()
    const out = await Promise.all(tail.map(async (s) => {
      try {
        const d = await fetch(`${TCGDEX[lang]}/${s.id}`, { next: { revalidate: 21600 } }).then(r => r.json())
        if (!d.releaseDate) return null
        const t = new Date(d.releaseDate).getTime()
        const daysUntil = Math.ceil((t - now) / 86400000)
        return {
          name: d.name, slug: d.id, pptId: lang + ':' + d.id, series: d.serie?.name || '', lang,
          releaseDate: d.releaseDate, releaseDateLocale: localeDate(d.releaseDate),
          imageUrl: d.logo ? d.logo + '.webp' : null,
          daysUntil, isReleased: daysUntil <= 0,
        } as ReleaseSet
      } catch { return null }
    }))
    return out.filter((x): x is ReleaseSet => !!x)
  } catch { return [] }
}

async function fetchPptUpcoming(): Promise<ReleaseSet[]> {
  const KEY = process.env.POKEMON_PRICE_TRACKER_API_KEY
  if (!KEY) return []
  try {
    const r = await fetch('https://www.pokemonpricetracker.com/api/v2/sets?language=english', {
      headers: { Authorization: 'Bearer ' + KEY }, next: { revalidate: 21600 },
    })
    const j = await r.json()
    const sets: any[] = j.data || []
    const now = Date.now()
    return sets
      .filter(s => s.releaseDate && new Date(s.releaseDate).getTime() > now)
      .map(s => {
        const t = new Date(s.releaseDate).getTime()
        const daysUntil = Math.ceil((t - now) / 86400000)
        return {
          name: s.name, slug: s.tcgPlayerId || '', pptId: 'ppt:' + (s.tcgPlayerId || s.id),
          series: s.series || '', lang: 'EN' as Lang,
          releaseDate: s.releaseDate, releaseDateLocale: localeDate(s.releaseDate),
          imageUrl: s.imageUrl || null,
          daysUntil, isReleased: false,
        } as ReleaseSet
      })
  } catch { return [] }
}

/** Calendrier fusionne : a venir (date croissante) puis sortis (date decroissante). */
export async function getReleases(): Promise<ReleaseSet[]> {
  const [fr, en, jp, ppt] = await Promise.all([
    fetchTcgdex('FR'), fetchTcgdex('EN'), fetchTcgdex('JP'), fetchPptUpcoming(),
  ])
  const all = [...fr, ...en, ...jp]
  const seen = new Set(all.map(s => norm(s.name)))
  for (const p of ppt) {
    if (!seen.has(norm(p.name))) { all.push(p); seen.add(norm(p.name)) }
  }
  const upcoming = all.filter(s => !s.isReleased).sort((a, b) => a.releaseDate < b.releaseDate ? -1 : 1)
  const recent = all.filter(s => s.isReleased).sort((a, b) => a.releaseDate < b.releaseDate ? 1 : -1)
  return [...upcoming, ...recent.slice(0, 14)]
}
