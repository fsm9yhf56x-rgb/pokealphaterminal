'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { SNOW, FONT } from '@/lib/design/snow'
import { SnowButton } from '@/components/ui/snow'

type Platform = 'GB'|'GBC'|'GBA'|'DS'|'N64'|'GC'
type GameType = 'main'|'spinoff'|'stadium'|'mystery'|'ranger'

interface Game {
  id: string; name: string; nameFr: string; nameJp: string; year: number; platform: Platform
  type: GameType; gen: number; imgEn: string; imgJp: string; description: string; jpOnly?: boolean
}

const PLATFORMS: Record<Platform,{label:string;color:string;bg:string}> = {
  GB:{label:'Game Boy',color:'#2D6B22',bg:'rgba(234,243,222,0.7)'},
  GBC:{label:'Game Boy Color',color:'#7B2D8B',bg:'rgba(245,234,255,0.7)'},
  GBA:{label:'Game Boy Advance',color:'#003DAA',bg:'rgba(240,245,255,0.7)'},
  DS:{label:'Nintendo DS',color:'#1D1D1F',bg:'rgba(245,245,247,0.7)'},
  N64:{label:'Nintendo 64',color:'#C84B00',bg:'rgba(255,245,240,0.7)'},
  GC:{label:'GameCube',color:'#534AB7',bg:'rgba(238,237,254,0.7)'},
}
const TYPES: Record<GameType,{label:string}> = {
  main:{label:'Jeu principal'},spinoff:{label:'Spin-off'},stadium:{label:'Stadium/Battle'},
  mystery:{label:'Donjon Mystère'},ranger:{label:'Ranger'},
}

const GAMES: Game[] = [
  {id:'red',name:'Pokémon Red',nameFr:'Pokémon Rouge',nameJp:'ポケットモンスター 赤',year:1996,platform:'GB',type:'main',gen:1,imgEn:'/img/games/en/red.png',imgJp:'/img/games/jp/red.png',description:'Le jeu qui a tout lancé. Parcourez Kanto et devenez Maître Pokémon avec 151 créatures à capturer.'},
  {id:'blue',name:'Pokémon Blue',nameFr:'Pokémon Bleu',nameJp:'ポケットモンスター 青',year:1996,platform:'GB',type:'main',gen:1,imgEn:'/img/games/en/blue.png',imgJp:'/img/games/jp/blue.png',description:'Version compagnon de Rouge. Même aventure, Pokémon exclusifs différents.'},
  {id:'yellow',name:'Pokémon Yellow',nameFr:'Pokémon Jaune',nameJp:'ポケットモンスター ピカチュウ',year:1998,platform:'GB',type:'main',gen:1,imgEn:'/img/games/en/yellow.png',imgJp:'/img/games/jp/yellow.png',description:'Pikachu vous suit partout ! Version spéciale inspirée de l\'anime.'},
  {id:'tcg-gb',name:'Pokémon TCG',nameFr:'Pokémon Jeu de Cartes',nameJp:'ポケモンカードGB',year:1998,platform:'GB',type:'spinoff',gen:1,imgEn:'/img/games/en/tcg-gb.png',imgJp:'/img/games/jp/tcg-gb.png',description:'Le JCC Pokémon sur Game Boy ! Collectionnez des cartes et battez les Grands Maîtres.'},
  {id:'gold',name:'Pokémon Gold',nameFr:'Pokémon Or',nameJp:'ポケットモンスター 金',year:1999,platform:'GBC',type:'main',gen:2,imgEn:'/img/games/en/gold.png',imgJp:'/img/games/jp/gold.png',description:'Direction Johto avec 100 nouveaux Pokémon, le cycle jour/nuit et les œufs.'},
  {id:'silver',name:'Pokémon Silver',nameFr:'Pokémon Argent',nameJp:'ポケットモンスター 銀',year:1999,platform:'GBC',type:'main',gen:2,imgEn:'/img/games/en/silver.png',imgJp:'/img/games/jp/silver.png',description:'Version compagnon d\'Or. Explorez Johto et retournez à Kanto.'},
  {id:'pinball',name:'Pokémon Pinball',nameFr:'Pokémon Pinball',nameJp:'ポケモンピンボール',year:1999,platform:'GBC',type:'spinoff',gen:1,imgEn:'/img/games/en/pinball.png',imgJp:'/img/games/jp/pinball.png',description:'Flipper avec des Pokémon à capturer. La cartouche vibrait grâce au moteur intégré.'},
  {id:'stadium',name:'Pokémon Stadium',nameFr:'Pokémon Stadium',nameJp:'ポケモンスタジアム',year:1999,platform:'N64',type:'stadium',gen:1,imgEn:'/img/games/en/stadium.png',imgJp:'/img/games/jp/stadium.png',description:'Combats 3D sur N64. Connectez votre Game Boy pour utiliser vos Pokémon.'},
  {id:'snap',name:'Pokémon Snap',nameFr:'Pokémon Snap',nameJp:'ポケモンスナップ',year:1999,platform:'N64',type:'spinoff',gen:1,imgEn:'/img/games/en/snap.png',imgJp:'/img/games/jp/snap.png',description:'Photographiez les Pokémon dans leur habitat naturel. Un concept unique et culte.'},
  {id:'crystal',name:'Pokémon Crystal',nameFr:'Pokémon Cristal',nameJp:'ポケットモンスター クリスタル',year:2000,platform:'GBC',type:'main',gen:2,imgEn:'/img/games/en/crystal.png',imgJp:'/img/games/jp/crystal.png',description:'Version améliorée avec Suicune en vedette. Premier jeu où l\'on peut jouer une fille.'},
  {id:'puzzle',name:'Pokémon Puzzle Challenge',nameFr:'Pokémon Puzzle Challenge',nameJp:'ポケモンパズル',year:2000,platform:'GBC',type:'spinoff',gen:2,imgEn:'/img/games/en/puzzle.png',imgJp:'/img/games/jp/puzzle.png',description:'Puzzle game addictif de type Panel de Pon avec les Pokémon de Johto.'},
  {id:'stadium2',name:'Pokémon Stadium 2',nameFr:'Pokémon Stadium 2',nameJp:'ポケモンスタジアム金銀',year:2000,platform:'N64',type:'stadium',gen:2,imgEn:'/img/games/en/stadium2.png',imgJp:'/img/games/jp/stadium2.png',description:'Suite avec les 251 Pokémon de Johto. Mini-jeux légendaires.'},
  {id:'ruby',name:'Pokémon Ruby',nameFr:'Pokémon Rubis',nameJp:'ポケットモンスター ルビー',year:2002,platform:'GBA',type:'main',gen:3,imgEn:'/img/games/en/ruby.png',imgJp:'/img/games/jp/ruby.png',description:'Bienvenue à Hoenn ! Nouveaux graphismes, talents et combats doubles.'},
  {id:'sapphire',name:'Pokémon Sapphire',nameFr:'Pokémon Saphir',nameJp:'ポケットモンスター サファイア',year:2002,platform:'GBA',type:'main',gen:3,imgEn:'/img/games/en/sapphire.png',imgJp:'/img/games/jp/sapphire.png',description:'Version compagnon de Rubis. Team Aqua au lieu de Team Magma.'},
  {id:'colosseum',name:'Pokémon Colosseum',nameFr:'Pokémon Colosseum',nameJp:'ポケモンコロシアム',year:2003,platform:'GC',type:'stadium',gen:3,imgEn:'/img/games/en/colosseum.png',imgJp:'/img/games/jp/colosseum.png',description:'RPG sombre sur GameCube. Purifiez les Pokémon Obscurs dans la région d\'Orre.'},
  {id:'emerald',name:'Pokémon Emerald',nameFr:'Pokémon Émeraude',nameJp:'ポケットモンスター エメラルド',year:2004,platform:'GBA',type:'main',gen:3,imgEn:'/img/games/en/emerald.png',imgJp:'/img/games/jp/emerald.png',description:'Version ultime de Hoenn avec la Battle Frontier et Rayquaza.'},
  {id:'firered',name:'Pokémon FireRed',nameFr:'Pokémon Rouge Feu',nameJp:'ポケットモンスター ファイアレッド',year:2004,platform:'GBA',type:'main',gen:3,imgEn:'/img/games/en/firered.png',imgJp:'/img/games/jp/firered.png',description:'Remake de Rouge avec les graphismes GBA. Les Îles Sevii en bonus.'},
  {id:'leafgreen',name:'Pokémon LeafGreen',nameFr:'Pokémon Vert Feuille',nameJp:'ポケットモンスター リーフグリーン',year:2004,platform:'GBA',type:'main',gen:3,imgEn:'/img/games/en/leafgreen.png',imgJp:'/img/games/jp/leafgreen.png',description:'Remake de Bleu/Vert. Retour à Kanto en beauté.'},
  {id:'mystery-red',name:'Pokémon Mystery Dungeon Red',nameFr:'Pokémon Donjon Mystère Rouge',nameJp:'ポケモン不思議のダンジョン 赤',year:2005,platform:'GBA',type:'mystery',gen:3,imgEn:'/img/games/en/mystery-red.png',imgJp:'/img/games/jp/mystery-red.png',description:'Vous êtes transformé en Pokémon ! Explorez des donjons générés aléatoirement.'},
  {id:'mystery-blue',name:'Pokémon Mystery Dungeon Blue',nameFr:'Pokémon Donjon Mystère Bleu',nameJp:'ポケモン不思議のダンジョン 青',year:2005,platform:'DS',type:'mystery',gen:3,imgEn:'/img/games/en/mystery-blue.png',imgJp:'/img/games/jp/mystery-blue.png',description:'Version DS de Donjon Mystère avec des graphismes améliorés.'},
  {id:'xd',name:'Pokémon XD',nameFr:'Pokémon XD : Le Souffle des Ténèbres',nameJp:'ポケモンXD 闇の旋風',year:2005,platform:'GC',type:'stadium',gen:3,imgEn:'/img/games/en/xd.png',imgJp:'/img/games/jp/xd.png',description:'Suite de Colosseum. Lugia Obscur et une aventure plus profonde.'},
  {id:'diamond',name:'Pokémon Diamond',nameFr:'Pokémon Diamant',nameJp:'ポケットモンスター ダイヤモンド',year:2006,platform:'DS',type:'main',gen:4,imgEn:'/img/games/en/diamond.png',imgJp:'/img/games/jp/diamond.png',description:'Explorez Sinnoh sur DS. Échanges Wi-Fi et GTS révolutionnaires.'},
  {id:'pearl',name:'Pokémon Pearl',nameFr:'Pokémon Perle',nameJp:'ポケットモンスター パール',year:2006,platform:'DS',type:'main',gen:4,imgEn:'/img/games/en/pearl.png',imgJp:'/img/games/jp/pearl.png',description:'Version compagnon de Diamant. Palkia en couverture.'},
  {id:'ranger',name:'Pokémon Ranger',nameFr:'Pokémon Ranger',nameJp:'ポケモンレンジャー',year:2006,platform:'DS',type:'ranger',gen:3,imgEn:'/img/games/en/ranger.png',imgJp:'/img/games/jp/ranger.png',description:'Capturez avec le stylet ! Un gameplay tactile innovant dans la région de Fiore.'},
  {id:'platinum',name:'Pokémon Platinum',nameFr:'Pokémon Platine',nameJp:'ポケットモンスター プラチナ',year:2008,platform:'DS',type:'main',gen:4,imgEn:'/img/games/en/platinum.png',imgJp:'/img/games/jp/platinum.png',description:'Le Monde Distorsion et Giratina. La version définitive de Sinnoh.'},
  {id:'hgss-hg',name:'Pokémon HeartGold',nameFr:'Pokémon Or HeartGold',nameJp:'ポケットモンスター ハートゴールド',year:2009,platform:'DS',type:'main',gen:4,imgEn:'/img/games/en/hgss-hg.png',imgJp:'/img/games/jp/hgss-hg.png',description:'Remake d\'Or sur DS. Le Pokéwalker et votre Pokémon qui vous suit.'},
  {id:'hgss-ss',name:'Pokémon SoulSilver',nameFr:'Pokémon Argent SoulSilver',nameJp:'ポケットモンスター ソウルシルバー',year:2009,platform:'DS',type:'main',gen:4,imgEn:'/img/games/en/hgss-ss.png',imgJp:'/img/games/jp/hgss-ss.png',description:'Remake d\'Argent. Considéré par beaucoup comme le meilleur Pokémon.'},
  {id:'green',name:'Pocket Monsters Green',nameFr:'Pocket Monsters Vert',nameJp:'ポケットモンスター 緑',year:1996,platform:'GB',type:'main',gen:1,imgEn:'/img/games/jp/green.png',imgJp:'/img/games/jp/green.png',jpOnly:true,description:'Le vrai original japonais, sorti en paire avec Rouge. Remplacé par Bleu en Occident.'},
  {id:'stadium-jp',name:'Pocket Monsters Stadium',nameFr:'Pocket Monsters Stadium (JP)',nameJp:'ポケモンスタジアム',year:1998,platform:'N64',type:'stadium',gen:1,imgEn:'/img/games/jp/stadium-jp.png',imgJp:'/img/games/jp/stadium-jp.png',jpOnly:true,description:'Le tout premier Stadium, exclusif au Japon. Seulement 42 Pokémon jouables. Différent du Stadium occidental.'},
  {id:'tcg-gb2',name:'Pokémon Card GB2',nameFr:'Pokémon Card GB2',nameJp:'ポケモンカードGB2',year:2001,platform:'GBC',type:'spinoff',gen:2,imgEn:'/img/games/jp/tcg-gb2.png',imgJp:'/img/games/jp/tcg-gb2.png',jpOnly:true,description:'Suite du JCC Game Boy, exclusif au Japon. Team Great Rocket en antagoniste. Très recherché par les collectionneurs.'}
]

const CHUNK = 40

export function JeuxVideo() {
  const [filPlatform, setFilPlatform] = useState<'all'|Platform>('all')
  const [filType, setFilType] = useState<'all'|GameType>('all')
  const [filGen, setFilGen] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'year'|'name'|'gen'>('year')
  const [lang, setLang] = useState<'FR'|'EN'|'JP'>('FR')
  const [visible, setVisible] = useState(CHUNK)
  const [selId, setSelId] = useState<string|null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    let r = [...GAMES]
    if (filPlatform !== 'all') r = r.filter(g => g.platform === filPlatform)
    if (filType !== 'all') r = r.filter(g => g.type === filType)
    if (filGen !== 'all') r = r.filter(g => g.gen === parseInt(filGen))
    r = r.filter(g => !g.jpOnly || lang==='JP')
    if (search) { const q = search.toLowerCase(); r = r.filter(g => g.name.toLowerCase().includes(q) || g.nameFr.toLowerCase().includes(q) || g.nameJp.toLowerCase().includes(q)) }
    if (sort === 'name') return r.sort((a, b) => a.nameFr.localeCompare(b.nameFr))
    if (sort === 'gen') return r.sort((a, b) => a.gen - b.gen || a.year - b.year)
    return r.sort((a, b) => a.year - b.year)
  }, [filPlatform, filType, filGen, search, sort, lang])

  const pageItems = filtered.slice(0, visible)
  const hasMore = visible < filtered.length
  const selGame = selId ? GAMES.find(g => g.id === selId) : null
  const gens = [...new Set(GAMES.map(g => g.gen))].sort()
  const gn = (g: Game) => lang==='FR'?g.nameFr:lang==='EN'?g.name:g.nameJp
  const gi = (g: Game) => lang==='JP'?g.imgJp:g.imgEn

  useEffect(() => { setVisible(CHUNK) }, [filPlatform, filType, filGen, search, sort, lang])
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
        .jv-card{
          transition:transform .3s cubic-bezier(.2,.85,.3,1),box-shadow .3s ease,border-color .2s ease;
          border-radius:14px;overflow:hidden;cursor:pointer;position:relative;
          background:rgba(255,255,255,0.65);
          backdrop-filter:blur(14px) saturate(180%);
          -webkit-backdrop-filter:blur(14px) saturate(180%);
          box-shadow:0 1px 3px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.8);
        }
        .jv-card:hover{transform:translateY(-3px) scale(1.015);box-shadow:0 10px 28px rgba(0,0,0,0.08),0 2px 6px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.9);}
        .jv-card:hover .jv-img{transform:scale(1.05)}
        .jv-card:hover .jv-name{color:#000 !important}
        .jv-card.sel{border-color:#1D1D1F !important;box-shadow:0 8px 28px rgba(0,0,0,0.12),inset 0 1px 0 rgba(255,255,255,0.9)}
        .jv-img{transition:transform .4s cubic-bezier(.2,.85,.3,1);will-change:transform}
        .jv-pill{
          padding:6px 13px;border-radius:99px;
          background:rgba(255,255,255,0.5);
          backdrop-filter:blur(12px) saturate(180%);
          -webkit-backdrop-filter:blur(12px) saturate(180%);
          border:1px solid rgba(0,0,0,0.05);
          color:#48484A;font-size:11.5px;font-weight:500;cursor:pointer;
          font-family:var(--font-display);
          transition:all .2s cubic-bezier(.2,.85,.3,1);
          white-space:nowrap;
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.7);
        }
        .jv-pill:hover{background:rgba(255,255,255,0.75);transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.85)}
        .jv-pill.on{background:linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%) !important;color:#1D1D1F !important;border-color:rgba(255,255,255,0.6) !important;box-shadow:0 2px 8px rgba(0,0,0,0.07),inset 0 1px 0 rgba(255,255,255,0.95) !important}
        .jv-srt{
          padding:6px 13px;border-radius:99px;border:none;background:transparent;
          color:#86868B;font-size:11.5px;font-weight:600;cursor:pointer;
          font-family:var(--font-display);transition:all .2s;
        }
        .jv-srt:hover{background:rgba(255,255,255,0.6);color:#1D1D1F}
        .jv-srt.on{background:linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%) !important;color:#1D1D1F !important;box-shadow:0 2px 8px rgba(0,0,0,0.07),inset 0 1px 0 rgba(255,255,255,0.95) !important}
        .jv-fsel{
          height:36px;padding:0 12px;
          background:rgba(255,255,255,0.55);
          backdrop-filter:blur(12px) saturate(180%);
          -webkit-backdrop-filter:blur(12px) saturate(180%);
          border:1px solid rgba(0,0,0,0.06);
          border-radius:8px;font-size:12.5px;outline:none;cursor:pointer;
          font-family:var(--font-display);color:#1D1D1F;
          transition:all .2s;
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.75);
        }
        .jv-fsel:focus,.jv-fsel:hover{background:rgba(255,255,255,0.75);border-color:rgba(0,0,0,0.08)}
        .jv-search{
          width:100%;height:40px;padding:0 14px 0 36px;
          background:rgba(255,255,255,0.55);
          backdrop-filter:blur(12px) saturate(180%);
          -webkit-backdrop-filter:blur(12px) saturate(180%);
          border:1px solid rgba(0,0,0,0.06);
          border-radius:9px;font-size:13px;color:#1D1D1F;outline:none;
          font-family:var(--font-sans);box-sizing:border-box;
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.75);
          transition:all .2s;
        }
        .jv-search:focus{background:rgba(255,255,255,0.75);border-color:rgba(0,0,0,0.1)}
        .jv-lang{
          background:rgba(255,255,255,0.45);
          backdrop-filter:blur(12px) saturate(180%);
          -webkit-backdrop-filter:blur(12px) saturate(180%);
          border-radius:12px;padding:4px;display:flex;gap:3px;
          border:1px solid rgba(0,0,0,0.04);
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.75);
        }
        .jv-lang-btn{
          padding:8px 14px;border-radius:9px;border:none;
          font-family:var(--font-display);font-size:13px;cursor:pointer;
          display:flex;align-items:center;gap:6px;
          transition:all .25s cubic-bezier(.2,.85,.3,1);
          background:transparent;color:#86868B;font-weight:500;
        }
        .jv-lang-btn.on{
          background:rgba(255,255,255,0.95) !important;color:#1D1D1F !important;font-weight:700 !important;
          box-shadow:0 2px 8px rgba(0,0,0,0.08),inset 0 1px 0 rgba(255,255,255,1) !important;
        }
        .jv-sticky-bar{
          position:sticky;top:0;z-index:30;
          background:rgba(255,255,255,0.7);
          backdrop-filter:blur(20px) saturate(180%);
          -webkit-backdrop-filter:blur(20px) saturate(180%);
          padding:14px 12px;margin:0 -12px 18px;
          border-radius:12px;
          border:1px solid rgba(0,0,0,0.04);
          box-shadow:0 1px 3px rgba(0,0,0,0.03),inset 0 1px 0 rgba(255,255,255,0.85);
        }
        .jv-panel{
          background:rgba(255,255,255,0.7);
          backdrop-filter:blur(28px) saturate(180%);
          -webkit-backdrop-filter:blur(28px) saturate(180%);
          border:1px solid rgba(255,255,255,0.55);
          border-radius:18px;overflow:hidden;
          box-shadow:0 12px 40px rgba(0,0,0,0.1),0 2px 8px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.9);
          animation:panelIn .3s cubic-bezier(.2,.85,.3,1);
        }
      `}</style>
      <div style={{animation:'fadeIn .25s ease-out',width:'100%',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>
          {/* Header */}
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
            <div>
              <p style={{fontSize:10,color:SNOW.muted,textTransform:'uppercase',letterSpacing:'.1em',margin:'0 0 4px',fontFamily:FONT.display}}>Pokédesk</p>
              <h1 style={{fontSize:28,fontWeight:600,color:SNOW.ink,fontFamily:FONT.display,letterSpacing:'-0.5px',margin:'0 0 6px'}}>Jeux Vidéo Vintage</h1>
              <div style={{fontSize:12.5,color:SNOW.muted,fontFamily:FONT.display}}><strong style={{color:SNOW.ink}}>{filtered.length}</strong> jeux · Générations 1 à 4</div>
            </div>
            <div className="jv-lang">
              {(['FR','EN','JP'] as const).map(l=>(
                <button key={l} onClick={()=>setLang(l)} className={'jv-lang-btn'+(lang===l?' on':'')}>
                  <span>{l==='FR'?'🇫🇷':l==='EN'?'🇬🇧':'🇯🇵'}</span>
                  <span>{l==='FR'?'Français':l==='EN'?'English':'日本語'}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Search + Sort */}
          <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            <div style={{position:'relative',flex:1,minWidth:200}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:SNOW.mutedLight,fontSize:15,pointerEvents:'none'}}>⌕</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un jeu..." className="jv-search"/>
            </div>
            <div style={{display:'flex',gap:3,background:'rgba(255,255,255,0.45)',backdropFilter:'blur(12px) saturate(180%)',WebkitBackdropFilter:'blur(12px) saturate(180%)',border:'1px solid rgba(0,0,0,0.04)',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.75)',borderRadius:9,padding:3}}>
              {(([['year','Année'],['name','Nom'],['gen','Génération']]) as ['year'|'name'|'gen',string][]).map(([k,l])=>(
                <button key={k} onClick={()=>setSort(k)} className={'jv-srt'+(sort===k?' on':'')}>{l}</button>
              ))}
            </div>
          </div>
          {/* Sticky filter bar */}
          <div className="jv-sticky-bar" style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            <select className="jv-fsel" value={filGen} onChange={e=>setFilGen(e.target.value)} style={{color:filGen!=='all'?SNOW.ink:SNOW.muted}}>
              <option value="all">Toutes les générations</option>
              {gens.map(g=><option key={g} value={g}>Génération {g}</option>)}
            </select>
            <div style={{width:1,height:24,background:'rgba(0,0,0,0.06)'}}/>
            {(['all','GB','GBC','GBA','DS','N64','GC'] as ('all'|Platform)[]).map(p=>(
              <button key={p} onClick={()=>setFilPlatform(p)} className={'jv-pill'+(filPlatform===p?' on':'')}
                style={filPlatform===p?{}:p!=='all'?{background:PLATFORMS[p as Platform]?.bg,color:PLATFORMS[p as Platform]?.color,borderColor:PLATFORMS[p as Platform]?.color+'25'}:{}}>
                {p==='all'?'Toutes':PLATFORMS[p].label}
              </button>
            ))}
            <div style={{width:1,height:24,background:'rgba(0,0,0,0.06)'}}/>
            {(['all','main','spinoff','stadium','mystery','ranger'] as ('all'|GameType)[]).map(t=>(
              <button key={t} onClick={()=>setFilType(t)} className={'jv-pill'+(filType===t?' on':'')}>{t==='all'?'Tous':TYPES[t].label}</button>
            ))}
            {(filPlatform!=='all'||filType!=='all'||filGen!=='all'||search)&&(
              <SnowButton size="sm" variant="ghost" onClick={()=>{setFilPlatform('all');setFilType('all');setFilGen('all');setSearch('')}}>✕ Effacer</SnowButton>
            )}
            <span style={{fontSize:11.5,color:SNOW.mutedLight,marginLeft:'auto',fontFamily:FONT.display}}>{filtered.length} jeux</span>
          </div>
          {/* Grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
            {pageItems.map((game,idx)=>{
              const isSel=selId===game.id
              const plt=PLATFORMS[game.platform]
              return (
                <div key={game.id} className={'jv-card'+(isSel?' sel':'')} onClick={()=>setSelId(isSel?null:game.id)}
                  style={{animation:'cardIn .3s '+Math.min(idx,18)*.025+'s cubic-bezier(.2,.85,.3,1) both',border:'1.5px solid '+(isSel?'#1D1D1F':'rgba(0,0,0,0.05)')}}>
                  <div style={{height:220,background:'rgba(245,245,247,0.5)',position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <img src={gi(game)} alt={game.nameFr} className="jv-img"
                      style={{maxWidth:'75%',maxHeight:'90%',objectFit:'contain',filter:'drop-shadow(0 4px 12px rgba(0,0,0,.12))'}}
                      onError={e=>{const t=e.target as HTMLImageElement;if(t.src.includes('/jp/'))t.src=t.src.replace('/jp/','/en/');else t.style.display='none'}}/>
                    <div style={{position:'absolute',top:6,left:6,zIndex:2,padding:'3px 7px',borderRadius:5,background:plt.bg,fontSize:9,fontWeight:600,color:plt.color,fontFamily:FONT.display,letterSpacing:'.02em',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.6)'}}>{plt.label}</div>
                    <div style={{position:'absolute',top:6,right:6,zIndex:2,padding:'3px 7px',borderRadius:5,background:'rgba(255,255,255,0.65)',fontSize:9,fontWeight:600,color:SNOW.muted,fontFamily:FONT.display,backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.8)'}}>Gen {game.gen}</div>
                  </div>
                  <div style={{padding:'12px 14px 14px'}}>
                    <div className="jv-name" style={{fontSize:13.5,fontWeight:600,color:SNOW.ink,fontFamily:FONT.display,marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.3,transition:'color .2s'}}>{gn(game)}</div>
                    <div style={{fontSize:10.5,color:SNOW.mutedLight,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:FONT.display}}>
                      {game.year} · {TYPES[game.type].label}
                      {lang!=='FR'&&<span style={{marginLeft:4,opacity:.6}}>({game.nameFr})</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {hasMore&&<div ref={sentinelRef} style={{display:'flex',justifyContent:'center',padding:'32px 0'}}><div style={{display:'flex',alignItems:'center',gap:8,color:SNOW.mutedLight,fontSize:12,fontFamily:FONT.display}}><div style={{width:16,height:16,border:'2px solid rgba(0,0,0,0.08)',borderTop:'2px solid '+SNOW.muted,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>Chargement...</div></div>}
          {filtered.length===0&&(
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:48,opacity:.2,marginBottom:16}}>🎮</div>
              <div style={{fontSize:16,fontWeight:600,color:SNOW.ink,fontFamily:FONT.display,marginBottom:14}}>Aucun jeu trouvé</div>
              <SnowButton variant="primary" size="md" onClick={()=>{setFilPlatform('all');setFilType('all');setFilGen('all');setSearch('')}}>Effacer les filtres</SnowButton>
            </div>
          )}
        </div>
        {/* Detail panel */}
        {selGame && (
          <div style={{width:295,flexShrink:0,position:'sticky',top:80,maxHeight:'calc(100vh - 100px)',overflowY:'auto'}}>
            <div className="jv-panel">
              <div style={{background:'rgba(245,245,247,0.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 20px',position:'relative',minHeight:210}}>
                <img src={gi(selGame)} alt={selGame.nameFr} style={{maxHeight:200,maxWidth:'80%',objectFit:'contain',filter:'drop-shadow(0 6px 16px rgba(0,0,0,.18))'}}
                  onError={e=>{const t=e.target as HTMLImageElement;if(t.src.includes('/jp/'))t.src=t.src.replace('/jp/','/en/');else t.style.display='none'}}/>
                <button onClick={()=>setSelId(null)} style={{position:'absolute',top:10,left:10,width:30,height:30,borderRadius:'50%',background:'rgba(255,255,255,0.85)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:'1px solid rgba(0,0,0,0.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.85)',transition:'all .2s'}}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.95)';e.currentTarget.style.transform='scale(1.05)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.85)';e.currentTarget.style.transform='scale(1)'}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div style={{padding:16}}>
                <div style={{fontSize:17,fontWeight:700,color:SNOW.ink,fontFamily:FONT.display,lineHeight:1.25,marginBottom:4}}>{gn(selGame)}</div>
                {lang!=='EN'&&<div style={{fontSize:11.5,color:SNOW.mutedLight,fontFamily:FONT.display,marginBottom:2}}>🇬🇧 {selGame.name}</div>}
                {lang!=='FR'&&<div style={{fontSize:11.5,color:SNOW.mutedLight,fontFamily:FONT.display,marginBottom:2}}>🇫🇷 {selGame.nameFr}</div>}
                {lang!=='JP'&&<div style={{fontSize:11.5,color:SNOW.mutedLight,fontFamily:FONT.display,marginBottom:2}}>🇯🇵 {selGame.nameJp}</div>}
                <div style={{height:12}}/>
                <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
                  <span style={{padding:'4px 9px',borderRadius:6,background:PLATFORMS[selGame.platform].bg,color:PLATFORMS[selGame.platform].color,fontSize:9.5,fontWeight:600,fontFamily:FONT.display,backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.6)'}}>{PLATFORMS[selGame.platform].label}</span>
                  <span style={{padding:'4px 9px',borderRadius:6,background:'rgba(245,245,247,0.65)',color:SNOW.muted,fontSize:9.5,fontWeight:600,fontFamily:FONT.display,backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)'}}>Génération {selGame.gen}</span>
                  <span style={{padding:'4px 9px',borderRadius:6,background:'rgba(245,245,247,0.65)',color:SNOW.muted,fontSize:9.5,fontWeight:600,fontFamily:FONT.display,backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)'}}>{selGame.year}</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:14}}>
                  {[['Type',TYPES[selGame.type].label],['Année',String(selGame.year)],['Console',PLATFORMS[selGame.platform].label],['Génération','Gen '+selGame.gen]].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                      <span style={{fontSize:10.5,color:SNOW.mutedLight,fontFamily:FONT.display,flexShrink:0}}>{l}</span>
                      <span style={{fontSize:11.5,color:SNOW.ink,fontFamily:FONT.display,fontWeight:500}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:'rgba(245,245,247,0.55)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',borderRadius:11,padding:13,marginBottom:8,boxShadow:'inset 0 1px 0 rgba(255,255,255,0.7)'}}>
                  <div style={{fontSize:11.5,color:SNOW.inkSoft,lineHeight:1.65,fontFamily:FONT.body}}>{selGame.description}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
