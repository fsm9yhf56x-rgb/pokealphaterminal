'use client'

import { useState, useMemo, useRef, useEffect } from 'react'

type Platform = 'GB'|'GBC'|'GBA'|'DS'|'N64'|'GC'
type GameType = 'main'|'spinoff'|'stadium'|'mystery'|'ranger'

interface Game {
  id: string; name: string; nameFr: string; year: number; platform: Platform;
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
  mystery:{label:'Donjon Mystère'},ranger:{label:'Ranger'},
}

const GAMES: Game[] = [
  {id:'red',name:'Pokémon Red',nameFr:'Pokémon Rouge',year:1996,platform:'GB',type:'main',gen:1,img:'https://archives.bulbagarden.net/media/upload/a/ad/Pok%C3%A9mon_Red_Version_cover.png',description:'Le jeu qui a tout lancé. Parcourez Kanto et devenez Maître Pokémon avec 151 créatures à capturer.'},
  {id:'blue',name:'Pokémon Blue',nameFr:'Pokémon Bleu',year:1996,platform:'GB',type:'main',gen:1,img:'https://archives.bulbagarden.net/media/upload/a/a4/Pok%C3%A9mon_Blue_Version_cover.png',description:'Version compagnon de Rouge. Même aventure, Pokémon exclusifs différents.'},
  {id:'yellow',name:'Pokémon Yellow',nameFr:'Pokémon Jaune',year:1998,platform:'GB',type:'main',gen:1,img:'https://archives.bulbagarden.net/media/upload/4/4a/Pok%C3%A9mon_Yellow_Version_cover.png',description:'Pikachu vous suit partout ! Version spéciale inspirée de l\'anime.'},
  {id:'gold',name:'Pokémon Gold',nameFr:'Pokémon Or',year:1999,platform:'GBC',type:'main',gen:2,img:'https://archives.bulbagarden.net/media/upload/3/3e/Pok%C3%A9mon_Gold_Version_cover.png',description:'Direction Johto avec 100 nouveaux Pokémon, le cycle jour/nuit et les œufs.'},
  {id:'silver',name:'Pokémon Silver',nameFr:'Pokémon Argent',year:1999,platform:'GBC',type:'main',gen:2,img:'https://archives.bulbagarden.net/media/upload/1/17/Pok%C3%A9mon_Silver_Version_cover.png',description:'Version compagnon d\'Or. Explorez Johto et retournez à Kanto.'},
  {id:'crystal',name:'Pokémon Crystal',nameFr:'Pokémon Cristal',year:2000,platform:'GBC',type:'main',gen:2,img:'https://archives.bulbagarden.net/media/upload/4/4b/Pok%C3%A9mon_Crystal_Version_cover.png',description:'Version améliorée avec Suicune en vedette. Premier jeu où l\'on peut jouer une fille.'},
  {id:'ruby',name:'Pokémon Ruby',nameFr:'Pokémon Rubis',year:2002,platform:'GBA',type:'main',gen:3,img:'https://archives.bulbagarden.net/media/upload/b/b9/Pok%C3%A9mon_Ruby_Version_cover.png',description:'Bienvenue à Hoenn ! Nouveaux graphismes, talents et combats doubles.'},
  {id:'sapphire',name:'Pokémon Sapphire',nameFr:'Pokémon Saphir',year:2002,platform:'GBA',type:'main',gen:3,img:'https://archives.bulbagarden.net/media/upload/4/4a/Pok%C3%A9mon_Sapphire_Version_cover.png',description:'Version compagnon de Rubis. Team Aqua au lieu de Team Magma.'},
  {id:'emerald',name:'Pokémon Emerald',nameFr:'Pokémon Émeraude',year:2004,platform:'GBA',type:'main',gen:3,img:'https://archives.bulbagarden.net/media/upload/f/f3/Pok%C3%A9mon_Emerald_Version_cover.png',description:'Version ultime de Hoenn avec la Battle Frontier et Rayquaza.'},
  {id:'firered',name:'Pokémon FireRed',nameFr:'Pokémon Rouge Feu',year:2004,platform:'GBA',type:'main',gen:3,img:'https://archives.bulbagarden.net/media/upload/a/a0/Pok%C3%A9mon_FireRed_Version_cover.png',description:'Remake de Rouge avec les graphismes GBA. Les Îles Sevii en bonus.'},
  {id:'leafgreen',name:'Pokémon LeafGreen',nameFr:'Pokémon Vert Feuille',year:2004,platform:'GBA',type:'main',gen:3,img:'https://archives.bulbagarden.net/media/upload/0/0a/Pok%C3%A9mon_LeafGreen_Version_cover.png',description:'Remake de Bleu/Vert. Retour à Kanto en beauté.'},
  {id:'diamond',name:'Pokémon Diamond',nameFr:'Pokémon Diamant',year:2006,platform:'DS',type:'main',gen:4,img:'https://archives.bulbagarden.net/media/upload/b/b8/Pok%C3%A9mon_Diamond_Version_cover.png',description:'Explorez Sinnoh sur DS. Échanges Wi-Fi et GTS révolutionnaires.'},
  {id:'pearl',name:'Pokémon Pearl',nameFr:'Pokémon Perle',year:2006,platform:'DS',type:'main',gen:4,img:'https://archives.bulbagarden.net/media/upload/f/f4/Pok%C3%A9mon_Pearl_Version_cover.png',description:'Version compagnon de Diamant. Palkia en couverture.'},
  {id:'platinum',name:'Pokémon Platinum',nameFr:'Pokémon Platine',year:2008,platform:'DS',type:'main',gen:4,img:'https://archives.bulbagarden.net/media/upload/0/0f/Pok%C3%A9mon_Platinum_Version_cover.png',description:'Le Monde Distorsion et Giratina. La version définitive de Sinnoh.'},
  {id:'hgss-hg',name:'Pokémon HeartGold',nameFr:'Pokémon Or HeartGold',year:2009,platform:'DS',type:'main',gen:4,img:'https://archives.bulbagarden.net/media/upload/5/55/Pok%C3%A9mon_HeartGold_Version_cover.png',description:'Remake d\'Or sur DS. Le Pokéwalker et votre Pokémon qui vous suit.'},
  {id:'hgss-ss',name:'Pokémon SoulSilver',nameFr:'Pokémon Argent SoulSilver',year:2009,platform:'DS',type:'main',gen:4,img:'https://archives.bulbagarden.net/media/upload/4/4f/Pok%C3%A9mon_SoulSilver_Version_cover.png',description:'Remake d\'Argent. Considéré par beaucoup comme le meilleur Pokémon.'},
  {id:'stadium',name:'Pokémon Stadium',nameFr:'Pokémon Stadium',year:1999,platform:'N64',type:'stadium',gen:1,img:'https://archives.bulbagarden.net/media/upload/9/96/Pok%C3%A9mon_Stadium_cover.png',description:'Combats 3D sur N64. Connectez votre Game Boy pour utiliser vos Pokémon.'},
  {id:'stadium2',name:'Pokémon Stadium 2',nameFr:'Pokémon Stadium 2',year:2000,platform:'N64',type:'stadium',gen:2,img:'https://archives.bulbagarden.net/media/upload/6/62/Pok%C3%A9mon_Stadium_2_cover.png',description:'Suite avec les 251 Pokémon de Johto. Mini-jeux légendaires.'},
  {id:'snap',name:'Pokémon Snap',nameFr:'Pokémon Snap',year:1999,platform:'N64',type:'spinoff',gen:1,img:'https://archives.bulbagarden.net/media/upload/4/4e/Pok%C3%A9mon_Snap_cover.png',description:'Photographiez les Pokémon dans leur habitat naturel. Un concept unique et culte.'},
  {id:'colosseum',name:'Pokémon Colosseum',nameFr:'Pokémon Colosseum',year:2003,platform:'GC',type:'stadium',gen:3,img:'https://archives.bulbagarden.net/media/upload/b/bb/Pok%C3%A9mon_Colosseum_cover.png',description:'RPG sombre sur GameCube. Purifiez les Pokémon Obscurs dans la région d\'Orre.'},
  {id:'xd',name:'Pokémon XD',nameFr:'Pokémon XD : Le Souffle des Ténèbres',year:2005,platform:'GC',type:'stadium',gen:3,img:'https://archives.bulbagarden.net/media/upload/e/e3/Pok%C3%A9mon_XD_Gale_of_Darkness_cover.png',description:'Suite de Colosseum. Lugia Obscur et une aventure plus profonde.'},
  {id:'mystery-red',name:'Pokémon Mystery Dungeon Red',nameFr:'Pokémon Donjon Mystère : Equipe de Secours Rouge',year:2005,platform:'GBA',type:'mystery',gen:3,img:'https://archives.bulbagarden.net/media/upload/3/3e/Pok%C3%A9mon_Mystery_Dungeon_Red_Rescue_Team_cover.png',description:'Vous êtes transformé en Pokémon ! Explorez des donjons générés aléatoirement.'},
  {id:'mystery-blue',name:'Pokémon Mystery Dungeon Blue',nameFr:'Pokémon Donjon Mystère : Equipe de Secours Bleue',year:2005,platform:'DS',type:'mystery',gen:3,img:'https://archives.bulbagarden.net/media/upload/0/09/Pok%C3%A9mon_Mystery_Dungeon_Blue_Rescue_Team_cover.png',description:'Version DS de Donjon Mystère avec des graphismes améliorés.'},
  {id:'ranger',name:'Pokémon Ranger',nameFr:'Pokémon Ranger',year:2006,platform:'DS',type:'ranger',gen:3,img:'https://archives.bulbagarden.net/media/upload/a/ab/Pok%C3%A9mon_Ranger_cover.png',description:'Capturez avec le stylet ! Un gameplay tactile innovant dans la région de Fiore.'},
  {id:'pinball',name:'Pokémon Pinball',nameFr:'Pokémon Pinball',year:1999,platform:'GBC',type:'spinoff',gen:1,img:'https://archives.bulbagarden.net/media/upload/c/cc/Pok%C3%A9mon_Pinball_cover.png',description:'Flipper avec des Pokémon à capturer. La cartouche vibrait grâce au moteur intégré.'},
  {id:'tcg-gb',name:'Pokémon TCG',nameFr:'Pokémon Jeu de Cartes à Collectionner',year:1998,platform:'GB',type:'spinoff',gen:1,img:'https://archives.bulbagarden.net/media/upload/5/58/Pok%C3%A9mon_Trading_Card_Game_cover.png',description:'Le JCC Pokémon sur Game Boy ! Collectionnez des cartes et battez les Grands Maîtres.'},
  {id:'puzzle',name:'Pokémon Puzzle Challenge',nameFr:'Pokémon Puzzle Challenge',year:2000,platform:'GBC',type:'spinoff',gen:2,img:'https://archives.bulbagarden.net/media/upload/9/9e/Pok%C3%A9mon_Puzzle_Challenge_cover.png',description:'Puzzle game addictif de type Panel de Pon avec les Pokémon de Johto.'},
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
    if (search) { const q = search.toLowerCase(); r = r.filter(g => g.name.toLowerCase().includes(q) || g.nameFr.toLowerCase().includes(q)) }
    if (sort === 'name') return r.sort((a, b) => a.nameFr.localeCompare(b.nameFr))
    if (sort === 'gen') return r.sort((a, b) => a.gen - b.gen || a.year - b.year)
    return r.sort((a, b) => a.year - b.year)
  }, [filPlatform, filType, filGen, search, sort])

  const pageItems = filtered.slice(0, visible)
  const hasMore = visible < filtered.length
  const selGame = selId ? GAMES.find(g => g.id === selId) : null

  useEffect(() => { setVisible(CHUNK) }, [filPlatform, filType, filGen, search, sort])
  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(e => { if (e[0].isIntersecting) setVisible(p => Math.min(p + CHUNK, filtered.length)) }, { rootMargin: '400px' })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [visible, filtered.length])

  const gens = [...new Set(GAMES.map(g => g.gen))].sort()

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
          {/* Header */}
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap' as const,gap:12}}>
            <div>
              <p style={{fontSize:10,color:'#AAA',textTransform:'uppercase' as const,letterSpacing:'.1em',margin:'0 0 4px',fontFamily:'var(--font-display)'}}>Pokédesk</p>
              <h1 style={{fontSize:26,fontWeight:600,color:'#111',fontFamily:'var(--font-display)',letterSpacing:'-.5px',margin:'0 0 6px'}}>Jeux Vidéo Vintage</h1>
              <div style={{fontSize:12,color:'#86868B'}}><strong style={{color:'#1D1D1F'}}>{filtered.length}</strong> jeux · Générations 1 à 4</div>
            </div>
          </div>

          {/* Search + Sort */}
          <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap' as const,alignItems:'center'}}>
            <div style={{position:'relative' as const,flex:1,minWidth:200}}>
              <span style={{position:'absolute' as const,left:11,top:'50%',transform:'translateY(-50%)',color:'#CCC',fontSize:15,pointerEvents:'none' as const}}>{String.fromCharCode(8981)}</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un jeu..."
                style={{width:'100%',height:38,padding:'0 12px 0 32px',border:'1px solid #EBEBEB',borderRadius:9,fontSize:13,color:'#111',outline:'none',background:'#fff',fontFamily:'var(--font-sans)',boxSizing:'border-box' as const}}/>
            </div>
            <div style={{display:'flex',gap:3,background:'#F5F5F5',borderRadius:9,padding:3}}>
              {([['year','Année'],['name','Nom'],['gen','Génération']] as ['year'|'name'|'gen',string][]).map(([k,l])=>(
                <button key={k} onClick={()=>setSort(k)} className={'srt'+(sort===k?' on':'')}>{l}</button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap' as const,alignItems:'center',position:'sticky' as const,top:0,zIndex:30,background:'rgba(255,255,255,.92)',backdropFilter:'blur(8px)',padding:'10px 0'}}>
            <select className="fsel" value={filGen} onChange={e=>setFilGen(e.target.value)} style={{color:filGen!=='all'?'#111':'#AAA'}}>
              <option value="all">Toutes les générations</option>
              {gens.map(g=><option key={g} value={g}>Génération {g}</option>)}
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
              <button onClick={()=>{setFilPlatform('all');setFilType('all');setFilGen('all');setSearch('')}} style={{height:30,padding:'0 12px',borderRadius:7,border:'1px solid #EBEBEB',background:'#fff',color:'#888',fontSize:11,cursor:'pointer',fontFamily:'var(--font-display)'}}>✕ Effacer</button>
            )}
            <span style={{fontSize:11,color:'#AEAEB2',marginLeft:'auto',fontFamily:'var(--font-display)'}}>{filtered.length} jeux</span>
          </div>

          {/* Grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
            {pageItems.map((game,idx)=>{
              const isSel=selId===game.id
              const plt=PLATFORMS[game.platform]
              return (
                <div key={game.id} className="enc-card" onClick={()=>setSelId(isSel?null:game.id)}
                  style={{background:'#fff',border:'1.5px solid '+(isSel?'#111':'#EBEBEB'),boxShadow:isSel?'0 8px 28px rgba(0,0,0,.1)':'0 2px 8px rgba(0,0,0,.04)',animation:'cardIn .28s '+Math.min(idx,18)*.025+'s ease-out both'}}>
                  <div style={{height:220,background:'#F5F5F5',position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <img src={game.img} alt={game.nameFr} className="card-img"
                      style={{maxWidth:'75%',maxHeight:'90%',objectFit:'contain' as const,filter:'drop-shadow(0 4px 12px rgba(0,0,0,.12))'}}
                      onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                    <div style={{position:'absolute',top:6,left:6,zIndex:2,padding:'2px 6px',borderRadius:4,background:plt.bg,fontSize:8,fontWeight:600,color:plt.color,fontFamily:'var(--font-display)',letterSpacing:'.02em'}}>{plt.label}</div>
                    <div style={{position:'absolute',top:6,right:6,zIndex:2,padding:'2px 6px',borderRadius:4,background:'#F5F5F7',fontSize:8,fontWeight:600,color:'#86868B',fontFamily:'var(--font-display)'}}>Gen {game.gen}</div>
                  </div>
                  <div style={{padding:'10px 12px 12px'}}>
                    <div className="card-name" style={{fontSize:13,fontWeight:600,color:'#111',fontFamily:'var(--font-display)',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,lineHeight:1.3}}>{game.nameFr}</div>
                    <div style={{fontSize:10,color:'#AEAEB2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>
                      {game.year} · {TYPES[game.type].label}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {hasMore&&<div ref={sentinelRef} style={{display:'flex',justifyContent:'center',padding:'32px 0'}}><div style={{display:'flex',alignItems:'center',gap:8,color:'#AEAEB2',fontSize:12,fontFamily:'var(--font-display)'}}><div style={{width:16,height:16,border:'2px solid #E5E5EA',borderTop:'2px solid #86868B',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>Chargement...</div></div>}
          {filtered.length===0&&(
            <div style={{textAlign:'center' as const,padding:'60px 20px'}}>
              <div style={{fontSize:48,opacity:.15,marginBottom:16}}>🎮</div>
              <div style={{fontSize:16,fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',marginBottom:6}}>Aucun jeu trouvé</div>
              <button onClick={()=>{setFilPlatform('all');setFilType('all');setFilGen('all');setSearch('')}} style={{padding:'8px 16px',borderRadius:8,background:'#1D1D1F',color:'#fff',border:'none',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)'}}>Effacer les filtres</button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selGame && (
          <div className="detail-panel" style={{width:285,flexShrink:0,position:'sticky' as any,top:80,maxHeight:'calc(100vh - 100px)',overflowY:'auto' as any}}>
            <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:16,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,.07)'}}>
              <div style={{background:'#F5F5F5',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',position:'relative',minHeight:200}}>
                <img src={selGame.img} alt={selGame.nameFr} style={{maxHeight:200,maxWidth:'80%',objectFit:'contain' as const,filter:'drop-shadow(0 6px 16px rgba(0,0,0,.15))'}}
                  onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                <button onClick={()=>setSelId(null)} style={{position:'absolute',top:8,left:8,width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,.9)',border:'1px solid rgba(0,0,0,.08)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div style={{padding:14}}>
                <div style={{fontSize:16,fontWeight:700,color:'#111',fontFamily:'var(--font-display)',lineHeight:1.2,marginBottom:2}}>{selGame.nameFr}</div>
                <div style={{fontSize:11,color:'#AEAEB2',fontFamily:'var(--font-display)',marginBottom:12}}>{selGame.name}</div>
                <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap' as const}}>
                  <span style={{padding:'3px 8px',borderRadius:5,background:PLATFORMS[selGame.platform].bg,color:PLATFORMS[selGame.platform].color,fontSize:9,fontWeight:600,fontFamily:'var(--font-display)'}}>{PLATFORMS[selGame.platform].label}</span>
                  <span style={{padding:'3px 8px',borderRadius:5,background:'#F5F5F7',color:'#86868B',fontSize:9,fontWeight:600,fontFamily:'var(--font-display)'}}>Génération {selGame.gen}</span>
                  <span style={{padding:'3px 8px',borderRadius:5,background:'#F5F5F7',color:'#86868B',fontSize:9,fontWeight:600,fontFamily:'var(--font-display)'}}>{selGame.year}</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
                  {[['Type',TYPES[selGame.type].label],['Année',String(selGame.year)],['Console',PLATFORMS[selGame.platform].label],['Génération','Gen '+selGame.gen]].map(([l,v])=>(
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
