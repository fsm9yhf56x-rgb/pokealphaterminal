'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { useNav } from '@/lib/useNav'
import type { SoonInfo } from '@/lib/constants/navigation'
import { SoonModal, SoonBadge } from '@/components/ui/snow'

export function SubMenu() {
  const NAV = useNav()
  const pathname = usePathname()
  const [open] = useState(true)
  const [soonModal, setSoonModal] = useState<SoonInfo | null>(null)

  const section = NAV.find(n => pathname.startsWith(n.href) && n.href !== '/')
    ?? NAV.find(n => n.children?.some(c => pathname === c.href || pathname.startsWith(c.href + '/')))

  if (!section?.children?.length) return null

  return (
    <>
      <style>{`
        .ksub-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          border-radius: 999px;
          border: 0.5px solid transparent;
          font-size: 13px;
          font-weight: 500;
          color: #6E6E73;
          font-family: var(--font-sora, \'Sora\', sans-serif);
          letter-spacing: -0.01em;
          text-decoration: none;
          transition: all .2s cubic-bezier(.2,.8,.2,1);
          cursor: pointer;
          position: relative;
        }
        .ksub-link:hover {
          background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.4) 100%);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          border-color: rgba(255,255,255,0.6);
          color: #1D1D1F;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9);
        }
        .ksub-link.act {
          background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 100%);
          color: #1D1D1F;
          font-weight: 600;
          border-color: rgba(255,255,255,0.6);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          box-shadow: 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95);
        }
        
        .ksub-pro {
          font-size: 8.5px;
          font-weight: 800;
          background: linear-gradient(135deg, #C9A84C, #FFE08A);
          color: #5C4200;
          padding: 1px 6px;
          border-radius: 4px;
          font-family: var(--font-sora, \'Sora\', sans-serif);
          margin-left: auto;
          letter-spacing: 0.05em;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
        }

        /* Responsive — sidebar 220px -> bandeau horizontal scrollable < 1024 */
        @media (max-width: 1023px) {
          .ksub-aside {
            width: 100% !important;
            min-width: 0 !important;
            padding: 10px 12px !important;
            border-right: none !important;
            border-bottom: 0.5px solid rgba(255,255,255,0.55) !important;
            box-shadow: inset 0 -1px 0 rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.7) !important;
          }
          .ksub-section { display: none !important; }
          .ksub-list {
            flex-direction: row !important;
            overflow-x: auto;
            overflow-y: hidden;
            gap: 6px !important;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 2px;
          }
          .ksub-list::-webkit-scrollbar { display: none; }
          .ksub-link { white-space: nowrap; flex-shrink: 0; }
          /* Fade à droite : indice visuel que les onglets scrollent (swipe) */
          .ksub-list {
            -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 48px), transparent 100%);
            mask-image: linear-gradient(to right, #000 calc(100% - 48px), transparent 100%);
            padding-right: 8px;
          }
        }
      `}</style>

      <aside className="ksub-aside" style={{
        width: open ? 220 : 0,
        minWidth: open ? 220 : 0,
        padding: open ? '24px 12px' : 0,
        overflow: 'hidden',
        transition: 'all .3s cubic-bezier(.2,.8,.2,1)',
        flexShrink: 0,
        position: 'relative' as const,
        zIndex: 1,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.4) 100%)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderRight: '0.5px solid rgba(255,255,255,0.55)',
        boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.02), inset 1px 0 0 rgba(255,255,255,0.7)',
      }}>
        {open && (
          <>
            <div className="ksub-section" style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#AEAEB2',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.16em',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
              padding: '0 14px 4px',
              marginBottom: 10,
            }}>{section.label}</div>

            <div className="ksub-list" style={{ display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
              {section.children.map(child => {
                const isActive = pathname === child.href ||
                  (child.href !== section.href && pathname.startsWith(child.href + '/'))

                if (child.soon) {
                  return (
                    <a
                      key={child.href}
                      href="#"
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
                    href={child.href}
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
