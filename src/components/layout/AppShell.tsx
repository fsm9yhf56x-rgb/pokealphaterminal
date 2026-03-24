import { TickerBar } from './TickerBar'
import { TopNav }    from './TopNav'
import { SubMenu }   from './SubMenu'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* 1 — Ticker fixe tout en haut */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        <TickerBar />
        <TopNav />
      </div>

      {/* 2 — Corps sous les barres fixes */}
      <div style={{
        display: 'flex',
        flex: 1,
        marginTop: '80px', /* ticker 36px + topnav 44px */
        minHeight: 'calc(100vh - 80px)',
      }}>

        {/* 3 — Sous-menu gauche rétractable */}
        <SubMenu />

        {/* 4 — Contenu principal */}
        <main style={{
          flex: 1,
          padding: '24px',
          minWidth: 0,
          overflowX: 'hidden',
        }}>
          {children}
        </main>

      </div>
    </div>
  )
}
