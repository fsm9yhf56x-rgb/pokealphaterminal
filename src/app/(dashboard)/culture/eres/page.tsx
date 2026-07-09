'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'
import { usePortfolio } from '@/lib/usePortfolio'
import { deriveEra } from '@/components/features/portfolio/allocation/Allocation'

const GOLD = '#D4AF37'

const ERAS = [
  { name: 'Vintage WOTC',     color: '#D4AF37', years: '1999 – 2003', tag: 'Les origines',                   card: 'https://assets.tcgdex.net/fr/base/base1/4',
    desc: 'L\'âge d\'or. Set de Base, Jungle, Fossile, Neo, Team Rocket — édités par Wizards of the Coast. Le berceau des cartes les plus convoitées, dont le Dracaufeu holographique.' },
  { name: 'EX',               color: '#2A82DD', years: '2003 – 2007', tag: 'Reprise par Nintendo',           card: 'https://assets.tcgdex.net/fr/ex/ex3/100',
    desc: 'Nintendo reprend la licence. Apparition des cartes EX, des holos pleines et des séries Delta Species. Une ère de transition graphique et de mécaniques nouvelles.' },
  { name: 'DPP / HGSS',       color: '#0E9E8E', years: '2007 – 2011', tag: 'Diamant, Perle & Or HeartGold',  card: 'https://assets.tcgdex.net/fr/pl/pl1/5',
    desc: 'Diamond & Pearl, Platinum, puis HeartGold SoulSilver. Les cartes LV.X et les Prime marquent l\'époque. Un style plus détaillé et mature.' },
  { name: 'Black & White',    color: '#5C6270', years: '2011 – 2013', tag: 'Génération Unys',       card: 'https://assets.tcgdex.net/fr/bw/bw9/39',
    desc: 'Refonte complète du design des cartes (bordures, layout). Introduction des Full Art et des Secret Rares qui deviendront un pilier de la collection moderne.' },
  { name: 'XY',               color: '#C44E8E', years: '2013 – 2016', tag: 'Kalos & Méga-Évolutions', card: 'https://assets.tcgdex.net/fr/xy/xy12/11',
    desc: 'Les Méga-EX et les cartes texturées. XY Évolutions ravive le design vintage. Une ère charnière, très prisée pour ses Full Art et ses Secrets.' },
  { name: 'Sun & Moon',       color: '#E07B39', years: '2017 – 2019', tag: 'Alola & cartes GX',              card: 'https://assets.tcgdex.net/fr/sm/sm9/33',
    desc: 'Les GX, les Rainbow Rares et les Tag Team. Explosion des cartes arc-en-ciel et des alternatives art. Hidden Fates et son éclat holographique culte.' },
  { name: 'Sword & Shield',   color: '#4F5FC4', years: '2019 – 2022', tag: 'Galar & cartes V / VMAX',        card: 'https://assets.tcgdex.net/fr/swsh/swsh8/113',
    desc: 'L\'ère des V, VMAX et VSTAR. Les Alternate Arts deviennent l\'objet de toutes les convoitises. Evolving Skies et Charizard atteignent des sommets.' },
  { name: 'Scarlet & Violet', color: '#D93A3A', years: '2023 – aujourd\'hui', tag: 'Paldea & ère moderne', card: 'https://assets.tcgdex.net/fr/sv/sv03.5/200',
    desc: 'Les ex, les Illustration Rares et Special Illustration Rares. 151 ravive la nostalgie Kanto. L\'ère actuelle, hyper dynamique et spéculative.' },
]

function EraRow({ era, index, ownedCount }: { era: typeof ERAS[number]; index: number; ownedCount: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  const owned = ownedCount > 0
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { threshold: 0.15 })
    io.observe(el); return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 18, opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(22px)', transition: `opacity .5s ease ${index * 70}ms, transform .55s cubic-bezier(.2,.85,.3,1) ${index * 70}ms` }}>
      <div style={{ position: 'absolute', left: -30, top: 22, width: 16, height: 16, borderRadius: '50%', background: '#fff', border: `3px solid ${owned ? GOLD : era.color}`, boxShadow: owned ? `0 0 0 4px ${GOLD}33` : `0 0 0 4px ${era.color}22` }} />
      <div
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 14px 34px ${(owned ? GOLD : era.color)}22, inset 0 1px 0 rgba(255,255,255,0.85)` }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = owned ? `0 0 0 1px ${GOLD}55, inset 0 1px 0 rgba(255,255,255,0.85)` : 'inset 0 1px 0 rgba(255,255,255,0.85)' }}
        style={{ display: 'flex', gap: 18, alignItems: 'stretch', background: `linear-gradient(135deg, ${era.color}14, rgba(255,255,255,0.6))`, backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)', border: `1px solid ${owned ? GOLD + '88' : era.color + '33'}`, borderRadius: RADIUS.lg, padding: '18px 20px', boxShadow: owned ? `0 0 0 1px ${GOLD}55, inset 0 1px 0 rgba(255,255,255,0.85)` : 'inset 0 1px 0 rgba(255,255,255,0.85)', transition: 'transform .2s cubic-bezier(.2,.85,.3,1), box-shadow .2s' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: FONT.display, fontSize: 19, fontWeight: 800, color: SNOW.ink, margin: 0, letterSpacing: '-0.02em' }}>{era.name}</h3>
            <span style={{ fontFamily: 'var(--font-data, "Space Mono", monospace)', fontSize: 12, fontWeight: 600, color: era.color }}>{era.years}</span>
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 12, fontWeight: 600, color: era.color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85 }}>{era.tag}</div>
          <p style={{ fontFamily: FONT.body, fontSize: 13.5, color: SNOW.muted, margin: 0, lineHeight: 1.55 }}>{era.desc}</p>
          {owned && (
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: RADIUS.pill, background: `${GOLD}1A`, border: `1px solid ${GOLD}55` }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12l4.5 4.5L19 7" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontFamily: FONT.display, fontSize: 12, fontWeight: 700, color: '#9A7B14' }}>
                {ownedCount} carte{ownedCount > 1 ? 's' : ''} dans ta collection
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EresPage() {
  const { cards: owned } = usePortfolio()

  const countByEra = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of owned ?? []) {
      const era = deriveEra((c as any).set_name ?? null)
      m[era] = (m[era] ?? 0) + 1
    }
    return m
  }, [owned])

  const erasOwned = ERAS.filter(e => (countByEra[e.name] ?? 0) > 0).length

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '8px 20px 90px' }}>
      <span style={{ display: 'inline-block', marginBottom: 12, padding: '5px 13px', borderRadius: RADIUS.pill, background: 'rgba(224,48,32,0.08)', border: '1px solid rgba(224,48,32,0.2)', color: '#E03020', fontSize: 10.5, fontWeight: 700, fontFamily: FONT.display, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Culture · Ères</span>
      <h1 style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1 }}>Les ères du TCG Pokémon</h1>
      <p style={{ fontFamily: FONT.body, fontSize: 14.5, color: SNOW.muted, margin: '0 0 20px', maxWidth: '60ch', lineHeight: 1.55 }}>
        Vingt-cinq ans d\'histoire en cartes. Des holos Wizards aux Illustration Rares modernes, chaque ère a forgé son style, ses raretés et ses légendes.
      </p>

      {erasOwned > 0 && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 36, padding: '9px 16px', borderRadius: RADIUS.pill, background: `linear-gradient(135deg, ${GOLD}1A, rgba(255,255,255,0.55))`, border: `1px solid ${GOLD}55`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 2l2.6 6.4L21 9l-5 4.3L17.6 20 12 16.5 6.4 20 8 13.3 3 9l6.4-.6L12 2z" fill={GOLD} opacity="0.9" />
          </svg>
          <span style={{ fontFamily: FONT.display, fontSize: 13.5, fontWeight: 700, color: '#9A7B14' }}>
            Ta collection traverse {erasOwned} ère{erasOwned > 1 ? 's' : ''} sur 8
          </span>
        </div>
      )}

      <div style={{ position: 'relative', paddingLeft: 30 }}>
        <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: 'linear-gradient(180deg, #D4AF37, #2A82DD, #0E9E8E, #C44E8E, #E07B39, #4F5FC4, #D93A3A)', borderRadius: 2, opacity: 0.4 }} />
        {ERAS.map((era, i) => <EraRow key={era.name} era={era} index={i} ownedCount={countByEra[era.name] ?? 0} />)}
      </div>
    </div>
  )
}
