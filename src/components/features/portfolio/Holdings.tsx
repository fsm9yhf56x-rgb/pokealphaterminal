'use client'

import { useState } from 'react'
import { Card }  from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

type Card_ = {
  id:        string
  name:      string
  set:       string
  number:    string
  rarity:    'Common'|'Uncommon'|'Rare'|'Ultra Rare'|'Secret Rare'|'Alt Art'
  type:      string
  lang:      'EN'|'JP'|'FR'
  condition: 'Raw'|'PSA 9'|'PSA 10'|'CGC 9'
  buyPrice:  number
  curPrice:  number
  qty:       number
  psa?:      number
}

const CARDS: Card_[] = [
  { id:'1', name:'Charizard Alt Art',   set:'SV151',         number:'006', rarity:'Alt Art',     type:'fire',     lang:'EN', condition:'PSA 9',  buyPrice:620,  curPrice:920,  qty:1, psa:312  },
  { id:'2', name:'Umbreon VMAX Alt',    set:'Evolving Skies', number:'215', rarity:'Alt Art',     type:'dark',     lang:'EN', condition:'Raw',    buyPrice:540,  curPrice:880,  qty:2  },
  { id:'3', name:'Charizard VMAX',      set:'Champion Path',  number:'074', rarity:'Secret Rare', type:'fire',     lang:'EN', condition:'PSA 10', buyPrice:280,  curPrice:420,  qty:1, psa:1240 },
  { id:'4', name:'Gengar VMAX Alt',     set:'Fusion Strike',  number:'271', rarity:'Alt Art',     type:'psychic',  lang:'EN', condition:'Raw',    buyPrice:220,  curPrice:340,  qty:1  },
  { id:'5', name:'Pikachu VMAX RR',     set:'Vivid Voltage',  number:'188', rarity:'Secret Rare', type:'electric', lang:'JP', condition:'PSA 9',  buyPrice:80,   curPrice:110,  qty:3, psa:4200 },
  { id:'6', name:'Rayquaza VMAX Alt',   set:'Evolving Skies', number:'218', rarity:'Alt Art',     type:'electric', lang:'EN', condition:'Raw',    buyPrice:480,  curPrice:740,  qty:1  },
  { id:'7', name:'Mewtwo V Alt',        set:'Pokemon GO',     number:'071', rarity:'Alt Art',     type:'psychic',  lang:'JP', condition:'Raw',    buyPrice:160,  curPrice:280,  qty:2  },
  { id:'8', name:'Blastoise Base Set',  set:'Base Set',       number:'002', rarity:'Rare',        type:'water',    lang:'EN', condition:'PSA 9',  buyPrice:480,  curPrice:620,  qty:1, psa:890  },
]

const ENERGY: Record<string,string> = {
  fire:'#FF6B35', water:'#42A5F5', psychic:'#C855D4',
  dark:'#7E57C2', electric:'#D4A800', grass:'#3DA85A',
}

const RARITY_BADGE: Record<string, 'default'|'tier-s'|'tier-a'|'tier-b'|'red'|'green'|'outline'> = {
  'Alt Art':     'tier-s',
  'Secret Rare': 'tier-a',
  'Ultra Rare':  'tier-b',
  'Rare':        'default',
  'Common':      'outline',
  'Uncommon':    'outline',
}

type SortKey = 'roi'|'curPrice'|'gain'|'name'|'buyPrice'
type Filter  = 'all'|'fire'|'water'|'psychic'|'dark'|'electric'

function SecTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
      <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#E03020', flexShrink:0 }} />
      <span style={{ fontSize:'10px', fontWeight:600, color:'#888', textTransform:'uppercase' as const, letterSpacing:'0.1em', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>{children}</span>
      <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg,#EBEBEB,transparent)' }} />
      {action}
    </div>
  )
}

export function Holdings() {
  const [sort, setSort]       = useState<SortKey>('roi')
  const [filter, setFilter]   = useState<Filter>('all')
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState<string|null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const filtered = CARDS
    .filter(c => filter === 'all' || c.type === filter)
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.set.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      if (sort === 'roi')      return ((b.curPrice-b.buyPrice)/b.buyPrice) - ((a.curPrice-a.buyPrice)/a.buyPrice)
      if (sort === 'curPrice') return b.curPrice*b.qty - a.curPrice*a.qty
      if (sort === 'gain')     return (b.curPrice-b.buyPrice)*b.qty - (a.curPrice-a.buyPrice)*a.qty
      if (sort === 'buyPrice') return a.buyPrice - b.buyPrice
      return a.name.localeCompare(b.name)
    })

  const totalBuy  = CARDS.reduce((s,c) => s + c.buyPrice*c.qty, 0)
  const totalCur  = CARDS.reduce((s,c) => s + c.curPrice*c.qty, 0)
  const totalGain = totalCur - totalBuy
  const totalROI  = Math.round((totalGain/totalBuy)*100)
  const bestCard  = [...CARDS].sort((a,b) => ((b.curPrice-b.buyPrice)/b.buyPrice) - ((a.curPrice-a.buyPrice)/a.buyPrice))[0]

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .sort-btn:hover  { background:#F0F0F0 !important; }
        .sort-btn.active { background:#111 !important; color:#fff !important; }
        .filter-btn:hover  { border-color:#D4D4D4 !important; }
        .filter-btn.active { background:#111 !important; color:#fff !important; border-color:#111 !important; }
        .card-row:hover  { background:#FAFAFA !important; }
        .card-row.sel    { background:#FFF8F8 !important; border-left:2px solid #E03020 !important; }
        .add-btn:hover   { background:#333 !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        {/* HEADER */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'22px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <p style={{ fontSize:'10px', color:'#888', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Portfolio</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:0 }}>Holdings</h1>
          </div>
          <button className="add-btn" onClick={() => setShowAdd(true)} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'9px 16px', background:'#111', color:'#fff', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'background 0.15s', flexShrink:0 }}>
            + Ajouter une carte
          </button>
        </div>

        {/* STATS SUMMARY */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'22px' }}>
          {[
            { label:'Valeur totale',   value:`€ ${totalCur.toLocaleString('fr-FR')}`, sub:`Investi € ${totalBuy.toLocaleString('fr-FR')}`, color:'#111'    },
            { label:'Gain total',      value:`+ € ${totalGain.toLocaleString('fr-FR')}`, sub:`ROI global`, color:'#2E9E6A' },
            { label:'ROI global',      value:`+ ${totalROI}%`, sub:`${CARDS.length} cartes · ${CARDS.reduce((s,c)=>s+c.qty,0)} exemplaires`, color:'#2E9E6A' },
            { label:'Meilleure carte', value:bestCard.name, sub:`+${Math.round(((bestCard.curPrice-bestCard.buyPrice)/bestCard.buyPrice)*100)}% ROI`, color:'#E03020' },
          ].map((s,i) => (
            <div key={i} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'12px', padding:'14px 16px' }}>
              <div style={{ fontSize:'9px', color:'#888', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--font-display)', marginBottom:'6px' }}>{s.label}</div>
              <div style={{ fontSize: i===3 ? '14px' : '20px', fontWeight:600, color:s.color, fontFamily:'var(--font-display)', letterSpacing:i===3?'0':'-0.5px', lineHeight:1, marginBottom:'4px' }}>{s.value}</div>
              <div style={{ fontSize:'10px', color:'#888' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* CONTROLS */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', flexWrap:'wrap' }}>

          {/* Search */}
          <div style={{ position:'relative', flex:'1', minWidth:'200px' }}>
            <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#BBB', fontSize:'13px' }}>◎</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une carte..."
              style={{ width:'100%', height:'36px', padding:'0 12px 0 30px', border:'1px solid #EBEBEB', borderRadius:'8px', fontSize:'13px', color:'#111', fontFamily:'var(--font-sans)', outline:'none', background:'#fff' }}
            />
          </div>

          {/* Type filters */}
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
            {(['all','fire','water','psychic','dark','electric'] as Filter[]).map(f => (
              <button key={f} className={`filter-btn${filter===f?' active':''}`} onClick={() => setFilter(f)} style={{ padding:'5px 11px', borderRadius:'7px', border:'1px solid #EBEBEB', background:filter===f?'#111':'#fff', color:filter===f?'#fff':f==='all'?'#666':ENERGY[f], fontSize:'11px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all 0.12s', display:'flex', alignItems:'center', gap:'4px' }}>
                {f !== 'all' && <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:ENERGY[f], display:'inline-block' }} />}
                {f === 'all' ? 'Tous' : f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ display:'flex', gap:'4px', background:'#F5F5F5', borderRadius:'8px', padding:'3px' }}>
            {([['roi','ROI'],['curPrice','Valeur'],['gain','Gain'],['name','A-Z']] as [SortKey,string][]).map(([k,l]) => (
              <button key={k} className={`sort-btn${sort===k?' active':''}`} onClick={() => setSort(k)} style={{ padding:'4px 10px', borderRadius:'6px', border:'none', background:sort===k?'#111':'transparent', color:sort===k?'#fff':'#666', fontSize:'11px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all 0.12s' }}>{l}</button>
            ))}
          </div>
        </div>

        {/* CARDS TABLE */}
        <Card padding="none">
          {/* Header */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 80px', gap:'0', padding:'10px 16px', borderBottom:'1px solid #F0F0F0', background:'#FAFAFA', borderRadius:'12px 12px 0 0' }}>
            {['Carte','Condition','Prix achat','Valeur actuelle','ROI',''].map((h,i) => (
              <div key={i} style={{ fontSize:'10px', fontWeight:600, color:'#888', textTransform:'uppercase' as const, letterSpacing:'0.07em', fontFamily:'var(--font-display)', textAlign: i>1 ? 'right' as const : 'left' as const }}>{h}</div>
            ))}
          </div>

          {filtered.map((card, i) => {
            const gain    = (card.curPrice - card.buyPrice) * card.qty
            const roi     = Math.round(((card.curPrice - card.buyPrice) / card.buyPrice) * 100)
            const isSel   = selected === card.id
            return (
              <div key={card.id} className={`card-row${isSel?' sel':''}`} onClick={() => setSelected(isSel ? null : card.id)} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 80px', gap:'0', padding:'12px 16px', borderBottom: i < filtered.length-1 ? '1px solid #F8F8F8' : 'none', cursor:'pointer', transition:'background 0.1s', borderLeft: isSel ? '2px solid #E03020' : '2px solid transparent', alignItems:'center' }}>

                {/* Carte info */}
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ width:'32px', height:'44px', borderRadius:'5px', background:'linear-gradient(145deg,#F5F5F5,#EBEBEB)', border:'1px solid #E0E0E0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: ENERGY[card.type] ?? '#888' }} />
                  </div>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', marginBottom:'3px' }}>{card.name}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'10px', color:'#888' }}>{card.set} · #{card.number}</span>
                      <Badge variant={RARITY_BADGE[card.rarity] ?? 'default'}>{card.rarity}</Badge>
                      <span style={{ fontSize:'9px', background: card.lang==='JP' ? '#F0F5FF' : card.lang==='FR' ? '#F0FFF5' : '#FFF5F0', color: card.lang==='JP' ? '#003DAA' : card.lang==='FR' ? '#00660A' : '#C84B00', border:`1px solid ${card.lang==='JP'?'#C0D0FF':card.lang==='FR'?'#A0DDAA':'#FFD0B0'}`, padding:'1px 5px', borderRadius:'3px', fontWeight:600, fontFamily:'var(--font-display)' }}>{card.lang}</span>
                      {card.qty > 1 && <span style={{ fontSize:'9px', color:'#888' }}>×{card.qty}</span>}
                    </div>
                  </div>
                </div>

                {/* Condition */}
                <div style={{ fontSize:'12px', color:'#555', fontFamily:'var(--font-display)' }}>
                  {card.condition}
                  {card.psa && <div style={{ fontSize:'10px', color:'#BBB', marginTop:'1px' }}>Pop {card.psa.toLocaleString()}</div>}
                </div>

                {/* Prix achat */}
                <div style={{ textAlign:'right', fontSize:'13px', color:'#888', fontFamily:'var(--font-display)' }}>
                  € {(card.buyPrice * card.qty).toLocaleString('fr-FR')}
                  {card.qty > 1 && <div style={{ fontSize:'10px', color:'#CCC' }}>€ {card.buyPrice}/u</div>}
                </div>

                {/* Valeur actuelle */}
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)' }}>
                    € {(card.curPrice * card.qty).toLocaleString('fr-FR')}
                  </div>
                  {card.qty > 1 && <div style={{ fontSize:'10px', color:'#888' }}>€ {card.curPrice}/u</div>}
                </div>

                {/* ROI */}
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color: roi>=0 ? '#2E9E6A' : '#E03020', fontFamily:'var(--font-display)' }}>
                    {roi>=0?'+':''}{roi}%
                  </div>
                  <div style={{ fontSize:'10px', color: gain>=0 ? '#2E9E6A' : '#E03020', marginTop:'1px' }}>
                    {gain>=0?'+':''}€ {Math.abs(gain).toLocaleString('fr-FR')}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:'5px', justifyContent:'flex-end' }}>
                  <button onClick={e => { e.stopPropagation(); alert('Voir signal') }} style={{ padding:'4px 8px', borderRadius:'5px', background:'#FFF0EE', border:'1px solid #FFD8D0', color:'#E03020', fontSize:'10px', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:500 }}>Signal</button>
                  <button onClick={e => { e.stopPropagation(); alert('Supprimer') }} style={{ padding:'4px 8px', borderRadius:'5px', background:'#F5F5F5', border:'1px solid #E8E8E8', color:'#888', fontSize:'10px', cursor:'pointer', fontFamily:'var(--font-display)' }}>×</button>
                </div>

              </div>
            )
          })}

          {/* Footer total */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 80px', gap:'0', padding:'12px 16px', background:'#FAFAFA', borderRadius:'0 0 12px 12px', borderTop:'2px solid #EBEBEB' }}>
            <div style={{ fontSize:'12px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)' }}>Total · {filtered.length} cartes</div>
            <div />
            <div style={{ textAlign:'right', fontSize:'12px', color:'#888', fontFamily:'var(--font-display)' }}>€ {filtered.reduce((s,c)=>s+c.buyPrice*c.qty,0).toLocaleString('fr-FR')}</div>
            <div style={{ textAlign:'right', fontSize:'12px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)' }}>€ {filtered.reduce((s,c)=>s+c.curPrice*c.qty,0).toLocaleString('fr-FR')}</div>
            <div style={{ textAlign:'right', fontSize:'12px', fontWeight:600, color:'#2E9E6A', fontFamily:'var(--font-display)' }}>
              +{Math.round(((filtered.reduce((s,c)=>s+c.curPrice*c.qty,0)-filtered.reduce((s,c)=>s+c.buyPrice*c.qty,0))/filtered.reduce((s,c)=>s+c.buyPrice*c.qty,0))*100)}%
            </div>
            <div />
          </div>
        </Card>

      </div>
    </>
  )
}
