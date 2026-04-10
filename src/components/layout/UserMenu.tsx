'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import AuthModal from './AuthModal'

export default function UserMenu() {
  const { user, profile, loading, signOut, isPro } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (loading) return <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'#F0F0F0'}}/>

  // Not logged in
  if (!user) return (
    <>
      <button onClick={()=>setAuthOpen(true)} style={{
        padding:'8px 16px',borderRadius:'8px',border:'none',
        background:'#1D1D1F',color:'#fff',fontSize:'12px',fontWeight:600,
        cursor:'pointer',fontFamily:'var(--font-sora,Sora,system-ui)',
        transition:'opacity .15s',
      }}>
        Connexion
      </button>
      <AuthModal open={authOpen} onClose={()=>setAuthOpen(false)}/>
    </>
  )

  // Logged in
  const initials = (profile?.display_name || user.email || '?').slice(0, 1).toUpperCase()

  return (
    <div ref={menuRef} style={{position:'relative'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        {isPro && (
          <span style={{
            fontSize:'10px',fontWeight:700,letterSpacing:'.08em',
            padding:'3px 8px',borderRadius:'6px',
            background:'linear-gradient(135deg,#C9A84C,#FFE08A)',color:'#5C4200',
            fontFamily:'var(--font-sora,Sora,system-ui)',
          }}>PRO</span>
        )}
        <button onClick={()=>setMenuOpen(!menuOpen)} style={{
          width:'34px',height:'34px',borderRadius:'50%',border:'none',
          background:'#E03020',color:'#fff',fontSize:'14px',fontWeight:700,
          cursor:'pointer',fontFamily:'var(--font-sora,Sora,system-ui)',
          display:'flex',alignItems:'center',justifyContent:'center',
        }}>
          {initials}
        </button>
      </div>

      {menuOpen && (
        <div style={{
          position:'absolute',top:'42px',right:0,width:'220px',
          background:'#fff',borderRadius:'12px',border:'1px solid #E5E5EA',
          boxShadow:'0 8px 30px rgba(0,0,0,.12)',overflow:'hidden',zIndex:100,
          animation:'fadeUp .15s ease-out',
        }}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid #F0F0F0'}}>
            <p style={{fontSize:'14px',fontWeight:600,color:'#1D1D1F',margin:0,fontFamily:'var(--font-sora,Sora,system-ui)'}}>{profile?.display_name || 'Utilisateur'}</p>
            <p style={{fontSize:'11px',color:'#AEAEB2',margin:'2px 0 0',fontFamily:'var(--font-dm,"DM Sans",system-ui)'}}>{user.email}</p>
          </div>
          {[
            {label:'Mon profil',action:()=>setMenuOpen(false)},
            {label:'Paramètres',action:()=>setMenuOpen(false)},
            ...(!isPro?[{label:'Passer Pro ✦',action:()=>setMenuOpen(false)}]:[]),
          ].map((item,i)=>(
            <button key={i} onClick={item.action} style={{
              width:'100%',padding:'10px 16px',border:'none',background:'transparent',
              textAlign:'left',fontSize:'13px',color:'#1D1D1F',cursor:'pointer',
              fontFamily:'var(--font-dm,"DM Sans",system-ui)',
              transition:'background .1s',
            }} onMouseEnter={e=>(e.currentTarget.style.background='#F5F5F7')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              {item.label}
            </button>
          ))}
          <div style={{borderTop:'1px solid #F0F0F0'}}>
            <button onClick={()=>{signOut();setMenuOpen(false)}} style={{
              width:'100%',padding:'10px 16px',border:'none',background:'transparent',
              textAlign:'left',fontSize:'13px',color:'#E03020',cursor:'pointer',
              fontFamily:'var(--font-dm,"DM Sans",system-ui)',
              transition:'background .1s',
            }} onMouseEnter={e=>(e.currentTarget.style.background='#FEF2F2')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
