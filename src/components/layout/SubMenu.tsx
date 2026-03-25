'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { NAV } from '@/lib/constants/navigation'
import { useState } from 'react'

export function SubMenu() {
  const pathname  = usePathname()
  const [open, setOpen] = useState(true)

  const section = NAV.find(n => pathname.startsWith(n.href) && n.href !== '/')
  if (!section?.children?.length) return null

  return (
    <>
      <style>{`
        .submenu-link       { display:flex; align-items:center; gap:8px; padding:7px 12px; border-radius:8px; font-size:13px; font-weight:400; color:#555; font-family:var(--font-display); text-decoration:none; transition:all 0.12s; cursor:pointer; }
        .submenu-link:hover { background:#F0F0F0; color:#111; }
        .submenu-link.act   { background:#FFF0EE; color:#E03020; font-weight:600; }
      `}</style>
      <div style={{
        width: open ? '200px' : '0px',
        minWidth: open ? '200px' : '0px',
        borderRight:'1px solid #F0F0F0',
        padding: open ? '20px 10px' : '0',
        overflow:'hidden',
        transition:'all 0.2s ease',
        flexShrink:0,
        position:'relative',
      }}>
        {open && (
          <>
            <div style={{ fontSize:'10px', fontWeight:700, color:'#BBB', textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:'var(--font-display)', padding:'0 12px', marginBottom:'8px' }}>
              {section.label}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
              {section.children.map(child => {
                const isActive = pathname === child.href || (child.href !== section.href && pathname.startsWith(child.href))
                return (
                  <Link key={child.href} href={child.href} className={`submenu-link${isActive?' act':''}`}>
                    {child.label}
                    {child.pro && (
                      <span style={{ fontSize:'8px', fontWeight:700, background:'#E03020', color:'#fff', padding:'1px 5px', borderRadius:'3px', fontFamily:'var(--font-display)', marginLeft:'auto' }}>PRO</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </>
        )}
        {/* Toggle */}
        <button onClick={()=>setOpen(o=>!o)} style={{ position:'absolute', top:'50%', right:'-12px', transform:'translateY(-50%)', width:'22px', height:'22px', borderRadius:'50%', background:'#fff', border:'1px solid #E8E8E8', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'10px', color:'#888', boxShadow:'0 1px 4px rgba(0,0,0,0.08)', zIndex:10 }}>
          {open ? '‹' : '›'}
        </button>
      </div>
    </>
  )
}
