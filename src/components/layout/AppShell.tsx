'use client'
import { TickerBar } from './TickerBar'
import { TopNav }    from './TopNav'
import { SubMenu }   from './SubMenu'

const HEADER_H = '83px'

/**
 * AppShell Snow+ v3.
 *
 * - Fond dégradé subtil rose pâle → blanc → bleu pâle (30% intensité Login)
 *   pour faire ressortir la translucidité du verre des composants enfants.
 * - 2 blobs colorés flous absolus pour profondeur.
 * - Header fixe en glass v3 cohérent (refraction + blur fort).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      width: '100%',
      // Fond dégradé subtil (30% intensité du Login)
      background: '#FAFAFB',
      position: 'relative',
      overflow: 'hidden',
    }}>
      

      {/* Nappes bokeh alignees sur Spotlight (5 couleurs floutees fixes) */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-15%', left: '-15%',
          width: '70%', height: '70%',
          background: 'radial-gradient(circle, rgba(255,165,80,0.42) 0%, rgba(255,165,80,0.15) 40%, transparent 75%)',
          filter: 'blur(110px)',
        }} />
        <div style={{
          position: 'absolute', top: '15%', right: '-15%',
          width: '70%', height: '70%',
          background: 'radial-gradient(circle, rgba(110,150,255,0.36) 0%, rgba(110,150,255,0.12) 40%, transparent 75%)',
          filter: 'blur(130px)',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '10%',
          width: '80%', height: '60%',
          background: 'radial-gradient(circle, rgba(195,135,245,0.3) 0%, rgba(195,135,245,0.1) 40%, transparent 75%)',
          filter: 'blur(130px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '-10%',
          width: '70%', height: '60%',
          background: 'radial-gradient(circle, rgba(0,210,150,0.28) 0%, rgba(0,210,150,0.1) 40%, transparent 75%)',
          filter: 'blur(120px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '-15%',
          width: '60%', height: '55%',
          background: 'radial-gradient(circle, rgba(255,90,140,0.24) 0%, rgba(255,90,140,0.08) 40%, transparent 75%)',
          filter: 'blur(120px)',
        }} />
      </div>

      {/* Header fixe glass v3 */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.58) 100%)',
        backdropFilter: 'saturate(180%) blur(24px)',
        WebkitBackdropFilter: 'saturate(180%) blur(24px)',
        borderBottom: '0.5px solid rgba(255,255,255,0.5)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 1px 0 rgba(0,0,0,0.03)',
      }}>
        <TickerBar />
        <TopNav />
      </div>

      <div style={{
        display: 'flex',
        flex: 1,
        marginTop: HEADER_H,
        minHeight: `calc(100vh - ${HEADER_H})`,
        width: '100%',
        position: 'relative',
        zIndex: 1,
      }}>
        <SubMenu />
        <main style={{
          flex: 1,
          minWidth: 0,
          padding: '32px 36px',
          width: '100%',
          overflowX: 'clip' as any,
          position: 'relative',
          zIndex: 1,
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}
