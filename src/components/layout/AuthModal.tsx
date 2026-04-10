'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/useAuth'

type Mode = 'login' | 'signup'

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!open) return null

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    if (mode === 'login') {
      const { error: e } = await signIn(email, password)
      if (e) setError(e.message)
      else onClose()
    } else {
      const { error: e } = await signUp(email, password, name)
      if (e) setError(e.message)
      else setSuccess(true)
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    await signInWithGoogle()
  }

  return (
    <>
      <style>{`
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes overlayIn{from{opacity:0}to{opacity:1}}
        .auth-overlay{animation:overlayIn .2s ease-out}
        .auth-modal{animation:modalIn .25s ease-out}
        .auth-input{transition:border-color .15s,box-shadow .15s}
        .auth-input:focus{border-color:#1D1D1F!important;box-shadow:0 0 0 3px rgba(29,29,31,.08)!important;outline:none}
        .auth-btn{transition:all .15s}.auth-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.15)}
        .auth-btn:active{transform:translateY(0)}
        .auth-btn-google{transition:all .15s}.auth-btn-google:hover{background:#F5F5F7!important;border-color:#C7C7CC!important}
        .auth-link{transition:color .1s}.auth-link:hover{color:#1D1D1F!important}
        .auth-close{transition:background .1s}.auth-close:hover{background:#F0F0F0!important}
      `}</style>

      <div className="auth-overlay" onClick={onClose} style={{
        position:'fixed',inset:0,background:'rgba(0,0,0,.4)',backdropFilter:'blur(4px)',
        zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',
      }}>
        <div className="auth-modal" onClick={e=>e.stopPropagation()} style={{
          width:'100%',maxWidth:'400px',background:'#fff',borderRadius:'18px',
          boxShadow:'0 24px 80px rgba(0,0,0,.2)',overflow:'hidden',
        }}>
          {/* Header */}
          <div style={{padding:'24px 24px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <p style={{fontSize:'10px',color:'#AEAEB2',textTransform:'uppercase',letterSpacing:'.12em',margin:'0 0 4px',fontWeight:600,fontFamily:'var(--font-sora,Sora,system-ui)'}}>PokéAlpha Terminal</p>
              <h2 style={{fontSize:'22px',fontWeight:700,color:'#1D1D1F',margin:0,fontFamily:'var(--font-sora,Sora,system-ui)',letterSpacing:'-.3px'}}>
                {mode==='login'?'Connexion':'Créer un compte'}
              </h2>
            </div>
            <button className="auth-close" onClick={onClose} style={{width:'32px',height:'32px',borderRadius:'50%',border:'none',background:'#F5F5F7',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',color:'#86868B'}}>✕</button>
          </div>

          <div style={{padding:'20px 24px 24px'}}>
            {success ? (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:'40px',marginBottom:'12px'}}>✉️</div>
                <p style={{fontSize:'15px',fontWeight:600,color:'#1D1D1F',margin:'0 0 8px',fontFamily:'var(--font-sora,Sora,system-ui)'}}>Vérifie tes emails</p>
                <p style={{fontSize:'13px',color:'#86868B',margin:0,fontFamily:'var(--font-dm,"DM Sans",system-ui)',lineHeight:1.6}}>
                  Un lien de confirmation a été envoyé à <strong>{email}</strong>. Clique dessus pour activer ton compte.
                </p>
              </div>
            ) : (
              <>
                {/* Google */}
                <button className="auth-btn-google" onClick={handleGoogle} style={{
                  width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #E5E5EA',
                  background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',
                  fontSize:'13px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-sora,Sora,system-ui)',marginBottom:'16px',
                }}>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  Continuer avec Google
                </button>

                {/* Divider */}
                <div style={{display:'flex',alignItems:'center',gap:'12px',margin:'0 0 16px'}}>
                  <div style={{flex:1,height:'1px',background:'#E5E5EA'}}/>
                  <span style={{fontSize:'11px',color:'#AEAEB2',fontFamily:'var(--font-dm,"DM Sans",system-ui)'}}>ou par email</span>
                  <div style={{flex:1,height:'1px',background:'#E5E5EA'}}/>
                </div>

                {/* Form */}
                {mode==='signup'&&(
                  <input className="auth-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ton pseudo" style={{
                    width:'100%',padding:'12px 14px',borderRadius:'10px',border:'1px solid #E5E5EA',
                    fontSize:'14px',color:'#1D1D1F',fontFamily:'var(--font-dm,"DM Sans",system-ui)',
                    marginBottom:'10px',boxSizing:'border-box',background:'#FAFAFA',
                  }}/>
                )}
                <input className="auth-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" style={{
                  width:'100%',padding:'12px 14px',borderRadius:'10px',border:'1px solid #E5E5EA',
                  fontSize:'14px',color:'#1D1D1F',fontFamily:'var(--font-dm,"DM Sans",system-ui)',
                  marginBottom:'10px',boxSizing:'border-box',background:'#FAFAFA',
                }}/>
                <input className="auth-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" onKeyDown={e=>e.key==='Enter'&&handleSubmit()} style={{
                  width:'100%',padding:'12px 14px',borderRadius:'10px',border:'1px solid #E5E5EA',
                  fontSize:'14px',color:'#1D1D1F',fontFamily:'var(--font-dm,"DM Sans",system-ui)',
                  marginBottom:'16px',boxSizing:'border-box',background:'#FAFAFA',
                }}/>

                {error&&<p style={{fontSize:'12px',color:'#E03020',margin:'0 0 12px',fontFamily:'var(--font-dm,"DM Sans",system-ui)'}}>{error}</p>}

                <button className="auth-btn" onClick={handleSubmit} disabled={loading} style={{
                  width:'100%',padding:'13px',borderRadius:'10px',border:'none',
                  background:'#1D1D1F',color:'#fff',fontSize:'14px',fontWeight:700,
                  cursor:loading?'wait':'pointer',fontFamily:'var(--font-sora,Sora,system-ui)',
                  opacity:loading?.7:1,letterSpacing:'-.2px',
                }}>
                  {loading?'Chargement...':mode==='login'?'Se connecter':'Créer mon compte'}
                </button>

                {/* Switch mode */}
                <p style={{textAlign:'center',margin:'16px 0 0',fontSize:'13px',color:'#86868B',fontFamily:'var(--font-dm,"DM Sans",system-ui)'}}>
                  {mode==='login'?'Pas encore de compte ?':'Déjà un compte ?'}{' '}
                  <button className="auth-link" onClick={()=>{setMode(mode==='login'?'signup':'login');setError('')}} style={{
                    background:'none',border:'none',color:'#6E6E73',cursor:'pointer',
                    fontWeight:600,fontSize:'13px',fontFamily:'var(--font-dm,"DM Sans",system-ui)',
                    textDecoration:'underline',padding:0,
                  }}>
                    {mode==='login'?'Créer un compte':'Se connecter'}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
