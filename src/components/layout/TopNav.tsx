'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from '@/lib/constants/navigation'
import UserMenu from './UserMenu'

/**
 * TopNav v7 - glassmorphism premium aligne SpotDrawer.
 *
 * - Background transparent (le wrapper AppShell gere le glass)
 * - Items glass v7: hover = pill subtle, active = pill rouge tinted
 * - Logo avec petit dot pulse rouge (signature Kodo Cards)
 * - Badge PRO refractif
 */
export function TopNav() {
  const pathname = usePathname()
  return (
    <>
      <style>{`
        .knav-link {
          font-size: 13px;
          font-weight: 500;
          color: #6E6E73;
          text-decoration: none;
          padding: 7px 14px;
          border-radius: 10px;
          font-family: var(--font-sora, \'Sora\', sans-serif);
          letter-spacing: -0.01em;
          transition: all .2s cubic-bezier(.2,.8,.2,1);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          position: relative;
        }
        .knav-link:hover {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(12px) saturate(180%);
          -webkit-backdrop-filter: blur(12px) saturate(180%);
          color: #1D1D1F;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.85);
        }
        .knav-link.act {
          background: rgba(224,48,32,0.08);
          color: #E03020;
          font-weight: 600;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
        }
        .knav-link.act::after {
          content: \'\';
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #E03020;
          box-shadow: 0 0 6px rgba(224,48,32,0.6);
        }
        .knav-pro {
          font-size: 8.5px;
          font-weight: 800;
          background: linear-gradient(135deg, #E03020, #FF6644);
          color: #fff;
          padding: 2px 5px;
          border-radius: 4px;
          letter-spacing: 0.05em;
          font-family: var(--font-sora, \'Sora\', sans-serif);
          box-shadow: 0 1px 2px rgba(224,48,32,0.35), inset 0 1px 0 rgba(255,255,255,0.25);
        }
        @keyframes knavPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
      <nav style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        paddingInline: 24,
        gap: 4,
        position: 'relative' as const,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <Link href="/home" style={{
          display: 'flex', alignItems: 'center', gap: 9,
          textDecoration: 'none', marginRight: 18, flexShrink: 0,
          padding: '5px 10px 5px 5px',
          borderRadius: 12,
          transition: 'background .2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '' }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'linear-gradient(135deg,#E03020,#FF6644)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 13.5,
            boxShadow: '0 2px 6px rgba(224,48,32,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
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
          }}>Kodo<span style={{ color: '#E03020' }}> Cards</span></span>
        </Link>

        {/* Nav items */}
        {NAV.map(item => {
          const isActive = pathname.startsWith(item.href) ||
            item.children?.some(c => pathname === c.href || pathname.startsWith(c.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.children?.[0]?.href ?? item.href}
              className={`knav-link${isActive ? ' act' : ''}`}
            >
              {item.label}
              {item.pro && <span className="knav-pro">PRO</span>}
            </Link>
          )
        })}

        <div style={{ flex: 1 }} />
        <UserMenu />
      </nav>
    </>
  )
}
