'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNav } from '@/lib/useNav'
import type { SoonInfo } from '@/lib/constants/navigation'
import UserMenu from './UserMenu'
import { MobileNav } from './MobileNav'
import { SoonModal, SoonBadge } from '@/components/ui/snow'
import { BrandMark } from '@/components/brand/BrandMark'

/**
 * TopNav v12 — magnetic glass + wordmark typographique.
 * Logo = lockup typo "Kodo" (lourd) + "CARDS" (capitales espacees rouge),
 * sans mark. Indicateur glass qui GLISSE (suit le survol, se cale sur la
 * route active) ; .knav-items en overflow visible -> plus d'ombre carree.
 */
export function TopNav() {
  const NAV = useNav()
  const pathname = usePathname()
  const [soonModal, setSoonModal] = useState<SoonInfo | null>(null)

  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const first = useRef(true)
  const [ind, setInd] = useState<{ left: number; width: number; opacity: number; instant: boolean }>({ left: 0, width: 0, opacity: 0, instant: true })

  const activeIndex = NAV.findIndex(item =>
    pathname.startsWith(item.href) ||
    item.children?.some(c => pathname === c.href || pathname.startsWith(c.href + '/'))
  )

  const moveTo = useCallback((idx: number) => {
    const el = itemRefs.current[idx]
    if (!el) { setInd(s => ({ ...s, opacity: 0 })); return }
    setInd({ left: el.offsetLeft, width: el.offsetWidth, opacity: 1, instant: first.current })
    if (first.current) first.current = false
  }, [])

  useEffect(() => { moveTo(activeIndex) }, [activeIndex, NAV.length, moveTo])
  useEffect(() => {
    const onR = () => moveTo(activeIndex)
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [activeIndex, moveTo])

  return (
    <>
      <style>{`
        .knav-items {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          min-width: 0;
          position: relative;
          overflow: visible;
        }

        .knav-ind {
          position: absolute;
          top: 0; bottom: 0; left: 0;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.82) 100%);
          backdrop-filter: blur(22px) saturate(200%);
          -webkit-backdrop-filter: blur(22px) saturate(200%);
          border: 0.5px solid rgba(255,255,255,0.95);
          box-shadow: 0 6px 18px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1);
          pointer-events: none;
          z-index: 0;
          will-change: transform, width;
        }

        .knav-link {
          font-size: 14.5px;
          font-weight: 600;
          color: #5A5A5E;
          text-decoration: none;
          padding: 9px 18px;
          font-family: var(--font-sora, 'Sora', sans-serif);
          letter-spacing: -0.018em;
          transition: color .22s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          position: relative;
          z-index: 1;
          background: none;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .knav-link:hover { color: #1D1D1F; }
        .knav-link.act { color: #1D1D1F; font-weight: 700; }

        .knav-pro {
          font-size: 8.5px;
          font-weight: 700;
          background: #F5F5F7;
          color: #6E6E73;
          border: 1px solid #E5E5EA;
          padding: 2px 6px;
          border-radius: 5px;
          letter-spacing: 0.04em;
          font-family: var(--font-sora, 'Sora', sans-serif);
        }
        .knav-pro--premium {
          background: rgba(224,48,32,0.08);
          color: #E03020;
          border-color: rgba(224,48,32,0.20);
        }

        /* Wordmark "KodoCards" — Teko 700 italique, plus presente. */
        .knav-word { display: inline-flex; align-items: baseline; }
        .knav-word-kodo {
          font-family: var(--font-shonen, 'Sora', sans-serif);
          font-weight: 700; font-style: italic; font-size: 31px; color: #1D1D1F;
          letter-spacing: 0; line-height: 1;
        }
        .knav-word-cards {
          font-family: var(--font-shonen, 'Sora', sans-serif);
          font-weight: 700; font-style: italic; font-size: 31px; color: #E03020;
          letter-spacing: 0; line-height: 1;
        }

        /* Signature sous le wordmark */
        .knav-lockup { display: inline-flex; flex-direction: column; align-items: flex-start; gap: 3px; }
        .knav-sig {
          display: flex; align-items: center; gap: 6px;
          font-family: var(--font-sora, 'Sora', sans-serif);
          font-size: 8px; font-weight: 600; letter-spacing: 0.24em;
          text-transform: uppercase; color: #86868B; line-height: 1; white-space: nowrap;
          padding-left: 2px;
        }
        .knav-sig-dot { color: #C7C7CC; font-weight: 700; }
        .knav-sig-jp { font-family: 'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif; color: #E03020; font-size: 10px; letter-spacing: 0.06em; }
        @media (max-width: 1023px) { .knav-sig { display: none !important; } }


        @media (max-width: 1023px) {
          .knav-bar { padding-inline: 14px !important; }
          .knav-items { display: none !important; }
          /* Logo centre en absolu : burger a gauche, CTA a droite, marque au milieu */
          .knav-logo {
            position: absolute !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            margin: 0 !important;
          }
          .knav-usermenu { margin-left: auto !important; flex-shrink: 0; }
        }
        /* < 768 : on garde "Kodo" seul */
        @media (max-width: 767px) {
          .knav-word-cards { display: none !important; }
        }
      `}</style>

      <nav className="knav-bar" style={{
        height: 58,
        display: 'flex',
        alignItems: 'center',
        paddingInline: 24,
        gap: 4,
        position: 'relative' as const,
        flexShrink: 0,
      }}>
        <MobileNav />

        {/* Logo — wordmark typographique */}
        <Link href="/home" className="knav-logo" style={{
          display: 'flex', alignItems: 'center',
          textDecoration: 'none', marginRight: 28, flexShrink: 0,
          padding: '6px 10px',
          borderRadius: 12,
          transition: 'background .2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.035)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '' }}
        >
          <BrandMark size={28} inline signature mark={false} />
        </Link>

        {/* Nav items + indicateur glissant */}
        <div className="knav-items" onMouseLeave={() => moveTo(activeIndex)}>
          <div className="knav-ind" aria-hidden style={{
            transform: `translateX(${ind.left}px)`,
            width: ind.width,
            opacity: ind.opacity,
            transition: ind.instant ? 'none' : 'transform .36s cubic-bezier(.34,1.4,.4,1), width .36s cubic-bezier(.34,1.4,.4,1), opacity .25s ease',
          }} />

          {NAV.map((item, i) => {
            const isActive = i === activeIndex

            // SOON item: click ouvre modal (preventDefault)
            if (item.soon) {
              return (
                <a
                  key={item.href}
                  ref={el => { itemRefs.current[i] = el }}
                  href="#"
                  onMouseEnter={() => moveTo(i)}
                  onClick={(e) => { e.preventDefault(); setSoonModal(item.soon!) }}
                  className="knav-link"
                >
                  {item.label}
                  <SoonBadge version={item.soon.version} variant="inline" />
                </a>
              )
            }

            return (
              <Link
                key={item.href}
                ref={el => { itemRefs.current[i] = el }}
                href={item.href ?? item.children?.[0]?.href ?? '#'}
                onMouseEnter={() => moveTo(i)}
                className={`knav-link${isActive ? ' act' : ''}`}
              >
                {item.label}
                {item.tier && !item.soon && <span className={`knav-pro${item.tier === 'premium' ? ' knav-pro--premium' : ''}`}>{item.tier === 'premium' ? 'PREMIUM' : 'PRO'}</span>}
              </Link>
            )
          })}
        </div>

        <span className="knav-usermenu"><UserMenu /></span>
      </nav>

      {/* SoonModal */}
      {soonModal && (
        <SoonModal
          open={!!soonModal}
          onClose={() => setSoonModal(null)}
          feature={soonModal.feature}
          version={soonModal.version}
          description={soonModal.description}
          bullets={soonModal.bullets}
          brevoListId={Number(process.env.NEXT_PUBLIC_BREVO_WAITLIST_V2_LIST_ID) || 3}
        />
      )}
    </>
  )
}
