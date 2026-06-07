
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSets, type StaticSet } from '@/lib/cardDb'
import { usePersona } from '@/lib/usePersona'
import type { ObjAggregates, SetCompletionData } from './Objectifs'

/* ── Couleurs d'ere (glass v7, teintes douces) ─────────────── */
function eraOf(setName: string): string {
  const l = (setName || '').toLowerCase()
  if (l.match(/base|jungle|fossil|neo|gym|rocket|wizard|legendary collection|expedition|aquapolis|skyridge/)) return 'Vintage WOTC'
  if (l.match(/ruby|sapphire|emerald|firered|leafgreen|deoxys|delta|holon|dragon frontiers|crystal guardians|legend maker|unseen forces|hidden legends|team magma|team aqua|sandstorm|\bex\b/)) return 'EX'
  if (l.match(/diamond|pearl|platinum|hgss|heartgold|soulsilver|mysterious treasures|secret wonders|great encounters|majestic dawn|legends awakened|stormfront|rising rivals|supreme victors|arceus|triumphant|undaunted|unleashed|call of legends/)) return 'DPP / HGSS'
  if (l.match(/black|white|\bbw\b|plasma|boundaries|legendary treasures|noble victories|next destinies|dark explorers|dragons exalted|emerging powers/)) return 'Black & White'
  if (l.match(/\bxy\b|kalos|primal|roaring|ancient origins|breakthrough|breakpoint|fates collide|steam siege|evolutions|flashfire|furious fists|phantom forces|generations|double crisis/)) return 'XY'
  if (l.match(/sun|moon|\bsm\b|guardians rising|burning shadows|crimson invasion|ultra prism|forbidden light|celestial storm|cosmic eclipse|hidden fates|unbroken bonds|unified minds|team up|lost thunder|dragon majesty|shining legends/)) return 'Sun & Moon'
  if (l.match(/sword|shield|\bswsh\b|rebel clash|darkness ablaze|vivid voltage|battle styles|chilling reign|evolving skies|fusion strike|brilliant stars|astral radiance|lost origin|silver tempest|crown zenith|shining fates|celebrations/)) return 'Sword & Shield'
  if (l.match(/scarlet|violet|\bsv\b|paldea|obsidian flames|paradox rift|temporal forces|twilight masquerade|paldean fates|surging sparks|stellar crown|shrouded fable|prismatic/)) return 'Scarlet & Violet'
  return 'Autre'
}
const ERA_COLOR: Record<string, string> = {
  'Vintage WOTC':    '#C9A227',
  'EX':              '#3B7DD8',
  'DPP / HGSS':      '#16A085',
  'Black & White':   '#6B7280',
  'XY':              '#C2557A',
  'Sun & Moon':      '#E08A3C',
  'Sword & Shield':  '#5566C9',
  'Scarlet & Violet':'#D14545',
  'Autre':           '#86868B',
}
const hex = (c: string, a: number) => {
  const h = c.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`
}

/* serie connue pour quelques setId -> logo TCGdex (fallback couleur sinon) */
function setLogo(setId: string, serie: string | null, lang: 'fr'|'en'): string | null {
  const clean = setId.replace(/^en-|^jp-/, '')
  if (!serie) return null
  return `https://assets.tcgdex.net/${lang}/${serie}/${clean}/logo.webp`
}

export function ObjSetCompletion({ agg }: { agg: ObjAggregates }) {
  const { isCollector } = usePersona()
  const router = useRouter()
  const [setsByLang, setSetsByLang] = useState<Record<string, StaticSet>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getSets('FR').catch(() => []),
      getSets('EN').catch(() => []),
      getSets('JP').catch(() => []),
    ]).then(([fr, en, jp]) => {
      const map: Record<string, StaticSet> = {}
      for (const s of [...fr, ...en, ...jp]) map[s.id] = s
      setSetsByLang(map)
      setLoading(false)
    })
  }, [])

  const enriched: SetCompletionData[] = agg.setProgress.map(s => {
    const meta = setsByLang[s.setId]
    const total = meta?.total || 0
    const pct = total > 0 ? Math.min((s.owned / total) * 100, 100) : 0
    return { ...s, total, pct }
  }).sort((a, b) => {
    const aRank = a.total === 0 ? 2 : (a.pct >= 100 ? 1 : 0)
    const bRank = b.total === 0 ? 2 : (b.pct >= 100 ? 1 : 0)
    if (aRank !== bRank) return aRank - bRank
    return b.pct - a.pct
  })

  if (loading) {
    return (
      <div style={{ background:'rgba(255,255,255,0.65)', backdropFilter:'blur(14px) saturate(180%)', WebkitBackdropFilter:'blur(14px) saturate(180%)', border:'1px solid rgba(0,0,0,0.05)', borderRadius:18, padding:'40px 20px', textAlign:'center', color:'#86868B', fontFamily:'var(--font-sora, Sora, sans-serif)', fontSize:13 }}>
        Chargement de ta progression…
      </div>
    )
  }

  if (enriched.length === 0) {
    return (
      <div style={{ background:'rgba(255,255,255,0.65)', backdropFilter:'blur(14px) saturate(180%)', WebkitBackdropFilter:'blur(14px) saturate(180%)', border:'1px solid rgba(0,0,0,0.05)', borderRadius:18, padding:'40px 20px', textAlign:'center', color:'#86868B', fontFamily:'var(--font-sora, Sora, sans-serif)', fontSize:13 }}>
        Aucun set en cours. Ajoute des cartes pour suivre ta progression.
      </div>
    )
  }

  const inProgress = enriched.filter(s => s.total > 0 && s.pct < 100)
  const completed  = enriched.filter(s => s.total > 0 && s.pct >= 100)
  const unknown    = enriched.filter(s => s.total === 0)
  const hero = inProgress[0] || null
  const rest = hero ? inProgress.slice(1) : inProgress

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <style>{`
        @keyframes objBarGrow { 0%{transform:scaleX(0);transform-origin:left} 100%{transform:scaleX(1);transform-origin:left} }
        .obj-bar-fill { animation: objBarGrow .8s .3s cubic-bezier(.16,1,.3,1) both; }
        .obj-set-card { transition: transform .22s cubic-bezier(.2,.85,.3,1), box-shadow .22s; }
        .obj-set-card:hover { transform: translateY(-3px); }
        @keyframes objGold { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
      `}</style>

      <div style={{ fontSize:11, fontWeight:700, color:'#6E6E73', textTransform:'uppercase', letterSpacing:'.14em', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ display:'inline-block', width:3, height:11, background:'#1D1D1F', borderRadius:2 }} />
        Ta quete de completion
        <span style={{ marginLeft:'auto', fontSize:10.5, fontWeight:600, color:'#86868B', letterSpacing:'.04em', textTransform:'none' }}>
          {completed.length > 0 && `${completed.length} complet${completed.length>1?'s':''} · `}{inProgress.length} en cours
        </span>
      </div>

      {hero && <HeroSet set={hero} sets={setsByLang} router={router} />}

      {rest.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:14 }}>
          {rest.map(s => <SetCard key={s.setId} set={s} sets={setsByLang} router={router} />)}
        </div>
      )}

      {completed.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:14 }}>
          {completed.map(s => <SetCard key={s.setId} set={s} sets={setsByLang} router={router} completed />)}
        </div>
      )}

      {unknown.length > 0 && (
        <div style={{ fontSize:11, color:'#AEAEB2', fontFamily:'var(--font-display)', padding:'4px 2px' }}>
          {unknown.length} set{unknown.length>1?'s':''} sans total connu · {unknown.reduce((n,s)=>n+s.owned,0)} cartes
        </div>
      )}
    </div>
  )
}

/* ── Hero : le set le plus proche de la completion ─────────── */
function HeroSet({ set, sets, router }: { set: SetCompletionData; sets: Record<string, StaticSet>; router: any }) {
  const era = eraOf(set.setName)
  const color = ERA_COLOR[era]
  const remaining = Math.max(0, set.total - set.owned)
  const R = 78, SW = 9, C = 2 * Math.PI * R
  const dash = C * (set.pct / 100)

  return (
    <div style={{
      position:'relative', overflow:'hidden', borderRadius:22,
      background:`linear-gradient(135deg, ${hex(color,0.13)} 0%, rgba(255,255,255,0.62) 55%, ${hex(color,0.06)} 100%)`,
      backdropFilter:'blur(24px) saturate(185%)', WebkitBackdropFilter:'blur(24px) saturate(185%)',
      border:`1px solid ${hex(color,0.26)}`, boxShadow:`0 20px 50px ${hex(color,0.16)}, inset 0 1px 0 rgba(255,255,255,0.9)`,
      padding:'32px 38px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:40, flexWrap:'wrap',
    }}>
      <div aria-hidden style={{ position:'absolute', top:-100, right:60, width:340, height:340, borderRadius:'50%', background:`radial-gradient(circle, ${hex(color,0.14)}, transparent 68%)`, pointerEvents:'none' }} />
      <div aria-hidden style={{ position:'absolute', bottom:-120, left:-40, width:260, height:260, borderRadius:'50%', background:`radial-gradient(circle, ${hex(color,0.08)}, transparent 70%)`, pointerEvents:'none' }} />

      <div style={{ flex:'0 1 460px', minWidth:260, position:'relative', zIndex:1 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:7, marginBottom:12, padding:'5px 12px', borderRadius:99, background:hex(color,0.13), border:`1px solid ${hex(color,0.26)}` }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:color }} />
          <span style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'.09em', fontFamily:'var(--font-display)' }}>{era} · le plus proche</span>
        </div>
        <div style={{ fontSize:'clamp(26px,3.4vw,38px)', fontWeight:800, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.035em', lineHeight:1.02, marginBottom:8 }}>{set.setName}</div>
        <div style={{ fontSize:16, color:'#48484A', fontFamily:'var(--font-body)', marginBottom:22, maxWidth:'42ch', lineHeight:1.5 }}>
          {remaining > 0
            ? <>Il te manque <strong style={{ color, fontWeight:700 }}>{remaining} carte{remaining>1?'s':''}</strong> pour accomplir ce masterset.</>
            : <>Masterset accompli — chapeau, gardien.</>}
        </div>
        <button onClick={() => router.push('/cartes')} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 22px', borderRadius:99, background:'#1D1D1F', color:'#fff', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:600, fontSize:14, boxShadow:'0 6px 18px rgba(0,0,0,0.18)', transition:'gap .2s, transform .2s' }}
          onMouseEnter={e=>{e.currentTarget.style.gap='12px'; e.currentTarget.style.transform='translateY(-1px)'}} onMouseLeave={e=>{e.currentTarget.style.gap='8px'; e.currentTarget.style.transform=''}}>
          Chasser les {remaining} cartes manquantes
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div style={{ flex:'1 1 auto', display:'flex', justifyContent:'center', gap:32, position:'relative', zIndex:1, minWidth:0 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:30, fontWeight:800, color:'#1D1D1F', fontFamily:'var(--font-data)', letterSpacing:'-1px', lineHeight:1 }}>{set.owned}</div>
          <div style={{ fontSize:10.5, color:'#86868B', fontFamily:'var(--font-display)', textTransform:'uppercase', letterSpacing:'.08em', marginTop:6 }}>possédées</div>
        </div>
        <div style={{ width:1, alignSelf:'stretch', background:`linear-gradient(180deg, transparent, ${hex(color,0.3)}, transparent)` }} />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:30, fontWeight:800, color, fontFamily:'var(--font-data)', letterSpacing:'-1px', lineHeight:1 }}>{remaining}</div>
          <div style={{ fontSize:10.5, color:'#86868B', fontFamily:'var(--font-display)', textTransform:'uppercase', letterSpacing:'.08em', marginTop:6 }}>à chasser</div>
        </div>
      </div>
      <div style={{ flex:'0 0 auto', position:'relative', zIndex:1, width:R*2+SW, height:R*2+SW, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width={R*2+SW} height={R*2+SW} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={(R*2+SW)/2} cy={(R*2+SW)/2} r={R} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={SW} />
          <circle cx={(R*2+SW)/2} cy={(R*2+SW)/2} r={R} fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C - dash}
            style={{ transition:'stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)', filter:`drop-shadow(0 2px 6px ${hex(color,0.4)})` }} />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:38, fontWeight:800, color:'#1D1D1F', fontFamily:'var(--font-data)', letterSpacing:'-1.5px', lineHeight:1 }}>{set.pct.toFixed(0)}<span style={{ fontSize:18, color }}>%</span></span>
          <span style={{ fontSize:12, color:'#86868B', fontFamily:'var(--font-data)', marginTop:4 }}>{set.owned} / {set.total}</span>
        </div>
      </div>
    </div>
  )
}

/* ── Carte de set (grille) ─────────────────────────────────── */
function SetCard({ set, sets, router, completed }: { set: SetCompletionData; sets: Record<string, StaticSet>; router: any; completed?: boolean }) {
  const era = eraOf(set.setName)
  const color = completed ? '#C9A227' : ERA_COLOR[era]
  const remaining = Math.max(0, set.total - set.owned)
  const r = 22, sw = 5, c = 2 * Math.PI * r
  const dash = c * (set.pct / 100)

  return (
    <div className="obj-set-card" onClick={() => router.push('/cartes')} style={{
      cursor:'pointer', position:'relative', overflow:'hidden', borderRadius:16,
      background: completed
        ? 'linear-gradient(140deg, rgba(201,162,39,0.16), rgba(255,255,255,0.66))'
        : `linear-gradient(140deg, ${hex(color,0.10)}, rgba(255,255,255,0.66) 75%)`,
      backdropFilter:'blur(16px) saturate(180%)', WebkitBackdropFilter:'blur(16px) saturate(180%)',
      border:`1px solid ${hex(color, completed?0.42:0.22)}`,
      boxShadow: completed
        ? `0 10px 28px ${hex(color,0.22)}, inset 0 1px 0 rgba(255,255,255,0.85)`
        : `0 4px 16px ${hex(color,0.08)}, inset 0 1px 0 rgba(255,255,255,0.8)`,
      padding:'18px 20px',
    }}
    onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 14px 34px ${hex(color,0.2)}, inset 0 1px 0 rgba(255,255,255,0.85)`}}
    onMouseLeave={e=>{e.currentTarget.style.boxShadow= completed ? `0 10px 28px ${hex(color,0.22)}, inset 0 1px 0 rgba(255,255,255,0.85)` : `0 4px 16px ${hex(color,0.08)}, inset 0 1px 0 rgba(255,255,255,0.8)`}}>
      <div aria-hidden style={{ position:'absolute', top:-50, right:-30, width:130, height:130, borderRadius:'50%', background:`radial-gradient(circle, ${hex(color,0.12)}, transparent 70%)`, pointerEvents:'none' }} />

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, position:'relative' }}>
        {/* Texte */}
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontSize:9.5, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'.07em', fontFamily:'var(--font-display)', marginBottom:4 }}>{completed ? 'Masterset' : era}</div>
          <div style={{ fontSize:15, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.015em', lineHeight:1.2, marginBottom:10, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{set.setName}</div>
          {completed
            ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, color:'#8A6500', fontFamily:'var(--font-display)' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>Complet</span>
            : <div style={{ fontSize:13, fontFamily:'var(--font-data)' }}><span style={{ fontWeight:700, color }}>plus que {remaining}</span><span style={{ color:'#AEAEB2' }}> carte{remaining>1?'s':''}</span></div>}
        </div>

        {/* Mini-anneau */}
        <div style={{ flex:'0 0 auto', position:'relative', width:r*2+sw, height:r*2+sw }}>
          <svg width={r*2+sw} height={r*2+sw} style={{ transform:'rotate(-90deg)' }}>
            <circle cx={(r*2+sw)/2} cy={(r*2+sw)/2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={sw} />
            <circle cx={(r*2+sw)/2} cy={(r*2+sw)/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c - dash}
              style={{ transition:'stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)' }} />
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#1D1D1F', fontFamily:'var(--font-data)', letterSpacing:'-0.5px' }}>{set.pct.toFixed(0)}</div>
        </div>
      </div>

      {/* Barre fine en bas (touche de rappel) */}
      <div style={{ width:'100%', height:4, background:'rgba(0,0,0,0.05)', borderRadius:3, overflow:'hidden', marginTop:14 }}>
        <div className="obj-bar-fill" style={{ width:`${set.pct}%`, height:'100%', background: completed ? 'linear-gradient(90deg,#C9A84C,#E8D48B,#C9A84C)' : `linear-gradient(90deg, ${color}, ${hex(color,0.65)})`, borderRadius:3 }} />
      </div>
      <div style={{ fontSize:11, color:'#86868B', fontFamily:'var(--font-data)', marginTop:7 }}>{set.owned} / {set.total} cartes</div>
    </div>
  )
}
