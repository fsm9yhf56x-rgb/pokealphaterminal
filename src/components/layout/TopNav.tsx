'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useNav } from '@/lib/useNav'
import type { SoonInfo } from '@/lib/constants/navigation'
import UserMenu from './UserMenu'
import { MobileNav } from './MobileNav'
import { SoonModal, SoonBadge } from '@/components/ui/snow'

/**
 * TopNav v7 - glassmorphism premium aligne SpotDrawer.
 * Items SOON: badge inline + click ouvre SoonModal (preventDefault navigation).
 */
export function TopNav() {
  const NAV = useNav()
  const pathname = usePathname()
  const [soonModal, setSoonModal] = useState<SoonInfo | null>(null)

  return (
    <>
      <style>{`
        .knav-link {
          font-size: 13px;
          font-weight: 500;
          color: #6E6E73;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 999px;
          border: 0.5px solid transparent;
          font-family: var(--font-sora, \'Sora\', sans-serif);
          letter-spacing: -0.01em;
          transition: all .2s cubic-bezier(.2,.8,.2,1);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          position: relative;
        }
        .knav-link:hover {
          background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.4) 100%);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          border-color: rgba(255,255,255,0.6);
          color: #1D1D1F;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9);
        }
        .knav-link.act {
          background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 100%);
          color: #1D1D1F;
          font-weight: 600;
          border-color: rgba(255,255,255,0.6);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          box-shadow: 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95);
        }
        
        .knav-pro {
          font-size: 8.5px;
          font-weight: 800;
          background: linear-gradient(135deg, #C9A84C, #FFE08A);
          color: #5C4200;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.05em;
          font-family: var(--font-sora, \'Sora\', sans-serif);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 2px rgba(184,142,59,0.18);
        }
        @keyframes knavPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes blink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        /* Responsive — nav items scrollables horizontalement < 1024 */
        .knav-items {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          min-width: 0;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .knav-items::-webkit-scrollbar { display: none; }
        .knav-link { white-space: nowrap; flex-shrink: 0; }
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
          .knav-tile { display: none !important; }
        }
        /* < 768 : wordmark compacte */
        @media (max-width: 767px) {
          .knav-wordmark-cards { display: none !important; }
        }
      `}</style>

      <nav className="knav-bar" style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        paddingInline: 24,
        gap: 4,
        position: 'relative' as const,
        flexShrink: 0,
      }}>
        <MobileNav />
        {/* Logo */}
        <Link href="/home" className="knav-logo" style={{
          display: 'flex', alignItems: 'center', gap: 9,
          textDecoration: 'none', marginRight: 18, flexShrink: 0,
          padding: '5px 10px 5px 5px',
          borderRadius: 12,
          transition: 'background .2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '' }}
        >
          <div className="knav-tile" style={{
            width: 30, height: 30, borderRadius: 9,
            background: '#1D1D1F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 13.5,
            boxShadow: '0 2px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.14)',
            position: 'relative' as const,
            letterSpacing: '-0.02em',
          }}>K
            <span aria-hidden style={{
              position: 'absolute', top: -2, right: -2,
              width: 6, height: 6, borderRadius: '50%',
              background: '#2E9E6A',
              boxShadow: '0 0 6px rgba(46,158,106,0.7)',
              animation: 'knavPulse 2.4s ease-in-out infinite',
            }} />
          </div>
          <span style={{
            fontSize: 15, fontWeight: 700,
            color: '#1D1D1F',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            letterSpacing: '-0.025em',
          }}>Kodo<span className="knav-wordmark-cards" style={{ color: '#C42E1F' }}> Cards</span></span>
        </Link>

        {/* Nav items */}
        <div className="knav-items">
        {NAV.map(item => {
          const isActive = pathname.startsWith(item.href) ||
            item.children?.some(c => pathname === c.href || pathname.startsWith(c.href + '/'))

          // SOON item: click ouvre modal (preventDefault)
          if (item.soon) {
            return (
              <a
                key={item.href}
                href="#"
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
              href={item.href ?? item.children?.[0]?.href ?? '#'}
              className={`knav-link${isActive ? ' act' : ''}`}
            >
              {item.label}
              {item.pro && <span className="knav-pro">PRO</span>}
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
