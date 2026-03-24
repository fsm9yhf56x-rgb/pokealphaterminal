'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { NAV } from '@/lib/constants/navigation'

export function SubMenu() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Trouve la section active
  const activeSection = NAV.find(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  // Collapse auto si pas de sous-menu
  useEffect(() => {
    if (!activeSection || activeSection.sub.length <= 1) {
      setCollapsed(true)
    } else {
      setCollapsed(false)
    }
  }, [pathname, activeSection])

  if (!activeSection) return null

  return (
    <div style={{
      width: collapsed ? '40px' : '200px',
      minHeight: '100%',
      background: '#fff',
      borderRight: '1px solid #EBEBEB',
      flexShrink: 0,
      transition: 'width 0.2s ease',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          position: 'absolute',
          top: '12px',
          right: '8px',
          width: '24px', height: '24px',
          borderRadius: '6px',
          border: '1px solid #EBEBEB',
          background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '10px',
          color: '#888',
          zIndex: 2,
          flexShrink: 0,
          transition: 'all 0.15s',
        }}
        title={collapsed ? 'Ouvrir le menu' : 'Fermer le menu'}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* Contenu du sous-menu */}
      <div style={{
        opacity: collapsed ? 0 : 1,
        transition: 'opacity 0.15s ease',
        pointerEvents: collapsed ? 'none' : 'auto',
        padding: '10px 8px',
        paddingTop: '44px',
      }}>

        {/* Titre section */}
        <div style={{
          fontSize: '9px',
          fontWeight: 600,
          color: '#BBBBBB',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontFamily: 'var(--font-display)',
          padding: '0 8px 8px',
          whiteSpace: 'nowrap',
        }}>
          {activeSection.label}
        </div>

        {/* Sous-liens */}
        {activeSection.sub.map(sub => {
          const active = pathname === sub.href
          return (
            <Link
              key={sub.href}
              href={sub.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 8px',
                borderRadius: '7px',
                marginBottom: '1px',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: active ? 500 : 400,
                fontFamily: 'var(--font-display)',
                color: active ? '#E03020' : '#555',
                background: active ? '#FFF0EE' : 'transparent',
                whiteSpace: 'nowrap',
                transition: 'all 0.1s ease',
              }}
            >
              <span>{sub.label}</span>
              {sub.premium && (
                <span style={{
                  fontSize: '7px', fontWeight: 600,
                  background: '#111', color: '#fff',
                  padding: '1px 4px', borderRadius: '3px',
                  letterSpacing: '0.04em', flexShrink: 0,
                }}>
                  PRO
                </span>
              )}
            </Link>
          )
        })}

      </div>

    </div>
  )
}
