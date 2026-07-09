'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNav } from '@/lib/useNav'
import type { SoonInfo } from '@/lib/constants/navigation'
import { SoonModal, SoonBadge } from '@/components/ui/snow'

/**
 * SubMenu v6 — magnetic glass vertical, aere.
 * aside en overflow visible (ne se replie jamais) -> l'ombre de la pill n'est
 * plus rognee (fini les bords carres). Mobile : indicateur masque, fallback glass.
 */
export function SubMenu() {
  const NAV = useNav()
  const pathname = usePathname()
  const [open] = useState(true)
  const [soonModal, setSoonModal] = useState<SoonInfo | null>(null)

  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const first = useRef(true)
  const [ind, setInd] = useState<{ top: number; height: number; opacity: number; instant: boolean }>({ top: 0, height: 0, opacity: 0, instant: true })

  const section = NAV.find(n => pathname.startsWith(n.href) && n.href !== '/')
    ?? NAV.find(n => n.children?.some(c => pathname === c.href || pathname.startsWith(c.href + '/')))

  const children = section?.children ?? []
  const activeIndex = children.findIndex(child =>
    pathname === child.href || (child.href !== section?.href && pathname.startsWith(child.href + '/'))
  )

  const moveTo = useCallback((idx: number) => {
    const el = itemRefs.current[idx]
    if (!el) { setInd(s => ({ ...s, opacity: 0 })); return }
    setInd({ top: el.offsetTop, height: el.offsetHeight, opacity: 1, instant: first.current })
    if (first.current) first.current = false
  }, [])

  useEffect(() => { moveTo(activeIndex) }, [activeIndex, children.length, moveTo])
  useEffect(() => {
    const onR = () => moveTo(activeIndex)
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [activeIndex, moveTo])

  if (!section?.children?.length) return null

  return (
    <>
      <style>{`
        .ksub-list { position: relative; }

        .ksub-ind {
          position: absolute;
          left: 0; right: 0; top: 0;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.82) 100%);
          backdrop-filter: blur(22px) saturate(200%);
          -webkit-backdrop-filter: blur(22px) saturate(200%);
          border: 0.5px solid rgba(255,255,255,0.95);
          box-shadow: 0 6px 18px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1);
          pointer-events: none;
          z-index: 0;
          will-change: transform, height;
        }

        .ksub-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 16px;
          border-radius: 999px;
          font-size: 13.5px;
          font-weight: 600;
          color: #5A5A5E;
          font-family: var(--font-sora, 'Sora', sans-serif);
          letter-spacing: -0.018em;
          text-decoration: none;
          transition: color .22s ease;
          cursor: pointer;
          position: relative;
          z-index: 1;
          border: none;
          background: none;
        }
        .ksub-link:hover { color: #1D1D1F; }
        .ksub-link.act { color: #1D1D1F; font-weight: 700; }

        .ksub-pro {
          font-size: 8.5px;
          font-weight: 700;
          background: #F5F5F7;
          color: #6E6E73;
          border: 1px solid #E5E5EA;
          padding: 1px 6px;
          border-radius: 5px;
          font-family: var(--font-sora, 'Sora', sans-serif);
          margin-left: auto;
          letter-spacing: 0.04em;
        }
        .ksub-pro--premium {
          background: rgba(224,48,32,0.08);
          color: #E03020;
          border-color: rgba(224,48,32,0.20);
        }

        /* Responsive — sidebar -> bandeau horizontal scrollable < 1024 */
        @media (max-width: 1023px) {
          .ksub-aside {
            width: 100% !important;
            min-width: 0 !important;
            padding: 10px 12px !important;
            border-right: none !important;
            border-bottom: 0.5px solid rgba(0,0,0,0.06) !important;
            box-shadow: none !important;
            overflow: hidden !important;
          }
          .ksub-section { display: none !important; }
          .ksub-ind { display: none !important; }
          .ksub-list {
            flex-direction: row !important;
            overflow-x: auto;
            overflow-y: hidden;
            gap: 6px !important;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 2px;
            -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 48px), transparent 100%);
            mask-image: linear-gradient(to right, #000 calc(100% - 48px), transparent 100%);
            padding-right: 8px;
          }
          .ksub-list::-webkit-scrollbar { display: none; }
          .ksub-link { white-space: nowrap; flex-shrink: 0; }
          /* Fallback glass mobile (pas d'indicateur glissant en bandeau) */
          .ksub-link.act {
            background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.78));
            border: 0.5px solid rgba(255,255,255,0.9);
            box-shadow: 0 4px 14px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95);
          }
        }

        /* Desktop : la sidebar remplit au moins la hauteur de la zone contenu
           (viewport - header), pour descendre jusqu'au footer meme quand la page est courte. */
        @media (min-width: 1024px) {
          .ksub-aside { min-height: calc(100vh - 58px); }
        }
      `}</style>

      <aside className="ksub-aside" style={{
        width: open ? 236 : 0,
        minWidth: open ? 236 : 0,
        alignSelf: 'stretch' as const,
        padding: open ? '30px 14px' : 0,
        overflow: 'visible',
        transition: 'all .3s cubic-bezier(.2,.8,.2,1)',
        flexShrink: 0,
        position: 'relative' as const,
        zIndex: 1,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.4) 100%)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderRight: '0.5px solid rgba(0,0,0,0.05)',
      }}>
        {open && (
          <>
            <div className="ksub-section" style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: '#6E6E73',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.15em',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
              padding: '0 16px 4px',
              marginBottom: 16,
            }}>{section.label}</div>

            <div className="ksub-list" onMouseLeave={() => moveTo(activeIndex)} style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
              <div className="ksub-ind" aria-hidden style={{
                transform: `translateY(${ind.top}px)`,
                height: ind.height,
                opacity: ind.opacity,
                transition: ind.instant ? 'none' : 'transform .34s cubic-bezier(.34,1.4,.4,1), height .34s cubic-bezier(.34,1.4,.4,1), opacity .25s ease',
              }} />

              {children.map((child, i) => {
                const isActive = i === activeIndex

                if (child.soon) {
                  return (
                    <a
                      key={child.href}
                      ref={el => { itemRefs.current[i] = el }}
                      href="#"
                      onMouseEnter={() => moveTo(i)}
                      onClick={(e) => { e.preventDefault(); setSoonModal(child.soon!) }}
                      className="ksub-link"
                    >
                      {child.label}
                      <SoonBadge version={child.soon.version} variant="inline" style={{ marginLeft: 'auto' }} />
                    </a>
                  )
                }

                return (
                  <Link
                    key={child.href}
                    ref={el => { itemRefs.current[i] = el }}
                    href={child.href}
                    onMouseEnter={() => moveTo(i)}
                    className={`ksub-link${isActive ? ' act' : ''}`}
                  >
                    {child.label}
                    {child.tier && !child.soon && <span className={`ksub-pro${child.tier === 'premium' ? ' ksub-pro--premium' : ''}`}>{child.tier === 'premium' ? 'PREMIUM' : 'PRO'}</span>}
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </aside>

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
