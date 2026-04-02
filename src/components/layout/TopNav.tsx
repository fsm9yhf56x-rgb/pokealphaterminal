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
        .nav-link       { font-size:13px; font-weight:500; color:#86868B; text-decoration:none; padding:6px 12px; border-radius:8px; font-family:var(--font-display); transition:all 0.12s; }
        .nav-link:hover { background:rgba(0,0,0,.04); color:#1D1D1F; }
        .nav-link.act   { background:rgba(224,48,32,.08); color:#E03020; font-weight:600; }
        .menu-item:hover { background:rgba(0,0,0,.04) !important; }
        @keyframes fadeIn { 0%{opacity:0;transform:translateY(-8px) scale(.97)} 60%{opacity:1;transform:translateY(2px) scale(1.005)} 100%{opacity:1;transform:translateY(0) scale(1)} }
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

        {user && (
          <div style={{ fontSize:'11px', fontWeight:700, background:user.plan==='pro'?'linear-gradient(135deg,#D97706,#EA580C)':'#F5F5F7', color:user.plan==='pro'?'#fff':'#888', padding:'4px 10px', borderRadius:'20px', fontFamily:'var(--font-display)', marginRight:'8px', boxShadow:user.plan==='pro'?'0 2px 8px rgba(217,119,6,0.25)':'none', cursor:'pointer' }} onClick={() => user.plan==='free' && router.push('/signup')}>
            {user.plan==='pro' ? '✦ Pro' : 'Free ↑'}
          </div>
        )}

        {user ? (
          <div style={{ position:'relative' }}>
            <button onClick={()=>setMenuOpen(o=>!o)} style={{ width:'34px', height:'34px', borderRadius:'10px', background:'linear-gradient(135deg,#E03020,#FF6644)', color:'#fff', border:'none', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {user.avatar}
            </button>

            {menuOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'rgba(255,255,255,.85)', backdropFilter:'saturate(180%) blur(20px)', WebkitBackdropFilter:'saturate(180%) blur(20px)', border:'1px solid rgba(0,0,0,.06)', borderRadius:'14px', boxShadow:'0 12px 40px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.04)', padding:'8px', minWidth:'210px', zIndex:100, animation:'fadeIn 0.15s ease-out' }}>
                <div style={{ padding:'8px 12px 12px', borderBottom:'1px solid rgba(0,0,0,.04)', marginBottom:'4px' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:'2px' }}>{user.name}</div>
                  <div style={{ fontSize:'11px', color:'#86868B' }}>{user.email}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'6px' }}>
                    <div style={{ fontSize:'10px', fontWeight:700, background:user.plan==='pro'?'linear-gradient(135deg,#D97706,#EA580C)':'#F5F5F7', color:user.plan==='pro'?'#fff':'#888', padding:'2px 8px', borderRadius:'10px' }}>
                      {user.plan==='pro'?'✦ Pro':'Free'}
                    </div>
                    <span style={{ fontSize:'10px', color:'#86868B' }}>🔥 {user.streak}j</span>
                    <span style={{ fontSize:'10px', color:'#86868B' }}>⚡ {user.xp.toLocaleString()} XP</span>
                  </div>
                </div>

                {[
                  { label:'Mon portfolio',    icon:'📊', href:'/portfolio'      },
                  { label:'Mes missions',     icon:'🎯', href:'/home/missions'  },
                  { label:'Dexy Insights',    icon:'💡', href:'/home/insights'  },
                ].map(item=>(
                  <Link key={item.label} href={item.href} onClick={()=>setMenuOpen(false)} className="menu-item" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', fontSize:'13px', color:'#48484A', fontFamily:'var(--font-display)', textDecoration:'none', borderRadius:'8px', transition:'background 0.1s' }}>
                    <span>{item.icon}</span>{item.label}
                  </Link>
                ))}

                {user.plan==='free' && (
                  <button onClick={()=>{setMenuOpen(false); router.push('/signup')}} className="menu-item" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', fontSize:'13px', color:'#E03020', fontFamily:'var(--font-display)', background:'none', border:'none', cursor:'pointer', width:'100%', textAlign:'left', borderRadius:'8px', fontWeight:600 }}>
                    🚀 Passer Pro — €9,99/mois
                  </button>
                )}

                <div style={{ height:'1px', background:'rgba(0,0,0,.04)', margin:'4px 0' }} />
                <button onClick={handleLogout} className="menu-item" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', fontSize:'13px', color:'#E03020', fontFamily:'var(--font-display)', background:'none', border:'none', cursor:'pointer', width:'100%', textAlign:'left', borderRadius:'8px' }}>
                  ↩ Se déconnecter
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" style={{ padding:'7px 16px', borderRadius:'9px', background:'#1D1D1F', color:'#fff', fontSize:'13px', fontWeight:600, textDecoration:'none', fontFamily:'var(--font-display)' }}>
            Connexion
          </Link>
        )}
      </nav>
    </>
  )
}
