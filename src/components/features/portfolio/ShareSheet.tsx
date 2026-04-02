"use client"

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

const REFERRAL = 'POKEALPHA-' + Math.random().toString(36).slice(2,8).toUpperCase()

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
    : `${portfolio.length} carte${portfolio.length !== 1 ? 's' : ''} · EUR ${totalCur.toLocaleString('fr-FR')}`

  const roi = isCard && card!.buyPrice > 0
    ? Math.round(((card!.curPrice - card!.buyPrice) / card!.buyPrice) * 100)
    : totalROI

  const tweetText = isShowcase
    ? `Ma Vitrine PokéAlpha — ${showcaseCards.length} pieces d'exception`
    : isCard
    ? `${card!.name} dans ma collection PokéAlpha Terminal ${card!.buyPrice > 0 ? '— ROI +' + roi + '%' : ''}`
    : context === 'wrapped'
    ? `Mon Wrapped 2026 sur PokéAlpha Terminal — ${portfolio.length} cartes, EUR ${totalCur.toLocaleString('fr-FR')}`
    : `Mon portfolio Pokemon TCG : EUR ${totalCur.toLocaleString('fr-FR')}${totalBuy > 0 ? ' (+' + totalROI + '%)' : ''} sur PokéAlpha`

  const shareUrl = `https://pokealphaterminal.io?ref=${REFERRAL}`

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
    a.download = `pokealpha-${isCard ? card!.name.toLowerCase().replace(/\s+/g, '-') : 'portfolio'}.png`
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
          const file = new File([blob], 'pokealpha.png', { type: 'image/png' })
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
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div style={{ width:'100%', maxWidth:'420px', background:'#fff', borderRadius:'20px', overflow:'hidden', animation:'shareUp .3s cubic-bezier(.22,.68,0,1.1)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'18px 20px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #E5E5EA' }}>
          <div>
            <div style={{ fontSize:'16px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>Partager</div>
            <div style={{ fontSize:'11px', color:'#86868B', marginTop:'2px' }}>{title} · {subtitle}</div>
          </div>
          <button onClick={onClose} style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#F0F0F5', border:'none', color:'#86868B', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* Preview compact */}
        <div style={{ padding:'16px 20px' }}>
          <div ref={previewRef} style={{ borderRadius:'14px', overflow:'hidden', background:'linear-gradient(160deg,#0A0A0A,#1A1A1A)', padding:'24px', display:'flex', alignItems:'center', gap:'16px' }}>
            {/* Card image or showcase strip or portfolio icon */}
            {isShowcase && showcaseCards.length > 0 ? (
              <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                {showcaseCards.slice(0,3).map((sc,i) => (
                  <img key={sc.id} src={sc.image ? `${sc.image.replace(/\/low\.(webp|jpg|png)$/, '')}/high.webp` : ''} alt={sc.name} crossOrigin="anonymous"
                    style={{ width:'60px', borderRadius:'6px', boxShadow:'0 4px 16px rgba(0,0,0,.4)', transform:`rotate(${(i-1)*4}deg)` }}
                    onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                ))}
              </div>
            ) : isCard && card!.image ? (
              <img src={`${card!.image.replace(/\/low\.(webp|jpg|png)$/, '')}/high.webp`} alt={card!.name} crossOrigin="anonymous"
                style={{ width:'100px', borderRadius:'8px', boxShadow:'0 8px 24px rgba(0,0,0,.4)' }}
                onError={e => { const t = e.target as HTMLImageElement; if (t.src.includes('.webp')) t.src = t.src.replace('.webp', '.jpg') }} />
            ) : (
              <div style={{ display:'flex', flexShrink:0, position:'relative' }}>
                {portfolio.filter(c=>c.image).slice(0,3).length >= 2 ? (
                  <div style={{ display:'flex' }}>
                    {portfolio.filter(c=>c.image).slice(0,3).map((c,i) => {
                      const angles = ['-8deg','0deg','8deg']
                      return <img key={c.id} src={c.image!.replace(/\/low\.(webp|jpg|png)$/, '') + '/high.webp'} alt={c.name} crossOrigin="anonymous"
                        style={{ width:'52px', borderRadius:'6px', boxShadow:'0 4px 12px rgba(0,0,0,.4)', transform:'rotate('+angles[i]+') translateY('+(i===1?'0':'4')+'px)', marginLeft:i>0?'-10px':'0', position:'relative', zIndex:i===1?3:1 }}
                        onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                    })}
                  </div>
                ) : (
                  <div style={{ width:'80px', height:'80px', borderRadius:'14px', background:context==='wrapped'?'linear-gradient(135deg,#FF6B35,#D97706)':'linear-gradient(135deg,#E03020,#FF6B35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M4 4h16v16H4zM9 4v16M15 4v16"/></svg>
                  </div>
                )}
              </div>
            )}
            {/* Info */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'6px' }}>
                <div style={{ width:'14px', height:'14px', borderRadius:'4px', background:'linear-gradient(135deg,#E03020,#FF6644)', flexShrink:0 }} />
                <span style={{ fontSize:'9px', color:'rgba(255,255,255,.5)', fontFamily:'var(--font-display)' }}>PokéAlpha Terminal</span>
              </div>
              <div style={{ fontSize:'15px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</div>
              {isCard ? (
                <>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,.4)', marginTop:'2px' }}>{card!.set}</div>
                  {card!.curPrice > 0 && <div style={{ fontSize:'18px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', marginTop:'6px' }}>{card!.curPrice} €</div>}
                  {card!.buyPrice > 0 && <div style={{ fontSize:'11px', color:'#4ECCA3', fontWeight:600 }}>+{roi}% ROI</div>}
                </>
              ) : (
                <>
                  <div style={{ fontSize:'22px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', marginTop:'4px' }}>EUR {totalCur.toLocaleString('fr-FR')}</div>
                  {totalBuy > 0 && <div style={{ fontSize:'12px', color:'#4ECCA3', fontWeight:600 }}>+{totalROI}%</div>}
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,.35)', marginTop:'2px' }}>{portfolio.length} cartes</div>
                </>
              )}
              <div style={{ fontSize:'8px', color:'rgba(255,255,255,.25)', marginTop:'8px' }}>pokealphaterminal.io</div>
            </div>
          </div>
        </div>

        {/* Share buttons */}
        <div style={{ padding:'0 20px 16px', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'8px' }}>
          {[
            { id:'story', label:'Story', bg:'linear-gradient(135deg,#833AB4,#FD1D1D,#F77737)', icon:'📸' },
            { id:'tiktok', label:'TikTok', bg:'#000', icon:'🎵' },
            { id:'twitter', label:'X', bg:'#1D1D1F', icon:'𝕏' },
            { id:'link', label:copied ? 'Copie!' : 'Lien', bg:'#F0F0F5', icon:'🔗' },
            { id:'plus', label:'Plus', bg:'#F0F0F5', icon:'📤' },
          ].map(b => (
            <button key={b.id} onClick={() => handleShare(b.id)}
              style={{ padding:'12px 4px', borderRadius:'12px', background:b.bg, border:b.id==='link'||b.id==='plus'?'1px solid #E5E5EA':'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
              <span style={{ fontSize:'18px' }}>{b.icon}</span>
              <span style={{ fontSize:'9px', fontWeight:600, color:b.id==='link'||b.id==='plus'?'#48484A':'#fff', fontFamily:'var(--font-display)' }}>{b.label}</span>
            </button>
          ))}
        </div>

        {/* Generate + Download */}
        <div style={{ padding:'0 20px 12px', display:'flex', gap:'8px' }}>
          <button onClick={async () => { await generateImage(); download() }} disabled={generating}
            style={{ flex:1, padding:'11px', borderRadius:'10px', background:'#1D1D1F', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:generating?'wait':'pointer', fontFamily:'var(--font-display)' }}>
            {generating ? 'Generation...' : '💾 Sauvegarder l\'image'}
          </button>
        </div>

        {/* Referral */}
        <div style={{ padding:'0 20px 18px' }}>
          <div style={{ background:'linear-gradient(135deg,rgba(224,48,32,.06),rgba(255,107,53,.06))', border:'1px solid rgba(224,48,32,.12)', borderRadius:'12px', padding:'12px 14px', display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'11px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>Invitez un ami, gagnez 1 mois Pro</div>
              <div style={{ fontSize:'10px', color:'#86868B', marginTop:'2px' }}>Partagez votre code : <span style={{ fontWeight:700, color:'#E03020', fontFamily:'var(--font-data)' }}>{REFERRAL}</span></div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(REFERRAL); setRefCopied(true); showToast('Code copie'); setTimeout(() => setRefCopied(false), 2000) }}
              style={{ padding:'6px 12px', borderRadius:'8px', background:refCopied?'#2E9E6A':'#E03020', color:'#fff', border:'none', fontSize:'10px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap', transition:'background .2s' }}>
              {refCopied ? '✓' : 'Copier'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
