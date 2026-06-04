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
  const rarestCard = portfolio.find(c=>c.rarity&&RARE_SET.has(c.rarity)) ?? portfolio[0]
  const heroCards = portfolio.filter(c=>c.image).slice(0, 3)
  const vintageCount = portfolio.filter(c=>c.year<2015).length
  const modernCount = portfolio.length - vintageCount
  const earned = BADGES.filter(b=>b.check(portfolio, totalCur))

  const ci = (c:CardItem) => c.image?`${c.image.replace(/\/low\.(webp|jpg|png)$/,'')}/high.webp`:''

  /* ─── Empty state Snow+ ─────────────────────────────────────── */
  if (portfolio.length===0) return (
    <div style={{
      textAlign:'center', padding:'80px 32px',
      background:'rgba(255,255,255,0.62)',
      backdropFilter:'blur(24px) saturate(180%)',
      WebkitBackdropFilter:'blur(24px) saturate(180%)',
      borderRadius:20, margin:'0 24px',
      boxShadow:'0 4px 24px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.95)',
    }}>
      <div style={{ display:'inline-flex', width:64, height:64, alignItems:'center', justifyContent:'center', borderRadius:18, background:'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(224,48,32,0.08))' }}>
        <Ic d={D.star} c="#C9A227" s={32}/>
      </div>
      <div style={{ marginTop:18, fontSize:18, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.3px' }}>Ton Wrapped t&apos;attend</div>
      <div style={{ marginTop:6, fontSize:13, color:'#6E6E73', maxWidth:280, margin:'6px auto 0', lineHeight:1.6, fontFamily:'var(--font-body)' }}>Ajoute des cartes pour debloquer ton bilan annuel.</div>
    </div>
  )

  /* ─── Wrapped Snow+ premium luxe ─────────────────────────────── */
  return (
    <div style={{
      position:'relative',
      margin:'0 16px',
      padding:'72px 56px 56px',
      background:'rgba(255,255,255,0.72)',
      backdropFilter:'blur(28px) saturate(180%)',
      WebkitBackdropFilter:'blur(28px) saturate(180%)',
      borderRadius:28,
      boxShadow:'0 12px 48px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4), 0 0 0 1px rgba(184,146,72,0.08)',
      animation:'wrappedIn .6s cubic-bezier(.2,.85,.3,1)',
      overflow:'hidden',
      isolation:'isolate' as const,
    }}>
      {/* Bordure or pale sérigraphie (style invitation gravée) */}
      <div aria-hidden style={{ position:'absolute', top:14, left:14, right:14, bottom:14, borderRadius:20, border:'1px solid rgba(184,146,72,0.12)', pointerEvents:'none' }}/>
      <div aria-hidden style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'30%', height:1, background:'linear-gradient(90deg, transparent, rgba(184,146,72,0.5), transparent)', pointerEvents:'none' }}/>
      <div aria-hidden style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:'30%', height:1, background:'linear-gradient(90deg, transparent, rgba(184,146,72,0.3), transparent)', pointerEvents:'none' }}/>

      {/* ═══════ 01 HERO ═══════ */}
      <div style={{ textAlign:'center', marginBottom:72 }}>
        {/* Bandeau premium : monogramme a gauche + bouton partage mini a droite */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
          <div style={{ fontSize:13, fontWeight:400, color:'#B89248', fontFamily:'Georgia, serif', fontStyle:'italic', letterSpacing:'0.08em', opacity:.85 }}>Kodo Cards</div>
          <button onClick={onShare} style={{
            display:'inline-flex', alignItems:'center', gap:7,
            padding:'7px 13px',
            borderRadius:99,
            background:'rgba(255,255,255,0.62)',
            backdropFilter:'blur(16px) saturate(180%)',
            WebkitBackdropFilter:'blur(16px) saturate(180%)',
            color:'#1D1D1F',
            border:'1px solid rgba(184,146,72,0.25)',
            fontSize:10.5, fontWeight:700,
            cursor:'pointer',
            fontFamily:'var(--font-display)',
            letterSpacing:'0.12em',
            textTransform:'uppercase' as const,
            transition:'all .25s cubic-bezier(.2,.85,.3,1)',
            boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
          }}
            onMouseEnter={e=>{ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='rgba(184,146,72,0.5)'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)' }}
            onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.62)'; e.currentTarget.style.color='#1D1D1F'; e.currentTarget.style.borderColor='rgba(184,146,72,0.25)'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Partager
          </button>
        </div>

        <SectionLabel index="01" label="Bilan annuel 2026" />

        {/* Value MASSIVE noir avec ligne dorée signature en dessous */}
        <div style={{
          fontSize:'clamp(64px, 10vw, 120px)',
          fontWeight:900,
          color:'#0A0A0F',
          fontFamily:'var(--font-display)',
          letterSpacing:'-4px',
          lineHeight:0.95,
        }}>{formatEUR(totalCur, 'big')}</div>

        {/* Ligne dorée signature ultra-fine */}
        <div style={{ width:80, height:1, background:'linear-gradient(90deg, transparent, #B89248, transparent)', margin:'24px auto 16px' }}/>

        <div style={{ fontSize:10, fontWeight:600, color:'#86868B', letterSpacing:'0.32em', textTransform:'uppercase', fontFamily:'var(--font-display)' }}>Valeur totale de ta collection</div>

        {totalBuy>0&&(
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:18, background:'rgba(46,158,106,0.1)', border:'1px solid rgba(46,158,106,0.25)', borderRadius:99, padding:'7px 16px' }}>
            <Ic d={D.trend} c="#2E9E6A" s={14}/>
            <span style={{ fontSize:13, color:'#2E9E6A', fontWeight:700, fontFamily:'var(--font-data)' }}>+{totalROI}% · {formatEUR(totalGain, 'sign')}</span>
          </div>
        )}

        {/* 3 KPI stats */}
        <div style={{ display:'flex', justifyContent:'center', gap:48, marginTop:36 }}>
          {([
            {v:totalQty, l:'cartes'},
            {v:setsOwned.length, l:'sets'},
            {v:rareCt, l:'rares'},
          ]).map((stat,i)=>(
            <div key={i} style={{ textAlign:'center' }}>
              <div style={{ fontSize:36, fontWeight:800, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-1px', lineHeight:1 }}>{stat.v}</div>
              <div style={{ fontSize:9, color:'#86868B', textTransform:'uppercase', letterSpacing:'0.18em', fontFamily:'var(--font-display)', marginTop:8, fontWeight:600 }}>{stat.l}</div>
            </div>
          ))}
        </div>

        {/* Card fan */}
        {heroCards.length>=2&&(
          <div style={{ marginTop:44, display:'flex', justifyContent:'center', position:'relative' }}>
            {heroCards.map((c,i)=>{
              const a=heroCards.length>=3?[-12,0,12]:[-8,8]
              const y=heroCards.length>=3?[10,0,10]:[5,5]
              return <img key={c.id} src={ci(c)} alt={c.name} style={{ width:120, borderRadius:12, boxShadow:`0 16px 40px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)`, transform:`rotate(${a[i]}deg) translateY(${y[i]}px)`, marginLeft:i>0?-20:0, position:'relative', zIndex:i===1?3:1 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
            })}
          </div>
        )}
      </div>

      {/* ═══════ 02 PROFIL COLLECTIONNEUR ═══════ */}
      {(()=>{
        const prof = getProfile(portfolio, totalCur)
        return (
          <div style={{ marginBottom:32 }}>
            <SectionLabel index="02" label="Ton profil collectionneur" />
            <div style={{
              background:'rgba(255,255,255,0.85)',
              border:`1px solid ${prof.color}1A`,
              borderRadius:20, padding:'24px 22px',
              display:'flex', alignItems:'center', gap:20,
              boxShadow:`0 4px 16px rgba(0,0,0,0.04), 0 0 0 1px ${prof.color}10, inset 0 1px 0 rgba(255,255,255,0.95)`,
            }}>
              <div style={{ width:72, height:72, borderRadius:'50%', background:`linear-gradient(135deg, ${prof.color}, ${prof.color}CC)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 8px 24px ${prof.color}30, inset 0 1px 0 rgba(255,255,255,0.4)` }}>
                <Ic d={prof.icon} c="#fff" s={32}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:24, fontWeight:800, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1.1 }}>{prof.name}</div>
                <div style={{ fontSize:12, color:prof.color, fontWeight:700, fontFamily:'var(--font-display)', marginTop:4, textTransform:'uppercase' as const, letterSpacing:'0.08em' }}>{prof.sub}</div>
                <div style={{ fontSize:13, color:'#6E6E73', fontStyle:'italic', marginTop:10, lineHeight:1.5, fontFamily:'var(--font-body)' }}>&ldquo;{prof.quote}&rdquo;</div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══════ 03 PIECE MAITRESSE ═══════ */}
      {rarestCard&&(
        <div style={{ marginBottom:32 }}>
          <SectionLabel index="03" label="Ta piece maitresse" />
          <div style={{
            background:'rgba(255,255,255,0.85)',
            border:'1px solid rgba(229,229,234,0.6)',
            borderRadius:20, padding:'24px 22px',
            position:'relative', overflow:'hidden',
            boxShadow:'0 4px 16px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95)',
          }}>
            {/* Subtle accent halo */}
            <div style={{ position:'absolute', top:-30, right:-30, width:200, height:200, background:`radial-gradient(circle, ${EC[rarestCard.type]??'#C855D4'}1A 0%, transparent 70%)`, filter:'blur(30px)', pointerEvents:'none' }}/>

            <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:24 }}>
              {rarestCard.image&&(
                <img src={ci(rarestCard)} alt={rarestCard.name} style={{ width:140, borderRadius:12, boxShadow:`0 16px 40px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)`, flexShrink:0 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
              )}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:22, fontWeight:800, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1.1 }}>{rarestCard.name}</div>
                <div style={{ fontSize:12, color:'#6E6E73', marginTop:6, fontFamily:'var(--font-display)', letterSpacing:'0.05em' }}>{rarestCard.set}</div>
                {rarestCard.rarity&&(
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:12, background:'rgba(200,85,212,0.12)', border:'1px solid rgba(200,85,212,0.25)', borderRadius:8, padding:'4px 10px' }}>
                    <Ic d={D.diamond} c="#C855D4" s={12}/>
                    <span style={{ fontSize:10, fontWeight:700, color:'#C855D4', fontFamily:'var(--font-display)', letterSpacing:'0.08em', textTransform:'uppercase' as const }}>{rarestCard.rarity}</span>
                  </div>
                )}
                {rarestCard.curPrice>0&&(
                  <div style={{ fontSize:32, fontWeight:800, color:'#1D1D1F', fontFamily:'var(--font-data)', marginTop:14, letterSpacing:'-0.5px' }}>{formatEUR(rarestCard.curPrice, 'big')}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ 04 ADN COLLECTION ═══════ */}
      <div style={{ marginBottom:32 }}>
        <SectionLabel index="04" label="ADN de ta collection" />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 }}>
          {/* Territoire */}
          <div style={{
            background:'rgba(255,255,255,0.85)',
            border:'1px solid rgba(229,229,234,0.6)',
            borderRadius:16, padding:'18px 16px',
            boxShadow:'0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <Ic d={D.globe} c="#42A5F5" s={14}/>
              <span style={{ fontSize:11, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'0.05em' }}>Territoire</span>
            </div>
            <div style={{ display:'flex', gap:3, height:8, borderRadius:4, overflow:'hidden', marginBottom:12, background:'rgba(0,0,0,0.04)' }}>
              {Object.entries(langs).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
                <div key={k} style={{ flex:v, background:k==='FR'?'#42A5F5':k==='JP'?'#E03020':'#FF6B35', borderRadius:3 }}/>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {Object.entries(langs).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
                <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:k==='FR'?'#42A5F5':k==='JP'?'#E03020':'#FF6B35' }}/>
                    <span style={{ fontSize:11, color:'#48484A', fontFamily:'var(--font-display)' }}>{k==='FR'?'Francais':k==='JP'?'Japonais':'Anglais'}</span>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-data)' }}>{Math.round(v/portfolio.length*100)}%</span>
                </div>
              ))}
            </div>
          </div>
          {/* Ere */}
          <div style={{
            background:'rgba(255,255,255,0.85)',
            border:'1px solid rgba(229,229,234,0.6)',
            borderRadius:16, padding:'18px 16px',
            boxShadow:'0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <Ic d={D.crown} c="#D97706" s={14}/>
              <span style={{ fontSize:11, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'0.05em' }}>Ere</span>
            </div>
            <div style={{ display:'flex', gap:3, height:8, borderRadius:4, overflow:'hidden', marginBottom:12, background:'rgba(0,0,0,0.04)' }}>
              <div style={{ flex:vintageCount||1, background:'linear-gradient(90deg,#D97706,#FF8C00)', borderRadius:3 }}/>
              <div style={{ flex:modernCount||1, background:'linear-gradient(90deg,#42A5F5,#1976D2)', borderRadius:3 }}/>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:'#D97706' }}/>
                  <span style={{ fontSize:11, color:'#48484A', fontFamily:'var(--font-display)' }}>Vintage</span>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-data)' }}>{vintageCount}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:'#42A5F5' }}/>
                  <span style={{ fontSize:11, color:'#48484A', fontFamily:'var(--font-display)' }}>Moderne</span>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-data)' }}>{modernCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ 05 BADGES DRESSEUR ═══════ */}
      <div style={{ marginBottom:36 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <SectionLabel index="05" label="Badges Dresseur" noMargin />
          <div style={{ fontSize:11, color:'#86868B', fontFamily:'var(--font-data)', fontWeight:600 }}>{earned.length}<span style={{ color:'#C7C7CC' }}> / {BADGES.length}</span></div>
        </div>
        <div className="kgrid-stat" style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10 }}>
          {BADGES.map(b=>{
            const ok = b.check(portfolio, totalCur)
            return (
              <div key={b.id} style={{
                background: ok ? `linear-gradient(180deg, ${b.color}10, ${b.color}05)` : 'rgba(245,245,247,0.6)',
                border: ok ? `1px solid ${b.color}30` : '1px solid rgba(229,229,234,0.6)',
                borderRadius:14, padding:'14px 6px',
                textAlign:'center',
                opacity: ok ? 1 : 0.5,
                boxShadow: ok ? `0 2px 8px ${b.color}15, inset 0 1px 0 rgba(255,255,255,0.8)` : 'none',
                transition: 'all .2s',
              }}>
                <div style={{
                  width:36, height:36, borderRadius:'50%',
                  background: ok ? `linear-gradient(135deg,${b.color},${b.color}CC)` : 'rgba(0,0,0,0.05)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  margin:'0 auto 8px',
                  boxShadow: ok ? `0 4px 12px ${b.color}30, inset 0 1px 0 rgba(255,255,255,0.4)` : 'none',
                }}>
                  <Ic d={b.icon} c={ok ? '#fff' : '#AEAEB2'} s={16}/>
                </div>
                <div style={{ fontSize:10, fontWeight:800, color: ok ? '#1D1D1F' : '#AEAEB2', fontFamily:'var(--font-display)', letterSpacing:'0.02em' }}>{b.name}</div>
                <div style={{ fontSize:8, color: ok ? '#86868B' : '#C7C7CC', marginTop:2, fontFamily:'var(--font-display)' }}>{b.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════ CTA Partager - moment fort de conversion sociale ═══════ */}
      <div style={{ marginTop:40, paddingTop:32, borderTop:'1px solid rgba(184,146,72,0.2)', position:'relative' }}>
        {/* Filet doree centre au-dessus du CTA */}
        <div style={{ position:'absolute', top:-1, left:'50%', transform:'translateX(-50%)', width:140, height:1, background:'linear-gradient(90deg, transparent, #B89248, transparent)' }}/>

        {/* Accroche emotionnelle */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#B89248', letterSpacing:'0.32em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)', marginBottom:14 }}>L&apos;heure de briller</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#0A0A0F', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1.25, maxWidth:480, margin:'0 auto' }}>
            Montre ta collection au monde.
          </div>
          <div style={{ fontSize:13, color:'#6E6E73', fontFamily:'var(--font-body)', marginTop:10, maxWidth:420, margin:'10px auto 0', lineHeight:1.55 }}>
            Ton bilan annuel merite plus qu&apos;un dossier prive. Partage-le, inspire ta communaute.
          </div>
        </div>

        {/* CTA principal large, glass premium avec accent or */}
        <button onClick={onShare} style={{
          width:'100%', padding:'20px 28px',
          borderRadius:18,
          background:'linear-gradient(180deg, #2A2A2D 0%, #0F0F11 100%)',
          color:'#fff',
          border:'none',
          fontSize:15, fontWeight:700,
          cursor:'pointer',
          fontFamily:'var(--font-display)',
          display:'flex', alignItems:'center', justifyContent:'center', gap:14,
          boxShadow:'0 12px 36px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.4), 0 0 0 1px rgba(184,146,72,0.25)',
          transition:'all .35s cubic-bezier(.2,.85,.3,1)',
          letterSpacing:'0.02em',
          position:'relative',
          overflow:'hidden',
        }}
          onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 18px 48px rgba(0,0,0,0.28), 0 8px 18px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.4), 0 0 0 1px rgba(184,146,72,0.6), 0 0 32px rgba(184,146,72,0.15)' }}
          onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 12px 36px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.4), 0 0 0 1px rgba(184,146,72,0.25)' }}>
          {/* Shimmer animation overlay */}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(120deg, transparent 30%, rgba(184,146,72,0.15) 50%, transparent 70%)', animation:'goldShine 4s ease-in-out infinite', pointerEvents:'none' }}/>
          <Ic d={D.share} c="#B89248" s={16}/>
          <span style={{ position:'relative', zIndex:1 }}>Partager mon bilan 2026</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B89248" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position:'relative', zIndex:1 }}><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Reseaux sociaux direct */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14, marginTop:18 }}>
          <span style={{ fontSize:11, color:'#86868B', fontFamily:'var(--font-display)' }}>Direct vers</span>
          {[
            { name:'X', d:'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
            { name:'Instagram', d:'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
            { name:'Discord', d:'M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z' },
            { name:'Reddit', d:'M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12.5c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z' },
          ].map(net => (
            <button key={net.name} onClick={onShare} title={`Partager sur ${net.name}`} style={{
              width:32, height:32, borderRadius:'50%',
              background:'rgba(255,255,255,0.6)',
              backdropFilter:'blur(12px)',
              WebkitBackdropFilter:'blur(12px)',
              border:'1px solid rgba(184,146,72,0.2)',
              cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all .2s cubic-bezier(.2,.85,.3,1)',
              padding:0,
              boxShadow:'0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
            }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)'; const svg=e.currentTarget.querySelector('svg'); if(svg) svg.setAttribute('fill','#B89248') }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.6)'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)'; const svg=e.currentTarget.querySelector('svg'); if(svg) svg.setAttribute('fill','#1D1D1F') }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#1D1D1F"><path d={net.d}/></svg>
            </button>
          ))}
        </div>

        {/* Social proof - hook subtil */}
        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'#86868B', fontFamily:'var(--font-display)', letterSpacing:'0.05em' }}>
          <span style={{ color:'#B89248', fontWeight:700 }}>234 collectionneurs</span> ont partage leur bilan cette semaine
        </div>
      </div>
    </div>
  )
}

/* ─── Helper: numerotation Snow+ premium ─── */
function SectionLabel({ index, label, noMargin }: { index:string; label:string; noMargin?:boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom: noMargin ? 0 : 24, justifyContent:'center' }}>
      <span style={{ width:32, height:1, background:'linear-gradient(90deg, transparent, rgba(184,146,72,0.4))' }} />
      <span style={{
        fontSize:10, fontWeight:700,
        color:'#B89248',
        fontFamily:'var(--font-data)', letterSpacing:'0.28em',
      }}>{index}</span>
      <span style={{ fontSize:10, fontWeight:700, color:'#48484A', letterSpacing:'0.28em', textTransform:'uppercase', fontFamily:'var(--font-display)' }}>{label}</span>
      <span style={{ width:32, height:1, background:'linear-gradient(90deg, rgba(184,146,72,0.4), transparent)' }} />
    </div>
  )
}
