'use client'

import { useEffect, useRef, useState } from 'react'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'
import { useIsMobile } from '@/lib/useIsMobile'

type Curio = { theme: string; cat: string; color: string; card: string; icon: string; title: string; text: string }

const THEMES = ['Tout', 'Graals', 'Variantes & erreurs', 'Exclusivités JP', 'Records & légendes']

const CURIOS: Curio[] = [
  { theme: 'Graals', cat: 'Graal absolu', color: '#D4AF37', card: 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev/culture/curiosites/pikachu-illustrator.webp', icon: '\u2605', title: 'Pikachu Illustrator',
    text: 'Distribuée en 1998 aux gagnants d\u2019un concours de dessin au Japon, elle est considérée comme la carte Pokémon la plus rare au monde. Un exemplaire gradé PSA 10 s\u2019est vendu plus de 5 millions de dollars \u2014 record absolu du hobby.' },
  { theme: 'Graals', cat: 'Carte trophée', color: '#2A82DD', card: 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev/culture/curiosites/no1-trainer.png', icon: '\u2605', title: 'Les No. 1 / 2 / 3 Trainer',
    text: 'Remises aux vainqueurs des tournois officiels japonais, ces cartes « Trophy » n\u2019existent qu\u2019à quelques dizaines d\u2019exemplaires. Le Pikachu trophée et les cartes « Master Key » comptent parmi les pièces les plus convoitées des collectionneurs avancés.' },
  { theme: 'Graals', cat: 'Pièce de musée', color: '#D4AF37', card: 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev/culture/curiosites/tropical-wind.webp', icon: '\u2605', title: 'Tropical Mega Battle',
    text: 'Les cartes distribuées lors des tournois Tropical Mega Battle (1999-2001), à Hawaï, font partie des plus rares au monde. La « Tropical Wind » remise aux participants atteint des sommets en vente aux enchères.' },

  { theme: 'Variantes & erreurs', cat: 'Erreur d\u2019impression', color: '#E03020', card: 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev/culture/curiosites/charizard-base.jpg', icon: '\u2605', title: 'Le Dracaufeu « 1st Edition Shadowless »',
    text: 'Les toutes premières impressions du Set de Base n\u2019avaient pas l\u2019ombre portée sous l\u2019illustration. Ces versions « Shadowless », et plus encore les « 1st Edition », valent une fortune comparées aux impressions ultérieures identiques au visuel près.' },
  { theme: 'Variantes & erreurs', cat: 'Pré-release', color: '#0E9E8E', card: 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev/culture/curiosites/raichu-prerelease.webp', icon: '\u2605', title: 'Le tampon « PRERELEASE »',
    text: 'Certaines cartes distribuées avant la sortie officielle d\u2019un set portent un tampon doré « PRERELEASE ». Le Raichu prerelease de l\u2019ère WOTC est devenu légendaire \u2014 quelques exemplaires seulement seraient sortis par erreur.' },
  { theme: 'Variantes & erreurs', cat: 'Curiosité visuelle', color: '#C44E8E', card: 'https://assets.tcgdex.net/fr/base/base1/46', icon: '\u2605', title: 'La queue de Dracaufeu',
    text: 'Un débat communautaire célèbre : sur certaines cartes, la flamme au bout de la queue de Salamèche/Dracaufeu varie de position et de taille selon l\u2019illustrateur et l\u2019édition, créant des micro-variantes que les puristes traquent.' },
  { theme: 'Variantes & erreurs', cat: 'Cartes spéciales', color: '#2A82DD', card: 'https://assets.tcgdex.net/fr/ex/ex13/16', icon: '\u2605', title: 'Les Crystal Types',
    text: 'Apparues à l\u2019ère EX, les cartes « Crystal Type » arborent une holographie spéciale et une double appartenance de type. Leur rareté et leur esthétique unique en font des pièces recherchées des collectionneurs de l\u2019époque moderne.' },

  { theme: 'Exclusivités JP', cat: 'Exclusivité JP', color: '#E07B39', card: 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev/culture/curiosites/mew-corocoro.jpg', icon: '\u2605', title: 'Les promos CoroCoro',
    text: 'Le magazine japonais CoroCoro a distribué des cartes promotionnelles introuvables ailleurs. Ces exclusivités nippones, souvent ignorées du marché occidental, sont une mine d\u2019or pour les collectionneurs qui suivent le marché japonais.' },
  { theme: 'Exclusivités JP', cat: 'Carte de film', color: '#C44E8E', card: 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev/culture/curiosites/ancient-mew.jpg', icon: '\u2605', title: 'Ancient Mew',
    text: 'Distribuée lors de la sortie du film « Pokémon 2000 », la carte Ancient Mew est écrite dans une langue runique illisible. Holographique des deux côtés, elle est devenue un objet culte malgré son absence d\u2019usage en jeu.' },
  { theme: 'Exclusivités JP', cat: 'Promo concours', color: '#0E9E8E', card: 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev/culture/curiosites/snap-card.webp', icon: '\u2605', title: 'Les Snap Cards',
    text: 'Inspirées du jeu Pokémon Snap, certaines cartes promotionnelles japonaises présentent des « photographies » de Pokémon dans leur habitat. Issues de concours, elles offrent un style visuel totalement à part dans toute l\u2019histoire du TCG.' },

  { theme: 'Records & légendes', cat: 'Record de vente', color: '#D4AF37', card: 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev/culture/curiosites/charizard-base.jpg', icon: '\u2605', title: 'Le Dracaufeu à 420 000 $',
    text: 'En 2022, un Dracaufeu Set de Base 1st Edition gradé PSA 10 s\u2019est vendu pour des centaines de milliers de dollars. Avec seulement une poignée d\u2019exemplaires en PSA 10 connus, il incarne le sommet du marché vintage occidental.' },
  { theme: 'Records & légendes', cat: 'Phénomène', color: '#E03020', card: 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev/culture/curiosites/charizard-base.jpg', icon: '\u2605', title: 'Le boom de 2020',
    text: 'La pandémie, la nostalgie et l\u2019arrivée d\u2019influenceurs comme Logan Paul \u2014 qui portera plus tard un Pikachu Illustrator autour du cou \u2014 ont fait exploser les prix. Le TCG Pokémon est passé d\u2019un loisir de niche à une classe d\u2019actifs mondiale.' },
]

function curioImg(u: string) { return /\.(webp|png|jpg)$/i.test(u) ? u : `${u}/low.webp` }

function CurioCard({ c, index }: { c: Curio; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { threshold: 0.12 })
    io.observe(el); return () => io.disconnect()
  }, [])
  return (
    <div ref={ref}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${c.color}22, inset 0 1px 0 rgba(255,255,255,0.85)` }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.85)' }}
      style={{
        opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity .5s ease ${index * 60}ms, transform .55s cubic-bezier(.2,.85,.3,1) ${index * 60}ms, box-shadow .2s`,
        background: `linear-gradient(135deg, ${c.color}14, rgba(255,255,255,0.62))`,
        backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)',
        border: `1px solid ${c.color}33`, borderRadius: RADIUS.lg, padding: '20px 22px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)', cursor: 'default',
      }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'inline-block', marginBottom: 10, padding: '4px 11px', borderRadius: RADIUS.pill, background: `${c.color}1A`, border: `1px solid ${c.color}40`, color: c.color, fontSize: 10, fontWeight: 700, fontFamily: FONT.display, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{c.cat}</span>
          <h3 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 800, color: SNOW.ink, margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{c.title}</h3>
          <p style={{ fontFamily: FONT.body, fontSize: 13.5, color: SNOW.muted, margin: 0, lineHeight: 1.6 }}>{c.text}</p>
        </div>
        <div style={{ flexShrink: 0, width: 84, height: 117, borderRadius: 9, overflow: 'hidden', background: `linear-gradient(160deg, ${c.color}22, ${c.color}0D)`, border: `1px solid ${c.color}33`, boxShadow: `0 6px 18px ${c.color}26`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <span style={{ position: 'absolute', fontSize: 26, color: c.color, opacity: 0.5 }}>{c.icon}</span>
          <img src={curioImg(c.card)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block', position: 'relative', zIndex: 1 }}
            onError={e => { const t = e.target as HTMLImageElement; if (t.src.includes('/low.webp')) { t.src = t.src.replace('/low.webp', '/high.webp') } else { t.style.display = 'none' } }} />
        </div>
      </div>
    </div>
  )
}

export default function CuriositesPage() {
  const isMobile = useIsMobile()
  const [theme, setTheme] = useState('Tout')
  const list = theme === 'Tout' ? CURIOS : CURIOS.filter(c => c.theme === theme)
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '8px 20px 90px' }}>
      <span style={{ display: 'inline-block', marginBottom: 12, padding: '5px 13px', borderRadius: RADIUS.pill, background: 'rgba(224,48,32,0.08)', border: '1px solid rgba(224,48,32,0.2)', color: '#E03020', fontSize: 10.5, fontWeight: 700, fontFamily: FONT.display, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Culture · Curiosités</span>
      <h1 style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1 }}>Curiosités & cartes mythiques</h1>
      <p style={{ fontFamily: FONT.body, fontSize: 14.5, color: SNOW.muted, margin: '0 0 32px', maxWidth: '60ch', lineHeight: 1.55 }}>
        Les histoires, raretés et anomalies qui font la légende du TCG Pokémon. De la carte la plus chère du monde aux erreurs d\u2019impression devenues mythiques.
      </p>
      {/* Filtres par thème */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {THEMES.map(t => {
          const active = theme === t
          return (
            <button key={t} onClick={() => setTheme(t)}
              style={{ padding: '7px 15px', borderRadius: RADIUS.pill, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: FONT.display,
                background: active ? '#1D1D1F' : 'rgba(255,255,255,0.6)', color: active ? '#fff' : SNOW.muted,
                border: `1px solid ${active ? '#1D1D1F' : SNOW.border}`,
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', transition: 'all .2s' }}>
              {t}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
        {list.map((c, i) => <CurioCard key={c.title} c={c} index={i} />)}
      </div>
    </div>
  )
}
