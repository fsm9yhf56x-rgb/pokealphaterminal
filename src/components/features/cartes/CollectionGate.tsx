'use client'
import { getCardImageUrl } from '@/lib/images'

interface GateCard { name: string; lang: string; setId: string; localId: string; image?: string }

interface Props {
  card: GateCard | null
  onClose: () => void
  onSignup: () => void
  onLogin: () => void
}

export function CollectionGate({ card, onClose, onSignup, onLogin }: Props) {
  if (!card) return null
  const img = card.image || (card.setId && card.localId
    ? getCardImageUrl({ lang: card.lang, setId: card.setId, localId: card.localId })
    : '')

  const benefits: [string, string][] = [
    ['Ta collection, valorisée en temps réel', 'comme un portefeuille boursier'],
    ['Alerte quand tes cartes bougent', 'tu sais avant les autres'],
    ['Gratuit, et tes cartes te suivent partout', ''],
  ]

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'rgba(20,15,10,0.35)', backdropFilter:'blur(12px) saturate(150%)', WebkitBackdropFilter:'blur(12px) saturate(150%)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'24px',
      animation:'cgFade .2s ease-out',
    }}>
      <style>{`@keyframes cgFade{from{opacity:0}to{opacity:1}}@keyframes cgUp{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxWidth:420, borderRadius:24, overflow:'hidden', padding:'28px 26px',
        background:'rgba(255,255,255,0.82)', backdropFilter:'blur(28px) saturate(180%)', WebkitBackdropFilter:'blur(28px) saturate(180%)',
        boxShadow:'0 24px 60px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.95)', position:'relative',
        animation:'cgUp .28s cubic-bezier(.2,.85,.3,1)',
      }}>
        <button onClick={onClose} aria-label="Fermer" style={{
          position:'absolute', top:18, right:18, width:30, height:30, borderRadius:'50%',
          background:'rgba(255,255,255,0.6)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
          border:'0.5px solid rgba(0,0,0,0.06)', color:'#48484A', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
        }}>×</button>

        <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
          <div style={{ width:120, aspectRatio:'0.72', borderRadius:10, overflow:'hidden', background:'rgba(245,245,247,0.6)', boxShadow:'0 8px 24px rgba(0,0,0,0.12)' }}>
            {img && <img src={img} alt={card.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{(e.currentTarget as HTMLImageElement).style.opacity='0'}}/>}
          </div>
        </div>

        <h2 style={{ fontSize:20, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', textAlign:'center', margin:'0 0 8px', letterSpacing:'-0.4px' }}>
          Garde {card.name} dans ta collection
        </h2>
        <p style={{ fontSize:13.5, color:'#48484A', textAlign:'center', lineHeight:1.5, margin:'0 0 20px', fontFamily:'var(--font-body, var(--font-display))' }}>
          Suis sa cote, vois ta collection prendre de la valeur, et ne rate jamais le bon moment pour acheter ou revendre.
        </p>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:22 }}>
          {benefits.map(([t, sub], i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              <span style={{ flexShrink:0, width:18, height:18, borderRadius:'50%', background:'rgba(46,158,106,0.12)', display:'flex', alignItems:'center', justifyContent:'center', marginTop:1 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2E9E6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </span>
              <span style={{ fontSize:13, color:'#1D1D1F', fontFamily:'var(--font-display)', fontWeight:500 }}>
                {t}{sub && <span style={{ color:'#86868B', fontWeight:400 }}> — {sub}</span>}
              </span>
            </div>
          ))}
        </div>

        <button onClick={onSignup} style={{
          width:'100%', padding:'14px', borderRadius:12, border:'none', background:'#1D1D1F', color:'#fff',
          fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', letterSpacing:'0.01em',
          boxShadow:'0 4px 14px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.14)',
        }}>
          Commencer ma collection
        </button>
        <button onClick={onLogin} style={{
          width:'100%', marginTop:10, padding:'4px', background:'none', border:'none',
          color:'#86868B', fontSize:12.5, cursor:'pointer', fontFamily:'var(--font-display)',
        }}>
          J&apos;ai déjà un compte
        </button>
      </div>
    </div>
  )
}
