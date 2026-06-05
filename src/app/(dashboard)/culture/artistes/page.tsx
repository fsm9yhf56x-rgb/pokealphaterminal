'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { fetchIllustrators } from '@/lib/tcgApi'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

// Vedettes : noms vérifiés présents dans /illustrators + carte emblème TCGdex.
const FEATURED = [
  { name: 'Mitsuhiro Arita',  card: 'https://assets.tcgdex.net/fr/base/base1/4',   bio: 'Le maître du Dracaufeu. Signature du Set de Base.' },
  { name: 'Atsuko Nishida',   card: 'https://assets.tcgdex.net/fr/base/base1/58',  bio: 'Créatrice du design de Pikachu et d’Évoli.' },
  { name: 'Ken Sugimori',     card: 'https://assets.tcgdex.net/fr/base/base1/15',  bio: 'Directeur artistique historique de la licence.' },
  { name: 'Kagemaru Himeno',  card: 'https://assets.tcgdex.net/fr/neo/neo1/9',     bio: 'Style éthéré, figure des ères Neo.' },
  { name: '5ban Graphics',    card: 'https://assets.tcgdex.net/fr/ex/ex3/100',     bio: 'Studio des cartes holographiques modernes.' },
]

function imgSrc(u: string) { return /\.(webp|png|jpg)$/i.test(u) ? u : `${u}/low.webp` }

export default function ArtistesPage() {
  const router = useRouter()
  const [all, setAll] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)

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

  function go(name: string) { router.push('/cartes/illustrateur/' + encodeURIComponent(name)) }

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {FEATURED.map(a => (
          <button key={a.name} onClick={() => go(a.name)} style={{ display: 'block', textAlign: 'left', padding: 14, borderRadius: RADIUS.lg, cursor: 'pointer', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)', border: `1px solid ${SNOW.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)', transition: 'transform .2s cubic-bezier(.2,.85,.3,1), box-shadow .2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(0,0,0,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
            <div style={{ aspectRatio: '63/88', borderRadius: RADIUS.md, overflow: 'hidden', background: SNOW.surface, marginBottom: 12, border: '1px solid rgba(0,0,0,0.05)' }}>
              <img src={imgSrc(a.card)} alt={a.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { const t = e.target as HTMLImageElement; if (t.src.includes('/low.webp')) t.src = t.src.replace('/low.webp', '/high.webp'); else t.style.display = 'none' }} />
            </div>
            <div style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: SNOW.ink, marginBottom: 4, letterSpacing: '-0.01em' }}>{a.name}</div>
            <div style={{ fontFamily: FONT.body, fontSize: 12.5, color: SNOW.muted, lineHeight: 1.45 }}>{a.bio}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
