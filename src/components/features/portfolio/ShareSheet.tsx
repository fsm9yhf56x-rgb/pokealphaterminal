"use client"
import { formatEUR } from '@/lib/formatPrice'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getProfile, Ic, D } from './WrappedView'

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
  const [xStep, setXStep] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const isCard = context === 'card' && card
  const isShowcase = context === 'showcase'
  const isWrapped = context === 'wrapped'
  const wrappedYear = new Date().getFullYear()
  const wProf = isWrapped ? getProfile(portfolio, totalCur) : null
  const wBest = isWrapped ? [...portfolio].filter(c=>c.curPrice>0).sort((a,b)=>b.curPrice-a.curPrice)[0] : null
  const wSets = isWrapped ? new Set(portfolio.map(c=>c.set)).size : 0
  const title = isCard ? card!.name : isShowcase ? 'Ma Vitrine' : context === 'wrapped' ? `Wrapped ${wrappedYear}` : 'Mon Portfolio'
  const showcaseCards = showcase ?? []
  const subtitle = isShowcase
    ? showcaseCards.length + ' piece' + (showcaseCards.length !== 1 ? 's' : '') + ' d\'exception'
    : isCard
    ? `${card!.set} · ${card!.rarity ?? ''}`
    : `${portfolio.length} carte${portfolio.length !== 1 ? 's' : ''} · ${formatEUR(totalCur, 'big')}`

  const roi = isCard && card!.buyPrice > 0
    ? Math.round(((card!.curPrice - card!.buyPrice) / card!.buyPrice) * 100)
    : totalROI

  const eurClean = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)
  const tweetText = isShowcase
    ? `Ma Vitrine Kodo Cards — ${showcaseCards.length} pièces d'exception`
    : isCard
    ? `${card!.name}, ajoutée à ma collection. Je référence toutes mes cartes Pokémon sur Kodo Cards — édition, état et cote.`
    : context === 'wrapped'
    ? `Mon Wrapped ${wrappedYear} est là 🔥 Une année de collection Pokémon résumée. Fais le tien sur Kodo Cards 👇`
    : `Voici ma collection Pokémon 🔥 Je référence tout sur Kodo Cards — cote, éditions, gradation. Et toi, elle vaut combien la tienne ?`

  const shareUrl = `https://kodocards.com?ref=${REFERRAL}`
  const xIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText + ' ' + shareUrl)}`

  // Image de partage carte : generee par la route serveur /api/share/card (next/og
  // + sharp). Robuste (jamais de crash / illu vide), qualite max. Remplace html2canvas
  // pour le cas carte. Les autres contextes (portfolio/wrapped) gardent html2canvas.
  // Construit l'URL de la route image serveur pour le format demande (story 9:16 |
  // post 4:5). Ajoute grade (badge), ref (QR parrainage) et image FR native.
  const buildOgUrl = (format: 'story' | 'post' | 'wide'): string | null => {
    if (!isCard || !card) return null
    const c = card as unknown as { name:string; set?:string; number?:string; setId?:string; lang?:string; rarity?:string; condition?:string; curPrice?:number; image?:string; graded?:boolean; gradeCompany?:string; gradeValue?:string; psa?:number }
    const R2 = 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev'
    const sid = String(c.setId || '').replace(/^(fr|en|jp)-/i, '').replace(/-1st$|-shadowless(-ns)?$/i, '')
    const num = String(c.number || '')
    const langPath = c.lang === 'JP' ? 'jp' : c.lang === 'EN' ? 'en' : 'fr'
    const ext = langPath === 'jp' ? 'jpg' : 'webp'
    const nativeImg = (sid && num) ? `${R2}/${langPath}/${sid}/${num}.${ext}` : String(c.image || '')
    const grader = String(c.gradeCompany || (c.psa ? 'PSA' : ''))
    const gradeVal = String(c.gradeValue || (c.psa ? c.psa : ''))
    const grade = (c.graded && grader && gradeVal) ? `${grader} ${gradeVal}` : ''
    const p = new URLSearchParams()
    p.set('name', c.name)
    p.set('set', c.set || '')
    p.set('num', num)
    p.set('lang', c.lang || 'FR')
    p.set('rarity', c.rarity || '')
    p.set('cond', c.condition || '')
    if ((c.curPrice || 0) > 0) p.set('price', String(c.curPrice))
    if (grade) { p.set('grade', grade); p.set('grader', grader) }
    p.set('ref', REFERRAL)
    if (format !== 'story') p.set('format', format)
    p.set('img', nativeImg)
    return `/api/share/card?${p.toString()}`
  }
  const ogCardUrl = buildOgUrl('story')

  // URL de l'image collection (contexte portfolio) : valeur totale propre, nb
  // cartes/series, ROI, URLs natives des top cartes (mur). Meme moteur serveur.
  const isPortfolio = context === 'portfolio'
  const buildCollectionUrl = (format: 'story' | 'wide'): string | null => {
    if (!isPortfolio) return null
    const totalClean = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalCur || 0)
    const pf = portfolio as unknown as Array<{ set?:string; setId?:string; number?:string; lang?:string; curPrice?:number; image?:string }>
    const nSets = new Set(pf.map(c => c.set)).size
    const R2 = 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev'
    const top = [...pf].sort((a, b) => (b.curPrice || 0) - (a.curPrice || 0)).slice(0, 30)
    const imgsP = top.map(c => {
      const sid = String(c.setId || '').replace(/^(fr|en|jp)-/i, '').replace(/-1st$|-shadowless(-ns)?$/i, '')
      const num = String(c.number || '')
      const lp = c.lang === 'JP' ? 'jp' : c.lang === 'EN' ? 'en' : 'fr'
      const ext = lp === 'jp' ? 'jpg' : 'webp'
      return (sid && num) ? `${R2}/${lp}/${sid}/${num}.${ext}` : String(c.image || '')
    }).filter(Boolean).join('|')
    const p = new URLSearchParams()
    p.set('total', totalClean)
    p.set('cards', String(portfolio.length))
    p.set('sets', String(nSets))
    if (totalROI > 0) p.set('roi', `+${totalROI}%`)
    p.set('ref', REFERRAL)
    if (format === 'wide') p.set('format', 'wide')
    p.set('imgs', imgsP)
    return `/api/share/collection?${p.toString()}`
  }
  const ogCollectionUrl = buildCollectionUrl('story')

  // URL de l'image WRAPPED (story only). Stats reelles : valeur, cartes, series,
  // gradees, serie favorite, ROI, carte star (piece maitresse).
  const buildWrappedUrl = (format: 'story' | 'post'): string | null => {
    if (!isWrapped) return null
    const pf = portfolio as unknown as Array<{ set?:string; setId?:string; number?:string; lang?:string; curPrice?:number; image?:string; graded?:boolean; name?:string }>
    const totalClean = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalCur || 0)
    const gradedCount = pf.filter(c => c.graded).length
    const setCount: Record<string, number> = {}
    for (const c of pf) { const s = c.set || ''; if (s) setCount[s] = (setCount[s] || 0) + 1 }
    const topSet = Object.entries(setCount).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    const star = wBest as unknown as { set?:string; setId?:string; number?:string; lang?:string; image?:string; name?:string } | null
    let starImg = ''
    if (star) {
      const R2 = 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev'
      const sid = String(star.setId || '').replace(/^(fr|en|jp)-/i, '').replace(/-1st$|-shadowless(-ns)?$/i, '')
      const num = String(star.number || '')
      const lp = star.lang === 'JP' ? 'jp' : star.lang === 'EN' ? 'en' : 'fr'
      const ext = lp === 'jp' ? 'jpg' : 'webp'
      starImg = (sid && num) ? `${R2}/${lp}/${sid}/${num}.${ext}` : String(star.image || '')
    }
    const p = new URLSearchParams()
    p.set('year', String(wrappedYear))
    p.set('total', totalClean)
    p.set('cards', String(portfolio.length))
    p.set('sets', String(wSets))
    p.set('graded', String(gradedCount))
    if (topSet) p.set('topSet', topSet)
    if (totalROI > 0) p.set('roi', `+${totalROI}%`)
    if (star?.name) p.set('starName', star.name)
    if (starImg) p.set('starImg', starImg)
    if (format === 'post') p.set('format', 'post')
    p.set('ref', REFERRAL)
    return `/api/share/wrapped?${p.toString()}`
  }
  const ogWrappedUrl = buildWrappedUrl('story')

  // URL "active" (image serveur) selon le contexte : carte / collection / wrapped.
  const activeStoryUrl = ogCardUrl || ogCollectionUrl || ogWrappedUrl
  const activeWideUrl = buildOgUrl('wide') || buildCollectionUrl('wide') || buildWrappedUrl('post')

  // Prechauffe le cache serveur des l'ouverture (carte ou collection).
  useEffect(() => {
    if (!open || (!isCard && !isPortfolio && !isWrapped)) return
    const urls = [activeStoryUrl, activeWideUrl].filter(Boolean) as string[]
    urls.forEach(u => { const img = new window.Image(); img.src = u })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isCard, isPortfolio, activeStoryUrl])

  const generateImage = useCallback(async (): Promise<string|null> => {
    // Carte ou collection : image produite par la route serveur (robuste).
    if (activeStoryUrl) { setImageUrl(activeStoryUrl); return activeStoryUrl }
    if (!previewRef.current) return null
    setGenerating(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(previewRef.current, {
        scale: 2, backgroundColor: null, useCORS: true, logging: false,
      })
      const url = canvas.toDataURL('image/png')
      setImageUrl(url)
      setGenerating(false)
      return url
    } catch { showToast('Erreur de capture'); setGenerating(false); return null }
  }, [activeStoryUrl, showToast])

  const download = useCallback(async (url?: string) => {
    const src = url || imageUrl || activeStoryUrl
    if (!src) return
    try {
      // fetch->blob marche pour l'URL serveur ET pour un data URL (html2canvas).
      const blob = await (await fetch(src)).blob()
      const obj = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = obj
      a.download = `kodocards-${isCard ? card!.name.toLowerCase().replace(/\s+/g, '-') : 'portfolio'}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(obj), 1000)
      showToast('Image sauvegardee')
    } catch { showToast('Erreur de telechargement') }
  }, [imageUrl, activeStoryUrl, isCard, card, showToast])

  const handleShare = useCallback(async (platform: string) => {
    if (platform === 'twitter') {
      // X/feed : format wide 1200x675 paysage (s'affiche parfaitement dans le fil X,
      // sans recadrage, contrairement au portrait qui est rogne au centre).
      const imgUrl = activeWideUrl || imageUrl || await generateImage()
      const isMobile = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
      // MOBILE : partage natif avec image -> X en cible directe, zero friction.
      if (isMobile && imgUrl && navigator.share) {
        try {
          const blob = await (await fetch(imgUrl)).blob()
          const file = new File([blob], 'kodocards.png', { type: 'image/png' })
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ text: `${tweetText} ${shareUrl}`, files: [file] })
            return
          }
        } catch { /* annule -> on ne retombe pas sur download, on ouvre X */ }
      }
      // DESKTOP : X ne propose pas de depot d'image programmatique. On copie l'image
      // automatiquement puis on affiche une ETAPE claire (impossible a rater) qui
      // explique de coller l'image avant d'ouvrir X.
      if (imgUrl) {
        try {
          const blob = await (await fetch(imgUrl)).blob()
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          setXStep(true)   // -> overlay "Image copiee, colle-la sur X"
          return
        } catch {
          // Copie impossible -> on ouvre X directement (texte + lien, sans image)
          window.open(xIntent, '_blank')
          return
        }
      }
      window.open(xIntent, '_blank')
      return
    }
    if (platform === 'link') {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true); showToast('Lien copie'); setTimeout(() => setCopied(false), 2000)
      return
    }
    // Story / TikTok / Plus → image + partage natif (mobile: Insta/TikTok en cible directe)
    const eff = imageUrl || await generateImage()
    if (navigator.share && eff) {
      try {
        const blob = await (await fetch(eff)).blob()
        const file = new File([blob], 'kodocards.png', { type: 'image/png' })
        const data: ShareData = { title, text: `${tweetText} ${shareUrl}` }
        if (navigator.canShare?.({ files: [file] })) data.files = [file]
        await navigator.share(data)
        return
      } catch {}
    }
    await download(eff || undefined)
    showToast(platform === 'story' ? 'Image prete — ouvrez Instagram' : platform === 'tiktok' ? 'Image prete — ouvrez TikTok' : 'Image sauvegardee')
  }, [imageUrl, generateImage, download, tweetText, shareUrl, title, showToast])

  if (!open) return null

  return createPortal(
    <div className="kshare-overlay" style={{ position:'fixed', inset:0, background:'rgba(20,20,28,0.30)', backdropFilter:'blur(12px) saturate(120%)', WebkitBackdropFilter:'blur(12px) saturate(120%)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <style>{`
        @media (max-width: 767px) {
          .kshare-overlay { align-items: center !important; padding: 16px !important; }
          .kshare-modal {
            max-width: 100% !important;
            max-height: 88vh; overflow-y: auto; -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
      <div className="kshare-modal" style={{
        width:'100%', maxWidth:'440px',
        background:'rgba(255,255,255,0.78)',
        backdropFilter:'blur(28px) saturate(180%)',
        WebkitBackdropFilter:'blur(28px) saturate(180%)',
        borderRadius:24,
        overflow:'hidden',
        animation:'shareUp .3s cubic-bezier(.22,.68,0,1.1)',
        boxShadow:'0 24px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 0.5px rgba(0,0,0,0.06)',
        position:'relative',
      }} onClick={e => e.stopPropagation()}>

        <div aria-hidden style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:120, height:1, background:'linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)', pointerEvents:'none' }}/>

        {/* Etape X : image copiee -> explique de la coller (impossible a rater) */}
        {xStep && (
          <div style={{ position:'absolute', inset:0, zIndex:6, background:'rgba(255,255,255,0.97)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', borderRadius:24, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'36px 32px', textAlign:'center' }}>
            <div style={{ fontSize:46, marginBottom:14 }}>📋</div>
            <div style={{ fontSize:19, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:10 }}>Image copiée&nbsp;!</div>
            <div style={{ fontSize:14.5, color:'#48484A', lineHeight:1.55, marginBottom:26, maxWidth:300 }}>
              Sur X, colle-la dans ton tweet avec <b style={{ color:'#1D1D1F' }}>⌘V</b> (ou <b style={{ color:'#1D1D1F' }}>Ctrl+V</b>). Le texte et le lien sont déjà prêts.
            </div>
            <button onClick={()=>{ window.open(xIntent, '_blank'); setXStep(false) }} style={{ padding:'15px 30px', borderRadius:13, background:'#1D1D1F', color:'#fff', border:'none', fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'var(--font-display)', width:'100%', maxWidth:280 }}>
              Ouvrir X&nbsp;→
            </button>
            <button onClick={()=>setXStep(false)} style={{ marginTop:14, background:'none', border:'none', color:'#86868B', fontSize:13, cursor:'pointer', fontFamily:'var(--font-display)' }}>Annuler</button>
          </div>
        )}

        {/* Header */}
        <div style={{ padding:'22px 24px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ fontSize:17, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.2px' }}>Partager</div>
          <button onClick={onClose} style={{
            width:30, height:30, borderRadius:'50%',
            background:'rgba(255,255,255,0.6)',
            backdropFilter:'blur(8px)',
            WebkitBackdropFilter:'blur(8px)',
            border:'1px solid rgba(0,0,0,0.08)',
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

        {/* Aperçu : image serveur (carte / collection) ou apercu compact (wrapped/vitrine) */}
        {(() => {
          if ((isCard && ogCardUrl) || (isPortfolio && ogCollectionUrl) || (isWrapped && ogWrappedUrl)) {
            const src = (ogCardUrl || ogCollectionUrl || ogWrappedUrl)!
            const wide = (isPortfolio && !!ogCollectionUrl)
            return (
              <div style={{ padding:'4px 24px 16px', display:'flex', justifyContent:'center' }}>
                <img src={src} alt={title} style={{ width: wide ? '78%' : '62%', maxWidth: wide ? 300 : 240, borderRadius:14, boxShadow:'0 10px 30px rgba(0,0,0,0.18)' }} />
              </div>
            )
          }
          const apFan = isShowcase ? showcaseCards.filter(c=>c.image).slice(0,3)
            : isCard ? (card!.image ? [card!] : [])
            : portfolio.filter(c=>c.image).slice(0,3)
          const apHi = (img:string) => /\/low\.(webp|jpg|png)$/.test(img) ? img.replace(/\/low\.(webp|jpg|png)$/, '') + '/high.webp' : img
          const apVal = isCard ? (card!.curPrice + ' \u20AC') : formatEUR(totalCur, 'big')
          const apCount = isCard ? 1 : (isShowcase?showcaseCards:portfolio).length
          return (
            <div style={{ padding:'4px 24px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, background:'#0A0A14', borderRadius:14, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
                <div aria-hidden style={{ position:'absolute', top:0, left:0, right:0, height:'70%', background:'radial-gradient(ellipse at 30% 0%, rgba(60,40,100,0.4) 0%, transparent 70%)', pointerEvents:'none' }}/>
                <div style={{ display:'flex', alignItems:'center', flexShrink:0, position:'relative', zIndex:1 }}>
                  {isWrapped ? (
                    <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(224,48,32,0.14)', border:'1.5px solid rgba(224,48,32,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {wProf && <Ic d={wProf.icon} c="#E03020" s={26}/>}
                    </div>
                  ) : apFan.length>0 ? apFan.map((c,i)=>(
                    <img key={c.id} src={apHi(c.image!)} alt={c.name} crossOrigin="anonymous"
                      style={{ width:i===Math.floor(apFan.length/2)&&apFan.length===3?44:38, borderRadius:5, marginLeft:i===0?0:-14, transform:`rotate(${apFan.length===3?(i===0?-10:i===2?10:0):apFan.length===2?(i===0?-6:6):0}deg)`, zIndex:i===1?3:1, position:'relative', border:'1px solid rgba(255,255,255,0.2)', boxShadow:'0 4px 12px rgba(0,0,0,0.5)' }}
                      onError={e=>{const t=e.target as HTMLImageElement; if(t.src.endsWith('/high.webp')){t.src=t.src.replace('/high.webp','/high.jpg')}else{t.style.display='none'}}} />
                  )) : (
                    <div style={{ width:40, height:56, borderRadius:6, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)' }}/>
                  )}
                </div>
                <div style={{ flex:1, minWidth:0, position:'relative', zIndex:1 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#E03020', fontFamily:'var(--font-display)' }}>{isWrapped ? `Wrapped ${wrappedYear}` : 'Kodo Cards'}</div>
                  {isWrapped ? (
                    <>
                      <div style={{ fontSize:16, fontWeight:800, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-0.3px', marginTop:2, lineHeight:1.1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{wProf?.name}</div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', marginTop:2, fontFamily:'var(--font-display)' }}>{apVal} · {apCount} carte{apCount>1?'s':''}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:19, fontWeight:800, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', marginTop:1, lineHeight:1.1 }}>{apVal}</div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', marginTop:2, fontFamily:'var(--font-display)' }}>Story prête · {apCount} carte{apCount>1?'s':''}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Story 9:16 hors-écran — capturée par html2canvas */}
        <div aria-hidden style={{ position:'fixed', left:-99999, top:0, width:360, pointerEvents:'none', opacity:0 }}>
          {(() => {
            const fanCards = isShowcase ? showcaseCards.filter(c=>c.image).slice(0,3)
              : isCard ? (card!.image ? [card!] : [])
              : portfolio.filter(c=>c.image).slice(0,3)
            const hi = (img:string) => /\/low\.(webp|jpg|png)$/.test(img) ? img.replace(/\/low\.(webp|jpg|png)$/, '') + '/high.webp' : img
            const setCount = isCard ? 1 : new Set((isShowcase?showcaseCards:portfolio).map(c=>c.set)).size
            const cardCount = isCard ? 1 : (isShowcase?showcaseCards:portfolio).length
            const ctxLabel = isShowcase ? 'MA VITRINE' : isCard ? 'MA CARTE' : 'MON PORTFOLIO'
            const bigVal = isCard ? (card!.curPrice + ' \u20AC') : formatEUR(totalCur, 'big')
            const roiVal = isCard ? roi : totalROI
            const hasRoi = isCard ? card!.buyPrice > 0 : totalBuy > 0
            const roiPos = roiVal >= 0

            if (isWrapped) {
              const wRoiPos = totalROI >= 0
              return (
              <div ref={previewRef} style={{
                borderRadius:18, overflow:'hidden', background:'#0A0A14', aspectRatio:'9 / 16',
                position:'relative', display:'flex', flexDirection:'column', boxShadow:'0 0 0 0.5px rgba(0,0,0,0.4)',
              }}>
                <div aria-hidden style={{ position:'absolute', top:0, left:0, right:0, height:'45%', background:'radial-gradient(ellipse at 50% 0%, rgba(80,50,130,0.45) 0%, transparent 70%)', pointerEvents:'none' }}/>
                <div style={{ padding:'22px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative', zIndex:2 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:'#E03020', fontFamily:'var(--font-display)', letterSpacing:'-0.2px' }}>Kodo Cards</span>
                  <span style={{ fontSize:9, fontWeight:600, color:'rgba(255,255,255,0.45)', letterSpacing:'0.16em', fontFamily:'var(--font-display)' }}>WRAPPED {wrappedYear}</span>
                </div>
                <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'space-evenly', padding:'20px 18px', position:'relative', zIndex:2 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,0.5)', letterSpacing:'0.18em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)' }}>Mon bilan annuel</div>
                    <div style={{ fontSize:56, fontWeight:800, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-2px', lineHeight:1, marginTop:6 }}>{wrappedYear}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                    <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(224,48,32,0.14)', border:'1.5px solid rgba(224,48,32,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {wProf && <Ic d={wProf.icon} c="#E03020" s={30}/>}
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:17, fontWeight:800, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-0.3px' }}>{wProf?.name}</div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,0.5)', letterSpacing:'0.1em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)', marginTop:2 }}>{wProf?.sub}</div>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4, padding:'0 4px' }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:26, fontWeight:800, color:'#fff', fontFamily:'var(--font-display)', lineHeight:1 }}>{portfolio.length}</div>
                      <div style={{ fontSize:8, color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)', marginTop:4 }}>carte{portfolio.length>1?'s':''}</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:26, fontWeight:800, color:'#fff', fontFamily:'var(--font-display)', lineHeight:1 }}>{wSets}</div>
                      <div style={{ fontSize:8, color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)', marginTop:4 }}>set{wSets>1?'s':''}</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:26, fontWeight:800, color:totalBuy>0?(wRoiPos?'#3DD68C':'#FF6B5B'):'rgba(255,255,255,0.7)', fontFamily:'var(--font-display)', lineHeight:1 }}>{totalBuy>0?(wRoiPos?'+':'')+totalROI+'%':'—'}</div>
                      <div style={{ fontSize:8, color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)', marginTop:4 }}>ROI</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,0.5)', letterSpacing:'0.14em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)' }}>Valeur de la collection</div>
                    <div style={{ fontSize:36, fontWeight:800, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', marginTop:4 }}>{formatEUR(totalCur, 'big')}</div>
                  </div>
                </div>
                <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'0.5px solid rgba(255,255,255,0.1)', position:'relative', zIndex:2 }}>
                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.55)', fontFamily:'var(--font-display)' }}>{wBest ? `Pièce maîtresse · ${wBest.name}` : `${portfolio.length} carte${portfolio.length>1?'s':''}`}</span>
                  <span style={{ fontSize:9, fontWeight:600, color:'rgba(255,255,255,0.75)', fontFamily:'var(--font-display)' }}>kodocards.com</span>
                </div>
              </div>
              )
            }

            return (
            <div ref={previewRef} style={{
              borderRadius:18,
              overflow:'hidden',
              background:'#0A0A14',
              aspectRatio:'9 / 16',
              position:'relative',
              display:'flex', flexDirection:'column',
              boxShadow:'0 0 0 0.5px rgba(0,0,0,0.4)',
            }}>
              <div aria-hidden style={{ position:'absolute', top:0, left:0, right:0, height:'45%', background:'radial-gradient(ellipse at 50% 0%, rgba(60,40,100,0.35) 0%, transparent 70%)', pointerEvents:'none' }}/>

              <div style={{ padding:'22px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative', zIndex:2 }}>
                <span style={{ fontSize:14, fontWeight:700, color:'#E03020', fontFamily:'var(--font-display)', letterSpacing:'-0.2px' }}>Kodo Cards</span>
                <span style={{ fontSize:9, fontWeight:600, color:'rgba(255,255,255,0.45)', letterSpacing:'0.16em', fontFamily:'var(--font-display)' }}>{ctxLabel}</span>
              </div>

              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', zIndex:1, minHeight:0, padding:'8px 0' }}>
                {fanCards.length > 0 ? (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {fanCards.map((c,i) => {
                      const isCenter = fanCards.length===3 ? i===1 : (fanCards.length===1)
                      const rot = fanCards.length===3 ? (i===0?-12:i===2?12:0) : fanCards.length===2 ? (i===0?-7:7) : 0
                      const w = isCenter ? 118 : 94
                      const ml = i===0 ? 0 : (fanCards.length===3 ? -22 : -16)
                      return (
                        <img key={c.id} src={hi(c.image!)} alt={c.name} crossOrigin="anonymous"
                          style={{ width:w, borderRadius:8, marginLeft:ml, transform:`rotate(${rot}deg)`, zIndex:isCenter?3:1, position:'relative', border:'1.5px solid rgba(255,255,255,0.2)', boxShadow:isCenter?'0 16px 40px rgba(0,0,0,0.6)':'0 10px 28px rgba(0,0,0,0.55)' }}
                          onError={e => { const t = e.target as HTMLImageElement; if (t.src.endsWith('/high.webp')) { t.src = t.src.replace('/high.webp','/high.jpg') } else { t.style.display='none' } }} />
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ width:92, height:128, borderRadius:10, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,0.1)' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.6"><path d="M4 4h16v16H4zM9 4v16M15 4v16"/></svg>
                  </div>
                )}
              </div>

              <div style={{ textAlign:'center', padding:'0 20px', position:'relative', zIndex:2 }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', letterSpacing:'0.14em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)', marginBottom:4 }}>{isCard ? card!.set : 'Valeur de la collection'}</div>
                <div style={{ fontSize:34, fontWeight:800, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-1px', lineHeight:1 }}>{bigVal}</div>
                {hasRoi && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:10, background:roiPos?'rgba(46,158,106,0.16)':'rgba(224,48,32,0.16)', border:`1px solid ${roiPos?'rgba(46,158,106,0.4)':'rgba(224,48,32,0.4)'}`, borderRadius:999, padding:'4px 14px' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:roiPos?'#3DD68C':'#FF6B5B', fontFamily:'var(--font-display)' }}>{roiPos?'\u2191':'\u2193'} {roiPos?'+':''}{roiVal}%</span>
                  </div>
                )}
              </div>

              <div style={{ padding:'18px 20px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'0.5px solid rgba(255,255,255,0.1)', marginTop:18, position:'relative', zIndex:2 }}>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.55)', fontFamily:'var(--font-display)' }}>{isCard ? card!.name : `${cardCount} carte${cardCount>1?'s':''} \u00B7 ${setCount} set${setCount>1?'s':''}`}</span>
                <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.75)', letterSpacing:'0.04em', fontFamily:'var(--font-display)' }}>kodocards.com</span>
              </div>
            </div>
            )
          })()}
        </div>

        {/* Share buttons */}
        <div style={{ padding:'0 24px 14px' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#AEAEB2', fontFamily:'var(--font-display)', marginBottom:10, paddingLeft:2 }}>Partager vers</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
            {[
              { id:'twitter', label:'X', svg:<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, dark:true },
              { id:'story', label:'Instagram', svg:<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>, dark:true },
              { id:'tiktok', label:'TikTok', svg:<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.1z"/></svg>, dark:true },
              { id:'link', label:copied ? 'Copie' : 'Lien', svg:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>, dark:false },
            ].map(b => (
              <button key={b.id} onClick={() => handleShare(b.id)} style={{
                padding:'14px 4px 12px',
                borderRadius:12,
                background:'rgba(255,255,255,0.7)',
                backdropFilter:'blur(12px) saturate(180%)',
                WebkitBackdropFilter:'blur(12px) saturate(180%)',
                border:'1px solid rgba(229,229,234,0.7)',
                color:'#1D1D1F',
                cursor:'pointer',
                display:'flex', flexDirection:'column' as const, alignItems:'center', gap:5,
                fontFamily:'var(--font-display)',
                transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
              }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 1px rgba(0,0,0,0.08)' }}
                onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
                {b.svg}
                <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.05em' }}>{b.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Generate + Download */}
        <div style={{ padding:'0 24px 14px' }}>
          <button onClick={async () => { const u = await generateImage(); download(u || undefined) }} disabled={generating} style={{
            width:'100%', padding:'13px 16px',
            borderRadius:12,
            background: generating ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.7)',
            backdropFilter:'blur(12px) saturate(180%)',
            WebkitBackdropFilter:'blur(12px) saturate(180%)',
            color: generating ? '#AEAEB2' : '#1D1D1F',
            border:'1px solid rgba(229,229,234,0.7)',
            fontSize:12.5, fontWeight:700,
            cursor: generating ? 'wait' : 'pointer',
            fontFamily:'var(--font-display)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
            transition:'all .2s cubic-bezier(.2,.85,.3,1)',
            letterSpacing:'0.04em',
          }}
            onMouseEnter={e=>{ if(!generating){ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.color='#fff'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)' } }}
            onMouseLeave={e=>{ if(!generating){ e.currentTarget.style.background='rgba(255,255,255,0.7)'; e.currentTarget.style.color='#1D1D1F'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)' } }}>
            {!generating && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>}
            {generating ? 'Generation en cours...' : "Sauvegarder l'image"}
          </button>
        </div>

        {/* Referral */}
        <div style={{ padding:'0 24px 20px' }}>
          <div style={{
            background:'rgba(224,48,32,0.06)',
            border:'1px solid rgba(224,48,32,0.18)',
            borderRadius:14,
            padding:'14px 16px',
            boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:'rgba(224,48,32,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E03020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.1px', lineHeight:1.2 }}>Parrainez un ami</div>
                <div style={{ fontSize:12, color:'#6E6E73', marginTop:2, fontFamily:'var(--font-display)' }}>1 mois offert pour vous deux</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.7)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:9, padding:'8px 8px 8px 12px' }}>
              <span style={{ flex:1, minWidth:0, fontSize:12, fontWeight:700, color:'#E03020', fontFamily:'var(--font-data)', letterSpacing:'0.04em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{REFERRAL}</span>
              <button onClick={() => { navigator.clipboard.writeText(REFERRAL); setRefCopied(true); showToast('Code copie'); setTimeout(() => setRefCopied(false), 2000) }} style={{
                padding:'7px 16px',
                borderRadius:7,
                background: refCopied ? '#2E9E6A' : '#1D1D1F',
                color:'#fff',
                border:'none',
                fontSize:11, fontWeight:700,
                cursor:'pointer',
                fontFamily:'var(--font-display)',
                whiteSpace:'nowrap' as const,
                flexShrink:0,
                transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                letterSpacing:'0.05em',
              }}
                onMouseEnter={e=>{ if(!refCopied){ e.currentTarget.style.background='#000' } }}
                onMouseLeave={e=>{ if(!refCopied){ e.currentTarget.style.background='#1D1D1F' } }}>
                {refCopied ? '✓ Copié' : 'Copier'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}
