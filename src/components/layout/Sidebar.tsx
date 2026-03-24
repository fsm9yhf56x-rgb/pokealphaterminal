'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/terminal', label: 'Market Terminal', icon: '◈', desc: 'Indices & tendances'  },
  { href: '/signals',  label: 'Alpha Signals',   icon: '◆', desc: 'Cartes sous-évaluées' },
  { href: '/dexy',     label: 'Dexy AI',         icon: '✦', desc: 'Analyste TCG'         },
  { href: '/whales',   label: 'Whale Tracker',   icon: '◉', desc: 'Gros collectionneurs'  },
  { href: '/deals',    label: 'Deal Hunter',     icon: '◎', desc: 'Meilleures affaires'   },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      minHeight: '100vh',
      background: '#fff',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 40,
    }}>

      {/* Logo */}
      <div style={{
        padding: '18px 20px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '15px',
          fontWeight: 600,
          color: '#111',
          letterSpacing: '-0.3px',
          lineHeight: 1.2,
        }}>
          Poké<span style={{ color: '#E03020' }}>Alpha</span>
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '15px',
          fontWeight: 600,
          color: '#111',
          letterSpacing: '-0.3px',
          lineHeight: 1.2,
        }}>
          Terminal
        </div>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-faint)',
          marginTop: '4px',
          fontFamily: 'var(--font-sans)',
          letterSpacing: '0.04em',
        }}>
          Market Intelligence
        </div>
      </div>

      {/* Caméra + dots — clin d'œil Pokédex */}
      <div style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          width: '22px', height: '22px', borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 32%, #B8E8FF, #2A82DD)',
          border: '2px solid #fff',
          boxShadow: '0 0 0 1.5px #D8EEFF',
          flexShrink: 0, position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: '4px', left: '4px',
            width: '5px', height: '5px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.8)',
          }} />
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { bg: '#FF6060', anim: 'blink 2.5s ease-in-out infinite' },
            { bg: '#FFD040', anim: 'none' },
            { bg: '#50D080', anim: 'none' },
          ].map((d, i) => (
            <div key={i} style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: d.bg, animation: d.anim,
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            }} />
          ))}
        </div>
        <span style={{
          fontSize: '9px', color: 'var(--ink-faint)',
          fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
          marginLeft: '2px',
        }}>
          v2.0
        </span>
      </div>

      {/* Nav */}
      <nav style={{ padding: '10px 10px', flex: 1, overflowY: 'auto' }}>
        <div style={{
          fontSize: '9px', color: 'var(--ink-faint)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          fontFamily: 'var(--font-display)', fontWeight: 500,
          padding: '6px 10px 8px',
        }}>
          Navigation
        </div>
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 10px',
                borderRadius: '8px',
                marginBottom: '2px',
                textDecoration: 'none',
                background: active ? '#FFF0EE' : 'transparent',
                border: active ? '1px solid #FFD8D0' : '1px solid transparent',
                transition: 'all 0.12s ease',
              }}
            >
              <span style={{
                fontSize: '14px',
                color: active ? '#E03020' : 'var(--ink-faint)',
                width: '18px',
                textAlign: 'center',
                flexShrink: 0,
                transition: 'color 0.12s',
              }}>
                {item.icon}
              </span>
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: active ? 500 : 400,
                  color: active ? '#E03020' : 'var(--ink)',
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1.3,
                  transition: 'color 0.12s',
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: active ? '#E03020' : 'var(--ink-faint)',
                  fontFamily: 'var(--font-sans)',
                  marginTop: '1px',
                  opacity: active ? 0.7 : 1,
                  transition: 'color 0.12s',
                }}>
                  {item.desc}
                </div>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer sidebar */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: '#fff',
        }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFB8C8, #FF7090)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: 600, color: '#fff', flexShrink: 0,
          }}>
            A
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Mon compte
            </div>
            <div style={{ fontSize: '9px', color: 'var(--ink-faint)' }}>
              Plan Pro ✦
            </div>
          </div>
          <div style={{
            fontSize: '9px', fontWeight: 500,
            background: '#111', color: '#fff',
            padding: '2px 6px', borderRadius: '4px',
            fontFamily: 'var(--font-display)',
            flexShrink: 0,
          }}>
            Pro
          </div>
        </div>
      </div>

    </aside>
  )
}
