'use client'

interface Props {
  gate: { current: number; limit: number } | null
  onClose: () => void
}

/** Modale affichée quand un user Gratuit atteint la limite de cartes (800). */
export function CardLimitGate({ gate, onClose }: Props) {
  if (!gate) return null
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'rgba(20,15,10,0.35)', backdropFilter:'blur(12px) saturate(150%)', WebkitBackdropFilter:'blur(12px) saturate(150%)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'24px',
      animation:'clgFade .2s ease-out',
    }}>
      <style>{`@keyframes clgFade{from{opacity:0}to{opacity:1}}@keyframes clgUp{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxWidth:440, borderRadius:24, overflow:'hidden', padding:'30px 28px',
        background:'rgba(255,255,255,0.85)', backdropFilter:'blur(28px) saturate(180%)', WebkitBackdropFilter:'blur(28px) saturate(180%)',
        boxShadow:'0 24px 60px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.95)', position:'relative',
        animation:'clgUp .28s cubic-bezier(.2,.85,.3,1)',
      }}>
        <button onClick={onClose} aria-label="Fermer" style={{
          position:'absolute', top:18, right:18, width:30, height:30, borderRadius:'50%',
          background:'rgba(255,255,255,0.6)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
          border:'0.5px solid rgba(0,0,0,0.06)', color:'#48484A', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
        }}>×</button>

        <div style={{ fontSize:11, fontWeight:700, color:'#E03020', letterSpacing:'.12em', fontFamily:'var(--font-data)', marginBottom:10, textTransform:'uppercase' }}>
          Plan Gratuit
        </div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:23, fontWeight:700, color:'#1D1D1F', margin:'0 0 8px', letterSpacing:'-0.5px', lineHeight:1.15 }}>
          Belle collection !
        </h2>
        <p style={{ fontFamily:'var(--font-body, sans-serif)', fontSize:14, color:'#6E6E73', lineHeight:1.5, margin:'0 0 22px' }}>
          Tu as rempli ton espace Gratuit — {gate.limit} cartes. Passe Pro pour continuer à l'enrichir sans limite.
        </p>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <a href="/abonnement" style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            fontFamily:'var(--font-display)', fontSize:14, fontWeight:600,
            padding:'14px 18px', borderRadius:14, textDecoration:'none',
            background:'#E03020', color:'#fff',
            boxShadow:'0 4px 14px rgba(224,48,32,0.28)',
          }}>
            Passer Pro — cartes illimitées
          </a>
          <a href="/abonnement" style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            fontFamily:'var(--font-display)', fontSize:13, fontWeight:600,
            padding:'12px 18px', borderRadius:14, textDecoration:'none',
            background:'rgba(255,255,255,0.7)', color:'#1D1D1F',
            border:'1px solid rgba(0,0,0,0.08)',
          }}>
            Voir aussi Premium
          </a>
        </div>

        <p style={{ fontFamily:'var(--font-body, sans-serif)', fontSize:11.5, color:'#86868B', textAlign:'center', margin:'16px 0 0' }}>
          Sans engagement · Annulation à tout moment
        </p>
      </div>
    </div>
  )
}
