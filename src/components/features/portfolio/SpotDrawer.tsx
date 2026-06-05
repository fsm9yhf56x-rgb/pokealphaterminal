'use client'
import { createPortal } from 'react-dom'

import React, { memo } from 'react'
import { cleanLegacyUrl as cleanImageUrl } from '@/lib/images'
import { SpotlightV2 } from '@/components/features/spotlight/SpotlightV2'

type CardItem = {
  id: string; name: string; set: string; year: number; number: string
  rarity: string; type: string; lang: 'EN'|'JP'|'FR'
  condition: string; graded: boolean; imageStatus?: 'pending'|'approved'|'rejected'
  buyPrice: number; curPrice: number; qty: number
  psa?: number; signal?: 'S'|'A'|'B'; hot?: boolean; favorite?: boolean
  image?: string; setTotal?: number; setId?: string; edition?: string; variant?: string
}

interface SpotDrawerProps {
  card: CardItem
  editQty: number | null
  favs: Set<string>
  portfolio: CardItem[]
  HOLO_RARITIES: string[]
  TIER_BG: Record<string, string>
  tiltCard: (e: React.MouseEvent<HTMLDivElement>) => void
  resetCard: (e: React.MouseEvent<HTMLDivElement>) => void
  setSpotCard: (c: CardItem | null) => void
  setEditQty: (q: number | null) => void
  setCardZoom: (b: boolean) => void
  setPortfolio: React.Dispatch<React.SetStateAction<CardItem[]>>
  setShareCtx: (c: 'portfolio'|'card'|'wrapped'|'showcase') => void
  setShareCard: (c: CardItem | null) => void
  setShareOpen: (b: boolean) => void
  showToast: (msg: string) => void
  toggleFav: (id: string, e: React.MouseEvent) => void
  triggerUpload: (id: string) => void
}

function SpotDrawerComponent(props: SpotDrawerProps) {
  const {
    card: spotCard,
    editQty, favs, HOLO_RARITIES, TIER_BG,
    tiltCard, resetCard,
    setSpotCard, setEditQty, setCardZoom,
    setPortfolio, setShareCtx, setShareCard, setShareOpen,
    showToast, toggleFav, triggerUpload,
  } = props

  const isHolo = HOLO_RARITIES.includes(spotCard.rarity)
  const curQty = editQty ?? spotCard.qty

  return createPortal(
    <div className="spot-overlay" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px' }} onClick={()=>{ setSpotCard(null); setEditQty(null); setCardZoom(false) }}>
      <div className="spot-modal" style={{ background:'rgba(255,255,255,0.88)', backdropFilter:'blur(40px) saturate(200%)', WebkitBackdropFilter:'blur(40px) saturate(200%)', borderRadius:'20px', border:'none', boxShadow:'0 24px 60px rgba(0,0,0,.18), 0 8px 20px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,0.9)', padding:'0', maxWidth:'1280px', width:'95vw', height:'90vh', animation:'kcSpringIn 0.22s cubic-bezier(.2,.85,.3,1)', position:'relative', display:'flex', flexDirection:'column' as const, overflow:'hidden' as const, isolation:'isolate' as const }} onClick={e=>e.stopPropagation()}>
        <style>{`
          @media (max-width: 900px) {
            .spot-overlay { padding: 0 !important; }
            .spot-modal {
              width: 100% !important; height: 100% !important;
              max-width: 100% !important; border-radius: 0 !important;
            }
            /* Colonnes empilees : image en haut, contenu dessous, tout scrolle */
            .spot-cols { flex-direction: column !important; overflow-y: auto !important; }
            .spot-imgcol {
              width: 100% !important; flex-shrink: 0 !important;
              padding: 6px 16px 0 !important;
              border-radius: 0 !important;
            }
            .spot-imgcol .gem { max-width: 130px !important; }
            /* Close ramene DANS le modal, en haut a droite */
            .spot-close {
              top: 12px !important; right: 12px !important;
              background: rgba(0,0,0,0.45) !important;
              border-color: rgba(255,255,255,0.2) !important;
            }
            /* Graphe SVG : largeur fluide (fix les 600px qui debordent) */
            .spot-modal svg { max-width: 100% !important; }
          }
        `}</style>
        <div style={{ position:'absolute' as const, inset:0, overflow:'hidden' as const, borderRadius:'20px', pointerEvents:'none' as const, zIndex:0 }}>
          <div style={{ position:'absolute' as const, top:'-10%', left:'-15%', width:'70%', height:'70%', background:'radial-gradient(circle, rgba(255,165,80,0.42) 0%, rgba(255,165,80,0.15) 40%, transparent 75%)', filter:'blur(110px)' }} />
          <div style={{ position:'absolute' as const, top:'15%', right:'-15%', width:'70%', height:'70%', background:'radial-gradient(circle, rgba(110,150,255,0.36) 0%, rgba(110,150,255,0.12) 40%, transparent 75%)', filter:'blur(130px)' }} />
          <div style={{ position:'absolute' as const, top:'40%', left:'10%', width:'80%', height:'60%', background:'radial-gradient(circle, rgba(195,135,245,0.3) 0%, rgba(195,135,245,0.1) 40%, transparent 75%)', filter:'blur(130px)' }} />
          <div style={{ position:'absolute' as const, bottom:'-10%', right:'-10%', width:'70%', height:'60%', background:'radial-gradient(circle, rgba(0,210,150,0.28) 0%, rgba(0,210,150,0.1) 40%, transparent 75%)', filter:'blur(120px)' }} />
          <div style={{ position:'absolute' as const, bottom:'10%', left:'-15%', width:'60%', height:'55%', background:'radial-gradient(circle, rgba(255,90,140,0.24) 0%, rgba(255,90,140,0.08) 40%, transparent 75%)', filter:'blur(120px)' }} />
        </div>
        <button className="spot-close" onClick={()=>{setSpotCard(null);setEditQty(null)}} style={{ position:'absolute', top:'0', right:'-56px', width:'40px', height:'40px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', backdropFilter:'blur(24px) saturate(200%)', WebkitBackdropFilter:'blur(24px) saturate(200%)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, transition:'all .2s cubic-bezier(.2,.8,.2,1)', boxShadow:'0 4px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3)' }}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.28)';e.currentTarget.style.transform='scale(1.08)'}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.18)';e.currentTarget.style.transform='scale(1)'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        <div className="spot-cols" style={{ display:'flex', flex:1, minHeight:0, overflow:'hidden' as const }}>
          <div className="spot-imgcol" style={{ flexShrink:0, width:'380px', position:'relative' as const, background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 32px', overflow:'hidden' as const, borderTopLeftRadius:'20px', borderBottomLeftRadius:'20px' }}>
                                    
            <div className="gem" style={{ background:'transparent', borderRadius:'18px', width:'100%', maxWidth:'280px', position:'relative' as const, zIndex:1, filter:'drop-shadow(0 24px 40px rgba(0,0,0,.18)) drop-shadow(0 8px 16px rgba(0,0,0,.08)) drop-shadow(0 0 36px rgba(255,150,80,0.16))', transition:'filter .3s ease, transform .3s ease' }} onMouseMove={tiltCard} onMouseLeave={resetCard}>
              {isHolo && <div className="holo"/>}
              <div className="hm"/>
              {spotCard.signal && <div style={{ position:'absolute', top:'10px', right:'10px', zIndex:3, fontSize:'10px', fontWeight:700, background:TIER_BG[spotCard.signal], color:'#1D1D1F', padding:'3px 9px', borderRadius:'6px', fontFamily:'var(--font-display)' }}>Tier {spotCard.signal}</div>}
              <div style={{ aspectRatio:'63/88', margin:'6px 6px 0', borderRadius:'14px', background:'#EBEBEB', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                {spotCard.image ? (
                  <img src={cleanImageUrl(spotCard.image)} alt={spotCard.name}
                    onClick={e=>{e.stopPropagation();setCardZoom(true)}}
                    style={{ width:'100%', height:'100%', objectFit:'cover', position:'relative', zIndex:1, cursor:'zoom-in' }}
                    onError={e=>{ const t=e.target as HTMLImageElement; t.onerror=null; t.style.opacity='0' }}/>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', zIndex:1 }}>
                    <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'#F0F0F5', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                    <button onClick={()=>triggerUpload(spotCard.id)} style={{ padding:'6px 14px', borderRadius:'999px', background:'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 100%)', backdropFilter:'blur(18px) saturate(190%)', WebkitBackdropFilter:'blur(18px) saturate(190%)', color:'#1D1D1F', fontSize:'10px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', border:'0.5px solid rgba(255,255,255,0.6)', boxShadow:'0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)' }}>
                      Ajouter une photo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div ref={(el)=>{ if(el) el.scrollTop=0 }} style={{ flex:1, minWidth:0, padding:0, overflowY:'auto' as const, display:'flex', flexDirection:'column' as const, }}>
            <div style={{ padding: '18px 22px 0' }}>
              {spotCard.setId && spotCard.number ? (
                <div style={{ marginTop:0 }}>
                  <SpotlightV2
                    cardId={spotCard.setId + '-' + spotCard.number}
                    lang={spotCard.lang}
                    portfolio={{
                      qty: spotCard.qty,
                      buyPrice: spotCard.buyPrice > 0 ? spotCard.buyPrice : null,
                      acquiredAt: null,
                      condition: spotCard.condition,
                      graded: spotCard.graded,
                    }}
                    imageUrl={null}
                  />
                </div>
              ) : null}
            </div>

            <div style={{ padding: '0 22px 16px', background: 'transparent' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px', padding:'10px 14px', borderRadius:'14px', background:'rgba(255,255,255,0.45)', backdropFilter:'blur(20px) saturate(200%)', WebkitBackdropFilter:'blur(20px) saturate(200%)', boxShadow:'0 4px 24px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95)', border:'none' }}>
                <span style={{ fontSize:'12px', color:'#6E6E73', fontWeight:500, fontFamily:'var(--font-display)' }}>Quantité</span>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <button onClick={()=>setEditQty(Math.max(1,curQty-1))} className="kc-glass-btn" style={{ width:'28px', height:'28px', borderRadius:'9px', background:'rgba(255,255,255,0.55)', backdropFilter:'blur(20px) saturate(200%)', WebkitBackdropFilter:'blur(20px) saturate(200%)', border:'1px solid rgba(255,255,255,0.6)', color:'#48484A', fontSize:'14px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95)', transition:'all .2s cubic-bezier(.2,.8,.2,1)' }}>-</button>
                  <span style={{ fontSize:'14px', fontWeight:600, color:'#1D1D1F', minWidth:'20px', textAlign:'center' as const, fontFamily:'var(--font-display)' }}>{curQty}</span>
                  <button onClick={()=>setEditQty(Math.min(99,curQty+1))} className="kc-glass-btn" style={{ width:'28px', height:'28px', borderRadius:'9px', background:'rgba(255,255,255,0.55)', backdropFilter:'blur(20px) saturate(200%)', WebkitBackdropFilter:'blur(20px) saturate(200%)', border:'1px solid rgba(255,255,255,0.6)', color:'#48484A', fontSize:'14px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95)', transition:'all .2s cubic-bezier(.2,.8,.2,1)' }}>+</button>
                  {editQty!==null && editQty!==spotCard.qty && (
                    <button onClick={()=>{ setPortfolio(prev=>prev.map(c=>c.id===spotCard.id?{...c,qty:editQty!}:c)); setSpotCard({...spotCard,qty:editQty!}); setEditQty(null); showToast('Quantité mise à jour') }} className="kc-glass-btn" style={{ padding:'6px 14px', borderRadius:'10px', background:'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)', color:'#1D1D1F', border:'0.5px solid rgba(255,255,255,0.6)', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const, boxShadow:'0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)', transition:'all .2s cubic-bezier(.2,.8,.2,1)' }}>OK</button>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={()=>{ setShareCtx('card'); setShareCard(spotCard); setShareOpen(true) }} className="kc-glass-btn" style={{ flex:1, padding:'12px', borderRadius:'12px', background:'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 100%)', backdropFilter:'blur(20px) saturate(190%)', WebkitBackdropFilter:'blur(20px) saturate(190%)', color:'#1D1D1F', border:'0.5px solid rgba(255,255,255,0.6)', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)', transition:'all .25s cubic-bezier(.2,.8,.2,1)' }}>Partager</button>
                <button onClick={e=>toggleFav(spotCard.id,e)} style={{ width:'44px', borderRadius:'12px', background:favs.has(spotCard.id)?'rgba(224,48,32,0.15)':'rgba(255,255,255,0.45)', backdropFilter:'blur(24px) saturate(200%)', WebkitBackdropFilter:'blur(24px) saturate(200%)', border:`1px solid ${favs.has(spotCard.id)?'rgba(224,48,32,.3)':'rgba(255,255,255,0.55)'}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .25s cubic-bezier(.2,.8,.2,1)', boxShadow:favs.has(spotCard.id)?'0 4px 16px rgba(224,48,32,0.12), inset 0 1px 0 rgba(255,255,255,0.5)':'0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95)' }}
                  onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.06)'}}
                  onMouseLeave={e=>{e.currentTarget.style.transform=''}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={favs.has(spotCard.id)?'#E03020':'none'} stroke={favs.has(spotCard.id)?'#E03020':'#86868B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export const SpotDrawer = memo(SpotDrawerComponent, (prev, next) => {
  return prev.card.id === next.card.id
    && prev.card.qty === next.card.qty
    && prev.card.condition === next.card.condition
    && prev.card.graded === next.card.graded
    && prev.card.image === next.card.image
    && prev.editQty === next.editQty
    && prev.favs === next.favs
})
