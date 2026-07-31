'use client'
// Scelles — catalogue scelle Kodo, branche sur /api/v1/sealed (donnees REELLES).
//
// DA reprise de l'Encyclopedie au detail pres : eyebrow + h1, segmented control
// de langue a drapeaux, recherche pleine largeur en verre depoli, barre de
// filtres sticky (PillSelect + SetSelect), vignettes TRANSLUCIDES sur le degrade
// de page, drawer lateral. Les <select> natifs et les boites CSS a degrades
// ont ete retires — c'est ce que la refonte du Pokedesk avait supprime ailleurs.
//
// REGLES D'AFFICHAGE (miroir des singles) :
//   - prix FR = annonces eBay FR decotees -> "des X EUR", jamais "X EUR"
//   - nombre de vendeurs affiche : c'est ce qui rend le prix credible
//   - pas de cote -> "Donnees insuffisantes", JAMAIS 0 EUR
//   - le marche est annonce en clair (FR = annonces France, EN = US converti)
//   - vignette : packshot officiel s'il existe, sinon logo de serie, sinon typo.
//     On n'affiche JAMAIS une photo d'annonce (la route les filtre deja).

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { FONT } from '@/lib/design/snow'
import { useAuth } from '@/lib/useAuth'
import { usePersona } from '@/lib/usePersona'
import { supabase } from '@/lib/supabase'
import { AddSealedModal, type SealedSeed } from '@/components/features/card/AddSealedModal'
import { SetSelect } from '@/components/features/cartes/SetSelect'
import { PillSelect } from '@/components/features/cartes/PillSelect'

type Lang = 'FR' | 'EN'

interface SealedPrice {
  value: number; currency: string; isAsking: boolean
  basis?: 'spot' | 'window'; windowDays?: number
  low: number | null; perBooster: number | null; raw: number | null
  method: string | null; market: string | null
  sellers: number | null; sampleSize: number | null; updatedAt: string | null
}

interface SealedItem {
  id: string; name: string; shortName: string; lang: string
  sku: string | null; skuLabel: string
  content: { qty: number; unit: string; label: string } | null
  setId: string | null; setName: string | null; series: string | null
  setLogo: string | null; image: string | null
  boosters: number | null; skuTrusted?: boolean
  // Fourchette des annonces vues sur 90 jours quand aucune cote n'est possible :
  // pour le scelle vintage c'est le seul affichage honnete — le collectionneur voit
  // ce qui passe au lieu d'un "Donnees insuffisantes" muet.
  range?: { low: number; high: number; sellers: number | null; days: number } | null
  price: SealedPrice | null
}

interface Facet { sku: string; label: string; total: number; priced: number }

const CHUNK = 48

const BLOC_LABEL: Record<string, string> = {
  me: 'Méga-Évolution', sv: 'Écarlate & Violet', swsh: 'Épée & Bouclier',
  sm: 'Soleil & Lune', xy: 'XY', bw: 'Noir & Blanc', hgss: 'HeartGold SoulSilver',
  pl: 'Platine', dp: 'Diamant & Perle', ex: 'EX', ecard: 'e-Card',
  neo: 'Neo', gym: 'Gym', base: 'Wizards',
}
const BLOC_ORDER = [
  'Méga-Évolution', 'Écarlate & Violet', 'Épée & Bouclier', 'Soleil & Lune', 'XY',
  'Noir & Blanc', 'Platine', 'Diamant & Perle', 'e-Card', 'EX', 'Neo', 'Gym', 'Wizards', 'Autre',
]
const blocOfSeries = (s: string | null) => (s ? BLOC_LABEL[s] || 'Autre' : 'Autre')
const flag = (l: Lang) => (l === 'FR' ? String.fromCodePoint(127467, 127479) : String.fromCodePoint(127482, 127480))

// Un plancher tres eloigne de la mediane n'est pas une affaire, c'est un doute :
// produit abime, boite vide passee entre les mailles, ou lot mal detecte.
// Sous ce rapport on TAIT le plancher plutot que de suggerer une aubaine
// invalidable (meme logique que la garde de monotonie sur les notes gradees).
const LOW_MIN_RATIO = 0.4
const usableLow = (p: SealedPrice | null) =>
  p && p.low != null && p.value > 0 && p.low / p.value >= LOW_MIN_RATIO ? p.low : null

/** age d'un releve, en clair : un prix sans date est un prix qu'on ne peut pas juger */
function ageLabel(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso).getTime()
  if (!Number.isFinite(d)) return null
  const j = Math.floor((Date.now() - d) / 86400000)
  if (j <= 0) return "aujourd'hui"
  if (j === 1) return 'hier'
  if (j < 31) return 'il y a ' + j + ' jours'
  const m = Math.round(j / 30)
  return 'il y a ' + m + ' mois'
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n >= 100 ? 0 : 2 }).format(n)

function Visual({ item, h, small }: { item: SealedItem; h: string; small?: boolean }) {
  const [broken, setBroken] = useState(false)
  // Pas d'opacite conditionnelle : quand l'image vient du cache navigateur, onLoad
  // ne se declenche pas et elle restait invisible (constate dans le drawer).
  const loaded = true
  const setLoaded = (_: boolean) => { }
  // TCGplayer sert un placeholder "Image Coming Soon" pour les produits non
  // photographies : ce n'est pas une illustration, on tombe sur le logo de serie.
  const isPlaceholder = !!item.image && /coming.?soon|placeholder|no.?image|blank/i.test(item.image)
  const packshot = !broken && item.image && !isPlaceholder ? item.image : null
  const logo = !packshot && item.setLogo ? item.setLogo : null
  return (
    <div className="sc-visual" style={{ height: h, background: packshot ? '#fff' : 'rgba(0,0,0,0.025)', position: 'relative' as const, overflow: 'hidden' as const, borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {packshot ? (
        <img src={packshot} alt="" onError={() => setBroken(true)} onLoad={() => setLoaded(true)}
          className={loaded ? 'sc-img-in' : undefined}
          style={{ maxWidth: '92%', maxHeight: '92%', objectFit: 'contain' as const, opacity: loaded ? 1 : 0 }} />
      ) : logo ? (
        <img src={logo} alt="" onError={() => setBroken(true)} onLoad={() => setLoaded(true)}
          className={loaded ? 'sc-img-in' : undefined}
          style={{ maxWidth: '62%', maxHeight: '46%', objectFit: 'contain' as const, opacity: loaded ? 0.9 : 0 }} />
      ) : (
        <span style={{ fontSize: small ? '9px' : '11px', color: '#C7C7CC', fontFamily: 'var(--font-display)', letterSpacing: '.08em', textTransform: 'uppercase' as const }}>
          {item.skuLabel}
        </span>
      )}
    </div>
  )
}

export function Scelles() {
  const { user } = useAuth()
  const { isInvestor, isCollector } = usePersona()
  const [sortBooster, setSortBooster] = useState(false)
  // Produit cible passe en URL (?p=fr-sm12-display) : la fiche devient
  // adressable, donc partageable et atteignable depuis le classeur. La langue
  // se deduit du prefixe de la cle, sinon on ouvrirait la page en FR sur un
  // produit EN et l'item ne serait pas dans la liste chargee.
  const urlProduct = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('p')
    : null
  const [lang, setLang] = useState<Lang>(
    urlProduct && urlProduct.startsWith('en-') ? 'EN' : 'FR'
  )
  const [items, setItems] = useState<SealedItem[]>([])
  const [facets, setFacets] = useState<Facet[]>([])
  const [market, setMarket] = useState('EU_FR')
  const [total, setTotal] = useState(0)
  const [pricedTotal, setPricedTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(false)
  const [filSku, setFilSku] = useState('all')
  const [filSet, setFilSet] = useState('all')
  const [search, setSearch] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const [visible, setVisible] = useState(CHUNK)
  const [selId, setSelId] = useState<string | null>(urlProduct)
  // Un state par rendu ne suffit pas : l'effet de reinitialisation ci-dessous
  // tourne AU MONTAGE et effacerait la selection venue de l'URL.
  const firstRun = useRef(true)
  const selectProduct = useCallback((id: string | null) => {
    setSelId(id)
    if (typeof window === 'undefined') return
    const u = new URL(window.location.href)
    if (id) u.searchParams.set('p', id); else u.searchParams.delete('p')
    window.history.replaceState(null, '', u.toString())
  }, [])
  const [sealedSeed, setSealedSeed] = useState<SealedSeed | null>(null)
  // Annonces reelles du produit selectionne. Distinctes de la cote : la cote est
  // une mediane decotee que personne ne pratique, ces lignes sont ce qu'on peut
  // acheter maintenant.
  type Ask = { url: string; price: number; seller: string | null; condition: string | null; seenAt: string | null }
  const [asks, setAsks] = useState<Ask[]>([])
  useEffect(() => {
    if (!selId) { setAsks([]); return }
    let alive = true
    fetch('/api/v1/sealed/asks?p=' + encodeURIComponent(selId) + '&limit=6', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => { if (alive) setAsks(Array.isArray(d.asks) ? d.asks : []) })
      .catch(() => { if (alive) setAsks([]) })
    return () => { alive = false }
  }, [selId])
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true); setLoadErr(false)
    fetch('/api/v1/sealed?lang=' + lang + '&limit=1000&sort=price', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        setItems(Array.isArray(d.items) ? d.items : [])
        setFacets(Array.isArray(d.facets) ? d.facets : [])
        setMarket(String(d.priceMarket || ''))
        setTotal(Number(d.total || 0))
        setPricedTotal(Number(d.priced || 0))
      })
      .catch(() => { if (alive) { setItems([]); setFacets([]); setLoadErr(true) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [lang])

  useEffect(() => {
    setVisible(CHUNK)
    if (firstRun.current) { firstRun.current = false; return }
    selectProduct(null)
  }, [lang, filSku, filSet, search, sortBooster, selectProduct])

  const setsLite = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number }>()
    for (const it of items) {
      if (!it.setId || !it.setName) continue
      const cur = m.get(it.setId)
      if (cur) cur.count++
      else m.set(it.setId, { id: it.setId, name: it.setName, count: 1 })
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  const setLogos = useMemo(() => {
    const o: Record<string, string> = {}
    for (const it of items) if (it.setId && it.setLogo && !o[it.setId]) o[it.setId] = it.setLogo
    return o
  }, [items])

  const setBloc = useMemo(() => {
    const o: Record<string, string> = {}
    for (const it of items) if (it.setId && !o[it.setId]) o[it.setId] = blocOfSeries(it.series)
    return o
  }, [items])

  const skuOfLabel = useMemo(() => {
    const o: Record<string, string> = {}
    for (const f of facets) o[f.label] = f.sku
    return o
  }, [facets])
  const labelOfSku = useMemo(() => {
    const o: Record<string, string> = {}
    for (const f of facets) o[f.sku] = f.label
    return o
  }, [facets])

  const filtered = useMemo(() => {
    let r = items
    if (filSku !== 'all') r = r.filter((i) => i.sku === filSku)
    if (filSet !== 'all') r = r.filter((i) => i.setId === filSet)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((i) => i.name.toLowerCase().includes(q) || (i.setName || '').toLowerCase().includes(q) || (i.skuLabel || '').toLowerCase().includes(q))
    }
    if (sortBooster) {
      // le moins cher au booster d'abord : c'est le format le mieux value
      return [...r].sort((a, b) => (a.price?.perBooster ?? 1e9) - (b.price?.perBooster ?? 1e9))
    }
    return [...r].sort((a, b) => (b.price?.value ?? -1) - (a.price?.value ?? -1))
  }, [items, filSku, filSet, search, sortBooster])

  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(
      (e) => { if (e[0].isIntersecting && visible < filtered.length) setVisible((p) => Math.min(p + CHUNK, filtered.length)) },
      { rootMargin: '400px' }
    )
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [visible, filtered.length])

  const pageItems = filtered.slice(0, visible)
  const selected = selId ? items.find((i) => i.id === selId) || null : null
  const cotes = filtered.filter((i) => i.price).length
  const hasFilters = filSku !== 'all' || filSet !== 'all' || search !== ''

  const openModal = useCallback(() => {
    if (!selected) return
    setSealedSeed({
      name: selected.name, set_name: selected.setName, set_id: selected.setId,
      card_type: selected.sku, year: 0, image_url: selected.image || selected.setLogo,
    })
  }, [selected])

  // CORRIGE deux defauts de l'ancienne version : la langue etait figee a 'FR'
  // (un produit EN entrait en FR) et le prix connu n'etait jamais ecrit.
  const handleSealedAdd = async (payload: Record<string, unknown>) => {
    const id = crypto.randomUUID()
    const name = String(payload.name ?? 'Produit')
    const set_name = payload.set_name ? String(payload.set_name) : ''
    const set_id = payload.set_id ? String(payload.set_id) : undefined
    const card_type = String(payload.card_type ?? '')
    const image_url = payload.image_url ? String(payload.image_url) : undefined
    const qty = Number(payload.qty ?? 1) || 1
    const buy_price = payload.buy_price != null ? (Number(payload.buy_price) || 0) : null
    const current_price = selected?.price?.value ?? null
    const itemLang = selected?.lang || lang

    if (user) {
      const { data, error } = await supabase.from('portfolio_cards').insert({
        id, user_id: user.id, name,
        set_name: set_name || null,
        set_id: (set_id || '').replace(/^(fr|en|jp)-/, '') || null,
        card_number: 'SEALED', lang: itemLang,
        rarity: 'Sealed', card_type,
        condition: 'Sealed', graded: false,
        qty, buy_price, current_price,
        image_url: image_url || null,
      }).select()
      if (error) { console.error('[KC SEALED] insert failed:', error); return null }
      const row = data && data[0] ? data[0] : null
      return row ?? { id }
    }
    try {
      const prev = JSON.parse(localStorage.getItem('portfolio') || '[]')
      prev.push({
        id, name, set: set_name, setId: set_id, number: 'SEALED', rarity: 'Sealed',
        type: card_type, lang: itemLang, condition: 'Sealed', graded: false,
        buyPrice: buy_price ?? 0, curPrice: current_price ?? 0, qty, image: image_url,
      })
      localStorage.setItem('portfolio', JSON.stringify(prev))
    } catch { }
    return { id }
  }

  return (
    <>
      <style>{`
        @keyframes scFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes scCardIn { from { opacity:0; transform:translateY(9px); filter:blur(5px) } to { opacity:1; transform:none; filter:blur(0) } }
        @keyframes scSpin { to { transform:rotate(360deg) } }
        @keyframes scPanelIn { 0% { opacity:0; transform:translateX(14px) scale(.985) } 66% { opacity:1; transform:translateX(-2px) scale(1.004) } 100% { opacity:1; transform:none } }
        @keyframes scImgIn { from { opacity:0; transform:scale(.97) } to { opacity:1; transform:none } }
        @keyframes scShimmer { 0% { background-position:-420px 0 } 100% { background-position:420px 0 } }
        @keyframes scRowIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:none } }

        .sc-card { transition: transform .24s cubic-bezier(.2,.85,.3,1), box-shadow .24s cubic-bezier(.2,.85,.3,1), border-color .18s; will-change: transform; }
        .sc-card:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,.09), 0 3px 8px rgba(0,0,0,.05), inset 0 1px 0 rgba(255,255,255,.92) !important; }
        .sc-card:active { transform: translateY(-1px) scale(.994); }
        .sc-card .sc-visual img { transition: transform .32s cubic-bezier(.2,.85,.3,1); }
        .sc-card:hover .sc-visual img { transform: scale(1.045); }
        .sc-img-in { animation: scImgIn .34s cubic-bezier(.2,.85,.3,1) both; }

        .sc-panel { animation: scPanelIn .3s cubic-bezier(.34,1.18,.64,1) both; }
        .sc-mrow { animation: scRowIn .28s cubic-bezier(.2,.85,.3,1) both; }

        .sc-skel { background: linear-gradient(90deg, rgba(0,0,0,0.035) 25%, rgba(0,0,0,0.06) 37%, rgba(0,0,0,0.035) 63%); background-size: 840px 100%; animation: scShimmer 1.25s ease-in-out infinite; border-radius: 6px; }

        .sc-lang { transition: all .2s cubic-bezier(.34,1.4,.64,1); }
        .sc-lang:active { transform: scale(.94); }
        .sc-cta { transition: transform .18s cubic-bezier(.34,1.3,.64,1), box-shadow .2s; }
        .sc-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(29,29,31,.26); }
        .sc-cta:active { transform: translateY(0) scale(.985); }

        @media (prefers-reduced-motion: reduce) {
          .sc-card, .sc-card:hover, .sc-card:active, .sc-card .sc-visual img, .sc-card:hover .sc-visual img,
          .sc-panel, .sc-mrow, .sc-skel, .sc-lang, .sc-cta, .sc-img-in {
            animation: none !important; transition: none !important; transform: none !important;
          }
        }
      `}</style>

      <div style={{ animation: 'scFadeIn .25s ease-out', width: '100%', display: 'flex', gap: '20px', alignItems: 'flex-start', fontFamily: FONT.body }}>
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '10px', color: '#AAA', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>Produits</p>
              <h1 style={{ fontSize: '26px', fontWeight: 600, color: '#111', fontFamily: 'var(--font-display)', letterSpacing: '-.5px', margin: '0 0 5px' }}>Scellés</h1>
              <div style={{ fontSize: '12px', color: '#888', minHeight: '18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {loading ? (
                  <>
                    <div style={{ position: 'relative', width: '14px', height: '14px', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', inset: 0, border: '1.5px solid #EEE', borderTop: '1.5px solid #555', borderRadius: '50%', animation: 'scSpin .7s linear infinite' }} />
                      <div style={{ position: 'absolute', inset: '3px', borderRadius: '50%', background: '#999' }} />
                    </div>
                    <span style={{ color: '#AAA' }}>Chargement du catalogue…</span>
                  </>
                ) : loadErr ? (
                  <span style={{ color: '#E03020' }}>Erreur de chargement</span>
                ) : (
                  <span>
                    <strong style={{ color: '#111' }}>{(total || filtered.length).toLocaleString('fr-FR')}</strong> produits
                    {isCollector ? null : (
                      <>
                        {' · '}<strong style={{ color: '#111' }}>{(hasFilters ? cotes : (pricedTotal || cotes)).toLocaleString('fr-FR')}</strong> cotés
                        {' · '}{market === 'EU_FR' ? 'annonces France' : 'marché américain converti'}
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div style={{ background: '#F5F5F5', borderRadius: '12px', padding: '4px', display: 'flex', gap: '3px', flexShrink: 0 }}>
              {(['FR', 'EN'] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)} className="sc-lang"
                  style={{ padding: '8px 14px', borderRadius: '9px', border: 'none', background: lang === l ? '#fff' : 'transparent', color: lang === l ? '#111' : '#888', fontFamily: 'var(--font-display)', fontWeight: lang === l ? 700 : 500, fontSize: '13px', cursor: 'pointer', boxShadow: lang === l ? '0 2px 8px rgba(0,0,0,.1)' : 'none', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span>{flag(l)}</span>
                  <span>{l === 'FR' ? 'Français' : 'English'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recherche */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#CCC', fontSize: '15px', pointerEvents: 'none' }}>{String.fromCharCode(8981)}</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocus(true)} onBlur={() => setSearchFocus(false)}
                placeholder="Rechercher un produit, une série..."
                style={{ width: '100%', height: '40px', padding: '0 32px', border: '1px solid ' + (searchFocus ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)'), borderRadius: '9px', fontSize: '13px', color: '#1D1D1F', outline: 'none', background: searchFocus ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px) saturate(180%)', WebkitBackdropFilter: 'blur(12px) saturate(180%)', boxSizing: 'border-box' as const, fontFamily: 'var(--font-sans)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)', transition: 'all .2s cubic-bezier(.2,.85,.3,1)' }} />
              {search ? (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', fontSize: '16px', padding: 0, lineHeight: 1 }}>{String.fromCharCode(215)}</button>
              ) : null}
            </div>
          </div>

          {/* Filtres */}
          <div className="kfilters-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', position: 'sticky' as const, top: 0, zIndex: 30, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', padding: '14px 12px', margin: '0 -12px 18px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
            <PillSelect
              options={facets.map((f) => f.label)}
              value={filSku === 'all' ? 'all' : (labelOfSku[filSku] || 'all')}
              onChange={(v) => setFilSku(v === 'all' ? 'all' : (skuOfLabel[v] || 'all'))}
              allLabel="Tous les produits"
              minWidth={186}
              disabled={loading}
            />
            <SetSelect
              sets={setsLite}
              value={filSet}
              onChange={(id) => setFilSet(id)}
              blocOf={(sid) => setBloc[sid] || 'Autre'}
              blocOrder={BLOC_ORDER}
              logos={setLogos}
              disabled={loading}
            />
            {isInvestor && items.some((i) => i.price?.perBooster) ? (
              <button className="fsel" onClick={() => setSortBooster((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: sortBooster ? '#1D1D1F' : '#86868B', background: sortBooster ? 'rgba(224,48,32,0.04)' : undefined, borderColor: sortBooster ? 'rgba(224,48,32,0.35)' : undefined }}>
                {sortBooster ? 'Prix au booster' : 'Cote décroissante'}
              </button>
            ) : null}
            {hasFilters ? (
              <button onClick={() => { setFilSku('all'); setFilSet('all'); setSearch('') }}
                style={{ height: '34px', padding: '0 12px', borderRadius: '7px', border: '1px solid #EBEBEB', background: '#fff', color: '#888', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                Réinitialiser
              </button>
            ) : null}
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#AAA' }}>
              {filtered.length.toLocaleString('fr-FR')} produits
            </span>
          </div>

          {!loading && !loadErr ? (
            <div style={{ fontSize: '12px', color: '#888', textAlign: 'right' as const, marginBottom: '10px' }}>
              {Math.min(visible, filtered.length)} / {(total > filtered.length && !hasFilters ? total : filtered.length).toLocaleString('fr-FR')} produits affichés
            </div>
          ) : null}

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: '12px' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', overflow: 'hidden' as const, animation: 'scCardIn .35s ' + i * 0.03 + 's cubic-bezier(.2,.85,.3,1) both' }}>
                  <div className="sc-skel" style={{ height: '160px', borderRadius: 0 }} />
                  <div style={{ padding: '10px 12px 12px' }}>
                    <div className="sc-skel" style={{ height: '11px', width: '72%', marginBottom: '7px' }} />
                    <div className="sc-skel" style={{ height: '9px', width: '48%', marginBottom: '10px' }} />
                    <div className="sc-skel" style={{ height: '13px', width: '38%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!loading && filtered.length === 0 ? (
            <div style={{ padding: '56px 0', textAlign: 'center' as const, color: '#888', fontSize: '13px' }}>
              Aucun produit ne correspond.
            </div>
          ) : null}

          <div style={{ display: loading ? 'none' : 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: '12px' }}>
            {pageItems.map((it, idx) => {
              const sel = selId === it.id
              return (
                <div key={it.id} className="sc-card" onClick={() => selectProduct(sel ? null : it.id)}
                  style={{
                    background: 'rgba(255,255,255,0.65)',
                    border: '1px solid ' + (sel ? '#1D1D1F' : 'rgba(0,0,0,0.05)'),
                    borderRadius: '12px', overflow: 'hidden' as const, cursor: 'pointer',
                    boxShadow: sel
                      ? '0 0 0 1px #1D1D1F, 0 16px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)'
                      : '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                    animation: 'scCardIn .35s ' + Math.min(idx, 18) * 0.025 + 's cubic-bezier(.2,.85,.3,1) both',
                  }}>
                  <div style={{ position: 'relative' as const }}>
                    <Visual item={it} h="160px" />
                    <div style={{ position: 'absolute' as const, bottom: 7, left: 7, zIndex: 2, padding: '3px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.92)', fontSize: 7.5, fontWeight: 700, color: '#6E6E73', fontFamily: 'var(--font-display)', letterSpacing: '.04em', textTransform: 'uppercase' as const, boxShadow: '0 2px 6px rgba(0,0,0,0.08)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                      {it.skuLabel}
                    </div>
                    <div style={{ position: 'absolute' as const, bottom: 6, right: 7, fontSize: 11, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px) saturate(180%)', WebkitBackdropFilter: 'blur(10px) saturate(180%)', borderRadius: 5, padding: '2px 6px', boxShadow: '0 2px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.04)' }}>
                      {flag(it.lang === 'EN' ? 'EN' : 'FR')}
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px 12px' }}>
                    <div title={it.name} style={{ fontSize: '13px', fontWeight: 600, color: '#111', fontFamily: 'var(--font-display)', marginBottom: '3px', overflow: 'hidden' as const, textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, lineHeight: 1.3 }}>
                      {it.shortName || it.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#86868B', marginBottom: '7px', overflow: 'hidden' as const, textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {it.setName || it.skuLabel}{it.content ? ' · ' + it.content.label : ''}
                    </div>
                    {isCollector ? null : it.price && it.price.value > 0 ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexWrap: 'wrap' as const }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111', fontFamily: 'var(--font-data)' }}>
                            {it.price.isAsking ? <span style={{ fontSize: '10px', fontWeight: 500, color: '#888', marginRight: '3px', fontFamily: 'var(--font-display)' }}>cote</span> : null}
                            {eur(it.price.value)}
                          </span>
                          {it.price.sellers ? (
                            <span style={{ fontSize: '10px', color: '#AAA' }}>{it.price.sellers} vendeurs</span>
                          ) : null}
                          {it.price.basis === 'window' ? (
                            <span style={{ fontSize: '9.5px', color: '#AAA', fontFamily: 'var(--font-display)' }}>sur {it.price.windowDays || 90} j</span>
                          ) : null}
                        </div>
                        {isInvestor && it.price.perBooster ? (
                          <div style={{ fontSize: '10.5px', color: '#6E6E73', marginTop: '3px', fontFamily: 'var(--font-data)' }}>
                            {eur(it.price.perBooster)} <span style={{ color: '#AAA', fontFamily: 'var(--font-display)' }}>/ booster</span>
                          </div>
                        ) : null}
                      </>
                    ) : it.range ? (
                      <>
                        <div style={{ fontSize: '12px', color: '#6E6E73', fontFamily: 'var(--font-data)' }}>
                          {eur(it.range.low)} — {eur(it.range.high)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#AAA', marginTop: '2px' }}>
                          {it.range.sellers || 0} annonce{(it.range.sellers || 0) > 1 ? 's' : ''} sur {it.range.days} j
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#AAA' }}>Données insuffisantes</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div ref={sentinelRef} style={{ height: 1 }} />
        </div>

        {/* Drawer lateral */}
        {selected ? (
          <aside className="sc-panel" style={{ width: '420px', flexShrink: 0, position: 'sticky' as const, top: '16px', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)', overflow: 'hidden' as const, animation: 'scFadeIn .2s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '10px', color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.1em', fontFamily: 'var(--font-display)' }}>Aperçu</span>
              <button onClick={() => selectProduct(null)} style={{ background: 'none', border: 'none', color: '#AAA', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0 }}>{String.fromCharCode(215)}</button>
            </div>

            <div style={{ padding: '16px' }}>
              <div style={{ borderRadius: '10px', overflow: 'hidden' as const, border: '1px solid rgba(0,0,0,0.05)', marginBottom: '14px' }}>
                <Visual item={selected} h="220px" />
              </div>

              <div style={{ fontSize: '10px', color: '#86868B', textTransform: 'uppercase' as const, letterSpacing: '.08em', fontFamily: 'var(--font-display)', marginBottom: '3px' }}>
                {flag(selected.lang === 'EN' ? 'EN' : 'FR')} {selected.setName || ''}
              </div>
              <h2 style={{ fontSize: '19px', fontWeight: 600, color: '#111', fontFamily: 'var(--font-display)', margin: '0 0 6px', lineHeight: 1.25 }}>
                {selected.shortName || selected.name}
              </h2>
              <div style={{ fontSize: '12px', color: '#86868B', marginBottom: '12px' }}>
                {selected.skuLabel}{selected.content ? ' · ' + selected.content.label : ''}
              </div>

              {isCollector ? null : (
              <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '10px', padding: '13px 14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', color: '#86868B', textTransform: 'uppercase' as const, letterSpacing: '.08em', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                  {selected.price?.basis === 'window' ? 'Annonces sur 90 jours'
                    : selected.price?.isAsking ? 'Annonces en cours' : 'Prix de marché'}
                </div>
                {selected.price && selected.price.value > 0 ? (
                  <>
                    <div style={{ fontSize: '26px', fontWeight: 600, color: '#111', fontFamily: 'var(--font-data)', letterSpacing: '-.5px' }}>
                      {selected.price.isAsking ? <span style={{ fontSize: '14px', fontWeight: 500, color: '#888', marginRight: '5px', fontFamily: 'var(--font-display)' }}>cote</span> : null}
                      {eur(selected.price.value)}
                    </div>
                    {/* D'ou vient le nombre. Sans cette phrase, la cote tombe du ciel
                        et la decote ressemble a du jargon au lieu d'un gage de serieux. */}
                    <div style={{ fontSize: '11.5px', color: '#6E6E73', marginTop: '6px', lineHeight: 1.5 }}>
                      {selected.price.raw && selected.price.isAsking ? (
                        <>
                          Médiane de {selected.price.sellers || 0} vendeur{(selected.price.sellers || 0) > 1 ? 's' : ''}{' '}
                          <strong style={{ color: '#1D1D1F', fontFamily: 'var(--font-data)', fontWeight: 600 }}>{eur(selected.price.raw)}</strong>,
                          {' '}moins 12&nbsp;% : ce sont des prix <em>demandés</em>, pas des ventes conclues.
                        </>
                      ) : (
                        <>
                          {selected.price.sellers ? selected.price.sellers + ' vendeur' + ((selected.price.sellers || 0) > 1 ? 's' : '') + ' · ' : ''}
                          {selected.price.market === 'US' ? 'marché américain converti' : 'annonces France'}
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#AEAEB2', marginTop: '3px' }}>
                      {ageLabel(selected.price.updatedAt) ? 'Relevé ' + ageLabel(selected.price.updatedAt) : ''}
                    </div>
                    {selected.price.perBooster ? (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F', fontFamily: 'var(--font-data)' }}>{eur(selected.price.perBooster)}</span>
                        <span style={{ fontSize: '11.5px', color: '#86868B' }}>par booster · {selected.boosters} au total</span>
                      </div>
                    ) : null}
                  </>
                ) : selected.range ? (
                  <>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: '#1D1D1F', fontFamily: 'var(--font-data)', letterSpacing: '-.3px' }}>
                      {eur(selected.range.low)} — {eur(selected.range.high)}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#86868B', marginTop: '4px', lineHeight: 1.4 }}>
                      {selected.range.sellers || 0} annonce{(selected.range.sellers || 0) > 1 ? 's' : ''} relevée{(selected.range.sellers || 0) > 1 ? 's' : ''} sur {selected.range.days} jours · pas assez de vendeurs distincts pour une cote
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '14px', color: '#AAA' }}>Données insuffisantes</div>
                )}
              </div>

              )}

              {isInvestor && selected.price && selected.price.value > 0 ? (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '10px', color: '#86868B', textTransform: 'uppercase' as const, letterSpacing: '.08em', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
                    Lecture de marché
                  </div>
                  {usableLow(selected.price) ? (
                    <div className="sc-mrow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <span style={{ fontSize: '12.5px', color: '#6E6E73' }}>La moins chère en vente</span>
                      <span style={{ fontSize: '12.5px', color: '#1D1D1F', fontFamily: 'var(--font-data)' }}>
                        {eur(usableLow(selected.price) as number)}
                      </span>
                    </div>
                  ) : null}
                  <div className="sc-mrow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', animationDelay: '.05s' }}>
                    <span style={{ fontSize: '12.5px', color: '#6E6E73' }}>Liquidité</span>
                    <span style={{ fontSize: '12.5px', color: selected.price.sellers ? '#1D1D1F' : '#AAA' }}>
                      {selected.price.sellers ? (
                        <>
                          {selected.price.sellers >= 15 ? 'Élevée' : selected.price.sellers >= 6 ? 'Moyenne' : 'Faible'}
                          <span style={{ color: '#AAA', fontFamily: 'var(--font-data)', marginLeft: 5 }}>{selected.price.sellers}</span>
                        </>
                      ) : 'Non renseignée'}
                    </span>
                  </div>
                  <div className="sc-mrow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', animationDelay: '.1s' }}>
                    <span style={{ fontSize: '12.5px', color: '#6E6E73' }}>Nature du prix</span>
                    <span style={{ fontSize: '12.5px', color: '#1D1D1F', textAlign: 'right' as const }}>
                      {selected.price.basis === 'window'
                        ? 'Annonces, décotées · fenêtre ' + (selected.price.windowDays || 90) + ' j'
                        : selected.price.isAsking ? 'Annonces France, décotées' : 'Agrégat fournisseur'}
                    </span>
                  </div>
                  {!selected.price.isAsking ? (
                    <div style={{ fontSize: '11px', color: '#AAA', marginTop: '6px', lineHeight: 1.45 }}>
                      Le fournisseur publie un prix unique sans détailler le nombre de ventes
                      ni leur période. Nous l&apos;affichons tel quel, sans lui prêter une
                      précision qu&apos;il ne donne pas.
                    </div>
                  ) : null}
                  <div style={{ fontSize: '11px', color: '#AAA', marginTop: '8px', lineHeight: 1.45 }}>
                    Pas encore assez d&apos;historique pour une variation. Les écarts s&apos;afficheront à mesure que les relevés s&apos;accumulent.
                  </div>
                </div>
              ) : null}

              {asks.length > 0 ? (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '10px', color: '#86868B', textTransform: 'uppercase' as const, letterSpacing: '.08em', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
                    En vente maintenant
                  </div>
                  {asks.map((a, i) => (
                    <a key={a.url} href={a.url} target="_blank" rel="sponsored noopener noreferrer"
                      className="sc-ask"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 11px', borderRadius: '10px', textDecoration: 'none', background: i === 0 ? 'rgba(224,48,32,0.05)' : 'transparent', marginBottom: '3px', transition: 'background .16s ease' }}>
                      <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#1D1D1F', fontFamily: 'var(--font-data)', minWidth: '74px' }}>{eur(a.price)}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: '11px', color: '#86868B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.condition ? a.condition : ''}{a.condition && a.seller ? ' · ' : ''}{a.seller || ''}
                      </span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M7 17L17 7M8 7h9v9" />
                      </svg>
                    </a>
                  ))}
                  <div style={{ fontSize: '10.5px', color: '#AEAEB2', marginTop: '7px', lineHeight: 1.45 }}>
                    Annonces eBay relevées {ageLabel(asks[0]?.seenAt) || 'récemment'} · elles peuvent avoir été vendues depuis.
                    <br />
                    Liens partenaires : KodoCards perçoit une commission sur les achats, sans effet sur la cote ni sur l’ordre d’affichage.
                  </div>
                </div>
              ) : null}

              <button onClick={openModal} className="sc-cta"
                style={{ width: '100%', height: '44px', borderRadius: '10px', background: '#1D1D1F', color: '#fff', border: 'none', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Ajouter au portfolio
              </button>
            </div>
          </aside>
        ) : null}
      </div>

      <AddSealedModal open={!!sealedSeed} onClose={() => setSealedSeed(null)} product={sealedSeed} onAdd={handleSealedAdd} />
    </>
  )
}
