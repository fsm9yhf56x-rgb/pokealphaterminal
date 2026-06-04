"use client"
import { formatEUR } from '@/lib/formatPrice'

import { useState, useRef, useCallback } from 'react'

interface CardItem {
  id:string; name:string; set:string; year:number; type:string;
  lang:string; condition:string; graded:boolean; buyPrice:number;
  curPrice:number; qty:number; signal?:string; image?:string; rarity?:string;
}

interface ShareSheetProps {
  open: boolean
  onClose: () => void
  context: 'portfolio' | 'card' | 'wrapped' | 'showcase'
  card?: CardItem | null
  portfolio: CardItem[]
  totalCur: number
  totalBuy: number
  totalROI: number
  totalGain: number
  showToast: (msg: string) => void
  showcase?: CardItem[]
}

const REFERRAL = 'KODOCARDS-' + Math.random().toString(36).slice(2,8).toUpperCase()

export function ShareSheet({ open, onClose, context, card, portfolio, totalCur, totalBuy, totalROI, totalGain, showToast, showcase }: ShareSheetProps) {
  const [generating, setGenerating] = useState(false)
  const [imageUrl, setImageUrl] = useState<string|null>(null)
  const [copied, setCopied] = useState(false)
  const [refCopied, setRefCopied] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const isCard = context === 'card' && card
  const isShowcase = context === 'showcase'
  const title = isCard ? card!.name : isShowcase ? 'Ma Vitrine' : context === 'wrapped' ? 'Wrapped 2026' : 'Mon Portfolio'
  const showcaseCards = showcase ?? []
  const subtitle = isShowcase
    ? showcaseCards.length + ' piece' + (showcaseCards.length !== 1 ? 's' : '') + ' d\'exception'
    : isCard
    ? `${card!.set} · ${card!.rarity ?? ''}`
    : `${portfolio.length} carte${portfolio.length !== 1 ? 's' : ''} · ${formatEUR(totalCur, 'big')}`

  const roi = isCard && card!.buyPrice > 0
    ? Math.round(((card!.curPrice - card!.buyPrice) / card!.buyPrice) * 100)
    : totalROI

  const tweetText = isShowcase
    ? `Ma Vitrine Kodo Cards — ${showcaseCards.length} pieces d'exception`
    : isCard
    ? `${card!.name} dans ma collection Kodo Cards ${card!.buyPrice > 0 ? '— ROI +' + roi + '%' : ''}`
    : context === 'wrapped'
    ? `Mon Wrapped 2026 sur Kodo Cards — ${portfolio.length} cartes, ${formatEUR(totalCur, 'big')}`
    : `Mon portfolio Pokemon TCG : ${formatEUR(totalCur, 'big')}${totalBuy > 0 ? ' (+' + totalROI + '%)' : ''} sur Kodo Cards`

  const shareUrl = `https://kodocards.com?ref=${REFERRAL}`

  const generateImage = useCallback(async () => {
    if (!previewRef.current) return
    setGenerating(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(previewRef.current, {
        scale: 2, backgroundColor: null, useCORS: true, logging: false,
      })
      setImageUrl(canvas.toDataURL('image/png'))
    } catch { showToast('Erreur de capture') }
    setGenerating(false)
  }, [showToast])

  const download = useCallback(() => {
    if (!imageUrl) return
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = `kodocards-${isCard ? card!.name.toLowerCase().replace(/\s+/g, '-') : 'portfolio'}.png`
    a.click()
    showToast('Image sauvegardee')
  }, [imageUrl, isCard, card, showToast])

  const handleShare = useCallback(async (platform: string) => {
    if (platform === 'twitter') {
      // Generer image si pas encore fait, copier dans clipboard, ouvrir Twitter
      let imgUrl = imageUrl
      if (!imgUrl) {
        try {
          const html2canvas = (await import('html2canvas')).default
          if (previewRef.current) {
            const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: null, useCORS: true, logging: false })
            imgUrl = canvas.toDataURL('image/png')
            setImageUrl(imgUrl)
          }
        } catch {}
      }
      if (imgUrl) {
        try {
          const res = await fetch(imgUrl)
          const blob = await res.blob()
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          showToast('Image copiee — collez (Cmd+V) dans votre tweet')
        } catch {
          showToast('Tweet pret — ajoutez votre image')
        }
      }
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText + ' ' + shareUrl)}`, '_blank')
      return
    }
    if (platform === 'link') {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true); showToast('Lien copie'); setTimeout(() => setCopied(false), 2000)
      return
    }
    // Story / TikTok / Plus → generate + download + native share
    if (!imageUrl) await generateImage()
    // Try native share
    if (navigator.share) {
      try {
        const data: ShareData = { title, text: tweetText, url: shareUrl }
        if (imageUrl) {
          const blob = await (await fetch(imageUrl)).blob()
          const file = new File([blob], 'kodocards.png', { type: 'image/png' })
          if (navigator.canShare?.({ files: [file] })) data.files = [file]
        }
        await navigator.share(data)
        return
      } catch {}
    }
    download()
    showToast(platform === 'story' ? 'Image prete — ouvrez Instagram' : platform === 'tiktok' ? 'Image prete — ouvrez TikTok' : 'Image sauvegardee')
  }, [imageUrl, generateImage, download, tweetText, shareUrl, title, showToast])

  if (!open) return null

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(20,15,10,0.35)', backdropFilter:'blur(12px) saturate(150%)', WebkitBackdropFilter:'blur(12px) saturate(150%)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div style={{
        width:'100%', maxWidth:'440px',
        background:'rgba(255,255,255,0.78)',
        backdropFilter:'blur(28px) saturate(180%)',
        WebkitBackdropFilter:'blur(28px) saturate(180%)',
        borderRadius:24,
        overflow:'hidden',
        animation:'shareUp .3s cubic-bezier(.22,.68,0,1.1)',
        boxShadow:'0 24px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 1px rgba(184,146,72,0.12)',
        position:'relative',
      }} onClick={e => e.stopPropagation()}>

        <div aria-hidden style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:120, height:1, background:'linear-gradient(90deg, transparent, #B89248, transparent)', pointerEvents:'none' }}/>

        {/* Header */}
        <div style={{ padding:'22px 24px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'#B89248', letterSpacing:'0.24em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)', marginBottom:6 }}>Partager</div>
            <div style={{ fontSize:18, fontWeight:800, color:'#0A0A0F', fontFamily:'var(--font-display)', letterSpacing:'-0.3px', lineHeight:1.2 }}>{title}</div>
            <div style={{ fontSize:11, color:'#86868B', marginTop:4, fontFamily:'var(--font-display)' }}>{subtitle}</div>
          </div>
          <button onClick={onClose} style={{
            width:30, height:30, borderRadius:'50%',
            background:'rgba(255,255,255,0.6)',
            backdropFilter:'blur(8px)',
            WebkitBackdropFilter:'blur(8px)',
            border:'1px solid rgba(184,146,72,0.18)',
            color:'#48484A',
            cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all .2s cubic-bezier(.2,.85,.3,1)',
            boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
          }}
            onMouseEnter={e=>{ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.color='#fff'; e.currentTarget.style.transform='scale(1.05)' }}
            onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.6)'; e.currentTarget.style.color='#48484A'; e.currentTarget.style.transform='' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Preview Snow+ premium */}
        <div style={{ padding:'4px 24px 18px' }}>
          <div ref={previewRef} style={{
            borderRadius:16,
            overflow:'hidden',
            background:'linear-gradient(180deg, #FAFAFB 0%, #F4F4F7 100%)',
            padding:'24px 22px',
            display:'flex', alignItems:'center', gap:18,
            position:'relative',
            boxShadow:'inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 1px rgba(184,146,72,0.15)',
          }}>
            <div aria-hidden style={{ position:'absolute', top:0, left:'15%', right:'15%', height:1, background:'linear-gradient(90deg, transparent, rgba(184,146,72,0.45), transparent)', pointerEvents:'none' }}/>
            <div aria-hidden style={{ position:'absolute', bottom:0, left:'15%', right:'15%', height:1, background:'linear-gradient(90deg, transparent, rgba(184,146,72,0.25), transparent)', pointerEvents:'none' }}/>

            {isShowcase && showcaseCards.length > 0 ? (
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                {showcaseCards.slice(0,3).map((sc,i) => (
                  <img key={sc.id} src={sc.image ? `${sc.image.replace(/\/low\.(webp|jpg|png)$/, '')}/high.webp` : ''} alt={sc.name} crossOrigin="anonymous"
                    style={{ width:62, borderRadius:8, boxShadow:'0 8px 20px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)', transform:`rotate(${(i-1)*4}deg)` }}
                    onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                ))}
              </div>
            ) : isCard && card!.image ? (
              <img src={`${card!.image.replace(/\/low\.(webp|jpg|png)$/, '')}/high.webp`} alt={card!.name} crossOrigin="anonymous"
                style={{ width:104, borderRadius:10, boxShadow:'0 12px 28px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.1)' }}
                onError={e => { const t = e.target as HTMLImageElement; if (t.src.includes('.webp')) t.src = t.src.replace('.webp', '.jpg') }} />
            ) : (
              <div style={{ display:'flex', flexShrink:0, position:'relative' }}>
                {portfolio.filter(c=>c.image).slice(0,3).length >= 2 ? (
                  <div style={{ display:'flex' }}>
                    {portfolio.filter(c=>c.image).slice(0,3).map((c,i) => {
                      const angles = ['-8deg','0deg','8deg']
                      return <img key={c.id} src={c.image!.replace(/\/low\.(webp|jpg|png)$/, '') + '/high.webp'} alt={c.name} crossOrigin="anonymous"
                        style={{ width:56, borderRadius:8, boxShadow:'0 8px 20px rgba(0,0,0,0.18)', transform:'rotate('+angles[i]+') translateY('+(i===1?'0':'4')+'px)', marginLeft:i>0?-10:0, position:'relative', zIndex:i===1?3:1 }}
                        onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                    })}
                  </div>
                ) : (
                  <div style={{ width:80, height:80, borderRadius:16, background:'linear-gradient(135deg, rgba(184,146,72,0.18), rgba(212,175,55,0.08))', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(184,146,72,0.25)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B89248" strokeWidth="1.8"><path d="M4 4h16v16H4zM9 4v16M15 4v16"/></svg>
                  </div>
                )}
              </div>
            )}

            <div style={{ flex:1, minWidth:0, position:'relative', zIndex:1 }}>
              <div style={{ fontSize:11, fontWeight:400, color:'#B89248', fontFamily:'Georgia, serif', fontStyle:'italic', letterSpacing:'0.08em', marginBottom:6, opacity:.85 }}>Kodo Cards</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#0A0A0F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', letterSpacing:'-0.2px' }}>{title}</div>
              {isCard ? (
                <>
                  <div style={{ fontSize:10, color:'#86868B', marginTop:3, fontFamily:'var(--font-display)' }}>{card!.set}</div>
                  {card!.curPrice > 0 && <div style={{ fontSize:22, fontWeight:800, color:'#0A0A0F', fontFamily:'var(--font-display)', marginTop:8, letterSpacing:'-0.5px' }}>{card!.curPrice} €</div>}
                  {card!.buyPrice > 0 && <div style={{ fontSize:11, color:'#2E9E6A', fontWeight:700, marginTop:2 }}>+{roi}% ROI</div>}
                </>
              ) : (
                <>
                  <div style={{ fontSize:26, fontWeight:800, color:'#0A0A0F', fontFamily:'var(--font-display)', marginTop:6, letterSpacing:'-0.8px', lineHeight:1 }}>{formatEUR(totalCur, 'big')}</div>
                  {totalBuy > 0 && <div style={{ fontSize:12, color:'#2E9E6A', fontWeight:700, marginTop:4 }}>+{totalROI}%</div>}
                  <div style={{ fontSize:10, color:'#86868B', marginTop:3, fontFamily:'var(--font-display)' }}>{portfolio.length} carte{portfolio.length>1?'s':''}</div>
                </>
              )}
              <div style={{ fontSize:9, fontWeight:600, color:'rgba(184,146,72,0.7)', marginTop:10, letterSpacing:'0.1em', fontFamily:'var(--font-display)' }}>kodocards.com</div>
            </div>
          </div>
        </div>

        {/* Share buttons */}
        <div style={{ padding:'0 24px 18px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#86868B', letterSpacing:'0.18em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)', marginBottom:10, paddingLeft:2 }}>Direct vers</div>
          <div className="kgrid-stat" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
            {[
              { id:'twitter', label:'X', svg:<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, dark:true },
              { id:'story', label:'Instagram', svg:<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>, dark:true },
              { id:'tiktok', label:'TikTok', svg:<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.1z"/></svg>, dark:true },
              { id:'link', label:copied ? 'Copie' : 'Lien', svg:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>, dark:false },
              { id:'plus', label:'Plus', svg:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>, dark:false },
            ].map(b => (
              <button key={b.id} onClick={() => handleShare(b.id)} style={{
                padding:'14px 4px 12px',
                borderRadius:12,
                background: b.dark ? '#1D1D1F' : 'rgba(255,255,255,0.7)',
                backdropFilter: b.dark ? 'none' : 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: b.dark ? 'none' : 'blur(12px) saturate(180%)',
                border: b.dark ? '1px solid rgba(184,146,72,0.18)' : '1px solid rgba(229,229,234,0.7)',
                color: b.dark ? '#fff' : '#1D1D1F',
                cursor:'pointer',
                display:'flex', flexDirection:'column' as const, alignItems:'center', gap:5,
                fontFamily:'var(--font-display)',
                transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                boxShadow: b.dark ? '0 4px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
              }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow = b.dark ? '0 8px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 0 1px rgba(184,146,72,0.4)' : '0 6px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 1px rgba(184,146,72,0.3)' }}
                onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow = b.dark ? '0 4px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
                {b.svg}
                <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.05em' }}>{b.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Generate + Download */}
        <div style={{ padding:'0 24px 14px' }}>
          <button onClick={async () => { await generateImage(); download() }} disabled={generating} style={{
            width:'100%', padding:'13px 16px',
            borderRadius:12,
            background: generating ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.7)',
            backdropFilter:'blur(12px) saturate(180%)',
            WebkitBackdropFilter:'blur(12px) saturate(180%)',
            color: generating ? '#AEAEB2' : '#1D1D1F',
            border:'1px solid rgba(184,146,72,0.25)',
            fontSize:12.5, fontWeight:700,
            cursor: generating ? 'wait' : 'pointer',
            fontFamily:'var(--font-display)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
            transition:'all .2s cubic-bezier(.2,.85,.3,1)',
            letterSpacing:'0.04em',
          }}
            onMouseEnter={e=>{ if(!generating){ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.color='#fff'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12), 0 0 0 1px rgba(184,146,72,0.5)' } }}
            onMouseLeave={e=>{ if(!generating){ e.currentTarget.style.background='rgba(255,255,255,0.7)'; e.currentTarget.style.color='#1D1D1F'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)' } }}>
            {!generating && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>}
            {generating ? 'Generation en cours...' : "Sauvegarder l'image"}
          </button>
        </div>

        {/* Referral */}
        <div style={{ padding:'0 24px 20px' }}>
          <div style={{
            background:'linear-gradient(135deg, rgba(184,146,72,0.1), rgba(212,175,55,0.05))',
            border:'1px solid rgba(184,146,72,0.25)',
            borderRadius:14,
            padding:'14px 16px',
            display:'flex', alignItems:'center', gap:12,
            boxShadow:'0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg, #D4AF37, #B8932F)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(184,146,72,0.3), inset 0 1px 0 rgba(255,255,255,0.4)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12.5, fontWeight:800, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.1px' }}>Invite un ami, gagne 1 mois Pro</div>
              <div style={{ fontSize:10.5, color:'#6E6E73', marginTop:3, fontFamily:'var(--font-display)' }}>Ton code : <span style={{ fontWeight:700, color:'#8B6914', fontFamily:'var(--font-data)', letterSpacing:'0.04em' }}>{REFERRAL}</span></div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(REFERRAL); setRefCopied(true); showToast('Code copie'); setTimeout(() => setRefCopied(false), 2000) }} style={{
              padding:'7px 14px',
              borderRadius:10,
              background: refCopied ? '#2E9E6A' : '#1D1D1F',
              color:'#fff',
              border:'none',
              fontSize:10.5, fontWeight:700,
              cursor:'pointer',
              fontFamily:'var(--font-display)',
              whiteSpace:'nowrap' as const,
              transition:'all .2s cubic-bezier(.2,.85,.3,1)',
              letterSpacing:'0.08em',
              textTransform:'uppercase' as const,
              boxShadow:'0 2px 6px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
              onMouseEnter={e=>{ if(!refCopied){ e.currentTarget.style.background='#000'; e.currentTarget.style.transform='translateY(-1px)' } }}
              onMouseLeave={e=>{ if(!refCopied){ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.transform='' } }}>
              {refCopied ? '✓ Copie' : 'Copier'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
