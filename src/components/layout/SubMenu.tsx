'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { NAV } from '@/lib/constants/navigation'

export function SubMenu() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const activeSection = NAV.find(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  if (!activeSection || activeSection.sub.length <= 1) return null

  return (
    <>
      <style>{`
        .sub-link:hover { background: #F5F5F5 !important; color: #111 !important; }
        .sub-toggle:hover { border-color: #D4D4D4 !important; background: #F8F8F8 !important; }
        @media(max-width:768px) { .submenu-aside { display:none !important; } }
      `}</style>

      <aside
        className="submenu-aside"
        style={{
          width: collapsed ? '44px' : '220px',
          minHeight: '100%',
          background: '#fff',
          borderRight: '1px solid #EBEBEB',
          flexShrink: 0,
          transition: 'width 0.22s ease',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* TOGGLE */}
        <button
          className="sub-toggle"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Ouvrir le menu' : 'Réduire'}
          style={{
            position: 'absolute',
            top: '14px',
            right: '10px',
            width: '24px', height: '24px',
            borderRadius: '7px',
            border: '1px solid #EBEBEB',
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#888',
            zIndex: 2,
            transition: 'all 0.15s',
            fontFamily: 'var(--font-display)',
            lineHeight: 1,
          }}
        >
          {collapsed ? '›' : '‹'}
        </button>

        {/* CONTENT */}
        <div style={{
          opacity: collapsed ? 0 : 1,
          transition: 'opacity 0.15s ease',
          pointerEvents: collapsed ? 'none' : 'auto',
          padding: '14px 10px',
          paddingTop: '52px',
        }}>

          {/* SECTION LABEL */}
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#BBBBBB',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-display)',
            padding: '0 10px 12px',
            whiteSpace: 'nowrap' as const,
          }}>
            {activeSection.label}
          </div>

          {/* LINKS */}
          {activeSection.sub.map(sub => {
            const active = pathname === sub.href
            return (
              <Link
                key={sub.href}
                href={sub.href}
                className="sub-link"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  marginBottom: '2px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: active ? 500 : 400,
                  fontFamily: 'var(--font-display)',
                  color: active ? '#E03020' : '#444',
                  background: active ? '#FFF0EE' : 'transparent',
                  whiteSpace: 'nowrap' as const,
                  transition: 'all 0.1s ease',
                  borderLeft: active ? '2.5px solid #E03020' : '2.5px solid transparent',
                  paddingLeft: active ? '8px' : '10px',
                }}
              >
                <span>{sub.label}</span>
                {sub.premium && (
                  <span style={{
                    fontSize: '8px', fontWeight: 600,
                    background: '#111', color: '#fff',
                    padding: '2px 5px', borderRadius: '4px',
                    letterSpacing: '0.04em', flexShrink: 0,
                  }}>PRO</span>
                )}
              </Link>
            )
          })}
        </div>
      </aside>
    </>
  )
}
