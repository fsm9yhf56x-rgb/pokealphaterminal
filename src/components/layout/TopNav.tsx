'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from '@/lib/constants/navigation'

export function TopNav() {
  const pathname = usePathname()
  return (
    <>
      <style>{`
        .topnav-link:hover { background: #F5F5F5 !important; color: #111 !important; }
        .topnav-avatar:hover { opacity: 0.85; }
      `}</style>
      <div style={{
        height: '52px',
        background: '#fff',
        borderBottom: '1px solid #EBEBEB',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '4px',
        width: '100%',
      }}>

        {/* LOGO */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '15px',
          fontWeight: 600,
          color: '#111',
          letterSpacing: '-0.3px',
          marginRight: '24px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 32%, #B8E8FF, #2A82DD)',
            border: '2.5px solid #fff',
            boxShadow: '0 0 0 1.5px #D8EEFF, 0 2px 6px rgba(42,130,220,0.2)',
            flexShrink: 0,
          }} />
          Poké<span style={{ color: '#E03020' }}>Alpha</span>
        </div>

        {/* NAV ITEMS */}
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="topnav-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '9px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: active ? 500 : 400,
                fontFamily: 'var(--font-display)',
                color: active ? '#E03020' : '#666',
                background: active ? '#FFF0EE' : 'transparent',
                border: active ? '1px solid #FFD8D0' : '1px solid transparent',
                transition: 'all 0.12s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
              {item.premium && (
                <span style={{
                  fontSize: '9px', fontWeight: 600,
                  background: '#111', color: '#fff',
                  padding: '2px 5px', borderRadius: '4px',
                  letterSpacing: '0.04em',
                }}>PRO</span>
              )}
            </Link>
          )
        })}

        <div style={{ flex: 1 }} />

        {/* ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{
            fontSize: '11px', fontWeight: 500,
            background: '#FFF0EE', color: '#E03020',
            border: '1px solid #FFD8D0',
            padding: '4px 11px', borderRadius: '20px',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.02em',
          }}>
            Pro ✦
          </div>
          <div
            className="topnav-avatar"
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFB8C8, #FF7090)',
              border: '2px solid #fff',
              boxShadow: '0 0 0 1.5px #FFD0DC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 600, color: '#fff',
              cursor: 'pointer', transition: 'opacity 0.15s',
            }}
          >
            A
          </div>
        </div>
      </div>
    </>
  )
}
