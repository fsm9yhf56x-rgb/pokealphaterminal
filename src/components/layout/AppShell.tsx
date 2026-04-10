'use client'

import { TickerBar } from './TickerBar'
import { TopNav }    from './TopNav'
import { SubMenu }   from './SubMenu'

const HEADER_H = '83px'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', width:'100%' }}>
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, background:'rgba(255,255,255,.6)', backdropFilter:'saturate(180%) blur(20px)', WebkitBackdropFilter:'saturate(180%) blur(20px)' }}>
        <TickerBar />
        <TopNav />
      </div>
      <div style={{ display:'flex', flex:1, marginTop:HEADER_H, minHeight:`calc(100vh - ${HEADER_H})`, width:'100%' }}>
        <SubMenu />
        <main style={{ flex:1, minWidth:0, padding:'32px 36px', width:'100%', overflowX:'clip' as any }}>
          {children}
        </main>
      </div>
    </div>
  )
}
