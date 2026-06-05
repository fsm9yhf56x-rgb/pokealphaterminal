'use client'

import { useEffect, useRef, useState } from 'react'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

type Chapter = { num: string; color: string; period: string; title: string; paras: string[] }

const CHAPTERS: Chapter[] = [
  { num: '01', color: '#D4AF37', period: 'Octobre 1996 · Japon', title: 'La naissance au Japon',
    paras: [
      'Le 20 octobre 1996, Media Factory publie au Japon le tout premier jeu de cartes \u00e0 collectionner Pok\u00e9mon, con\u00e7u par Tsunekazu Ishihara (Creatures Inc.). Il s\u2019inspire des jeux de cartes occidentaux comme Magic: The Gathering, mais le marie \u00e0 l\u2019univers du jeu vid\u00e9o sorti l\u2019ann\u00e9e pr\u00e9c\u00e9dente sur Game Boy.',
      'Le succ\u00e8s est imm\u00e9diat. Les illustrations de Mitsuhiro Arita, Ken Sugimori et Atsuko Nishida donnent aux cartes une identit\u00e9 artistique forte. Le Set de Base japonais pose les fondations de tout ce qui suivra : raret\u00e9s, holographies, et la fameuse hi\u00e9rarchie Commune / Peu Commune / Rare.',
    ] },
  { num: '02', color: '#2A82DD', period: '1998 – 1999 · Expansion occidentale', title: 'L\u2019arriv\u00e9e en Occident',
    paras: [
      'En 1999, Wizards of the Coast \u2014 l\u2019\u00e9diteur de Magic \u2014 obtient la licence pour traduire et distribuer le jeu en Am\u00e9rique du Nord puis en Europe. Le Set de Base anglais sort en janvier 1999 et d\u00e9clenche une v\u00e9ritable hyst\u00e9rie : ruptures de stock, files d\u2019attente, cours de r\u00e9cr\u00e9ation interdisant les cartes.',
      'C\u2019est l\u2019\u00e8re des premi\u00e8res \u00e9ditions l\u00e9gendaires : le Dracaufeu \u00ab 1st Edition Shadowless \u00bb devient le Saint Graal d\u2019une g\u00e9n\u00e9ration. Jungle, Fossile, puis les s\u00e9ries Neo et Team Rocket enrichissent le jeu jusqu\u2019en 2003.',
    ] },
  { num: '03', color: '#0E9E8E', period: '2003 – 2010 · Transition', title: 'Le passage \u00e0 Nintendo',
    paras: [
      'En 2003, Nintendo (via The Pok\u00e9mon Company) reprend la licence directement, mettant fin au partenariat avec Wizards of the Coast. Cette transition marque un tournant : nouvelles m\u00e9caniques (cartes EX, puis LV.X), refonte progressive du design, et internationalisation accrue.',
      'Les \u00e8res EX, Diamond & Pearl et HeartGold SoulSilver professionnalisent le jeu comp\u00e9titif tout en soignant la dimension collection. Les illustrations gagnent en d\u00e9tail et en diversit\u00e9 de styles.',
    ] },
  { num: '04', color: '#C44E8E', period: '2011 – 2019 · Modernisation', title: 'L\u2019\u00e8re moderne',
    paras: [
      'Black & White (2011) op\u00e8re la plus grande refonte visuelle de l\u2019histoire du jeu : nouvelles bordures, nouveau layout, et surtout l\u2019apparition des Full Art et Secret Rares qui deviendront le c\u0153ur du march\u00e9 de la collection moderne.',
      'XY introduit les Méga-\u00c9volutions et les cartes textur\u00e9es ; Sun & Moon apporte les GX, les Rainbow Rares et les Tag Team. Le jeu se structure autour de la chasse aux \u00ab chase cards \u00bb \u2014 ces cartes alternatives ultra-recherch\u00e9es.',
    ] },
  { num: '05', color: '#E03020', period: '2020 – aujourd\u2019hui · Le boom', title: 'L\u2019explosion mondiale',
    paras: [
      'La pand\u00e9mie de 2020 d\u00e9clenche un boom sans pr\u00e9c\u00e9dent. Le confinement, la nostalgie, et l\u2019arriv\u00e9e d\u2019influenceurs comme Logan Paul propulsent les prix \u00e0 des sommets : le march\u00e9 du TCG Pok\u00e9mon d\u00e9passe d\u00e9sormais les 8 milliards d\u2019euros et rivalise avec les marchés de collection traditionnels.',
      'Sword & Shield puis Scarlet & Violet introduisent les Alternate Arts, Illustration Rares et Special Illustration Rares. La gradation (PSA, CGC, et en Europe PCA, CCC) devient centrale. Le set 151 ravive la nostalgie Kanto. Le jeu est devenu une classe d\u2019actifs \u00e0 part enti\u00e8re.',
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
          {index < 4 && <div style={{ flex: 1, width: 2, background: `${ch.color}33`, marginTop: 6, borderRadius: 2 }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0, background: `linear-gradient(135deg, ${ch.color}12, rgba(255,255,255,0.6))`, backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)', border: `1px solid ${ch.color}30`, borderRadius: RADIUS.lg, padding: '20px 24px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)', marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--font-data, "Space Mono", monospace)', fontSize: 11.5, fontWeight: 600, color: ch.color, marginBottom: 6, letterSpacing: '0.02em' }}>{ch.period}</div>
          <h3 style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 800, color: SNOW.ink, margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>{ch.title}</h3>
          {ch.paras.map((para, i) => (
            <p key={i} style={{ fontFamily: FONT.body, fontSize: 14, color: SNOW.muted, margin: i === 0 ? '0 0 12px' : 0, lineHeight: 1.65 }}>{para}</p>
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
      <h1 style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1 }}>L\u2019histoire du TCG Pok\u00e9mon</h1>
      <p style={{ fontFamily: FONT.body, fontSize: 14.5, color: SNOW.muted, margin: '0 0 36px', maxWidth: '62ch', lineHeight: 1.55 }}>
        De sa naissance dans une boutique japonaise en 1996 \u00e0 un march\u00e9 mondial de plusieurs milliards, le Jeu de Cartes \u00e0 Collectionner Pok\u00e9mon a travers\u00e9 pr\u00e8s de trente ans d\u2019histoire. Voici les grands chapitres de cette \u00e9pop\u00e9e.
      </p>
      <div>
        {CHAPTERS.map((ch, i) => <ChapterBlock key={ch.num} ch={ch} index={i} />)}
      </div>
    </div>
  )
}
