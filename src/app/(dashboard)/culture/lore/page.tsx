'use client'

import { useEffect, useRef, useState } from 'react'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

type Chapter = { num: string; color: string; period: string; title: string; paras: string[] }

const CHAPTERS: Chapter[] = [
  { num: '01', color: '#D4AF37', period: 'Octobre 1996 · Japon', title: 'La naissance au Japon',
    paras: [
      'Le 30 octobre 1996, Media Factory publie au Japon le tout premier Jeu de Cartes à Collectionner Pokémon, imaginé par Tsunekazu Ishihara de Creatures Inc. Le concept s’inspire de Magic: The Gathering, mais le greffe sur l’univers du jeu vidéo sorti l’année précédente sur Game Boy. Le Set de Base japonais compte 102 cartes.',
      'Le succès est foudroyant. Les illustrations de Mitsuhiro Arita, Ken Sugimori et Atsuko Nishida donnent aux cartes une âme artistique qui dépasse le simple jeu. La hiérarchie Commune / Peu Commune / Rare, les holographies et la fameuse étoile de rareté posent des codes qui n’ont jamais changé depuis.',
      'Très vite, le jeu devient un phénomène de cour de récréation au Japon. Les premières extensions \u2014 Jungle, Fossile \u2014 enrichissent un univers que des millions d’enfants veulent compléter. Le mythe est né.',
    ] },
  { num: '02', color: '#2A82DD', period: '1998 – 2003 · Expansion occidentale', title: 'L’arrivée en Occident',
    paras: [
      'En janvier 1999, Wizards of the Coast \u2014 l’éditeur de Magic \u2014 lance le Set de Base anglais en Amérique du Nord, puis en Europe. C’est l’hystérie : ruptures de stock permanentes, files d’attente devant les magasins, et de nombreuses écoles qui finissent par interdire les cartes dans la cour.',
      'C’est l’ère des premières éditions devenues légendaires. Le Dracaufeu « 1st Edition Shadowless » s’impose comme le Saint Graal d’une génération entière. Les détails d’impression \u2014 présence ou absence d’ombre, symbole 1st Edition \u2014 créent une hiérarchie de valeur que les collectionneurs scrutent encore aujourd’hui.',
      'Jungle, Fossile, puis les séries Neo et Team Rocket prolongent l’âge d’or WOTC jusqu’en 2003. Ces cartes constituent aujourd’hui le c\u0153ur du marché vintage occidental.',
    ] },
  { num: '03', color: '#0E9E8E', period: '2003 – 2010 · Transition', title: 'Le passage à Nintendo',
    paras: [
      'En 2003, The Pokémon Company (Nintendo) reprend la licence en direct, mettant fin au partenariat avec Wizards of the Coast. Ce changement de main marque un tournant industriel : production internalisée, distribution mondiale unifiée, et un rythme de sorties accéléré.',
      'De nouvelles mécaniques apparaissent : les cartes EX, puis les LV.X et les Prime. Les ères EX, Diamond & Pearl et HeartGold SoulSilver professionnalisent le jeu compétitif tout en soignant la collection, avec des illustrations toujours plus variées et détaillées.',
      'Cette décennie, longtemps sous-cotée, attire désormais l’attention des collectionneurs : ses cartes rares deviennent les « prochains vintages » sur lesquels parient les investisseurs avertis.',
    ] },
  { num: '04', color: '#C44E8E', period: '2011 – 2019 · Modernisation', title: 'L’ère moderne',
    paras: [
      'Noir & Blanc (2011) opère la plus grande refonte visuelle de l’histoire du jeu : nouvelles bordures, nouveau gabarit, et surtout l’apparition des Full Art et des Secret Rares. Ces cartes alternatives deviennent rapidement le moteur du marché de la collection moderne.',
      'XY introduit les Méga-Évolutions et les premières cartes texturées ; Soleil & Lune apporte les GX, les Rainbow Rares et les Tag Team. La notion de « chase card » \u2014 la carte alternative ultra-recherchée d’un set \u2014 structure désormais l’acte de collectionner.',
      'C’est aussi l’époque où la gradation se démocratise : PSA, BGS puis CGC transforment l’état d’une carte en valeur chiffrée et liquide. Une carte n’est plus seulement belle : elle a une note.',
    ] },
  { num: '05', color: '#E03020', period: '2020 – 2023 · Le boom', title: 'L’explosion mondiale',
    paras: [
      'La pandémie de 2020 déclenche un boom sans précédent. Confinement, nostalgie et arrivée d’influenceurs comme Logan Paul propulsent les prix à des sommets vertigineux. Des cartes d’enfance se revendent soudain des milliers d’euros, et les médias généralistes s’emparent du phénomène.',
      'Le marché du TCG Pokémon dépasse les 8 milliards d’euros et rivalise désormais avec les marchés de collection traditionnels comme l’art ou les cartes de sport. Les maisons de vente prestigieuses (Heritage, Goldin) ouvrent des sessions dédiées.',
      'Épée & Bouclier puis Écarlate & Violet introduisent les Alternate Arts, Illustration Rares et Special Illustration Rares \u2014 des cartes pensées comme de véritables \u0153uvres. Le Charizard d’Evolving Skies devient l’icône de cette nouvelle flambée.',
    ] },
  { num: '06', color: '#4F5FC4', period: 'Aujourd’hui · L’ère globale', title: 'Le Japon, le monde, l’avenir',
    paras: [
      'Le marché est désormais pleinement mondialisé et corrélé. Une hype née au Japon se propage en quelques jours vers les États-Unis puis l’Europe. Le set 151, qui ravive la nostalgie Kanto, illustre cette circulation instantanée de la demande à travers les continents.',
      'Le Japon, marché d’origine, reprend une place centrale : exclusivités, qualité d’impression supérieure et certificateurs locaux en font le terrain de jeu des collectionneurs les plus pointus. L’arbitrage entre marchés US, JP et européen devient une discipline à part entière.',
      'Le TCG Pokémon est aujourd’hui une classe d’actifs reconnue, un loisir passionnel et un patrimoine culturel. Près de trente ans après une boutique japonaise de 1996, l’épopée ne fait que continuer.',
    ] },
]

function ChapterBlock({ ch, index }: { ch: Chapter; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { threshold: 0.1 })
    io.observe(el); return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(24px)', transition: `opacity .55s ease ${index * 80}ms, transform .6s cubic-bezier(.2,.85,.3,1) ${index * 80}ms`, marginBottom: 18 }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'stretch' }}>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: `linear-gradient(160deg, ${ch.color}, ${ch.color}CC)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: FONT.display, fontWeight: 800, fontSize: 16, boxShadow: `0 6px 16px ${ch.color}44`, flexShrink: 0 }}>{ch.num}</div>
          {index < 5 && <div style={{ flex: 1, width: 2, background: `${ch.color}33`, marginTop: 6, borderRadius: 2 }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0, background: `linear-gradient(135deg, ${ch.color}12, rgba(255,255,255,0.6))`, backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)', border: `1px solid ${ch.color}30`, borderRadius: RADIUS.lg, padding: '20px 24px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)', marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--font-data, "Space Mono", monospace)', fontSize: 11.5, fontWeight: 600, color: ch.color, marginBottom: 6, letterSpacing: '0.02em' }}>{ch.period}</div>
          <h3 style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 800, color: SNOW.ink, margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>{ch.title}</h3>
          {ch.paras.map((para, i) => (
            <p key={i} style={{ fontFamily: FONT.body, fontSize: 14, color: SNOW.muted, margin: i === ch.paras.length - 1 ? 0 : '0 0 12px', lineHeight: 1.65 }}>{para}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LorePage() {
  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '8px 20px 90px' }}>
      <span style={{ display: 'inline-block', marginBottom: 12, padding: '5px 13px', borderRadius: RADIUS.pill, background: 'rgba(224,48,32,0.08)', border: '1px solid rgba(224,48,32,0.2)', color: '#E03020', fontSize: 10.5, fontWeight: 700, fontFamily: FONT.display, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Culture · Lore</span>
      <h1 style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1 }}>L’histoire du TCG Pokémon</h1>
      <p style={{ fontFamily: FONT.body, fontSize: 14.5, color: SNOW.muted, margin: '0 0 36px', maxWidth: '62ch', lineHeight: 1.55 }}>
        De sa naissance dans une boutique japonaise en 1996 à un marché mondial de plusieurs milliards, le Jeu de Cartes à Collectionner Pokémon a traversé près de trente ans d’histoire. Voici les grands chapitres de cette épopée.
      </p>
      <div>
        {CHAPTERS.map((ch, i) => <ChapterBlock key={ch.num} ch={ch} index={i} />)}
      </div>
    </div>
  )
}
