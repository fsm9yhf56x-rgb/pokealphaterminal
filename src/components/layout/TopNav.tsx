'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from '@/lib/constants/navigation'
import UserMenu from './UserMenu'

export function TopNav() {
  const pathname = usePathname()

  return (
    <>
      <style>{`
        .nav-link       { font-size:13px; font-weight:500; color:#86868B; text-decoration:none; padding:6px 12px; border-radius:8px; font-family:var(--font-display); transition:all 0.12s; }
        .nav-link:hover { background:rgba(0,0,0,.04); color:#1D1D1F; }
        .nav-link.act   { background:rgba(224,48,32,.08); color:#E03020; font-weight:600; }
      `}</style>

      <nav style={{ height:'56px', background:'rgba(255,255,255,.72)', backdropFilter:'saturate(180%) blur(20px)', WebkitBackdropFilter:'saturate(180%) blur(20px)', borderBottom:'1px solid rgba(0,0,0,.06)', display:'flex', alignItems:'center', paddingInline:'24px', gap:'4px', position:'sticky', top:0, zIndex:50, flexShrink:0 }}>

        <Link href="/home" style={{ display:'flex', alignItems:'center', gap:'8px', textDecoration:'none', marginRight:'16px', flexShrink:0 }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'linear-gradient(135deg,#E03020,#FF6644)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color:'#fff', fontWeight:700 }}>◆</div>
          <span style={{ fontSize:'15px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.3px' }}>Poké<span style={{ color:'#E03020' }}>Alpha</span></span>
        </Link>

        {NAV.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.children?.[0]?.href ?? item.href} className={`nav-link${isActive?' act':''}`}>
              {item.label}
              {item.pro && <span style={{ fontSize:'8px', background:'#E03020', color:'#fff', padding:'1px 4px', borderRadius:'3px', marginLeft:'5px', fontWeight:700, verticalAlign:'middle' }}>PRO</span>}
            </Link>
          )
        })}

        <div style={{ flex:1 }} />

        <UserMenu />
      </nav>
    </>
  )
}
