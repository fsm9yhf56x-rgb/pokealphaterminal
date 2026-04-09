'use client'
import { useState, useMemo } from 'react'

const DEALS = [
  { name:'Blissey V Alt Art',    set:'Chilling Reign', type:'water',   fair:180,listed:128,gap:28,conf:81,source:'eBay',lang:'EN',signal:'S' as const,psa:null,   vol:34, trend:12.4,why:'PSA Pop tr\u00e8s faible, Alt Art populaire, momentum acheteur',img:'https://assets.tcgdex.net/en/swsh/swsh6/183/high.webp' },
  { name:'Espeon VMAX Alt Art',  set:'Evolving Skies', type:'psychic', fair:420,listed:318,gap:24,conf:74,source:'CM',  lang:'JP',signal:'A' as const,psa:1240,  vol:56, trend:8.5, why:'Version JP toujours sous-cot\u00e9e vs EN, set Eevee en hausse',img:'https://assets.tcgdex.net/en/swsh/swsh7/270/high.webp' },
  { name:'Glaceon VMAX Alt Art', set:'Evolving Skies', type:'water',   fair:260,listed:198,gap:24,conf:69,source:'eBay',lang:'EN',signal:'A' as const,psa:null,   vol:41, trend:6.2, why:'Momentum Eevee set, Glaceon en retard vs Umbreon',img:'https://assets.tcgdex.net/en/swsh/swsh7/209/high.webp' },
  { name:'Leafeon VMAX Alt Art', set:'Evolving Skies', type:'grass',   fair:310,listed:241,gap:22,conf:72,source:'CM',  lang:'EN',signal:'B' as const,psa:null,   vol:38, trend:7.1, why:'Set complet Eevee, toutes les \u00e9volutions montent',img:'https://assets.tcgdex.net/en/swsh/swsh7/205/high.webp' },
  { name:'Ditto V Alt Art',      set:'Fusion Strike',  type:'psychic', fair:95, listed:74, gap:22,conf:61,source:'eBay',lang:'JP',signal:'B' as const,psa:null,   vol:18, trend:4.3, why:'Alt Art rare, sous-\u00e9valu\u00e9 vs Gengar du m\u00eame set',img:'https://assets.tcgdex.net/en/swsh/swsh8/235/high.webp' },
  { name:'Vaporeon VMAX Alt Art',set:'Evolving Skies', type:'water',   fair:240,listed:188,gap:22,conf:68,source:'CM',  lang:'EN',signal:'B' as const,psa:2100,  vol:29, trend:5.8, why:'Trio Eevee OG en hausse, Vaporeon en retard sur le groupe',img:'https://assets.tcgdex.net/en/swsh/swsh7/172/high.webp' },
  { name:'Mew VMAX Alt Art',     set:'Fusion Strike',  type:'psychic', fair:185,listed:148,gap:20,conf:65,source:'eBay',lang:'EN',signal:'B' as const,psa:null,   vol:67, trend:9.1, why:'Mew iconique, Fusion Strike sous-cot\u00e9 globalement',img:'https://assets.tcgdex.net/en/swsh/swsh8/269/high.webp' },
  { name:'Sylveon VMAX Alt Art', set:'Evolving Skies', type:'psychic', fair:340,listed:278,gap:18,conf:63,source:'CM',  lang:'FR',signal:'B' as const,psa:null,   vol:22, trend:3.8, why:'Version FR rare, premium fran\u00e7ais pas encore pric\u00e9',img:'https://assets.tcgdex.net/en/swsh/swsh7/212/high.webp' },
]

const TC:Record<string,string> = {fire:'#FF6B35',water:'#42A5F5',psychic:'#C855D4',dark:'#7E57C2',electric:'#D4A800',grass:'#3DA85A'}
const SIG_COLORS:Record<string,{bg:string;color:string;border:string}> = {
  S:{bg:'#FEF2F2',color:'#E03020',border:'#FFD0C8'},
  A:{bg:'#F5F0FF',color:'#7E57C2',border:'#DDD0F5'},
  B:{bg:'#F0FFF6',color:'#2E9E6A',border:'#AAEEC8'},
}

type SortKey = 'gap'|'conf'|'potential'|'price'
type FilterLang = 'all'|'EN'|'JP'|'FR'
type FilterSignal = 'all'|'S'|'A'|'B'
type FilterSource = 'all'|'eBay'|'CM'

export function SousEvalues({ isPro = false }: { isPro?: boolean }) {
  const [sort, setSort] = useState<SortKey>('gap')
  const [filterLang, setFilterLang] = useState<FilterLang>('all')
  const [filterSignal, setFilterSignal] = useState<FilterSignal>('all')
  const [filterSource, setFilterSource] = useState<FilterSource>('all')
  const [expanded, setExpanded] = useState<string|null>(null)

  const filtered = useMemo(() => {
    let list = [...DEALS]
    if (filterLang !== 'all') list = list.filter(d => d.lang === filterLang)
    if (filterSignal !== 'all') list = list.filter(d => d.signal === filterSignal)
    if (filterSource !== 'all') list = list.filter(d => d.source === filterSource)
    list.sort((a, b) => {
      if (sort === 'gap') return b.gap - a.gap
      if (sort === 'conf') return b.conf - a.conf
      if (sort === 'potential') return (b.fair - b.listed) - (a.fair - a.listed)
      return a.listed - b.listed
    })
    return list
  }, [filterLang, filterSignal, filterSource, sort])

  const totalPotential = filtered.reduce((s, d) => s + (d.fair - d.listed), 0)
  const avgGap = filtered.length ? Math.round(filtered.reduce((s, d) => s + d.gap, 0) / filtered.length) : 0
  const avgConf = filtered.length ? Math.round(filtered.reduce((s, d) => s + d.conf, 0) / filtered.length) : 0

  return (
    <>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .d-row{display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px solid #F5F5F5;transition:all .15s;cursor:pointer;position:relative}
        .d-row:last-child{border-bottom:none}
        .d-row:hover{background:#FAFAFA}
        .d-row.on{background:#FAFBFF}
        .d-detail{overflow:hidden;transition:max-height .25s ease,opacity .2s;border-bottom:1px solid #F0F0F0}
        .chip{padding:4px 10px;border-radius:6px;border:1px solid #EBEBEB;background:#fff;font-size:10px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .1s;color:#888}
        .chip:hover{border-color:#C7C7CC;color:#111}
        .chip.on{background:#111;color:#fff;border-color:#111}
        .srt{padding:3px 10px;border-radius:5px;border:none;background:transparent;font-size:10px;color:#AAA;cursor:pointer;font-family:var(--font-display);transition:all .1s}
        .srt:hover{color:#111}.srt.on{background:#111;color:#fff}
        .conf-bar{height:4px;border-radius:99px;background:#F0F0F0;overflow:hidden;flex:1}
        .conf-fill{height:100%;border-radius:99px;transition:width .3s ease}
        .potential-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;font-family:var(--font-data)}
        .stat-pill{background:#F8F8FA;border-radius:8px;padding:10px 14px;flex:1;text-align:center}
        .stat-v{font-size:18px;font-weight:700;font-family:var(--font-data);letter-spacing:-.5px}
        .stat-l{font-size:9px;color:#AAA;font-family:var(--font-display);margin-top:2px}
      `}</style>

      <div style={{ animation:'fadeIn .25s ease-out', width:'100%' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <p style={{ fontSize:10, color:'#AAA', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Market</p>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <h1 style={{ fontSize:26, fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-.5px', margin:0 }}>Sous-{'\u00e9'}valu{'\u00e9'}s</h1>
              <span style={{ fontSize:9, fontWeight:700, background:'#E03020', color:'#fff', padding:'3px 8px', borderRadius:4, fontFamily:'var(--font-display)' }}>PRO</span>
            </div>
            <div style={{ fontSize:11, color:'#888', marginTop:4 }}>Cartes d{'\u00e9'}tect{'\u00e9'}es sous leur valeur march{'\u00e9'} par l'IA</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#2E9E6A', animation:'pulse 1.5s infinite' }} />
            <span style={{ fontSize:11, color:'#2E9E6A', fontWeight:600, fontFamily:'var(--font-display)' }}>LIVE</span>
            <span style={{ fontSize:11, color:'#AAA' }}>{'\u00b7'} {filtered.length} deals actifs</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <div className="stat-pill">
            <div className="stat-v" style={{ color:'#2E9E6A' }}>+{totalPotential.toLocaleString('fr-FR')} {'\u20ac'}</div>
            <div className="stat-l">Potentiel total</div>
          </div>
          <div className="stat-pill">
            <div className="stat-v">-{avgGap}%</div>
            <div className="stat-l">D{'\u00e9'}cote moyenne</div>
          </div>
          <div className="stat-pill">
            <div className="stat-v">{avgConf}%</div>
            <div className="stat-l">Confiance moy.</div>
          </div>
          <div className="stat-pill">
            <div className="stat-v">{filtered.length}</div>
            <div className="stat-l">Deals actifs</div>
          </div>
        </div>

        {/* Filters + Sort */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          <span style={{ fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', marginRight:4 }}>Signal :</span>
          {(['all','S','A','B'] as FilterSignal[]).map(v => (
            <button key={v} className={'chip'+(filterSignal===v?' on':'')} onClick={() => setFilterSignal(v)}>
              {v === 'all' ? 'Tous' : 'Tier ' + v}
            </button>
          ))}
          <div style={{ width:1, height:16, background:'#EBEBEB', margin:'0 4px' }} />
          <span style={{ fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', marginRight:4 }}>Langue :</span>
          {(['all','EN','JP','FR'] as FilterLang[]).map(v => (
            <button key={v} className={'chip'+(filterLang===v?' on':'')} onClick={() => setFilterLang(v)}>
              {v === 'all' ? 'Toutes' : v}
            </button>
          ))}
          <div style={{ width:1, height:16, background:'#EBEBEB', margin:'0 4px' }} />
          <span style={{ fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', marginRight:4 }}>Source :</span>
          {(['all','eBay','CM'] as FilterSource[]).map(v => (
            <button key={v} className={'chip'+(filterSource===v?' on':'')} onClick={() => setFilterSource(v)}>
              {v === 'all' ? 'Toutes' : v === 'CM' ? 'Cardmarket' : v}
            </button>
          ))}
          <div style={{ flex:1 }} />
          <span style={{ fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', marginRight:4 }}>Trier :</span>
          {([['gap','D\u00e9cote'],['conf','Confiance'],['potential','Potentiel'],['price','Prix']] as [SortKey,string][]).map(([k,l]) => (
            <button key={k} className={'srt'+(sort===k?' on':'')} onClick={() => setSort(k)}>{l}</button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:14, overflow:'hidden' }}>

          {/* Header row */}
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 18px', borderBottom:'1px solid #EBEBEB', background:'#FAFBFC' }}>
            <div style={{ width:44 }} />
            <div style={{ flex:1, fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', fontWeight:500 }}>Carte</div>
            <div style={{ width:60, fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', fontWeight:500, textAlign:'center' }}>Signal</div>
            <div style={{ width:80, fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', fontWeight:500, textAlign:'right' }}>List{'\u00e9'}</div>
            <div style={{ width:80, fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', fontWeight:500, textAlign:'right' }}>March{'\u00e9'}</div>
            <div style={{ width:60, fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', fontWeight:500, textAlign:'right' }}>D{'\u00e9'}cote</div>
            <div style={{ width:80, fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', fontWeight:500, textAlign:'right' }}>Potentiel</div>
            <div style={{ width:100, fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', fontWeight:500 }}>Confiance</div>
            <div style={{ width:24 }} />
          </div>

          {filtered.map(d => {
            const sig = SIG_COLORS[d.signal]
            const potential = d.fair - d.listed
            const isOpen = expanded === d.name
            return (
              <div key={d.name}>
                <div className={'d-row' + (isOpen ? ' on' : '')} onClick={() => setExpanded(isOpen ? null : d.name)}>
                  <img src={d.img} alt="" style={{ width:44, height:61, objectFit:'cover', borderRadius:6, border:'1px solid #F0F0F0', flexShrink:0 }}
                    onError={e => { const t = e.target as HTMLImageElement; t.style.background = '#F0F0F2' }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</div>
                    <div style={{ fontSize:10, color:'#BBB', marginTop:1, display:'flex', alignItems:'center', gap:4 }}>
                      {d.set}
                      <span style={{ fontSize:9, color:'#AAA', background:'#F0F0F2', padding:'1px 5px', borderRadius:3 }}>{d.lang}</span>
                      <span style={{ fontSize:9, color:'#AAA', background:'#F0F0F2', padding:'1px 5px', borderRadius:3 }}>{d.source}</span>
                    </div>
                  </div>
                  <div style={{ width:60, textAlign:'center' }}>
                    <span style={{ fontSize:10, fontWeight:700, color:sig.color, background:sig.bg, border:'1px solid '+sig.border, padding:'3px 8px', borderRadius:5, fontFamily:'var(--font-display)' }}>
                      {d.signal}
                    </span>
                  </div>
                  <div style={{ width:80, textAlign:'right', fontFamily:'var(--font-data)', fontSize:14, fontWeight:600 }}>{d.listed} {'\u20ac'}</div>
                  <div style={{ width:80, textAlign:'right', fontFamily:'var(--font-data)', fontSize:13, color:'#AAA', textDecoration:'line-through' }}>{d.fair} {'\u20ac'}</div>
                  <div style={{ width:60, textAlign:'right', fontFamily:'var(--font-data)', fontSize:14, fontWeight:700, color:'#2E9E6A' }}>-{d.gap}%</div>
                  <div style={{ width:80, textAlign:'right' }}>
                    <span className="potential-badge" style={{ background:'#F0FFF6', color:'#2E9E6A' }}>+{potential} {'\u20ac'}</span>
                  </div>
                  <div style={{ width:100, display:'flex', alignItems:'center', gap:6 }}>
                    <div className="conf-bar">
                      <div className="conf-fill" style={{ width:d.conf+'%', background:d.conf>=75?'#2E9E6A':d.conf>=60?'#EF9F27':'#E03020' }} />
                    </div>
                    <span style={{ fontSize:10, fontWeight:600, fontFamily:'var(--font-data)', color:d.conf>=75?'#2E9E6A':d.conf>=60?'#EF9F27':'#E03020', minWidth:24 }}>{d.conf}%</span>
                  </div>
                  <div style={{ width:24, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2.5" strokeLinecap="round" style={{ transform:isOpen?'rotate(180deg)':'rotate(0)', transition:'transform .15s' }}><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                </div>

                {/* Expandable detail */}
                <div className="d-detail" style={{ maxHeight:isOpen?300:0, opacity:isOpen?1:0 }}>
                  <div style={{ padding:'14px 18px 14px 76px', display:'flex', gap:20 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'#888', fontFamily:'var(--font-display)', marginBottom:6 }}>Analyse IA</div>
                      <div style={{ fontSize:12, color:'#555', lineHeight:1.6, marginBottom:10 }}>{d.why}</div>
                      <div style={{ display:'flex', gap:12 }}>
                        <div>
                          <div style={{ fontSize:9, color:'#AAA' }}>Volume 24h</div>
                          <div style={{ fontSize:14, fontWeight:600, fontFamily:'var(--font-data)' }}>{d.vol}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:9, color:'#AAA' }}>Tendance 7j</div>
                          <div style={{ fontSize:14, fontWeight:600, fontFamily:'var(--font-data)', color:d.trend>=0?'#2E9E6A':'#E03020' }}>+{d.trend}%</div>
                        </div>
                        {d.psa && <div>
                          <div style={{ fontSize:9, color:'#AAA' }}>PSA Pop</div>
                          <div style={{ fontSize:14, fontWeight:600, fontFamily:'var(--font-data)' }}>{d.psa.toLocaleString('fr-FR')}</div>
                        </div>}
                        <div>
                          <div style={{ fontSize:9, color:'#AAA' }}>ROI potentiel</div>
                          <div style={{ fontSize:14, fontWeight:600, fontFamily:'var(--font-data)', color:'#2E9E6A' }}>+{Math.round(potential / d.listed * 100)}%</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                      <button style={{ padding:'8px 20px', borderRadius:8, background:'#111', color:'#fff', border:'none', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', transition:'opacity .12s' }}
                        onMouseEnter={e=>(e.currentTarget.style.opacity='.85')} onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
                        Voir sur {d.source} {'\u2192'}
                      </button>
                      <button style={{ padding:'8px 20px', borderRadius:8, background:'#fff', color:'#111', border:'1px solid #EBEBEB', fontSize:11, fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .12s' }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor='#111'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#EBEBEB'}}>
                        + Ajouter au portfolio
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div style={{ padding:40, textAlign:'center', color:'#BBB', fontSize:13, fontFamily:'var(--font-display)' }}>
              Aucun deal ne correspond aux filtres
            </div>
          )}
        </div>
      </div>
    </>
  )
}
