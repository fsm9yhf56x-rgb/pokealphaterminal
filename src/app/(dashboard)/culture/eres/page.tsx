'use client'

import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

// Référentiel d'ères — couleurs alignées sur ERA_COLORS du treemap (cohérence visuelle).
const ERAS = [
  { name: 'Vintage WOTC',     color: '#D4AF37', years: '1999 – 2003', tag: 'Les origines',
    desc: 'L’âge d’or. Set de Base, Jungle, Fossile, Neo, Team Rocket — édités par Wizards of the Coast. Le berceau des cartes les plus convoitées, dont le Dracaufeu holographique.' },
  { name: 'EX',               color: '#2A82DD', years: '2003 – 2007', tag: 'Reprise par Nintendo',
    desc: 'Nintendo reprend la licence. Apparition des cartes EX, des holos pleines et des sets Delta Species. Une ère de transition graphique et de mécaniques nouvelles.' },
  { name: 'DPP / HGSS',       color: '#0E9E8E', years: '2007 – 2011', tag: 'Diamant, Perle & Or HeartGold',
    desc: 'Diamond & Pearl, Platinum, puis HeartGold SoulSilver. Les cartes LV.X et les Prime marquent l’époque. Un style plus détaillé et mature.' },
  { name: 'Black & White',    color: '#5C6270', years: '2011 – 2013', tag: 'Génération Unys',
    desc: 'Refonte complète du design des cartes (bordures, layout). Introduction des Full Art et des Secret Rares qui deviendront un pilier de la collection moderne.' },
  { name: 'XY',               color: '#C44E8E', years: '2013 – 2016', tag: 'Kalos & Méga-Évolutions',
    desc: 'Les Méga-EX et les cartes texturées. XY Évolutions ravive le design vintage. Une ère charnière, très prisée pour ses Full Art et ses Secrets.' },
  { name: 'Sun & Moon',       color: '#E07B39', years: '2017 – 2019', tag: 'Alola & cartes GX',
    desc: 'Les GX, les Rainbow Rares et les Tag Team. Explosion des cartes arc-en-ciel et des alternatives art. Hidden Fates et son éclat holographique culte.' },
  { name: 'Sword & Shield',   color: '#4F5FC4', years: '2019 – 2022', tag: 'Galar & cartes V / VMAX',
    desc: 'L’ère des V, VMAX et VSTAR. Les Alternate Arts deviennent l’objet de toutes les convoitises. Evolving Skies et Charizard atteignent des sommets.' },
  { name: 'Scarlet & Violet', color: '#D93A3A', years: '2023 – aujourd’hui', tag: 'Paldea & ère moderne',
    desc: 'Les ex, les Illustration Rares et Special Illustration Rares. 151 ravive la nostalgie Kanto. L’ère actuelle, hyper dynamique et spéculative.' },
]

export default function EresPage() {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '8px 20px 90px' }}>
      <span style={{ display: 'inline-block', marginBottom: 12, padding: '5px 13px', borderRadius: RADIUS.pill, background: 'rgba(224,48,32,0.08)', border: '1px solid rgba(224,48,32,0.2)', color: '#E03020', fontSize: 10.5, fontWeight: 700, fontFamily: FONT.display, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Culture · Ères</span>
      <h1 style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1 }}>Les ères du TCG Pokémon</h1>
      <p style={{ fontFamily: FONT.body, fontSize: 14.5, color: SNOW.muted, margin: '0 0 36px', maxWidth: '60ch', lineHeight: 1.55 }}>
        Vingt-cinq ans d’histoire en cartes. Des holos Wizards aux Illustration Rares modernes, chaque ère a forgé son style, ses raretés et ses légendes.
      </p>

      {/* Frise verticale */}
      <div style={{ position: 'relative', paddingLeft: 30 }}>
        {/* ligne verticale */}
        <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: 'linear-gradient(180deg, #D4AF37, #2A82DD, #0E9E8E, #C44E8E, #E07B39, #4F5FC4, #D93A3A)', borderRadius: 2, opacity: 0.4 }} />

        {ERAS.map((era) => (
          <div key={era.name} style={{ position: 'relative', marginBottom: 18 }}>
            {/* point */}
            <div style={{ position: 'absolute', left: -30, top: 22, width: 16, height: 16, borderRadius: '50%', background: '#fff', border: `3px solid ${era.color}`, boxShadow: `0 0 0 4px ${era.color}22`, transform: 'translateX(0)' }} />

            <div style={{
              background: `linear-gradient(135deg, ${era.color}14, rgba(255,255,255,0.6))`,
              backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)',
              border: `1px solid ${era.color}33`,
              borderRadius: RADIUS.lg, padding: '18px 20px',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
                <h3 style={{ fontFamily: FONT.display, fontSize: 19, fontWeight: 800, color: SNOW.ink, margin: 0, letterSpacing: '-0.02em' }}>{era.name}</h3>
                <span style={{ fontFamily: 'var(--font-data, "Space Mono", monospace)', fontSize: 12, fontWeight: 600, color: era.color }}>{era.years}</span>
              </div>
              <div style={{ fontFamily: FONT.display, fontSize: 12, fontWeight: 600, color: era.color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85 }}>{era.tag}</div>
              <p style={{ fontFamily: FONT.body, fontSize: 13.5, color: SNOW.muted, margin: 0, lineHeight: 1.55 }}>{era.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
