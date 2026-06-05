'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchCardsByIllustrator, fetchCardDetail, type TCGCard, type TCGCardFull } from '@/lib/tcgApi'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

function imgSrc(image?: string, q: 'high' | 'low' = 'low'): string | null {
  if (!image) return null
  return /\.(webp|png|jpg|jpeg)$/i.test(image) ? image : `${image}/${q}.webp`
}

// Dérive l'ère depuis le préfixe d'id TCGdex (ex: 'base1-4' -> Vintage WOTC)
const ERA_BY_PREFIX: { test: RegExp; era: string; color: string }[] = [
  { test: /^(base|jungle|fossil|neo|gym|wizards|bp|si|tk)/i, era: 'Vintage WOTC', color: '#D4AF37' },
  { test: /^(ecard|ex|np|pop)/i,                              era: 'EX',           color: '#2A82DD' },
  { test: /^(dp|pl|hgss|col|hs|ru)/i,                         era: 'DPP / HGSS',   color: '#0E9E8E' },
  { test: /^(bw|dv|mc)/i,                                     era: 'Black & White',color: '#5C6270' },
  { test: /^(xy|g1|dc)/i,                                     era: 'XY',           color: '#C44E8E' },
  { test: /^(sm|smp)/i,                                       era: 'Sun & Moon',   color: '#E07B39' },
  { test: /^(swsh|cel|me)/i,                                  era: 'Sword & Shield',color: '#4F5FC4' },
  { test: /^(sv|sve|svp|A\d|me\d|tcgp)/i,                    era: 'Scarlet & Violet', color: '#D93A3A' },
]
function eraOf(id: string): { era: string; color: string } | null {
  const prefix = id.split('-')[0]
  for (const e of ERA_BY_PREFIX) if (e.test.test(prefix)) return { era: e.era, color: e.color }
  return null
}

type MasterBio = { tagline: string; bio: string; style: string; period: string }
const MASTERS: Record<string, MasterBio> = {
  'Mitsuhiro Arita': { tagline: 'Le maître du Dracaufeu', period: '1996 — aujourd\u2019hui', style: 'Réalisme dramatique, lumière et matière',
    bio: 'Illustrateur de la toute première carte Dracaufeu du Set de Base, Mitsuhiro Arita est sans doute l\u2019artiste le plus emblématique du TCG. Son style réaliste et puissant a défini l\u2019identité visuelle des cartes vintage. Il a illustré des centaines de cartes sur près de trente ans.' },
  'Atsuko Nishida': { tagline: 'La créatrice de Pikachu', period: '1996 — 2010s', style: 'Douceur, rondeur, expressivité',
    bio: 'Character designer historique, Atsuko Nishida est à l\u2019origine du design de Pikachu et d\u2019Évoli. Ses illustrations de cartes capturent la tendresse et la personnalité des Pokémon, un style chaleureux reconnaissable entre tous.' },
  'Ken Sugimori': { tagline: 'Le directeur artistique', period: '1996 — aujourd\u2019hui', style: 'Ligne claire, canon officiel',
    bio: 'Directeur artistique de la franchise Pokémon et illustrateur principal des jeux vidéo, Ken Sugimori a aussi signé de nombreuses cartes. Son trait définit le canon visuel officiel de chaque Pokémon.' },
  'Kagemaru Himeno': { tagline: 'L\u2019artiste des ères Neo', period: '1999 — 2010s', style: 'Éthéré, onirique, mouvement',
    bio: 'Figure majeure des ères Neo et e-Card, Kagemaru Himeno est célèbre pour ses illustrations éthérées et dynamiques, notamment ses Lugia et ses cartes holographiques au style très atmosphérique.' },
  '5ban Graphics': { tagline: 'Le studio holographique', period: '2000s — 2010s', style: 'Compositions numériques, holos',
    bio: '5ban Graphics est un studio responsable de nombreuses cartes holographiques modernes, souvent des full arts et des cartes ex/EX aux compositions numériques spectaculaires.' },
  'Naoki Saito': { tagline: 'Le styliste moderne', period: '2000s — aujourd\u2019hui', style: 'Énergie, couleur, dynamisme',
    bio: 'Illustrateur prolifique de l\u2019ère moderne, Naoki Saito est connu pour ses compositions énergiques et colorées, présentes sur de nombreuses cartes populaires des séries récentes.' },
}

export default function IllustrateurPage() {
  const params = useParams()
  const router = useRouter()
  const raw = Array.isArray(params.name) ? params.name[0] : params.name
  const name = decodeURIComponent(raw ?? '')

  const [cards, setCards] = useState<TCGCard[]>([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<'FR' | 'EN'>('FR')

  // drawer carte
  const [selId, setSelId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TCGCardFull | null>(null)
  const [detLoading, setDetLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchCardsByIllustrator('FR', name)
      .then(async (fr) => { if (fr.length > 0) { setLang('FR'); return fr } setLang('EN'); return fetchCardsByIllustrator('EN', name) })
      .then((list) => { if (alive) { setCards(list); setLoading(false) } })
      .catch(() => { if (alive) { setCards([]); setLoading(false) } })
    return () => { alive = false }
  }, [name])

  async function openCard(id: string) {
    setSelId(id); setDetail(null); setDetLoading(true)
    try {
      let d = await fetchCardDetail(lang, id)
      setDetail(d)
    } catch { setDetail(null) }
    setDetLoading(false)
  }
  function closeCard() { setSelId(null); setDetail(null) }

  const withImg = cards.filter(c => c.image)

  // En-tête intelligent : ères couvertes (dérivées des ids) + bio si maître connu
  const eraMap = new Map<string, string>()
  cards.forEach(c => { const e = eraOf(c.id); if (e) eraMap.set(e.era, e.color) })
  const eras = Array.from(eraMap.entries())  // [ [era, color], ... ]
  const master = MASTERS[name] ?? null

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 90px' }}>
      <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18, background: 'transparent', border: 'none', cursor: 'pointer', color: SNOW.muted, fontSize: 13, fontFamily: FONT.body, padding: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Retour
      </button>

      <div style={{ marginBottom: 28 }}>
        <span style={{ display: 'inline-block', marginBottom: 10, padding: '5px 13px', borderRadius: RADIUS.pill, background: 'rgba(224,48,32,0.08)', border: '1px solid rgba(224,48,32,0.2)', color: '#E03020', fontSize: 10.5, fontWeight: 700, fontFamily: FONT.display, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Illustrateur{master ? ' · Maître' : ''}</span>
        <h1 style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.03em', margin: '0 0 4px', lineHeight: 1.1 }}>{name}</h1>
        {master && <p style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600, color: '#E03020', margin: '0 0 10px' }}>{master.tagline}</p>}

        {/* Stats dérivées */}
        <p style={{ fontFamily: FONT.body, fontSize: 14, color: SNOW.muted, margin: '0 0 14px' }}>
          {loading ? 'Chargement…' : `${cards.length} carte${cards.length !== 1 ? 's' : ''} illustrée${cards.length !== 1 ? 's' : ''}`}
          {!loading && master ? ` · ${master.period}` : ''}
        </p>

        {/* Bio maître */}
        {master && (
          <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)', border: `1px solid ${SNOW.border}`, borderRadius: RADIUS.lg, padding: '16px 18px', marginBottom: 16, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)', maxWidth: 680 }}>
            <p style={{ fontFamily: FONT.body, fontSize: 14, color: SNOW.inkSoft, margin: '0 0 10px', lineHeight: 1.6 }}>{master.bio}</p>
            <div style={{ fontFamily: FONT.display, fontSize: 12, color: SNOW.muted }}><strong style={{ color: SNOW.ink }}>Style :</strong> {master.style}</div>
          </div>
        )}

        {/* Ères couvertes (pills) */}
        {eras.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 600, color: SNOW.mutedLight, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2 }}>Ères :</span>
            {eras.map(([era, color]) => (
              <span key={era} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: RADIUS.pill, background: `${color}14`, border: `1px solid ${color}33`, fontSize: 11.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.body }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 4px ${color}66` }} />
                {era}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14 }}>
          {Array.from({ length: 14 }).map((_, i) => <div key={i} style={{ aspectRatio: '63/88', borderRadius: RADIUS.md, background: SNOW.surface, opacity: 0.5 }} />)}
        </div>
      ) : withImg.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: SNOW.muted, fontFamily: FONT.body, fontSize: 14, background: 'rgba(255,255,255,0.55)', borderRadius: RADIUS.lg, border: `1px solid ${SNOW.border}` }}>Aucune carte avec illustration disponible.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14 }}>
          {withImg.map((c) => {
            const src = imgSrc(c.image, 'low')
            return (
              <button key={c.id} onClick={() => openCard(c.id)} title={c.name} style={{ display: 'block', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left' }}>
                <div style={{ aspectRatio: '63/88', borderRadius: RADIUS.md, overflow: 'hidden', background: SNOW.surface, marginBottom: 7, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)', transition: 'transform .2s cubic-bezier(.2,.85,.3,1), box-shadow .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 26px rgba(0,0,0,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)' }}>
                  <img src={src ?? ''} alt={c.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { const t = e.target as HTMLImageElement; if (t.src.includes('/low.webp')) t.src = t.src.replace('/low.webp', '/high.webp'); else if (t.src.includes('/high.webp')) t.src = t.src.replace('/high.webp', '/low.png'); else { t.style.display = 'none' } }} />
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{c.name}</div>
              </button>
            )
          })}
        </div>
      )}

      {/* Drawer carte — autonome, glass v7 */}
      {selId && (
        <div onClick={closeCard} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(20,20,30,0.42)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', borderRadius: 22, border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 24px 80px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9)', padding: 22 }}>
            {detLoading || !detail ? (
              <div style={{ padding: 40, textAlign: 'center', color: SNOW.muted, fontFamily: FONT.body, fontSize: 14 }}>Chargement…</div>
            ) : (
              <>
                {imgSrc(detail.image, 'high') && (
                  <img src={imgSrc(detail.image, 'high') as string} alt={detail.name} style={{ width: '100%', borderRadius: 14, marginBottom: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                    onError={e => { const t = e.target as HTMLImageElement; if (t.src.includes('/high.webp')) t.src = t.src.replace('/high.webp', '/low.webp') }} />
                )}
                <h3 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 800, color: SNOW.ink, margin: '0 0 4px', letterSpacing: '-0.02em' }}>{detail.name}</h3>
                <p style={{ fontFamily: FONT.body, fontSize: 13, color: SNOW.muted, margin: '0 0 14px' }}>
                  {detail.set?.name}{detail.rarity ? ` · ${detail.rarity}` : ''}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {([['Catégorie', detail.category], ['Stade', detail.stage], ['PV', detail.hp ? String(detail.hp) : undefined], ['Illustrateur', detail.illustrator]] as [string, string | undefined][]).filter(([, v]) => v).map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                      <span style={{ color: SNOW.muted, fontFamily: FONT.body }}>{l}</span>
                      <span style={{ color: SNOW.ink, fontFamily: FONT.display, fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={closeCard} style={{ marginTop: 18, width: '100%', height: 42, borderRadius: 12, background: SNOW.ink, color: '#fff', border: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: FONT.display, cursor: 'pointer' }}>Fermer</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
