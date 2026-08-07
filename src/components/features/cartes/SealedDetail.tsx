'use client'
// SealedDetail — la fiche d'un produit scelle, extraite de Scelles.tsx.
//
// Elle ne connait plus rien de la liste : ni facettes, ni filtres, ni langue
// courante. Elle recoit UN produit et se debrouille. Deux appelants :
//   - Scelles.tsx, en panneau lateral (variant="panel", avec onClose)
//   - /cartes/scelles/[id], en page autonome (variant="page")
//
// REGLES D'AFFICHAGE (miroir des singles) :
//   - prix FR = annonces eBay FR decotees -> "des X EUR", jamais "X EUR"
//   - nombre de vendeurs affiche : c'est ce qui rend le prix credible
//   - pas de cote -> "Donnees insuffisantes", JAMAIS 0 EUR
//   - vignette : packshot officiel, sinon logo de serie, sinon typo. Jamais une
//     photo d'annonce (la couche donnees les filtre deja).
//
// LE PRIX AFFICHE VIENT DES ANNONCES EN COURS, pas de sealed_prices.
// sealed_prices conserve la derniere cote calculee — utile pour valoriser un
// portefeuille (sinon la valeur clignote des qu'un vendeur retire son annonce),
// FAUX pour une fiche produit : Eclipse Cosmique affichait 1848 EUR releve la
// veille au-dessus d'une liste dont la seule annonce etait a 5490.
// Ce qui est affiche en grand doit etre cliquable dans la liste juste dessous.

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { AddSealedModal, type SealedSeed } from '@/components/features/card/AddSealedModal'
import { buildSealedDbRow, buildSealedLocalRow } from '@/lib/sealed-portfolio'
import AuthModal from '@/components/layout/AuthModal'
import type { SealedItem } from '@/lib/sealed/catalog'

export type Ask = { url: string; price: number; seller: string | null; condition: string | null; seenAt: string | null }

const flag = (l: string) =>
  l === 'FR' ? String.fromCodePoint(127467, 127479) : String.fromCodePoint(127482, 127480)

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n >= 100 ? 0 : 2 }).format(n)

/** age d'un releve, en clair : un prix sans date est un prix qu'on ne peut pas juger */
export function ageLabel(iso: string | null): string | null {
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

export function Visual({ item, h, small }: { item: SealedItem; h: string; small?: boolean }) {
  const [broken, setBroken] = useState(false)
  // TCGplayer sert un placeholder "Image Coming Soon" pour les produits non
  // photographies : ce n'est pas une illustration, on tombe sur le logo de serie.
  const isPlaceholder = !!item.image && /coming.?soon|placeholder|no.?image|blank/i.test(item.image)
  const packshot = !broken && item.image && !isPlaceholder ? item.image : null
  const logo = !packshot && item.setLogo ? item.setLogo : null
  return (
    <div className="sc-visual" style={{ height: h, background: packshot ? '#fff' : 'rgba(0,0,0,0.025)', position: 'relative' as const, overflow: 'hidden' as const, borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {packshot ? (
        <img src={packshot} alt="" onError={() => setBroken(true)} className="sc-img-in"
          style={{ maxWidth: '92%', maxHeight: '92%', objectFit: 'contain' as const }} />
      ) : logo ? (
        <img src={logo} alt="" onError={() => setBroken(true)} className="sc-img-in"
          style={{ maxWidth: '62%', maxHeight: '46%', objectFit: 'contain' as const, opacity: 0.9 }} />
      ) : (
        <span style={{ fontSize: small ? '9px' : '11px', color: '#C7C7CC', fontFamily: 'var(--font-display)', letterSpacing: '.08em', textTransform: 'uppercase' as const }}>
          {item.skuLabel}
        </span>
      )}
    </div>
  )
}

export default function SealedDetail({
  item,
  variant = 'panel',
  onClose,
  initialAsks,
}: {
  item: SealedItem
  variant?: 'panel' | 'page'
  onClose?: () => void
  /** Annonces pre-chargees cote serveur : evite un aller-retour et rend le prix
   *  visible dans le HTML initial, donc lisible par Google. */
  initialAsks?: Ask[]
}) {
  const { user } = useAuth()
  const [asks, setAsks] = useState<Ask[]>(initialAsks ?? [])
  const [sealedSeed, setSealedSeed] = useState<SealedSeed | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (initialAsks) return
    let alive = true
    fetch('/api/v1/sealed/asks?p=' + encodeURIComponent(item.id) + '&limit=6', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => { if (alive) setAsks(Array.isArray(d.asks) ? d.asks : []) })
      .catch(() => { if (alive) setAsks([]) })
    return () => { alive = false }
  }, [item.id, initialAsks])

  const prixLive = asks.length > 0 ? Math.min(...asks.map((a) => a.price)) : (item.price?.value ?? null)
  const parBoosterLive = prixLive != null && item.boosters ? prixLive / item.boosters : null

  const openModal = useCallback(() => {
    // Un visiteur qui arrive par un lien partage n'a pas de compte : lui ouvrir
    // le formulaire d'ajout mene a une impasse (l'insert echoue silencieusement
    // et la ligne part dans localStorage). On propose la creation de compte.
    if (!user) { setAuthOpen(true); return }
    setSealedSeed({
      name: item.name, set_name: item.setName, set_id: item.setId,
      card_type: item.sku, lang: item.lang,
      year: 0, image_url: item.image || item.setLogo,
    })
  }, [item, user])

  const handleSealedAdd = async (payload: Record<string, unknown>) => {
    const id = crypto.randomUUID()
    const name = String(payload.name ?? 'Produit')
    const set_name = payload.set_name ? String(payload.set_name) : ''
    const set_id = payload.set_id ? String(payload.set_id) : undefined
    const card_type = String(payload.card_type ?? '')
    const image_url = payload.image_url ? String(payload.image_url) : undefined
    const qty = Number(payload.qty ?? 1) || 1
    const buy_price = payload.buy_price != null ? (Number(payload.buy_price) || 0) : null
    const current_price = item.price?.value ?? null
    const itemLang = String(payload.lang ?? item.lang)
    const seed = { name, set_name, set_id: set_id ?? null, card_type, lang: itemLang, image_url: image_url ?? null }
    const opts = { qty, buyPrice: buy_price, currentPrice: current_price }

    if (user) {
      const { data, error } = await supabase.from('portfolio_cards')
        .insert(buildSealedDbRow(seed, opts, { id, userId: user.id })).select()
      if (error) { console.error('[KC SEALED] insert failed:', error); return null }
      const row = data && data[0] ? data[0] : null
      return row ?? { id }
    }
    try {
      const prev = JSON.parse(localStorage.getItem('portfolio') || '[]')
      prev.push(buildSealedLocalRow(seed, opts, { id }))
      localStorage.setItem('portfolio', JSON.stringify(prev))
    } catch { }
    return { id }
  }

  const isPage = variant === 'page'

  return (
    <>
      <aside className="sc-panel" style={isPage ? {
        width: '100%', maxWidth: '520px', background: '#fff',
        border: '1px solid rgba(0,0,0,0.05)', borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)', overflow: 'hidden' as const,
      } : {
        width: '420px', flexShrink: 0, position: 'sticky' as const, top: '16px',
        background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
        overflow: 'hidden' as const, animation: 'scFadeIn .2s ease-out',
      }}>
        {isPage ? null : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '10px', color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.1em', fontFamily: 'var(--font-display)' }}>Aperçu</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#AAA', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0 }}>{String.fromCharCode(215)}</button>
          </div>
        )}

        <div style={{ padding: '16px' }}>
          <div style={{ borderRadius: '10px', overflow: 'hidden' as const, border: '1px solid rgba(0,0,0,0.05)', marginBottom: '14px' }}>
            <Visual item={item} h={isPage ? '300px' : '220px'} />
          </div>

          <div style={{ fontSize: '10px', color: '#86868B', textTransform: 'uppercase' as const, letterSpacing: '.08em', fontFamily: 'var(--font-display)', marginBottom: '3px' }}>
            {flag(item.lang === 'EN' ? 'EN' : 'FR')} {item.setName || ''}
          </div>
          {/* En page autonome le titre du produit EST le titre de la page : h1.
              En panneau il reste un h2 sous le h1 du catalogue. */}
          {isPage ? (
            <h1 style={{ fontSize: '25px', fontWeight: 600, color: '#111', fontFamily: 'var(--font-display)', margin: '0 0 6px', lineHeight: 1.2, letterSpacing: '-.01em' }}>
              {item.shortName || item.name}
              {item.setName ? (
                <span style={{ color: '#6E6E73', fontWeight: 500 }}> — {item.setName}</span>
              ) : null}
            </h1>
          ) : (
            <h2 style={{ fontSize: '19px', fontWeight: 600, color: '#111', fontFamily: 'var(--font-display)', margin: '0 0 6px', lineHeight: 1.25 }}>
              {item.shortName || item.name}
            </h2>
          )}
          <div style={{ fontSize: '12px', color: '#86868B', marginBottom: '12px' }}>
            {item.skuLabel}{item.content ? ' · ' + item.content.label : ''}
          </div>

          {/* Le bloc prix n'est PLUS conditionne a la persona. Sur une page
              publique et indexable, masquer le prix au visiteur par defaut
              revient a servir a Google une fiche produit sans prix — et a
              perdre la seule chose qui retient quelqu'un venu d'une recherche. */}
          <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '10px', padding: '13px 14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', color: '#86868B', textTransform: 'uppercase' as const, letterSpacing: '.08em', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
              {item.price?.basis === 'window' ? 'Annonces sur 90 jours'
                : item.price?.isAsking ? 'Annonces en cours' : 'Prix de marché'}
            </div>
            {item.price && item.price.value > 0 ? (
              <>
                <div style={{ fontSize: '26px', fontWeight: 600, color: '#111', fontFamily: 'var(--font-data)', letterSpacing: '-.5px' }}>
                  {item.price.isAsking ? <span style={{ fontSize: '14px', fontWeight: 500, color: '#888', marginRight: '5px', fontFamily: 'var(--font-display)' }}>dès</span> : null}
                  {eur(prixLive ?? item.price.value)}
                </div>
                {/* D'ou vient le nombre. Sans cette phrase, la cote tombe du ciel
                    et la decote ressemble a du jargon au lieu d'un gage de serieux. */}
                <div style={{ fontSize: '11.5px', color: '#6E6E73', marginTop: '6px', lineHeight: 1.5 }}>
                  {item.price.isAsking ? (
                    <>
                      {(item.price.sampleSize || 0) >= 3 ? (<>
                        La <strong style={{ color: '#1D1D1F', fontWeight: 600 }}>moins chère</strong> des{' '}
                        {item.price.sampleSize}&nbsp;annonces en cours en France. C&apos;est un prix demandé, pas une vente conclue.
                      </>) : (<>
                        Dernier relevé fiable : le marché n&apos;a plus assez d&apos;annonces distinctes aujourd&apos;hui pour recalculer.
                      </>)}
                    </>
                  ) : (
                    <>
                      {item.price.sellers ? item.price.sellers + ' vendeur' + ((item.price.sellers || 0) > 1 ? 's' : '') + ' · ' : ''}
                      {item.price.market === 'US' ? 'marché américain converti' : 'annonces France'}
                    </>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#AEAEB2', marginTop: '3px' }}>
                  {ageLabel(item.price.updatedAt) ? 'Relevé ' + ageLabel(item.price.updatedAt) : ''}
                </div>
                {(parBoosterLive ?? item.price.perBooster) ? (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F', fontFamily: 'var(--font-data)' }}>{eur((parBoosterLive ?? item.price.perBooster) as number)}</span>
                    <span style={{ fontSize: '11.5px', color: '#86868B' }}>par booster · {item.boosters} au total</span>
                  </div>
                ) : null}
              </>
            ) : item.range ? (
              <>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#1D1D1F', fontFamily: 'var(--font-data)', letterSpacing: '-.3px' }}>
                  {eur(item.range.low)} — {eur(item.range.high)}
                </div>
                <div style={{ fontSize: '11.5px', color: '#86868B', marginTop: '4px', lineHeight: 1.4 }}>
                  {item.range.sellers || 0} annonce{(item.range.sellers || 0) > 1 ? 's' : ''} relevée{(item.range.sellers || 0) > 1 ? 's' : ''} sur {item.range.days} jours · pas assez de vendeurs distincts pour une cote
                </div>
              </>
            ) : (
              <div style={{ fontSize: '14px', color: '#AAA' }}>Données insuffisantes</div>
            )}
          </div>

          {asks.length > 0 ? (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', color: '#86868B', textTransform: 'uppercase' as const, letterSpacing: '.08em', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
                En vente maintenant
              </div>
              {asks.map((a, i) => (
                <a key={a.url} href={a.url} target="_blank" rel="sponsored noopener noreferrer"
                  className="sc-ask"
                  onMouseEnter={(e) => { e.currentTarget.style.background = i === 0 ? 'rgba(224,48,32,0.09)' : 'rgba(0,0,0,0.04)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = i === 0 ? 'rgba(224,48,32,0.05)' : 'transparent' }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 11px', borderRadius: '10px', textDecoration: 'none', background: i === 0 ? 'rgba(224,48,32,0.05)' : 'transparent', marginBottom: '3px', transition: 'background .16s ease' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#1D1D1F', fontFamily: 'var(--font-data)', minWidth: '74px' }}>{eur(a.price)}</span>
                  {/* La condition eBay n'est PAS affichee : depuis la liste blanche
                      toute annonce retenue est scellee — et 'Non gradee' est une
                      condition de CARTE, absurde sur un display. */}
                  <span style={{ flex: 1, minWidth: 0, fontSize: '11px', color: '#86868B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i === 0 ? <span style={{ color: '#E03020', fontWeight: 600 }}>Le moins cher</span> : (a.seller || '')}
                  </span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M7 17L17 7M8 7h9v9" />
                  </svg>
                </a>
              ))}
              <div style={{ fontSize: '10.5px', color: '#AEAEB2', marginTop: '8px', paddingTop: '7px', borderTop: '1px solid rgba(0,0,0,0.045)' }}>
                Relevé {ageLabel(asks[0]?.seenAt) || 'récemment'} sur eBay · peut avoir été vendu depuis
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginTop: '7px', padding: '7px 9px', borderRadius: '8px', background: 'rgba(0,0,0,0.025)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                  <circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" />
                </svg>
                <span style={{ fontSize: '10.5px', color: '#86868B', lineHeight: 1.45 }}>
                  <strong style={{ color: '#6E6E73', fontWeight: 600 }}>Liens partenaires.</strong>{' '}
                  Une commission nous est versée sur les achats. Elle n&rsquo;influence ni la cote, ni l&rsquo;ordre d&rsquo;affichage — les annonces sont triées du prix le plus bas.
                </span>
              </div>
            </div>
          ) : null}

          <button onClick={openModal} className="sc-cta"
            style={{ width: '100%', height: '44px', borderRadius: '10px', background: '#1D1D1F', color: '#fff', border: 'none', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> {user ? 'Ajouter au portfolio' : 'Suivre ce produit'}
          </button>
        </div>
      </aside>

      <AddSealedModal open={!!sealedSeed} onClose={() => setSealedSeed(null)} product={sealedSeed} onAdd={handleSealedAdd} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultMode="signup" />
    </>
  )
}
