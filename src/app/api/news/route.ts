import { NextResponse } from 'next/server'
import { newsSlug } from '@/lib/news-slug'

/**
 * Actu TCG Pokémon — fil de titres 100% cartes, en français, AVEC vignette.
 * Sources RSS NATIVES (titre + image + lien vers l'article) :
 *   - PokeBeach front-page (EN, TCG-pur, <img> dans description)
 *   - Pokelite (FR, collection/marché, featured image WordPress)
 *   - Pokemon-France (FR, généraliste -> filtré JCC, featured image WordPress)
 * Source SCRAPÉE (pas de flux RSS) :
 *   - pokemon-card.com (JP, OFFICIEL) : la source primaire du marché japonais,
 *     lue avant que PokéBeach/PokéGuardian ne la commentent. HTML statique servi
 *     côté serveur (titre + date + vignette + catégorie dans la page liste).
 *     Fragile par nature : casse à toute refonte -> garde-fou zéro-article.
 * Le clic ouvre l'ARTICLE SOURCE dans un nouvel onglet : on cite le titre et on
 * renvoie le lecteur (et le trafic) chez l'éditeur. Aucun corps d'article aspiré.
 * Mise en français du titre (générée 1x puis cache news_cache) :
 *   1) si ANTHROPIC_API_KEY -> Claude Haiku (titre FR + résumé FR) ;
 *   2) sinon -> traduction GRATUITE Google du titre + résumé éditorial générique.
 *      Le JP passe par sl=auto ; les sources EN par sl=en.
 * Un item sans URL exploitable n'est ni inséré ni affiché (une carte non
 * cliquable ne vaut pas mieux que pas de carte).
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

type Lang = 'fr' | 'en' | 'jp'
type Feed = { url: string; tcgOnly: boolean; lang: 'fr' | 'en'; source: string }

// tcgOnly:false = source déjà 100% TCG -> on prend tout ; true = généraliste -> on filtre.
//
// PrimeTime Pokémon a été RETIRÉ (17/07/26) : le blog redirige vers FeedBurner, qui
// sert de l'Atom (<entry>) et non du RSS malgré ?alt=rss -> 0 item parsé depuis
// toujours. Et le blog est abandonné : dernier billet en février 2018. Ne pas le
// remettre sans vérifier ces deux points.
const FEEDS: Feed[] = [
  { url: 'https://www.pokebeach.com/forums/forum/front-page-news.18/index.rss', tcgOnly: false, lang: 'en', source: 'PokéBeach' },
  { url: 'https://www.pokelite.fr/feed/', tcgOnly: true, lang: 'fr', source: 'Pokelite' },
  { url: 'https://www.pokemon-france.com/feed/', tcgOnly: true, lang: 'fr', source: 'Pokémon France' },
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
  // 1) media:thumbnail / media:content (certains WP)
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

/* ── Extraction du lien de l'article ──────────────────────────────────── */
// Les 3 flux servent du RSS 2.0 avec un <link> nu dans chaque <item> (vérifié
// 17/07/26). Le \s* évite de capter un <link rel=... href=.../> auto-fermant,
// qui laisserait le regex courir jusqu'au </link> d'un autre bloc.
function extractLink(block: string): string | null {
  let m = block.match(/<link\s*>([\s\S]*?)<\/link>/i)
  if (m) {
    const u = clean(m[1])
    if (/^https?:\/\//i.test(u)) return u
  }
  // Variante Atom, au cas où une source basculerait de format.
  m = block.match(/<link[^>]*\brel=["']alternate["'][^>]*\bhref=["']([^"']+)["']/i)
  if (m) return decode(m[1])
  // Dernier recours : un <guid> qui est déjà une URL (WordPress ?p=123 redirige).
  const g = clean(tag(block, 'guid'))
  if (/^https?:\/\//i.test(g)) return g
  return null
}

/**
 * PokéBeach publie son fil de DISCUSSION dans le RSS (/forums/threads/{slug}.{id}/),
 * pas l'article : le lecteur tomberait sur un forum et un extrait tronqué.
 * L'article vit à /{année}/{mois}/{slug} — le slug est celui du thread, l'année et
 * le mois se lisent dans l'URL de la vignette (/news/2026/07/xxx.png).
 * On ne devine pas : on construit, on VÉRIFIE que ça répond, et à défaut on garde
 * le thread (qui reste un lien réel). Appelé une seule fois par article, à
 * l'ingestion — le cache empêche toute répétition.
 */
async function pokebeachArticleUrl(threadUrl: string, image: string | null): Promise<string | null> {
  const slug = threadUrl.match(/\/threads\/([^/]+?)\.\d+\/?$/)
  const ym = image ? image.match(/\/news\/(\d{4})\/(\d{2})\//) : null
  if (!slug || !ym) return null
  const guess = `https://www.pokebeach.com/${ym[1]}/${ym[2]}/${slug[1]}`
  try {
    const res = await fetch(guess, { method: 'HEAD', headers: { 'User-Agent': UA }, redirect: 'follow' })
    if (!res.ok) return null
    return res.url && /^https?:\/\/(www\.)?pokebeach\.com\//i.test(res.url) ? res.url : guess
  } catch {
    return null
  }
}

type Raw = { titleEn: string; date: string; ts: number; image: string | null; url: string; lang: Lang; source: string }

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
      // Sans lien, la carte serait un cul-de-sac : on ne la garde pas.
      const url = extractLink(block)
      if (!url) continue
      const dateStr = (tag(block, 'pubDate') || tag(block, 'dc:date') || tag(block, 'published')).trim()
      const ts = new Date(dateStr).getTime() || 0
      out.push({ titleEn, date: dateStr, ts, image: extractImage(block), url, lang: feed.lang, source: feed.source })
    }
    return out
  } catch {
    return []
  }
}

/* ── Source JP : pokemon-card.com (scraping HTML, pas de flux RSS) ─────── */
// EN VEILLE (JP_ENABLED = false). Le connecteur est complet, testé et prêt, mais
// la source ne se prête pas à un fil « en direct » : sa seule catégorie
// pertinente (Products = sorties/coffrets) est quasi vide et vieille de plusieurs
// mois, tandis que le récent (Event) est administratif (auth, compte joueur,
// ouvertures de boutique) ou des tournois locaux. Ni la date ni la catégorie ne
// donnent à la fois du frais ET du pertinent -> on n'affiche pas du faux-frais
// dans un fil qui vend la fraîcheur. Basculer JP_ENABLED à true quand
// pokemon-card.com aura une vraie vague de nouvelles cartes (typiquement avant
// une extension majeure). Pièges connus pour la reprise : le HTML sert chaque
// article en double (versions mobile + desktop) -> dédup sur l'URL ; la vignette
// est dans data-src (src = placeholder now-loading) ; le site renvoie 403 aux IP
// datacenter (OK depuis Vercel/local, KO depuis un conteneur de test).
// La page /info/ liste les news avec, par bloc <li class="List_item"> :
//   href /info/NNNNNN.html · alt=titre · data-src=vignette · Calendar_Label_XXX ·
//   <span class="Date">AAAA.M.J. Titre japonais -> translateFR(sl=auto).
const JP_ENABLED = false
const JP_BASE = 'https://www.pokemon-card.com'

async function fetchPokemonCardJP(): Promise<{ items: Raw[]; structureSeen: boolean }> {
  try {
    const res = await fetch(`${JP_BASE}/info/`, { next: { revalidate }, headers: { 'User-Agent': UA } })
    if (!res.ok) return { items: [], structureSeen: false }
    const html = await res.text()
    const byUrl = new Map<string, Raw>()
    // Chaque article = un <li class="List_item"> ... </li>. Le site le duplique
    // (versions mobile + desktop) -> on déduplique sur l'URL via la Map.
    const blocks = html.split('<li class="List_item">').slice(1)
    // structureSeen = la page contient bien des blocs article. Garde-fou : 0 bloc
    // = scraper cassé (refonte du site) ; des blocs mais 0 Products = simple
    // absence de sortie récente, pas une alerte.
    const structureSeen = blocks.length > 0
    for (const block of blocks) {
      const li = block.split('</li>')[0]

      const href = li.match(/href="(\/info\/\d{6}\.html)"/)
      if (!href) continue
      const url = JP_BASE + href[1]
      if (byUrl.has(url)) continue

      // Filtre catégorie : Products seulement.
      const label = li.match(/Calendar_Label_(\w+)/)
      if (!label || label[1] !== 'Products') continue

      // Titre : alt de l'image (fiable), sinon texte du List_body.
      let title = ''
      const alt = li.match(/<img[^>]*\balt="([^"]*)"/)
      if (alt && alt[1].trim()) title = decode(alt[1]).trim()
      if (!title) {
        const body = li.match(/<div class="List_body">([\s\S]*?)<\/div>/)
        if (body) title = clean(body[1].replace(/<span[\s\S]*$/, ''))
      }
      if (!title || title.length < 4) continue

      // Vignette : data-src (le vrai chemin ; src=placeholder now-loading).
      let image: string | null = null
      const ds = li.match(/data-src="([^"]+)"/)
      if (ds && !/now-loading/i.test(ds[1])) image = ds[1].startsWith('http') ? ds[1] : JP_BASE + ds[1]

      // Date AAAA.M.J -> ISO (pour le tri chronologique du fil).
      let ts = 0
      let dateStr = ''
      const d = li.match(/class="Date[^"]*">\s*(\d{4})\.(\d{1,2})\.(\d{1,2})/)
      if (d) {
        dateStr = `${d[1]}-${d[2].padStart(2, '0')}-${d[3].padStart(2, '0')}T00:00:00+09:00`
        ts = new Date(dateStr).getTime() || 0
      }

      byUrl.set(url, { titleEn: title, date: dateStr, ts, image, url, lang: 'jp', source: 'Pokémon Card (JP)' })
    }
    return { items: Array.from(byUrl.values()).sort((a, b) => b.ts - a.ts).slice(0, 8), structureSeen }
  } catch {
    return { items: [], structureSeen: false }
  }
}

/* ── Moteur 1 : Claude Haiku (si clé) — titre FR + résumé FR ──────────── */
function buildPrompt(title: string): string {
  return `Tu es l'éditeur de Kodo Cards, plateforme française dédiée aux cartes Pokémon (TCG). À partir du seul titre d'actualité ci-dessous (en anglais ou en japonais), produis :
- "titre" : une version française courte et fidèle du titre (12 mots maximum). Garde les noms de sets, produits et cartes dans leur forme d'origine (anglais ou japonais translittéré). N'invente rien.
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
// sl = langue source. 'en' pour PokéBeach, 'auto' pour le JP (Google détecte).
async function translateFR(text: string, sl: 'en' | 'auto' = 'en'): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=fr&dt=t&q=${encodeURIComponent(text)}`
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
    // Sources RSS (EN/FR) + source scrapée JP, en parallèle. Chaque bloc a son
    // propre try/catch et renvoie [] en cas d'échec : une source morte n'emporte
    // pas les autres.
    const [rss, jpResult] = await Promise.all([
      Promise.all(FEEDS.map(fetchFeed)).then(a => a.flat()),
      JP_ENABLED ? fetchPokemonCardJP() : Promise.resolve({ items: [] as Raw[], structureSeen: true }),
    ])
    const jp = jpResult.items
    const all = [...rss, ...jp]

    // GARDE-FOU JP : source scrapée sans flux -> casse en silence à toute
    // refonte. On alerte seulement si la STRUCTURE a disparu (aucun bloc article
    // dans la page = sélecteur cassé), pas si le filtre catégorie vide le
    // résultat. Inactif tant que JP_ENABLED est false (structureSeen forcé true).
    if (JP_ENABLED && !jpResult.structureSeen) {
      console.warn('[kodo-wire] source JP (pokemon-card.com) : aucun bloc article trouvé — refonte probable du site, vérifier le scraper')
    }

    const seen = new Set<string>()
    const uniq = all.filter(i => {
      // Clé de dédup : garde les lettres latines ET les caractères japonais
      // (hiragana/katakana/kanji), sinon un titre 100% japonais donne une clé
      // vide et tous les articles JP s'annulent entre eux.
      const k = i.titleEn.toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf]/g, '').slice(0, 60)
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
      url: r.url as string,
      lang: r.lang as Lang,
      source: r.source as string,
    }))

    try {
      const { sql } = await import('@/lib/db/sql')
      const slugs = picked.map(p => p.slug)
      const existing = new Set<string>()
      const cTitle: Record<string, string> = {}
      const cSum: Record<string, string | null> = {}
      const cImg: Record<string, string | null> = {}
      const cUrl: Record<string, string | null> = {}
      try {
        const rows: any[] = await sql.query('SELECT slug, title, summary, image, url FROM news_cache WHERE slug = ANY($1)', [slugs])
        for (const r of rows) { existing.add(r.slug); cTitle[r.slug] = r.title; cSum[r.slug] = r.summary; cImg[r.slug] = r.image; cUrl[r.slug] = r.url }
      } catch {}

      const insert = async (slug: string, title: string, summary: string, image: string | null, ts: number, source: string, url: string) => {
        try {
          await sql.query(
            'INSERT INTO news_cache (slug, title, summary, image, news_date, source, url) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (slug) DO NOTHING',
            [slug, title, summary, image, ts ? new Date(ts) : null, source, url],
          )
        } catch {}
      }

      await Promise.all(picked.map(async p => {
        if (existing.has(p.slug)) {
          if (cTitle[p.slug]) p.title = cTitle[p.slug]
          p.summary = cSum[p.slug]
          // image cachée prioritaire ; sinon on garde celle du flux courant
          if (cImg[p.slug]) p.image = cImg[p.slug]
          // idem pour le lien : le cache fait foi (il porte déjà l'article résolu)
          if (cUrl[p.slug]) p.url = cUrl[p.slug] as string
          return
        }
        // Article neuf : sur PokéBeach on tente de remplacer le thread par l'article.
        if (p.source === 'PokéBeach') {
          const better = await pokebeachArticleUrl(p.url, p.image)
          if (better) p.url = better
        }
        // 1) Haiku (titre + résumé riches) si une clé est dispo
        const fr = await reformulate(p.titleEn)
        if (fr) {
          p.title = fr.titre
          p.summary = fr.resume
          await insert(p.slug, fr.titre, fr.resume, p.image, p.ts, p.source, p.url)
          return
        }
        // 2) sinon, traduction gratuite du titre + résumé générique.
        //    JP -> sl=auto (Google détecte le japonais) ; EN -> sl=en.
        const t = await translateFR(p.titleEn, p.lang === 'jp' ? 'auto' : 'en')
        if (t) {
          p.title = t
          p.summary = GENERIC_FR
          await insert(p.slug, t, GENERIC_FR, p.image, p.ts, p.source, p.url)
          return
        }
        // 3) sinon : titre d'origine, pas d'insert (réessai au prochain run)
      }))
    } catch {}

    return NextResponse.json({
      items: picked.map(({ title, date, slug, summary, image, lang, source, url }) => ({ title, date, slug, summary, image, lang, source, url })),
      count: uniq.length,
    })
  } catch (e: any) {
    return NextResponse.json({ items: [], error: String(e?.message || e) })
  }
}
