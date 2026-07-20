'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Barre de progression "gel" Snow+ v7.
 * - track glass translucide + hairline
 * - remplissage liquide (degrade vertical clair->sature) de la couleur passee
 * - menisque (reflet de surface) en haut du niveau
 * - a 100% (master set) : or mat trophee, pas de metal brillant
 * - anime le remplissage en width, respecte prefers-reduced-motion
 */
export function LiquidProgress({
  pct,
  color = '#E03020',
  complete = false,
  height = 10,
}: {
  pct: number
  color?: string
  complete?: boolean
  height?: number
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  const [w, setW] = useState(clamped)
  const reduce = useRef(false)
  const didMountRef = useRef(false)

  useEffect(() => {
    reduce.current = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // 1er rendu : w est deja initialise a clamped (pas d'animation parasite au
    // remontage, ex. quand on masque/revele la valeur -> le header re-render).
    if (!didMountRef.current) { didMountRef.current = true; setW(clamped); return }
    if (reduce.current) { setW(clamped); return }
    const t = setTimeout(() => setW(clamped), 60)
    return () => clearTimeout(t)
  }, [clamped])

  const fillBase = color
  const fillTop = hexLighten(color, 0.32)

  return (
    <div style={{
      position: 'relative',
      height,
      borderRadius: 99,
      background: 'rgba(0,0,0,0.05)',
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06), inset 0 0 0 0.5px rgba(255,255,255,0.6)',
      overflow: 'hidden',
    }}>
      <style>{lpKeyframes}</style>
      {complete ? (
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 99, overflow: 'hidden',
          boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.6), 0 2px 16px rgba(150,120,230,0.38), 0 0 0 1px rgba(190,170,255,0.28)',
        }}>
          {/* 1. base foil : arc-en-ciel qui ondule lentement */}
          <div className="lp-foil" style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(110deg, #ff9ec4, #9ec4ff, #9efbd6, #fff0a8, #d49eff, #ff9ec4)',
            backgroundSize: '320% 100%',
            opacity: 0.95,
          }} />
          {/* 2. trame de facettes : structure cristalline qui glisse a contre-sens */}
          <div className="lp-facets" style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(60deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0.18) 3px, rgba(255,255,255,0) 7px, rgba(120,90,180,0.10) 11px, rgba(255,255,255,0) 15px)',
            backgroundSize: '60px 100%',
            mixBlendMode: 'overlay',
          }} />
          {/* 3. grain scintillant : fins eclats ponctuels (reverse holo) */}
          <div className="lp-sparkle" style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle at 18% 40%, rgba(255,255,255,0.9) 0.5px, transparent 1.5px), radial-gradient(circle at 62% 70%, rgba(255,255,255,0.8) 0.5px, transparent 1.5px), radial-gradient(circle at 84% 30%, rgba(255,255,255,0.85) 0.5px, transparent 1.5px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.7) 0.5px, transparent 1.5px)',
            backgroundSize: '100% 100%',
          }} />
          {/* voile profondeur */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.26), rgba(255,255,255,0.03) 45%, rgba(0,0,0,0.06))' }} />
          {/* 4. eclat prisme franc qui traverse */}
          <div className="lp-prism" style={{
            position: 'absolute', top: 0, bottom: 0, width: '45%',
            background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.95), rgba(225,238,255,0.5), transparent)',
          }} />
          {/* menisque brillant */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(3, height * 0.32), background: 'linear-gradient(180deg, rgba(255,255,255,0.72), transparent)' }} />
          {/* mention integree */}
          {height >= 18 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(55,35,90,0.9)"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.5 6.8L12 17l-6 3.9 1.5-6.8L2.3 9.5l6.9-.6z"/></svg>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.16em', color: 'rgba(50,32,82,0.92)', fontFamily: 'var(--font-display)', textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>MASTER SET COMPLET</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          position: 'absolute', inset: 0, width: w + '%',
          borderRadius: 99,
          background: 'linear-gradient(180deg, ' + hexA(fillTop, 0.95) + ' 0%, ' + hexA(fillBase, 0.92) + ' 55%, ' + hexA(fillBase, 1) + ' 100%)',
          boxShadow: 'inset 0 -2px 4px ' + hexA(fillBase, 0.5) + ', 0 0 8px ' + hexA(fillBase, 0.18),
          transition: 'width 1s cubic-bezier(.16,1,.3,1)',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(2, height * 0.28), borderRadius: 99, background: 'linear-gradient(180deg, rgba(255,255,255,0.55), transparent)' }} />
        </div>
      )}
    </div>
  )
}

const lpKeyframes = `
  @keyframes lpFoilShift { 0%{background-position:0% 50%} 100%{background-position:300% 50%} }
  @keyframes lpFacets { 0%{background-position:0 0} 100%{background-position:-120px 0} }
  @keyframes lpSparkle { 0%,100%{opacity:.25} 50%{opacity:.9} }
  @keyframes lpPrismSweep { 0%{left:-45%;opacity:0} 12%{opacity:1} 24%{opacity:0} 100%{left:115%;opacity:0} }
  .lp-foil { animation: lpFoilShift 9s linear infinite; }
  .lp-facets { animation: lpFacets 6s linear infinite; }
  .lp-sparkle { animation: lpSparkle 3.2s ease-in-out infinite; }
  .lp-prism { animation: lpPrismSweep 6s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .lp-foil, .lp-facets, .lp-sparkle, .lp-prism { animation: none; }
    .lp-prism { display: none; }
  }
`

function clampByte(n: number) { return Math.max(0, Math.min(255, Math.round(n))) }
function parseHex(c: string): [number, number, number] {
  let h = c.replace('#', '')
  if (h.length === 3) h = h.split('').map(x => x + x).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function hexA(c: string, a: number): string {
  if (!c.startsWith('#')) return c
  const [r, g, b] = parseHex(c)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
}
function hexLighten(c: string, amt: number): string {
  if (!c.startsWith('#')) return c
  const [r, g, b] = parseHex(c)
  return 'rgb(' + clampByte(r + (255 - r) * amt) + ',' + clampByte(g + (255 - g) * amt) + ',' + clampByte(b + (255 - b) * amt) + ')'
}
