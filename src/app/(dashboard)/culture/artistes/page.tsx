'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { fetchIllustrators, fetchCardsByIllustrator } from '@/lib/tcgApi'
import { usePortfolio } from '@/lib/usePortfolio'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'
import { useIsMobile } from '@/lib/useIsMobile'

// Vedettes : noms vérifiés présents dans /illustrators + carte emblème TCGdex.
const FEATURED = [
  { name: 'Mitsuhiro Arita',  card: 'https://assets.tcgdex.net/fr/base/base1/4',   bio: 'Le maître du Dracaufeu. Signature du Set de Base.' },
  { name: 'Atsuko Nishida',   card: 'https://assets.tcgdex.net/fr/base/base1/58',  bio: 'Créatrice du design de Pikachu et d’Évoli.' },
  { name: 'Ken Sugimori',     card: 'https://assets.tcgdex.net/fr/base/base1/15',  bio: 'Directeur artistique historique de la licence.' },
  { name: 'Kagemaru Himeno',  card: 'https://assets.tcgdex.net/fr/neo/neo1/9',     bio: 'Style éthéré, figure des ères Neo.' },
  { name: '5ban Graphics',    card: 'https://assets.tcgdex.net/fr/ex/ex3/100',     bio: 'Studio des cartes holographiques modernes.' },
]

function imgSrc(u: string) { return /\.(webp|png|jpg)$/i.test(u) ? u : `${u}/low.webp` }

const GOLD = '#D4AF37'

export default function ArtistesPage() {
  const isMobile = useIsMobile()
  const router = useRouter()
  const [all, setAll] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const [letter, setLetter] = useState<string>('Tous')

  // Cartes possedees -> set de cles "set|num" (meme normalisation que la fiche [name]).
  const { cards: owned } = usePortfolio()
  const ownedKeys = useMemo(() => new Set(
    (owned ?? []).map((c: any) =>
      `${String(c.set_id ?? '').replace(/^jp-/, '').replace(/^en-/, '').toLowerCase().trim()}|${String(c.card_number ?? '').replace(/^0+/, '').toLowerCase().trim()}`
    )
  ), [owned])

  // Pour chaque vedette : combien de ses cartes tu possedes (chargement parallele, tolerant).
  const [ownedByArtist, setOwnedByArtist] = useState<Record<string, number>>({})
  useEffect(() => {
    if (ownedKeys.size === 0) { setOwnedByArtist({}); return }
    let alive = true
    Promise.all(
      FEATURED.map(async (a) => {
        let list = await fetchCardsByIllustrator('FR', a.name).catch(() => [])
        if (list.length === 0) list = await fetchCardsByIllustrator('EN', a.name).catch(() => [])
        const count = list.filter((c) => {
          const dash = c.id.lastIndexOf('-')
          if (dash < 0) return false
          const setPart = c.id.slice(0, dash).replace(/^jp-/, '').replace(/^en-/, '').toLowerCase().trim()
          const numPart = c.id.slice(dash + 1).replace(/^0+/, '').toLowerCase().trim()
          return ownedKeys.has(`${setPart}|${numPart}`)
        }).length
        return [a.name, count] as const
      })
    ).then((pairs) => { if (alive) setOwnedByArtist(Object.fromEntries(pairs)) })
    return () => { alive = false }
  }, [ownedKeys])

  useEffect(() => {
    fetchIllustrators('FR').then(setAll).catch(() => setAll([]))
  }, [])

  // Noms grand public à proposer d'office (présents dans /illustrators)
  const POPULAR = [
    'Mitsuhiro Arita', 'Atsuko Nishida', 'Ken Sugimori', 'Kagemaru Himeno',
    '5ban Graphics', 'Naoki Saito', 'Mitsuhiro Arita', 'Tomokazu Komiya',
  ]
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length === 0) {
      // à vide : on propose les populaires connus présents dans la liste
      const seen = new Set<string>()
      return POPULAR.filter(n => all.includes(n) && !seen.has(n) && seen.add(n)).slice(0, 8)
    }
    if (s.length < 2) return []
    return all.filter(n => n.toLowerCase().includes(s)).slice(0, 8)
  }, [q, all])

  // Lettres reellement presentes (premiere lettre du nom, A-Z, sinon "#").
  const letters = useMemo(() => {
    const set = new Set<string>()
    for (const n of all) {
      const ch = (n.trim()[0] || '').toUpperCase()
      set.add(/[A-Z]/.test(ch) ? ch : '#')
    }
    return Array.from(set).sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
  }, [all])

  // Liste filtree par lettre active.
  const filteredAll = useMemo(() => {
    if (letter === 'Tous') return all
    return all.filter((n) => {
      const ch = (n.trim()[0] || '').toUpperCase()
      const bucket = /[A-Z]/.test(ch) ? ch : '#'
      return bucket === letter
    })
  }, [all, letter])

  function go(name: string) { router.push('/culture/artistes/' + encodeURIComponent(name)) }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '8px 20px 90px' }}>
      <span style={{ display: 'inline-block', marginBottom: 12, padding: '5px 13px', borderRadius: RADIUS.pill, background: 'rgba(224,48,32,0.08)', border: '1px solid rgba(224,48,32,0.2)', color: '#E03020', fontSize: 10.5, fontWeight: 700, fontFamily: FONT.display, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Culture · Artistes</span>
      <h1 style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1 }}>Les artistes derrière les cartes</h1>
      <p style={{ fontFamily: FONT.body, fontSize: 14.5, color: SNOW.muted, margin: '0 0 28px', maxWidth: '60ch', lineHeight: 1.55 }}>
        Chaque carte est une œuvre. Explore les illustrateurs qui ont façonné l’univers Pokémon, des maîtres du vintage aux studios modernes.
      </p>

      {/* Recherche avec autocomplétion */}
      <div style={{ position: 'relative', marginBottom: 36, maxWidth: 460 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Rechercher un illustrateur…"
          style={{ width: '100%', boxSizing: 'border-box', height: 48, padding: '0 18px', borderRadius: RADIUS.pill, border: `1px solid ${SNOW.border}`, fontSize: 15, color: SNOW.ink, fontFamily: FONT.body, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px) saturate(180%)', WebkitBackdropFilter: 'blur(12px) saturate(180%)', outline: 'none', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)' }}
        />
        {focused && matches.length > 0 && (
          <div style={{ position: 'absolute', top: 54, left: 0, right: 0, zIndex: 10, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px) saturate(180%)', WebkitBackdropFilter: 'blur(30px) saturate(180%)', borderRadius: RADIUS.lg, border: `1px solid ${SNOW.border}`, boxShadow: '0 18px 50px rgba(0,0,0,0.14)', overflow: 'hidden' }}>
            {q.trim().length === 0 && (
              <div style={{ padding: '10px 18px 6px', fontSize: 10.5, fontWeight: 600, color: SNOW.mutedLight, fontFamily: FONT.display, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Suggestions</div>
            )}
            {matches.map(n => (
              <button key={n} onClick={() => go(n)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: SNOW.ink, fontFamily: FONT.body }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {n}
              </button>
            ))}
          </div>
        )}
        {all.length > 0 && (
          <p style={{ fontFamily: FONT.body, fontSize: 12, color: SNOW.mutedLight, margin: '8px 4px 0' }}>{all.length} illustrateurs référencés</p>
        )}
      </div>

      {/* Vedettes */}
      <h2 style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: SNOW.ink, margin: '0 0 16px', letterSpacing: '-0.01em' }}>Les maîtres</h2>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: isMobile ? 10 : 14 }}>
        {FEATURED.map(a => {
          const ownedN = ownedByArtist[a.name] ?? 0
          const has = ownedN > 0
          return (
          <button key={a.name} onClick={() => go(a.name)} style={{ display: 'block', textAlign: 'left', padding: 14, borderRadius: RADIUS.lg, cursor: 'pointer', background: has ? `linear-gradient(160deg, ${GOLD}1A, rgba(255,255,255,0.6))` : 'rgba(255,255,255,0.6)', backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)', border: `1px solid ${has ? GOLD + '88' : SNOW.border}`, boxShadow: has ? `0 0 0 1px ${GOLD}44, inset 0 1px 0 rgba(255,255,255,0.9)` : '0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)', transition: 'transform .2s cubic-bezier(.2,.85,.3,1), box-shadow .2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = has ? `0 14px 36px ${GOLD}33, 0 0 0 1px ${GOLD}44` : '0 14px 36px rgba(0,0,0,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = has ? `0 0 0 1px ${GOLD}44, inset 0 1px 0 rgba(255,255,255,0.9)` : '0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
            <div style={{ aspectRatio: '63/88', borderRadius: RADIUS.md, overflow: 'hidden', background: SNOW.surface, marginBottom: 12, border: '1px solid rgba(0,0,0,0.05)' }}>
              <img src={imgSrc(a.card)} alt={a.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { const t = e.target as HTMLImageElement; if (t.src.includes('/low.webp')) t.src = t.src.replace('/low.webp', '/high.webp'); else t.style.display = 'none' }} />
            </div>
            <div style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: SNOW.ink, marginBottom: 4, letterSpacing: '-0.01em' }}>{a.name}</div>
            <div style={{ fontFamily: FONT.body, fontSize: 12.5, color: SNOW.muted, lineHeight: 1.45 }}>{a.bio}</div>
            {has && (
              <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: RADIUS.pill, background: `${GOLD}1F`, border: `1px solid ${GOLD}55` }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 12l4.5 4.5L19 7" stroke={GOLD} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 700, color: '#9A7B14' }}>{ownedN} dans ta collection</span>
              </div>
            )}
          </button>
          )
        })}
      </div>

      {/* Tous les illustrateurs */}
      <h2 style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: SNOW.ink, margin: '40px 0 14px', letterSpacing: '-0.01em' }}>
        Tous les illustrateurs <span style={{ color: SNOW.mutedLight, fontWeight: 600 }}>· {filteredAll.length}{letter !== 'Tous' ? ` en ${letter}` : ''}</span>
      </h2>
      {/* Barre alphabetique */}
      {all.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {['Tous', ...letters].map((L) => {
            const active = letter === L
            return (
              <button key={L} onClick={() => setLetter(L)}
                style={{
                  minWidth: L === 'Tous' ? 'auto' : 30, height: 30, padding: L === 'Tous' ? '0 12px' : '0 8px',
                  borderRadius: RADIUS.pill, cursor: 'pointer',
                  fontFamily: FONT.display, fontSize: 12.5, fontWeight: 700,
                  color: active ? '#fff' : SNOW.muted,
                  background: active ? '#E03020' : 'rgba(255,255,255,0.55)',
                  border: `1px solid ${active ? '#E03020' : SNOW.border}`,
                  boxShadow: active ? '0 2px 8px rgba(224,48,32,0.28)' : 'inset 0 1px 0 rgba(255,255,255,0.85)',
                  transition: 'all .15s ease',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.85)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.55)' }}>
                {L}
              </button>
            )
          })}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 140 : 180}px, 1fr))`, gap: 10 }}>
        {filteredAll.map(n => (
          <button key={n} onClick={() => go(n)} title={`Voir les cartes de ${n}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left',
              padding: '11px 14px', borderRadius: RADIUS.md, cursor: 'pointer',
              background: '#F7F7F9',
              border: `1px solid ${SNOW.border}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
              transition: 'transform .15s ease, box-shadow .15s ease, background .15s ease',
              contentVisibility: 'auto' as any,
              containIntrinsicSize: '46px' as any,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.background = '#F7F7F9'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.85)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E03020', flexShrink: 0, opacity: 0.55 }} />
            <span style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 500, color: SNOW.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
