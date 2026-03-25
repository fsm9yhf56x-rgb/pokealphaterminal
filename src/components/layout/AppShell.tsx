'use client'

import { TickerBar } from './TickerBar'
import { TopNav }    from './TopNav'
import { SubMenu }   from './SubMenu'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'#FAFAFA' }}>
      <TickerBar />
      <TopNav />
      <div style={{ display:'flex', flex:1, minHeight:0 }}>
        <SubMenu />
        <main style={{ flex:1, padding:'28px 32px', minWidth:0, overflowY:'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
