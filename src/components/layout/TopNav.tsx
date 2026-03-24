'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from '@/lib/constants/navigation'

export function TopNav() {
  const pathname = usePathname()

  return (
    <div style={{
      height: '44px',
      background: '#fff',
      borderBottom: '1px solid #EBEBEB',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '20px',
      paddingRight: '20px',
      gap: '4px',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '13px',
        fontWeight: 600,
        color: '#111',
        letterSpacing: '-0.2px',
        marginRight: '20px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        {/* Lens Pokédex */}
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 32%, #B8E8FF, #2A82DD)',
          border: '2px solid #fff',
          boxShadow: '0 0 0 1.5px #D8EEFF',
          flexShrink: 0,
        }} />
        Poké<span style={{ color: '#E03020' }}>Alpha</span>
      </div>

      {/* Nav items */}
      {NAV.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: active ? 500 : 400,
              fontFamily: 'var(--font-display)',
              color: active ? '#E03020' : '#888',
              background: active ? '#FFF0EE' : 'transparent',
              border: active ? '1px solid #FFD8D0' : '1px solid transparent',
              transition: 'all 0.12s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '11px' }}>{item.icon}</span>
            {item.label}
            {item.premium && (
              <span style={{
                fontSize: '8px', fontWeight: 600,
                background: '#111', color: '#fff',
                padding: '1px 4px', borderRadius: '3px',
                letterSpacing: '0.04em',
              }}>
                PRO
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
