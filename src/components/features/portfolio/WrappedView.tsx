"use client"
import { formatEUR } from '@/lib/formatPrice'

interface CardItem {
  id:string; name:string; set:string; year:number; type:string;
  lang:string; condition:string; graded:boolean; buyPrice:number;
  curPrice:number; qty:number; signal?:string; image?:string; rarity?:string;
}

const EC: Record<string,string> = {
  fire:'#FF6B35',water:'#42A5F5',psychic:'#C855D4',dark:'#7E57C2',
  electric:'#D4A800',grass:'#3DA85A',fighting:'#EF5350',steel:'#90A4AE',
  fairy:'#FF6B8A',dragon:'#7C4DFF',normal:'#A8A878',
}
const TYPE_FR: Record<string,string> = {
  fire:'Feu',water:'Eau',psychic:'Psy',dark:'Tenebres',electric:'Electrik',
  grass:'Plante',fighting:'Combat',steel:'Acier',fairy:'Fee',dragon:'Dragon',normal:'Normal',
}
const RARE_SET = new Set(['Alt Art','Secret Rare','Gold Star','Ultra Rare','Illustration Rare','Special Art Rare'])

const Ic = ({ d, c, s=16 }: { d:string; c:string; s?:number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
)
const D = {
  cards:'M4 4h16v16H4zM9 4v16M15 4v16', folder:'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  diamond:'M12 2L2 12l10 10 10-10L12 2z', globe:'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20',
  star:'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  fire:'M12 12c-2-2.67-2-6 0-8 2.67 3.33 4 6.67 4 10s-1.33 5.33-4 6c-2.67-.67-4-2.67-4-6s1.33-6.67 4-10z',
  crown:'M2 20h20L18 8l-4 6-2-8-2 8-4-6-4 12z', trend:'M23 6l-9.5 9.5-5-5L1 18',
  share:'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13',
  save:'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8',
  shield:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', zap:'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  target:'M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z',
}

interface Badge { id:string; name:string; icon:string; color:string; desc:string; check:(p:CardItem[],v:number)=>boolean }

/* ── PROFILS COLLECTIONNEUR ── */
interface Profile { id:string; name:string; sub:string; quote:string; icon:string; color:string }
function getProfile(p: CardItem[], totalCur: number): Profile {
  const rarePct = p.filter(c=>c.rarity&&RARE_SET.has(c.rarity)).length / Math.max(p.length,1)
  const frPct = p.filter(c=>c.lang==='FR').length / Math.max(p.length,1)
  const vintPct = p.filter(c=>c.year<2015).length / Math.max(p.length,1)
  const langCount = new Set(p.map(c=>c.lang)).size
  const bestROI = p.filter(c=>c.buyPrice>0).reduce((best,c)=>{const r=((c.curPrice-c.buyPrice)/c.buyPrice);return r>best?r:best},0)

  if (totalCur >= 5000) return { id:'whale', name:'La Baleine', sub:'Collectionneur d\'exception', quote:'Les marketplaces tremblent a ton passage.', icon:D.zap, color:'#7C4DFF' }
  if (bestROI >= 0.3 && p.filter(c=>c.buyPrice>0).length >= 3) return { id:'hunter', name:'Le Chasseur', sub:'Investisseur avise', quote:'Tu ne collectionnes pas. Tu investis.', icon:D.target, color:'#2E9E6A' }
  if (rarePct >= 0.3) return { id:'aesthete', name:'L\'Esthete', sub:'Amoureux de la beaute', quote:'Seule la beaute compte.', icon:D.diamond, color:'#C855D4' }
  if (frPct >= 0.7) return { id:'purist', name:'Le Puriste', sub:'Fidele aux origines', quote:'Full FR ou rien.', icon:D.shield, color:'#42A5F5' }
  if (vintPct >= 0.5) return { id:'archaeo', name:'L\'Archeologue', sub:'Gardien du passe', quote:'Le passe est ton terrain de jeu.', icon:D.crown, color:'#D97706' }
  if (langCount >= 3) return { id:'globe', name:'Le Globetrotter', sub:'Collectionneur sans frontieres', quote:'Ta collection n\'a pas de frontieres.', icon:D.globe, color:'#FF6B35' }
  if (p.length >= 10) return { id:'guardian', name:'Le Gardien', sub:'Collectionneur passionne', quote:'Ta collection est un musee.', icon:D.cards, color:'#E03020' }
  return { id:'newbie', name:'Le Decouvreur', sub:'Debut d\'une grande aventure', quote:'Chaque grande collection commence par une carte.', icon:D.star, color:'#D97706' }
}

const BADGES: Badge[] = [
  { id:'collector', name:'Collectionneur', icon:D.cards, color:'#E03020', desc:'10+ cartes', check:(p)=>p.length>=10 },
  { id:'investor', name:'Investisseur', icon:D.trend, color:'#2E9E6A', desc:'500+ EUR', check:(_,v)=>v>=500 },
  { id:'rare', name:'Chasseur Rare', icon:D.diamond, color:'#C855D4', desc:'5+ rares', check:(p)=>p.filter(c=>c.rarity&&RARE_SET.has(c.rarity)).length>=5 },
  { id:'fullFR', name:'Full FR', icon:D.shield, color:'#42A5F5', desc:'Majorite FR', check:(p)=>p.filter(c=>c.lang==='FR').length>p.length/2 },
  { id:'vintage', name:'Vintage', icon:D.crown, color:'#D97706', desc:'Carte pre-2010', check:(p)=>p.some(c=>c.year<2010) },
  { id:'grader', name:'Gradeur', icon:D.star, color:'#FF6B35', desc:'Cartes gradees', check:(p)=>p.some(c=>c.graded) },
  { id:'diverse', name:'Explorateur', icon:D.globe, color:'#3DA85A', desc:'5+ sets', check:(p)=>[...new Set(p.map(c=>c.set))].length>=5 },
  { id:'whale', name:'Baleine', icon:D.zap, color:'#7C4DFF', desc:'5000+ EUR', check:(_,v)=>v>=5000 },
]

interface Props {
  portfolio: CardItem[]; totalCur:number; totalBuy:number; totalROI:number; totalGain:number;
  bestCard: CardItem|null; favs: Set<string>; onShare:()=>void
}

export function WrappedView({ portfolio, totalCur, totalBuy, totalROI, totalGain, onShare }: Props) {
  const setsOwned = [...new Set(portfolio.map(c=>c.set))]
  const rareCt = portfolio.filter(c=>c.rarity&&RARE_SET.has(c.rarity)).length
  const totalQty = portfolio.reduce((s,c)=>s+c.qty, 0)
  const langs: Record<string,number> = {}
  portfolio.forEach(c=>{langs[c.lang]=(langs[c.lang]??0)+1})
  const types: Record<string,number> = {}
  portfolio.forEach(c=>{types[c.type]=(types[c.type]??0)+1})
  const topType = Object.entries(types).sort((a,b)=>b[1]-a[1])[0]
  const rarestCard = portfolio.find(c=>c.rarity&&RARE_SET.has(c.rarity)) ?? portfolio[0]
  const heroCards = portfolio.filter(c=>c.image).slice(0, 3)
  const vintageCount = portfolio.filter(c=>c.year<2015).length
  const modernCount = portfolio.length - vintageCount
  const earned = BADGES.filter(b=>b.check(portfolio, totalCur))

  const ci = (c:CardItem) => c.image?`${c.image.replace(/\/low\.(webp|jpg|png)$/,'')}/high.webp`:''

  if (portfolio.length===0) return (
    <div style={{ textAlign:'center', padding:'60px 28px' }}>
      <Ic d={D.cards} c="#D2D2D7" s={40}/>
      <div style={{ marginTop:'16px', fontSize:'16px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>Votre Wrapped vous attend</div>
      <div style={{ marginTop:'6px', fontSize:'13px', color:'#86868B', maxWidth:'280px', margin:'6px auto 0', lineHeight:1.6 }}>Ajoutez des cartes pour debloquer votre bilan.</div>
    </div>
  )

  return (
    <div style={{ position:'relative', zIndex:1, animation:'wrappedIn .35s ease-out' }}>

      {/* ═══════ BLOC 1 — HERO ═══════ */}
      <div style={{ background:'linear-gradient(160deg,#0A0A0A 0%,#1A0E06 50%,#0A0A0A 100%)', borderRadius:'20px', margin:'0 24px', padding:'40px 24px 32px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 25%,rgba(224,48,32,.14) 0%,transparent 55%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:0, left:'12%', right:'12%', height:'1px', background:'linear-gradient(90deg,transparent,rgba(224,48,32,.35),transparent)' }}/>

        <div style={{ position:'relative', zIndex:1, textAlign:'center' }}>
          {/* Badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(224,48,32,.12)', border:'1px solid rgba(224,48,32,.2)', borderRadius:'99px', padding:'5px 14px', marginBottom:'20px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#E03020' }}/>
            <span style={{ fontSize:'10px', fontWeight:700, color:'#E03020', letterSpacing:'.15em', textTransform:'uppercase', fontFamily:'var(--font-display)' }}>Wrapped 2026</span>
          </div>

          {/* Value */}
          <div style={{ fontSize:'48px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-2px', lineHeight:1 }}>{formatEUR(totalCur, 'big')}</div>

          {totalBuy>0&&(
            <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', marginTop:'10px', background:'rgba(46,158,106,.1)', border:'1px solid rgba(46,158,106,.2)', borderRadius:'99px', padding:'4px 14px' }}>
              <Ic d={D.trend} c="#4ECCA3" s={14}/>
              <span style={{ fontSize:'13px', color:'#4ECCA3', fontWeight:600, fontFamily:'var(--font-data)' }}>+{totalROI}% · {formatEUR(totalGain, 'sign')}</span>
            </div>
          )}

          {/* Compact stats */}
          <div style={{ display:'flex', justifyContent:'center', gap:'20px', marginTop:'16px' }}>
            {([
              {v:totalQty, l:'cartes', icon:D.cards},
              {v:setsOwned.length, l:'sets', icon:D.folder},
              {v:rareCt, l:'rares', icon:D.diamond},
            ]).map((s,i)=>(
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{ fontSize:'20px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)' }}>{s.v}</div>
                <div style={{ fontSize:'9px', color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'var(--font-display)', marginTop:'2px' }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Card fan */}
          {heroCards.length>=2&&(
            <div style={{ marginTop:'24px', display:'flex', justifyContent:'center', position:'relative' }}>
              {heroCards.map((c,i)=>{
                const a=heroCards.length>=3?[-10,0,10]:[-6,6]
                const y=heroCards.length>=3?[8,0,8]:[4,4]
                return <img key={c.id} src={ci(c)} alt={c.name} style={{ width:'100px', borderRadius:'10px', boxShadow:`0 16px 48px rgba(0,0,0,.5), 0 0 24px ${EC[c.type]??'#E03020'}20`, transform:`rotate(${a[i]}deg) translateY(${y[i]}px)`, marginLeft:i>0?'-14px':'0', position:'relative', zIndex:i===1?3:1 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
              })}
              <div style={{ position:'absolute', bottom:'-10px', width:'180px', height:'24px', left:'50%', transform:'translateX(-50%)', background:'radial-gradient(ellipse,rgba(224,48,32,.12) 0%,transparent 70%)', pointerEvents:'none' }}/>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ BLOC 2 — PROFIL COLLECTIONNEUR ═══════ */}
      {(()=>{
        const prof = getProfile(portfolio, totalCur)
        return (
          <div style={{ padding:'16px 24px 10px' }}>
            <div style={{ background:`linear-gradient(135deg,${prof.color}06,${prof.color}03)`, border:`1px solid ${prof.color}18`, borderRadius:'18px', padding:'22px', display:'flex', alignItems:'center', gap:'18px' }}>
              <div style={{ width:'60px', height:'60px', borderRadius:'50%', background:`linear-gradient(135deg,${prof.color},${prof.color}CC)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 6px 20px ${prof.color}25` }}>
                <Ic d={prof.icon} c="#fff" s={26}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'10px', color:'#86868B', textTransform:'uppercase', letterSpacing:'.12em', fontFamily:'var(--font-display)', marginBottom:'4px' }}>Ton profil collectionneur</div>
                <div style={{ fontSize:'22px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>{prof.name}</div>
                <div style={{ fontSize:'12px', color:prof.color, fontWeight:600, fontFamily:'var(--font-display)', marginTop:'2px' }}>{prof.sub}</div>
                <div style={{ fontSize:'11px', color:'#86868B', fontStyle:'italic', marginTop:'6px', lineHeight:1.5 }}>"{prof.quote}"</div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══════ BLOC 3 — PIÈCE MAÎTRESSE ═══════ */}
      {rarestCard&&(
        <div style={{ padding:'4px 24px 10px' }}>
          <div style={{ background:'linear-gradient(160deg,#0A0A0A,#1A1218)', borderRadius:'18px', padding:'24px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 50%,${EC[rarestCard.type]??'#C855D4'}12 0%,transparent 60%)`, pointerEvents:'none' }}/>
            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ fontSize:'10px', color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.12em', fontFamily:'var(--font-display)', marginBottom:'14px' }}>Ta piece maitresse</div>
              <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
                {rarestCard.image&&(
                  <img src={ci(rarestCard)} alt={rarestCard.name} style={{ width:'120px', borderRadius:'10px', boxShadow:`0 12px 36px rgba(0,0,0,.4), 0 0 20px ${EC[rarestCard.type]??'#C855D4'}20`, flexShrink:0 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                )}
                <div>
                  <div style={{ fontSize:'18px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)' }}>{rarestCard.name}</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,.4)', marginTop:'4px' }}>{rarestCard.set}</div>
                  {rarestCard.rarity&&<div style={{ display:'inline-flex', alignItems:'center', gap:'4px', marginTop:'8px', background:'rgba(200,85,212,.12)', border:'1px solid rgba(200,85,212,.2)', borderRadius:'6px', padding:'3px 10px' }}>
                    <Ic d={D.diamond} c="#C855D4" s={12}/>
                    <span style={{ fontSize:'10px', fontWeight:600, color:'#C855D4', fontFamily:'var(--font-display)' }}>{rarestCard.rarity}</span>
                  </div>}
                  {rarestCard.curPrice>0&&<div style={{ fontSize:'24px', fontWeight:700, color:'#fff', fontFamily:'var(--font-data)', marginTop:'10px' }}>{formatEUR(rarestCard.curPrice, 'big')}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ BLOC 4 — ADN COLLECTION ═══════ */}
      <div style={{ padding:'4px 24px 10px' }}>
        <div style={{ fontSize:'10px', fontWeight:600, color:'#86868B', textTransform:'uppercase', letterSpacing:'.12em', fontFamily:'var(--font-display)', marginBottom:'8px' }}>ADN de ta collection</div>
        <div style={{ display:'flex', gap:'8px' }}>
          {/* Territoire */}
          <div style={{ flex:1, background:'#F5F5F7', borderRadius:'16px', padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'10px' }}>
              <Ic d={D.globe} c="#42A5F5" s={14}/>
              <span style={{ fontSize:'11px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>Territoire</span>
            </div>
            <div style={{ display:'flex', gap:'3px', height:'6px', borderRadius:'3px', overflow:'hidden', marginBottom:'8px' }}>
              {Object.entries(langs).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
                <div key={k} style={{ flex:v, background:k==='FR'?'#42A5F5':k==='JP'?'#E03020':'#FF6B35', borderRadius:'3px' }}/>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
              {Object.entries(langs).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
                <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                    <div style={{ width:'6px', height:'6px', borderRadius:'2px', background:k==='FR'?'#42A5F5':k==='JP'?'#E03020':'#FF6B35' }}/>
                    <span style={{ fontSize:'10px', color:'#48484A', fontFamily:'var(--font-display)' }}>{k==='FR'?'Francais':k==='JP'?'Japonais':'Anglais'}</span>
                  </div>
                  <span style={{ fontSize:'10px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-data)' }}>{Math.round(v/portfolio.length*100)}%</span>
                </div>
              ))}
            </div>
          </div>
          {/* Ere */}
          <div style={{ flex:1, background:'#F5F5F7', borderRadius:'16px', padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'10px' }}>
              <Ic d={D.crown} c="#D97706" s={14}/>
              <span style={{ fontSize:'11px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>Ere</span>
            </div>
            <div style={{ display:'flex', gap:'3px', height:'6px', borderRadius:'3px', overflow:'hidden', marginBottom:'8px' }}>
              <div style={{ flex:vintageCount||1, background:'linear-gradient(90deg,#D97706,#FF8C00)', borderRadius:'3px' }}/>
              <div style={{ flex:modernCount||1, background:'linear-gradient(90deg,#42A5F5,#1976D2)', borderRadius:'3px' }}/>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                  <div style={{ width:'6px', height:'6px', borderRadius:'2px', background:'#D97706' }}/>
                  <span style={{ fontSize:'10px', color:'#48484A', fontFamily:'var(--font-display)' }}>Vintage</span>
                </div>
                <span style={{ fontSize:'10px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-data)' }}>{vintageCount}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                  <div style={{ width:'6px', height:'6px', borderRadius:'2px', background:'#42A5F5' }}/>
                  <span style={{ fontSize:'10px', color:'#48484A', fontFamily:'var(--font-display)' }}>Moderne</span>
                </div>
                <span style={{ fontSize:'10px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-data)' }}>{modernCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ BLOC 5 — BADGES DRESSEUR ═══════ */}
      <div style={{ padding:'4px 24px 10px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
          <div style={{ fontSize:'10px', fontWeight:600, color:'#86868B', textTransform:'uppercase', letterSpacing:'.12em', fontFamily:'var(--font-display)' }}>Badges Dresseur</div>
          <div style={{ fontSize:'10px', color:'#86868B', fontFamily:'var(--font-data)' }}>{earned.length}/{BADGES.length}</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
          {BADGES.map(b=>{
            const ok = b.check(portfolio, totalCur)
            return (
              <div key={b.id} style={{ background:ok?`${b.color}08`:'#F5F5F7', border:`1px solid ${ok?b.color+'20':'#E5E5EA'}`, borderRadius:'14px', padding:'12px 4px', textAlign:'center', opacity:ok?1:.35 }}>
                <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:ok?`linear-gradient(135deg,${b.color},${b.color}CC)`:'#D2D2D7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 5px', boxShadow:ok?`0 3px 10px ${b.color}25`:'none' }}>
                  <Ic d={b.icon} c={ok?'#fff':'#AEAEB2'} s={14}/>
                </div>
                <div style={{ fontSize:'9px', fontWeight:700, color:ok?'#1D1D1F':'#AEAEB2', fontFamily:'var(--font-display)' }}>{b.name}</div>
                <div style={{ fontSize:'7px', color:ok?'#86868B':'#C7C7CC', marginTop:'1px' }}>{b.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════ CTA ═══════ */}
      <div style={{ padding:'8px 24px 24px', display:'flex', gap:'8px' }}>
        <button onClick={onShare} className="btn-shimmer" style={{ flex:1, padding:'14px', borderRadius:'14px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          <Ic d={D.share} c="#fff" s={16}/>
          Partager mon Wrapped 2026
        </button>
        <button style={{ padding:'14px 18px', borderRadius:'14px', background:'#F5F5F7', color:'#48484A', border:'1px solid #E5E5EA', fontSize:'14px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:'6px' }}>
          <Ic d={D.save} c="#48484A" s={16}/>
          Sauvegarder
        </button>
      </div>
    </div>
  )
}
