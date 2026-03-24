'use client'

import { Card } from '@/components/ui/Card'

const BY_TYPE = [
  { label:'Fire',     value:68, color:'#FF6B35', amount:'€ 36,910' },
  { label:'Dark',     value:16, color:'#7E57C2', amount:'€ 8,685'  },
  { label:'Psychic',  value:9,  color:'#C855D4', amount:'€ 4,885'  },
  { label:'Water',    value:5,  color:'#42A5F5', amount:'€ 2,714'  },
  { label:'Electric', value:2,  color:'#D4A800', amount:'€ 1,086'  },
]

const BY_SET = [
  { label:'SV151',          value:34, color:'#E03020', amount:'€ 18,455' },
  { label:'Evolving Skies', value:28, color:'#7E57C2', amount:'€ 15,198' },
  { label:'Champion Path',  value:15, color:'#2E9E6A', amount:'€ 8,142'  },
  { label:'Fusion Strike',  value:12, color:'#FF8C00', amount:'€ 6,514'  },
  { label:'Autres',         value:11, color:'#BBBBBB', amount:'€ 5,971'  },
]

const BY_RARITY = [
  { label:'Alt Art',     value:55, color:'#FFD700', amount:'€ 29,854' },
  { label:'Secret Rare', value:25, color:'#C855D4', amount:'€ 13,570' },
  { label:'Ultra Rare',  value:12, color:'#42A5F5', amount:'€ 6,514'  },
  { label:'Rare',        value:8,  color:'#888',    amount:'€ 4,342'  },
]

const BY_LANG = [
  { label:'EN', value:72, color:'#FF6B35', amount:'€ 39,082' },
  { label:'JP', value:22, color:'#E03020', amount:'€ 11,942' },
  { label:'FR', value:6,  color:'#2E9E6A', amount:'€ 3,257'  },
]

function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
      <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#E03020', flexShrink:0 }} />
      <span style={{ fontSize:'10px', fontWeight:600, color:'#888', textTransform:'uppercase' as const, letterSpacing:'0.1em', fontFamily:'var(--font-display)' }}>{children}</span>
      <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg,#EBEBEB,transparent)' }} />
    </div>
  )
}

function AllocationBlock({ data }: { data: typeof BY_TYPE }) {
  return (
    <Card padding="md">
      {/* Stacked bar */}
      <div style={{ display:'flex', borderRadius:'8px', overflow:'hidden', height:'12px', marginBottom:'16px', gap:'2px' }}>
        {data.map(d => (
          <div key={d.label} style={{ width:`${d.value}%`, background:d.color, transition:'width 0.6s ease', minWidth: d.value > 3 ? undefined : '4px' }} />
        ))}
      </div>
      {/* Legend */}
      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
        {data.map(d => (
          <div key={d.label} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:d.color, flexShrink:0 }} />
            <span style={{ flex:1, fontSize:'12px', color:'#444', fontFamily:'var(--font-display)' }}>{d.label}</span>
            <span style={{ fontSize:'12px', color:'#888', minWidth:'42px', textAlign:'right' }}>{d.value}%</span>
            <span style={{ fontSize:'12px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', minWidth:'72px', textAlign:'right' }}>{d.amount}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function Allocation() {
  return (
    <>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        <div style={{ marginBottom:'22px' }}>
          <p style={{ fontSize:'10px', color:'#888', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Portfolio</p>
          <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:0 }}>Allocations</h1>
        </div>

        {/* ALERT surexposition */}
        <div style={{ background:'#FFF8F0', border:'1px solid #FFD8A0', borderRadius:'10px', padding:'12px 16px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#E08000', flexShrink:0 }} />
          <span style={{ fontSize:'12px', color:'#8B5A00', fontFamily:'var(--font-sans)' }}>
            <strong style={{ fontFamily:'var(--font-display)' }}>Surexposition Fire</strong> — 68% de ton portfolio est en cartes Fire. Recommandation : diversifier vers Water ou Electric.
          </span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
          <div>
            <SecTitle>Par type d'énergie</SecTitle>
            <AllocationBlock data={BY_TYPE} />
          </div>
          <div>
            <SecTitle>Par set</SecTitle>
            <AllocationBlock data={BY_SET} />
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          <div>
            <SecTitle>Par rareté</SecTitle>
            <AllocationBlock data={BY_RARITY} />
          </div>
          <div>
            <SecTitle>Par langue</SecTitle>
            <AllocationBlock data={BY_LANG} />
          </div>
        </div>

      </div>
    </>
  )
}
