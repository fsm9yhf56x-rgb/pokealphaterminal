'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/AuthContext'

export default function SignupPage() {
  const { signup }    = useAuth()
  const router        = useRouter()
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) { setError('Remplis tous les champs.'); return }
    if (password.length < 8) { setError('Mot de passe trop court (8 caractères min).'); return }
    setLoading(true); setError('')
    const res = await signup(name, email, password)
    setLoading(false)
    if (res.ok) router.push('/home')
    else setError(res.error ?? 'Erreur.')
  }

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const strengthColor = ['transparent','#E03020','#FF8C00','#2E9E6A'][strength]
  const strengthLabel = ['','Trop court','Correct','Fort'][strength]

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .inp:focus        { border-color:#E03020 !important; box-shadow:0 0 0 3px rgba(224,48,32,0.08) !important; }
        .btn-main:hover   { background:#CC2010 !important; }
        .btn-main:disabled { background:#CCC !important; cursor:not-allowed; }
      `}</style>

      <div style={{ width:'100%', maxWidth:'400px', animation:'fadeIn 0.25s ease-out' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
            <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'linear-gradient(135deg,#E03020,#FF6644)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>◆</div>
            <span style={{ fontSize:'20px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.3px' }}>PokéAlpha<span style={{ color:'#E03020' }}>Terminal</span></span>
          </div>
          <div style={{ fontSize:'14px', color:'#888' }}>Rejoins le Bloomberg des cartes Pokémon</div>
        </div>

        {/* Card */}
        <div style={{ background:'#fff', borderRadius:'20px', padding:'32px', border:'1px solid #EBEBEB', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* Free badge */}
          <div style={{ background:'#F5F5F5', borderRadius:'10px', padding:'10px 14px', marginBottom:'24px', display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ fontSize:'18px' }}>🎁</div>
            <div>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>Plan Gratuit — €0/mois</div>
              <div style={{ fontSize:'11px', color:'#888' }}>Dashboard marché · 1 signal Alpha · Portfolio</div>
            </div>
          </div>

          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

            <div>
              <label style={{ fontSize:'12px', fontWeight:600, color:'#555', fontFamily:'var(--font-display)', display:'block', marginBottom:'6px' }}>Pseudo</label>
              <input className="inp" type="text" value={name} onChange={e=>setName(e.target.value)}
                placeholder="Dracaufeu42" autoComplete="name"
                style={{ width:'100%', height:'44px', padding:'0 14px', border:'1.5px solid #EBEBEB', borderRadius:'10px', fontSize:'14px', color:'#111', outline:'none', background:'#fff', fontFamily:'var(--font-sans)', boxSizing:'border-box' as const, transition:'all 0.15s' }} />
            </div>

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
                  placeholder="8 caractères minimum" autoComplete="new-password"
                  style={{ width:'100%', height:'44px', padding:'0 42px 0 14px', border:'1.5px solid #EBEBEB', borderRadius:'10px', fontSize:'14px', color:'#111', outline:'none', background:'#fff', fontFamily:'var(--font-sans)', boxSizing:'border-box' as const, transition:'all 0.15s' }} />
                <button type="button" onClick={()=>setShowPwd(p=>!p)} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#AAA', cursor:'pointer', fontSize:'13px', padding:0 }}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
              {password.length > 0 && (
                <div style={{ marginTop:'6px', display:'flex', alignItems:'center', gap:'8px' }}>
                  <div style={{ flex:1, height:'3px', background:'#F0F0F0', borderRadius:'99px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${strength * 33.3}%`, background:strengthColor, borderRadius:'99px', transition:'all 0.3s' }} />
                  </div>
                  <span style={{ fontSize:'10px', color:strengthColor, fontFamily:'var(--font-display)', fontWeight:600, minWidth:'50px' }}>{strengthLabel}</span>
                </div>
              )}
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
                  Création...
                </>
              ) : 'Créer mon compte gratuit'}
            </button>
          </form>
        </div>

        <div style={{ textAlign:'center', marginTop:'20px', fontSize:'13px', color:'#888' }}>
          Déjà un compte ?{' '}
          <Link href="/login" style={{ color:'#E03020', fontWeight:600, textDecoration:'none', fontFamily:'var(--font-display)' }}>Se connecter</Link>
        </div>
      </div>
    </>
  )
}
