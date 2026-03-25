'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { NAV } from '@/lib/constants/navigation'

export function TopNav() {
  const pathname   = usePathname()
  const router     = useRouter()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => { logout(); router.push('/login') }

  return (
    <>
      <style>{`
        .nav-link       { font-size:13px; font-weight:500; color:#666; text-decoration:none; padding:6px 12px; border-radius:8px; font-family:var(--font-display); transition:all 0.12s; }
        .nav-link:hover { background:#F5F5F5; color:#111; }
        .nav-link.act   { background:#FFF0EE; color:#E03020; font-weight:600; }
        .menu-item:hover { background:#F5F5F5 !important; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <nav style={{ height:'56px', background:'#fff', borderBottom:'1px solid #F0F0F0', display:'flex', alignItems:'center', paddingInline:'24px', gap:'4px', position:'sticky', top:0, zIndex:50, flexShrink:0 }}>

        <Link href="/home" style={{ display:'flex', alignItems:'center', gap:'8px', textDecoration:'none', marginRight:'16px', flexShrink:0 }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'linear-gradient(135deg,#E03020,#FF6644)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color:'#fff', fontWeight:700 }}>◆</div>
          <span style={{ fontSize:'15px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.3px' }}>Poké<span style={{ color:'#E03020' }}>Alpha</span></span>
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

        {user && (
          <div style={{ fontSize:'11px', fontWeight:700, background:user.plan==='pro'?'linear-gradient(135deg,#FFD700,#FF8C00)':'#F5F5F5', color:user.plan==='pro'?'#fff':'#888', padding:'4px 10px', borderRadius:'20px', fontFamily:'var(--font-display)', marginRight:'8px', boxShadow:user.plan==='pro'?'0 2px 8px rgba(255,160,0,0.35)':'none', cursor:'pointer' }} onClick={() => user.plan==='free' && router.push('/signup')}>
            {user.plan==='pro' ? '✦ Pro' : 'Free ↑'}
          </div>
        )}

        {user ? (
          <div style={{ position:'relative' }}>
            <button onClick={()=>setMenuOpen(o=>!o)} style={{ width:'34px', height:'34px', borderRadius:'10px', background:'linear-gradient(135deg,#E03020,#FF6644)', color:'#fff', border:'none', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {user.avatar}
            </button>

            {menuOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'#fff', border:'1px solid #EBEBEB', borderRadius:'12px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', padding:'8px', minWidth:'210px', zIndex:100, animation:'fadeIn 0.15s ease-out' }}>
                <div style={{ padding:'8px 12px 12px', borderBottom:'1px solid #F5F5F5', marginBottom:'4px' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', marginBottom:'2px' }}>{user.name}</div>
                  <div style={{ fontSize:'11px', color:'#AAA' }}>{user.email}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'6px' }}>
                    <div style={{ fontSize:'10px', fontWeight:700, background:user.plan==='pro'?'linear-gradient(135deg,#FFD700,#FF8C00)':'#F5F5F5', color:user.plan==='pro'?'#fff':'#888', padding:'2px 8px', borderRadius:'10px' }}>
                      {user.plan==='pro'?'✦ Pro':'Free'}
                    </div>
                    <span style={{ fontSize:'10px', color:'#AAA' }}>🔥 {user.streak}j</span>
                    <span style={{ fontSize:'10px', color:'#AAA' }}>⚡ {user.xp.toLocaleString()} XP</span>
                  </div>
                </div>

                {[
                  { label:'Mon portfolio',    icon:'📊', href:'/portfolio'      },
                  { label:'Mes missions',     icon:'🎯', href:'/home/missions'  },
                  { label:'Dexy Insights',    icon:'💡', href:'/home/insights'  },
                ].map(item=>(
                  <Link key={item.label} href={item.href} onClick={()=>setMenuOpen(false)} className="menu-item" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', fontSize:'13px', color:'#444', fontFamily:'var(--font-display)', textDecoration:'none', borderRadius:'8px', transition:'background 0.1s' }}>
                    <span>{item.icon}</span>{item.label}
                  </Link>
                ))}

                {user.plan==='free' && (
                  <button onClick={()=>{setMenuOpen(false); router.push('/signup')}} className="menu-item" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', fontSize:'13px', color:'#E03020', fontFamily:'var(--font-display)', background:'none', border:'none', cursor:'pointer', width:'100%', textAlign:'left', borderRadius:'8px', fontWeight:600 }}>
                    🚀 Passer Pro — €9,99/mois
                  </button>
                )}

                <div style={{ height:'1px', background:'#F5F5F5', margin:'4px 0' }} />
                <button onClick={handleLogout} className="menu-item" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', fontSize:'13px', color:'#E03020', fontFamily:'var(--font-display)', background:'none', border:'none', cursor:'pointer', width:'100%', textAlign:'left', borderRadius:'8px' }}>
                  ↩ Se déconnecter
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" style={{ padding:'7px 16px', borderRadius:'9px', background:'#111', color:'#fff', fontSize:'13px', fontWeight:600, textDecoration:'none', fontFamily:'var(--font-display)' }}>
            Connexion
          </Link>
        )}
      </nav>
    </>
  )
}
