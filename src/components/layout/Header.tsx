'use client'

import { TickerBar } from '@/components/layout/TickerBar'

export function Header() {
  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 'var(--sidebar-width)',
      right: 0,
      height: 'var(--header-height)',
      background: '#fff',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      zIndex: 30,
      padding: '0 0 0 20px',
    }}>

      {/* Ticker live — prend tout l'espace */}
      <div style={{ flex: 1, marginRight: '16px', overflow: 'hidden' }}>
        <TickerBar />
      </div>

      {/* Actions droite */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '20px', flexShrink: 0 }}>
        <div style={{
          fontSize: '10px', fontWeight: 500,
          background: '#FFF0EE', color: '#E03020',
          border: '1px solid #FFD8D0',
          padding: '3px 9px', borderRadius: '20px',
          fontFamily: 'var(--font-display)', letterSpacing: '0.02em',
        }}>
          Pro ✦
        </div>

        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', color: 'var(--ink-muted)', background: '#fff',
          }}>
            ◎
          </div>
          <div style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#E03020', border: '1.5px solid #fff',
          }} />
        </div>

        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #FFB8C8, #FF7090)',
          border: '2px solid #fff', boxShadow: '0 0 0 1.5px #FFD0DC',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 600, color: '#fff', cursor: 'pointer',
        }}>
          A
        </div>
      </div>

    </header>
  )
}
