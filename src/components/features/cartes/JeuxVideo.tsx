'use client'

import { useState, useMemo, useRef, useEffect } from 'react'

type Platform = 'GB'|'GBC'|'GBA'|'DS'|'N64'|'GC'
type GameType = 'main'|'spinoff'|'stadium'|'mystery'|'ranger'

interface Game {
  id: string; name: string; nameFr: string; nameJp: string; year: number; platform: Platform
  type: GameType; gen: number; img: string; description: string
}

const PLATFORMS: Record<Platform,{label:string;color:string;bg:string}> = {
  GB:  {label:'Game Boy',        color:'#2D6B22', bg:'#EAF3DE'},
  GBC: {label:'Game Boy Color',  color:'#7B2D8B', bg:'#F5EAFF'},
  GBA: {label:'Game Boy Advance',color:'#003DAA', bg:'#F0F5FF'},
  DS:  {label:'Nintendo DS',     color:'#1D1D1F', bg:'#F5F5F7'},
  N64: {label:'Nintendo 64',     color:'#C84B00', bg:'#FFF5F0'},
  GC:  {label:'GameCube',        color:'#534AB7', bg:'#EEEDFE'},
}

const TYPES: Record<GameType,{label:string}> = {
  main:{label:'Jeu principal'},spinoff:{label:'Spin-off'},stadium:{label:'Stadium/Battle'},
  mystery:{label:'Donjon Myst\u00e8re'},ranger:{label:'Ranger'},
}

const GAMES: Game[] = [
  {id:'red',name:'Pok\u00e9mon Red',nameFr:'Pok\u00e9mon Rouge',nameJp:'Pocket Monsters Aka',year:1996,platform:'GB',type:'main',gen:1,img:'/img/games/red.png',description:'Le jeu qui a tout lanc\u00e9. Parcourez Kanto et devenez Ma\u00eetre Pok\u00e9mon avec 151 cr\u00e9atures \u00e0 capturer.'},
  {id:'blue',name:'Pok\u00e9mon Blue',nameFr:'Pok\u00e9mon Bleu',nameJp:'Pocket Monsters Ao',year:1996,platform:'GB',type:'main',gen:1,img:'/img/games/blue.png',description:'Version compagnon de Rouge. M\u00eame aventure, Pok\u00e9mon exclusifs diff\u00e9rents.'},
  {id:'yellow',name:'Pok\u00e9mon Yellow',nameFr:'Pok\u00e9mon Jaune',nameJp:'Pocket Monsters Pikachu',year:1998,platform:'GB',type:'main',gen:1,img:'/img/games/yellow.png',description:'Pikachu vous suit partout ! Version sp\u00e9ciale inspir\u00e9e de l\'anime.'},
  {id:'gold',name:'Pok\u00e9mon Gold',nameFr:'Pok\u00e9mon Or',nameJp:'Pocket Monsters Kin',year:1999,platform:'GBC',type:'main',gen:2,img:'/img/games/gold.png',description:'Direction Johto avec 100 nouveaux Pok\u00e9mon, le cycle jour/nuit et les \u0153ufs.'},
  {id:'silver',name:'Pok\u00e9mon Silver',nameFr:'Pok\u00e9mon Argent',nameJp:'Pocket Monsters Gin',year:1999,platform:'GBC',type:'main',gen:2,img:'/img/games/silver.png',description:'Version compagnon d\'Or. Explorez Johto et retournez \u00e0 Kanto.'},
  {id:'crystal',name:'Pok\u00e9mon Crystal',nameFr:'Pok\u00e9mon Cristal',nameJp:'Pocket Monsters Crystal',year:2000,platform:'GBC',type:'main',gen:2,img:'/img/games/crystal.png',description:'Version am\u00e9lior\u00e9e avec Suicune en vedette. Premier jeu o\u00f9 l\'on peut jouer une fille.'},
  {id:'ruby',name:'Pok\u00e9mon Ruby',nameFr:'Pok\u00e9mon Rubis',nameJp:'Pocket Monsters Ruby',year:2002,platform:'GBA',type:'main',gen:3,img:'/img/games/ruby.png',description:'Bienvenue \u00e0 Hoenn ! Nouveaux graphismes, talents et combats doubles.'},
  {id:'sapphire',name:'Pok\u00e9mon Sapphire',nameFr:'Pok\u00e9mon Saphir',nameJp:'Pocket Monsters Sapphire',year:2002,platform:'GBA',type:'main',gen:3,img:'/img/games/sapphire.png',description:'Version compagnon de Rubis. Team Aqua au lieu de Team Magma.'},
  {id:'emerald',name:'Pok\u00e9mon Emerald',nameFr:'Pok\u00e9mon \u00c9meraude',nameJp:'Pocket Monsters Emerald',year:2004,platform:'GBA',type:'main',gen:3,img:'/img/games/emerald.png',description:'Version ultime de Hoenn avec la Battle Frontier et Rayquaza.'},
  {id:'firered',name:'Pok\u00e9mon FireRed',nameFr:'Pok\u00e9mon Rouge Feu',nameJp:'Pocket Monsters FireRed',year:2004,platform:'GBA',type:'main',gen:3,img:'/img/games/firered.png',description:'Remake de Rouge avec les graphismes GBA. Les \u00celes Sevii en bonus.'},
  {id:'leafgreen',name:'Pok\u00e9mon LeafGreen',nameFr:'Pok\u00e9mon Vert Feuille',nameJp:'Pocket Monsters LeafGreen',year:2004,platform:'GBA',type:'main',gen:3,img:'/img/games/leafgreen.png',description:'Remake de Bleu/Vert. Retour \u00e0 Kanto en beaut\u00e9.'},
  {id:'diamond',name:'Pok\u00e9mon Diamond',nameFr:'Pok\u00e9mon Diamant',nameJp:'Pocket Monsters Diamond',year:2006,platform:'DS',type:'main',gen:4,img:'/img/games/diamond.png',description:'Explorez Sinnoh sur DS. \u00c9changes Wi-Fi et GTS r\u00e9volutionnaires.'},
  {id:'pearl',name:'Pok\u00e9mon Pearl',nameFr:'Pok\u00e9mon Perle',nameJp:'Pocket Monsters Pearl',year:2006,platform:'DS',type:'main',gen:4,img:'/img/games/pearl.png',description:'Version compagnon de Diamant. Palkia en couverture.'},
  {id:'platinum',name:'Pok\u00e9mon Platinum',nameFr:'Pok\u00e9mon Platine',nameJp:'Pocket Monsters Platinum',year:2008,platform:'DS',type:'main',gen:4,img:'/img/games/platinum.png',description:'Le Monde Distorsion et Giratina. La version d\u00e9finitive de Sinnoh.'},
  {id:'hgss-hg',name:'Pok\u00e9mon HeartGold',nameFr:'Pok\u00e9mon Or HeartGold',nameJp:'Pocket Monsters HeartGold',year:2009,platform:'DS',type:'main',gen:4,img:'/img/games/hgss-hg.png',description:'Remake d\'Or sur DS. Le Pok\u00e9walker et votre Pok\u00e9mon qui vous suit.'},
  {id:'hgss-ss',name:'Pok\u00e9mon SoulSilver',nameFr:'Pok\u00e9mon Argent SoulSilver',nameJp:'Pocket Monsters SoulSilver',year:2009,platform:'DS',type:'main',gen:4,img:'/img/games/hgss-ss.png',description:'Remake d\'Argent. Consid\u00e9r\u00e9 par beaucoup comme le meilleur Pok\u00e9mon.'},
  {id:'stadium',name:'Pok\u00e9mon Stadium',nameFr:'Pok\u00e9mon Stadium',nameJp:'Pocket Monsters Stadium',year:1999,platform:'N64',type:'stadium',gen:1,img:'/img/games/stadium.png',description:'Combats 3D sur N64. Connectez votre Game Boy pour utiliser vos Pok\u00e9mon.'},
  {id:'stadium2',name:'Pok\u00e9mon Stadium 2',nameFr:'Pok\u00e9mon Stadium 2',nameJp:'Pocket Monsters Stadium Kin Gin',year:2000,platform:'N64',type:'stadium',gen:2,img:'/img/games/stadium2.png',description:'Suite avec les 251 Pok\u00e9mon de Johto. Mini-jeux l\u00e9gendaires.'},
  {id:'snap',name:'Pok\u00e9mon Snap',nameFr:'Pok\u00e9mon Snap',nameJp:'Pocket Monsters Snap',year:1999,platform:'N64',type:'spinoff',gen:1,img:'/img/games/snap.png',description:'Photographiez les Pok\u00e9mon dans leur habitat naturel. Un concept unique et culte.'},
  {id:'colosseum',name:'Pok\u00e9mon Colosseum',nameFr:'Pok\u00e9mon Colosseum',nameJp:'Pocket Monsters Colosseum',year:2003,platform:'GC',type:'stadium',gen:3,img:'/img/games/colosseum.png',description:'RPG sombre sur GameCube. Purifiez les Pok\u00e9mon Obscurs dans la r\u00e9gion d\'Orre.'},
  {id:'xd',name:'Pok\u00e9mon XD',nameFr:'Pok\u00e9mon XD : Le Souffle des T\u00e9n\u00e8bres',nameJp:'Pocket Monsters XD',year:2005,platform:'GC',type:'stadium',gen:3,img:'/img/games/xd.png',description:'Suite de Colosseum. Lugia Obscur et une aventure plus profonde.'},
  {id:'mystery-red',name:'Pok\u00e9mon Mystery Dungeon Red',nameFr:'Pok\u00e9mon Donjon Myst\u00e8re Rouge',nameJp:'Fushigi no Dungeon Aka',year:2005,platform:'GBA',type:'mystery',gen:3,img:'/img/games/mystery-red.png',description:'Vous \u00eates transform\u00e9 en Pok\u00e9mon ! Explorez des donjons g\u00e9n\u00e9r\u00e9s al\u00e9atoirement.'},
  {id:'mystery-blue',name:'Pok\u00e9mon Mystery Dungeon Blue',nameFr:'Pok\u00e9mon Donjon Myst\u00e8re Bleu',nameJp:'Fushigi no Dungeon Ao',year:2005,platform:'DS',type:'mystery',gen:3,img:'/img/games/mystery-blue.png',description:'Version DS de Donjon Myst\u00e8re avec des graphismes am\u00e9lior\u00e9s.'},
  {id:'ranger',name:'Pok\u00e9mon Ranger',nameFr:'Pok\u00e9mon Ranger',nameJp:'Pocket Monsters Ranger',year:2006,platform:'DS',type:'ranger',gen:3,img:'/img/games/ranger.png',description:'Capturez avec le stylet ! Un gameplay tactile innovant dans la r\u00e9gion de Fiore.'},
  {id:'pinball',name:'Pok\u00e9mon Pinball',nameFr:'Pok\u00e9mon Pinball',nameJp:'Pocket Monsters Pinball',year:1999,platform:'GBC',type:'spinoff',gen:1,img:'/img/games/pinball.png',description:'Flipper avec des Pok\u00e9mon \u00e0 capturer. La cartouche vibrait gr\u00e2ce au moteur int\u00e9gr\u00e9.'},
  {id:'tcg-gb',name:'Pok\u00e9mon TCG',nameFr:'Pok\u00e9mon Jeu de Cartes',nameJp:'Pocket Monsters Card Game',year:1998,platform:'GB',type:'spinoff',gen:1,img:'/img/games/tcg-gb.png',description:'Le JCC Pok\u00e9mon sur Game Boy ! Collectionnez des cartes et battez les Grands Ma\u00eetres.'},
  {id:'puzzle',name:'Pok\u00e9mon Puzzle Challenge',nameFr:'Pok\u00e9mon Puzzle Challenge',nameJp:'Pocket Monsters Puzzle',year:2000,platform:'GBC',type:'spinoff',gen:2,img:'/img/games/puzzle.png',description:'Puzzle game addictif de type Panel de Pon avec les Pok\u00e9mon de Johto.'},
]

const CHUNK = 40

export function JeuxVideo() {
  const [filPlatform, setFilPlatform] = useState<'all'|Platform>('all')
  const [filType, setFilType] = useState<'all'|GameType>('all')
  const [filGen, setFilGen] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'year'|'name'|'gen'>('year')
  const [visible, setVisible] = useState(CHUNK)
  const [selId, setSelId] = useState<string|null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    let r = [...GAMES]
    if (filPlatform !== 'all') r = r.filter(g => g.platform === filPlatform)
    if (filType !== 'all') r = r.filter(g => g.type === filType)
    if (filGen !== 'all') r = r.filter(g => g.gen === parseInt(filGen))
    if (search) { const q = search.toLowerCase(); r = r.filter(g => g.name.toLowerCase().includes(q) || g.nameFr.toLowerCase().includes(q) || g.nameJp.toLowerCase().includes(q)) }
    if (sort === 'name') return r.sort((a, b) => a.nameFr.localeCompare(b.nameFr))
    if (sort === 'gen') return r.sort((a, b) => a.gen - b.gen || a.year - b.year)
    return r.sort((a, b) => a.year - b.year)
  }, [filPlatform, filType, filGen, search, sort])

  const pageItems = filtered.slice(0, visible)
  const hasMore = visible < filtered.length
  const selGame = selId ? GAMES.find(g => g.id === selId) : null
  const gens = [...new Set(GAMES.map(g => g.gen))].sort()

  useEffect(() => { setVisible(CHUNK) }, [filPlatform, filType, filGen, search, sort])
  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(e => { if (e[0].isIntersecting) setVisible(p => Math.min(p + CHUNK, filtered.length)) }, { rootMargin: '400px' })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [visible, filtered.length])

  return (
    <>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cardIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        @keyframes panelIn{from{opacity:0;transform:translateX(14px) scale(.98)}to{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .enc-card{transition:transform .22s cubic-bezier(.34,1.4,.64,1),box-shadow .22s ease,border-color .18s ease;border-radius:12px;overflow:hidden;cursor:pointer;position:relative}
        .enc-card:hover{transform:translateY(-5px) scale(1.02) !important;box-shadow:0 12px 32px rgba(0,0,0,.1) !important;border-color:#D2D2D7 !important}
        .enc-card:hover .card-img{transform:scale(1.04)}
        .enc-card:hover .card-name{color:#000 !important}
        .enc-card::after{content:'';position:absolute;inset:0;border-radius:12px;pointer-events:none;background:linear-gradient(115deg,rgba(255,255,255,0) 40%,rgba(255,255,255,.18) 50%,rgba(255,255,255,0) 60%);opacity:0;transition:opacity .25s}
        .enc-card:hover::after{opacity:1}
        .card-img{transition:transform .35s cubic-bezier(.34,1.2,.64,1);will-change:transform}
        .pill{padding:5px 12px;border-radius:99px;border:1px solid #E5E5EA;background:#fff;color:#48484A;font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .12s;white-space:nowrap}
        .pill:hover{border-color:#1D1D1F;background:#F5F5F7}
        .pill.on{background:#1D1D1F !important;color:#fff !important;border-color:#1D1D1F !important}
        .srt{padding:5px 11px;border-radius:6px;border:none;background:transparent;color:#86868B;font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .12s}
        .srt:hover{background:#EBEBEB}
        .srt.on{background:#1D1D1F !important;color:#fff !important}
        .fsel{height:34px;padding:0 10px;border:1px solid #EBEBEB;border-radius:7px;font-size:12px;outline:none;background:#fff;cursor:pointer;font-family:var(--font-display);color:#555;transition:border-color .15s}
        .fsel:focus,.fsel:hover{border-color:#BBB}
        .detail-panel{animation:panelIn .28s cubic-bezier(.34,1.2,.64,1)}
      `}</style>
      <div style={{animation:'fadeIn .25s ease-out',width:'100%',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
            <div>
              <p style={{fontSize:10,color:'#AAA',textTransform:'uppercase',letterSpacing:'.1em',margin:'0 0 4px',fontFamily:'var(--font-display)'}}>Pok\u00e9desk</p>
              <h1 style={{fontSize:26,fontWeight:600,color:'#111',fontFamily:'var(--font-display)',letterSpacing:'-.5px',margin:'0 0 6px'}}>Jeux Vid\u00e9o Vintage</h1>
              <div style={{fontSize:12,color:'#86868B'}}><strong style={{color:'#1D1D1F'}}>{filtered.length}</strong> jeux \u00b7 G\u00e9n\u00e9rations 1 \u00e0 4</div>
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            <div style={{position:'relative',flex:1,minWidth:200}}>
              <span style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#CCC',fontSize:15,pointerEvents:'none'}}>{'\u2315'}</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un jeu..."
                style={{width:'100%',height:38,padding:'0 12px 0 32px',border:'1px solid #EBEBEB',borderRadius:9,fontSize:13,color:'#111',outline:'none',background:'#fff',fontFamily:'var(--font-sans)',boxSizing:'border-box'}}/>
            </div>
            <div style={{display:'flex',gap:3,background:'#F5F5F5',borderRadius:9,padding:3}}>
              {([['year','Ann\u00e9e'],['name','Nom'],['gen','G\u00e9n\u00e9ration']] as ['year'|'name'|'gen',string][]).map(([k,l])=>(
                <button key={k} onClick={()=>setSort(k)} className={'srt'+(sort===k?' on':'')}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap',alignItems:'center',position:'sticky',top:0,zIndex:30,background:'rgba(255,255,255,.92)',backdropFilter:'blur(8px)',padding:'10px 0'}}>
            <select className="fsel" value={filGen} onChange={e=>setFilGen(e.target.value)} style={{color:filGen!=='all'?'#111':'#AAA'}}>
              <option value="all">Toutes les g\u00e9n\u00e9rations</option>
              {gens.map(g=><option key={g} value={g}>G\u00e9n\u00e9ration {g}</option>)}
            </select>
            <div style={{width:1,height:24,background:'#EBEBEB'}}/>
            {(['all','GB','GBC','GBA','DS','N64','GC'] as ('all'|Platform)[]).map(p=>(
              <button key={p} onClick={()=>setFilPlatform(p)} className={'pill'+(filPlatform===p?' on':'')}
                style={filPlatform===p?{}:{background:p!=='all'?PLATFORMS[p as Platform]?.bg:'',color:p!=='all'?PLATFORMS[p as Platform]?.color:'',borderColor:p!=='all'?PLATFORMS[p as Platform]?.color+'30':''}}>
                {p==='all'?'Toutes':PLATFORMS[p].label}
              </button>
            ))}
            <div style={{width:1,height:24,background:'#EBEBEB'}}/>
            {(['all','main','spinoff','stadium','mystery','ranger'] as ('all'|GameType)[]).map(t=>(
              <button key={t} onClick={()=>setFilType(t)} className={'pill'+(filType===t?' on':'')}>{t==='all'?'Tous':TYPES[t].label}</button>
            ))}
            {(filPlatform!=='all'||filType!=='all'||filGen!=='all'||search)&&(
              <button onClick={()=>{setFilPlatform('all');setFilType('all');setFilGen('all');setSearch('')}} style={{height:30,padding:'0 12px',borderRadius:7,border:'1px solid #EBEBEB',background:'#fff',color:'#888',fontSize:11,cursor:'pointer',fontFamily:'var(--font-display)'}}>{'✕'} Effacer</button>
            )}
            <span style={{fontSize:11,color:'#AEAEB2',marginLeft:'auto',fontFamily:'var(--font-display)'}}>{filtered.length} jeux</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
            {pageItems.map((game,idx)=>{
              const isSel=selId===game.id
              const plt=PLATFORMS[game.platform]
              return (
                <div key={game.id} className="enc-card" onClick={()=>setSelId(isSel?null:game.id)}
                  style={{background:'#fff',border:'1.5px solid '+(isSel?'#111':'#EBEBEB'),boxShadow:isSel?'0 8px 28px rgba(0,0,0,.1)':'0 2px 8px rgba(0,0,0,.04)',animation:'cardIn .28s '+Math.min(idx,18)*.025+'s ease-out both'}}>
                  <div style={{height:220,background:'#F5F5F5',position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <img src={game.img} alt={game.nameFr} className="card-img"
                      style={{maxWidth:'75%',maxHeight:'90%',objectFit:'contain',filter:'drop-shadow(0 4px 12px rgba(0,0,0,.12))'}}
                      onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                    <div style={{position:'absolute',top:6,left:6,zIndex:2,padding:'2px 6px',borderRadius:4,background:plt.bg,fontSize:8,fontWeight:600,color:plt.color,fontFamily:'var(--font-display)',letterSpacing:'.02em'}}>{plt.label}</div>
                    <div style={{position:'absolute',top:6,right:6,zIndex:2,padding:'2px 6px',borderRadius:4,background:'#F5F5F7',fontSize:8,fontWeight:600,color:'#86868B',fontFamily:'var(--font-display)'}}>Gen {game.gen}</div>
                  </div>
                  <div style={{padding:'10px 12px 12px'}}>
                    <div className="card-name" style={{fontSize:13,fontWeight:600,color:'#111',fontFamily:'var(--font-display)',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.3}}>{game.nameFr}</div>
                    <div style={{fontSize:10,color:'#AEAEB2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {game.year} \u00b7 {TYPES[game.type].label}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {hasMore&&<div ref={sentinelRef} style={{display:'flex',justifyContent:'center',padding:'32px 0'}}><div style={{display:'flex',alignItems:'center',gap:8,color:'#AEAEB2',fontSize:12,fontFamily:'var(--font-display)'}}><div style={{width:16,height:16,border:'2px solid #E5E5EA',borderTop:'2px solid #86868B',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>Chargement...</div></div>}
          {filtered.length===0&&(
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:48,opacity:.15,marginBottom:16}}>{'\ud83c\udfae'}</div>
              <div style={{fontSize:16,fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',marginBottom:6}}>Aucun jeu trouv\u00e9</div>
              <button onClick={()=>{setFilPlatform('all');setFilType('all');setFilGen('all');setSearch('')}} style={{padding:'8px 16px',borderRadius:8,background:'#1D1D1F',color:'#fff',border:'none',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)'}}>Effacer les filtres</button>
            </div>
          )}
        </div>
        {selGame && (
          <div className="detail-panel" style={{width:285,flexShrink:0,position:'sticky',top:80,maxHeight:'calc(100vh - 100px)',overflowY:'auto'}}>
            <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:16,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,.07)'}}>
              <div style={{background:'#F5F5F5',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',position:'relative',minHeight:200}}>
                <img src={selGame.img} alt={selGame.nameFr} style={{maxHeight:200,maxWidth:'80%',objectFit:'contain',filter:'drop-shadow(0 6px 16px rgba(0,0,0,.15))'}}
                  onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                <button onClick={()=>setSelId(null)} style={{position:'absolute',top:8,left:8,width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,.9)',border:'1px solid rgba(0,0,0,.08)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div style={{padding:14}}>
                <div style={{fontSize:16,fontWeight:700,color:'#111',fontFamily:'var(--font-display)',lineHeight:1.2,marginBottom:2}}>{selGame.nameFr}</div>
                <div style={{fontSize:11,color:'#AEAEB2',fontFamily:'var(--font-display)',marginBottom:4}}>{selGame.name}</div>
                <div style={{fontSize:10,color:'#D2D2D7',fontFamily:'var(--font-display)',marginBottom:12}}>{'\ud83c\uddef\ud83c\uddf5'} {selGame.nameJp}</div>
                <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
                  <span style={{padding:'3px 8px',borderRadius:5,background:PLATFORMS[selGame.platform].bg,color:PLATFORMS[selGame.platform].color,fontSize:9,fontWeight:600,fontFamily:'var(--font-display)'}}>{PLATFORMS[selGame.platform].label}</span>
                  <span style={{padding:'3px 8px',borderRadius:5,background:'#F5F5F7',color:'#86868B',fontSize:9,fontWeight:600,fontFamily:'var(--font-display)'}}>G\u00e9n\u00e9ration {selGame.gen}</span>
                  <span style={{padding:'3px 8px',borderRadius:5,background:'#F5F5F7',color:'#86868B',fontSize:9,fontWeight:600,fontFamily:'var(--font-display)'}}>{selGame.year}</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
                  {[['Type',TYPES[selGame.type].label],['Ann\u00e9e',String(selGame.year)],['Console',PLATFORMS[selGame.platform].label],['G\u00e9n\u00e9ration','Gen '+selGame.gen]].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                      <span style={{fontSize:10,color:'#AAA',fontFamily:'var(--font-display)',flexShrink:0}}>{l}</span>
                      <span style={{fontSize:11,color:'#111',fontFamily:'var(--font-display)',fontWeight:500}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:'#F8F8FA',borderRadius:10,padding:'12px',marginBottom:12}}>
                  <div style={{fontSize:11,color:'#48484A',lineHeight:1.6,fontFamily:'var(--font-sans)'}}>{selGame.description}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
