'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/AuthContext'

export default function LoginPage() {
  const { login }     = useAuth()
  const router        = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPwd, setShowPwd]   = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Remplis tous les champs.'); return }
    setLoading(true); setError('')
    const res = await login(email, password)
    setLoading(false)
    if (res.ok) router.push('/home')
    else setError(res.error ?? 'Erreur.')
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .inp:focus { border-color:#E03020 !important; box-shadow:0 0 0 3px rgba(224,48,32,0.08) !important; }
        .btn-main:hover { background:#CC2010 !important; }
        .btn-main:disabled { background:#CCC !important; cursor:not-allowed; }
      `}</style>

      <div style={{ width:'100%', maxWidth:'400px', animation:'fadeIn 0.25s ease-out' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
            <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'linear-gradient(135deg,#E03020,#FF6644)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>◆</div>
            <span style={{ fontSize:'20px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.3px' }}>PokéAlpha<span style={{ color:'#E03020' }}>Terminal</span></span>
          </div>
          <div style={{ fontSize:'14px', color:'#888' }}>Connexion à ton compte</div>
        </div>

        {/* Card */}
        <div style={{ background:'#fff', borderRadius:'20px', padding:'32px', border:'1px solid #EBEBEB', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* Demo hint */}
          <div style={{ background:'#F0FFF6', border:'1px solid #AAEEC8', borderRadius:'10px', padding:'10px 14px', marginBottom:'24px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#1A7A4A', fontFamily:'var(--font-display)', marginBottom:'3px' }}>Comptes de demo</div>
            <div style={{ fontSize:'11px', color:'#2E7A4A', lineHeight:1.6 }}>
              Free : <code style={{ background:'#E0F7EA', padding:'1px 5px', borderRadius:'3px' }}>demo@pokealphaterminal.io</code> / <code style={{ background:'#E0F7EA', padding:'1px 5px', borderRadius:'3px' }}>demo1234</code><br/>
              Pro : <code style={{ background:'#E0F7EA', padding:'1px 5px', borderRadius:'3px' }}>pro@pokealphaterminal.io</code> / <code style={{ background:'#E0F7EA', padding:'1px 5px', borderRadius:'3px' }}>pro1234</code>
            </div>
          </div>

          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

            <div>
              <label style={{ fontSize:'12px', fontWeight:600, color:'#555', fontFamily:'var(--font-display)', display:'block', marginBottom:'6px' }}>Email</label>
              <input className="inp" type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="ton@email.com" autoComplete="email"
                style={{ width:'100%', height:'44px', padding:'0 14px', border:'1.5px solid #EBEBEB', borderRadius:'10px', fontSize:'14px', color:'#111', outline:'none', background:'#fff', fontFamily:'var(--font-sans)', boxSizing:'border-box' as const, transition:'all 0.15s' }} />
            </div>

            <div>
              <label style={{ fontSize:'12px', fontWeight:600, color:'#555', fontFamily:'var(--font-display)', display:'block', marginBottom:'6px' }}>Mot de passe</label>
              <div style={{ position:'relative' }}>
                <input className="inp" type={showPwd?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  style={{ width:'100%', height:'44px', padding:'0 42px 0 14px', border:'1.5px solid #EBEBEB', borderRadius:'10px', fontSize:'14px', color:'#111', outline:'none', background:'#fff', fontFamily:'var(--font-sans)', boxSizing:'border-box' as const, transition:'all 0.15s' }} />
                <button type="button" onClick={()=>setShowPwd(p=>!p)} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#AAA', cursor:'pointer', fontSize:'13px', padding:0 }}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background:'#FFF0EE', border:'1px solid #FFD8D0', borderRadius:'8px', padding:'10px 12px', fontSize:'13px', color:'#C03020', fontFamily:'var(--font-sans)' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-main" disabled={loading}
              style={{ height:'46px', borderRadius:'12px', background:'#E03020', color:'#fff', border:'none', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', transition:'background 0.15s', marginTop:'4px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
              {loading ? (
                <>
                  <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite' }} />
                  Connexion...
                </>
              ) : 'Se connecter'}
            </button>
          </form>
        </div>

        <div style={{ textAlign:'center', marginTop:'20px', fontSize:'13px', color:'#888' }}>
          Pas encore de compte ?{' '}
          <Link href="/signup" style={{ color:'#E03020', fontWeight:600, textDecoration:'none', fontFamily:'var(--font-display)' }}>Créer un compte</Link>
        </div>
      </div>

      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </>
  )
}
