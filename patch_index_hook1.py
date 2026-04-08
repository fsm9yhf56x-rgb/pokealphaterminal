#!/usr/bin/env python3
"""A: header hero, D: series populaires, G: compteur, H: skeleton"""
from pathlib import Path

EA = '\u00e9'
EG = '\u00e8'
AG = '\u00e0'

f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# ═══ G: COMPTEUR DYNAMIQUE ═══
# Remplacer "Page X / Y" par "X cartes · Page Y / Z"
old_page_count = "Page {page+1} / {pageCount}"
new_page_count = "{filtered.length.toLocaleString()} carte{filtered.length!==1?'s':''} · Page {page+1} / {pageCount}"
c = s.count(old_page_count)
s = s.replace(old_page_count, new_page_count)
print(f'  > compteur dynamique x{c}')

# ═══ H: SKELETON LOADING ═══
old_loading = """            {loading && (
              <div style={{ textAlign:'center', padding:'60px 0' }}>"""
if old_loading in s:
    new_loading = """            {loading && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:'12px', padding:'20px 0' }}>
                  {Array.from({length:18}).map((_,i)=>(
                    <div key={i} style={{ borderRadius:'12px', overflow:'hidden', background:'#fff', border:'1px solid #EBEBEB' }}>
                      <div style={{ height:'180px', background:'linear-gradient(110deg,#F5F5F5 30%,#EBEBEB 50%,#F5F5F5 70%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s ease-in-out infinite' }}/>
                      <div style={{ padding:'10px' }}>
                        <div style={{ height:'12px', width:'70%', borderRadius:'4px', background:'#EBEBEB', marginBottom:'6px' }}/>
                        <div style={{ height:'10px', width:'50%', borderRadius:'4px', background:'#F0F0F0' }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {false && (
              <div style={{ textAlign:'center', padding:'60px 0' }}>"""
    s = s.replace(old_loading, new_loading, 1)
    print('  > skeleton loading')
else:
    print('  > loading block not found, trying alt')
    # Chercher le spinner
    idx_spin = s.find("Chargement des")
    if idx_spin > 0:
        print(f'  > spinner at {idx_spin}')

# Ajouter shimmer keyframe
old_fadein = "@keyframes fadeIn"
if 'shimmer' not in s:
    s = s.replace(old_fadein, "@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }\n        @keyframes fadeIn", 1)
    print('  > shimmer keyframe')

# ═══ A: HEADER HERO QUAND SET FILTRE ═══
# Ajouter le hero avant la grille, quand filSet !== 'all'
old_browse_toggle = "          {/* Browse toggle */}"
hero_code = """          {/* Hero header quand serie filtree */}
          {filSet!=='all' && !loading && (()=>{
            const heroSet = sets.find(st=>st[0]===filSet)
            const heroCards = allCards.filter(c=>c.setId===filSet)
            const heroOwned = heroCards.filter(c=>isOwned(c)).length
            const heroBloc = heroCards[0]?.era || ''
            const heroPct = heroCards.length>0 ? Math.round(heroOwned/heroCards.length*100) : 0
            return (
              <div style={{ background:'linear-gradient(135deg,#FAFAFA,#F0F0F5)', borderRadius:'16px', padding:'24px', marginBottom:'20px', border:'1px solid #EBEBEB', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:'-20px', right:'-20px', width:'180px', height:'180px', borderRadius:'50%', background:'radial-gradient(circle, rgba(224,48,32,.04) 0%, transparent 70%)', pointerEvents:'none' }}/>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'20px' }}>
                  <div>
                    <div style={{ fontSize:'10px', color:'#AEAEB2', fontFamily:'var(--font-display)', letterSpacing:'.08em', textTransform:'uppercase' as const, marginBottom:'4px' }}>{heroBloc}</div>
                    <div style={{ fontSize:'22px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:'6px' }}>{heroCards[0]?.setName || filSet}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px', fontSize:'12px', color:'#86868B' }}>
                      <span>{heroCards.length} cartes</span>
                      <span style={{ color:'#C7C7CC' }}>{String.fromCharCode(183)}</span>
                      <span>{heroOwned} dans ma collection</span>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'28px', fontWeight:700, color:heroPct===100?'#27500A':'#1D1D1F', fontFamily:'var(--font-data)' }}>{heroPct}%</div>
                    <div style={{ width:'120px', height:'6px', borderRadius:'3px', background:'#E8E8ED', overflow:'hidden', marginTop:'6px' }}>
                      <div style={{ width:heroPct+'%', height:'100%', borderRadius:'3px', background:heroPct===100?'linear-gradient(90deg,#C9A84C,#D4AF37,#E8D48B,#D4AF37,#C9A84C)':'linear-gradient(90deg,#E03020,#FF4433)', transition:'width .5s' }}/>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Browse toggle */}"""
assert old_browse_toggle in s, "CIBLE BROWSE"
s = s.replace(old_browse_toggle, hero_code, 1)
print('  > hero header')

# ═══ D: SERIES POPULAIRES ═══
# Pills horizontales scrollables sous la recherche
old_filters = """          <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap', alignItems:'center' }}>"""
idx_filters = s.find(old_filters)
assert idx_filters > 0, "CIBLE FILTERS"

popular_pills = """          {/* Series populaires */}
          {!loading && filSet==='all' && browseMode==='all' && (
            <div style={{ display:'flex', gap:'6px', marginBottom:'12px', overflowX:'auto' as const, paddingBottom:'4px', scrollbarWidth:'none' as any }}>
              {['sv03.5','base1','swsh12.5','sv04','sv01','cel25','sv08','sm12','swsh8','sv06'].filter(sid=>allCards.some(c=>c.setId===sid)).map(sid=>{
                const nm = allCards.find(c=>c.setId===sid)?.setName||sid
                const ct = allCards.filter(c=>c.setId===sid).length
                return (
                  <button key={sid} onClick={()=>{setFilSet(sid);setFilEra('all');setPage(0)}}
                    style={{ flexShrink:0, padding:'5px 12px', borderRadius:'99px', border:'1px solid #E5E5EA', background:'#fff', color:'#48484A', fontSize:'11px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .12s', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'4px' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#1D1D1F';e.currentTarget.style.background='#1D1D1F';e.currentTarget.style.color='#fff'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.background='#fff';e.currentTarget.style.color='#48484A'}}>
                    {nm} <span style={{ opacity:.5 }}>{ct}</span>
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap', alignItems:'center' }}>"""
s = s[:idx_filters] + popular_pills + s[idx_filters+len(old_filters):]
print('  > popular series pills')

f.write_text(s, 'utf-8')
print('OK')
