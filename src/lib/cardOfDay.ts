// Carte du jour pour le hero collectionneur.
// Priorite : une carte de SA collection (anecdote sur l'ere/artiste).
// Sinon : une carte iconique curee avec son anecdote. Rotation quotidienne.

export interface IconicCard {
  name: string
  setId: string        // slug TCGdex (ex: "base1")
  localId: string      // numero dans le set (ex: "4")
  lang: 'fr' | 'en'
  era: string
  illustrator: string
  anecdote: string     // drole ou interessante, 1-2 phrases
}

// Cartes iconiques curees (fallback si la collection est vide).
export const ICONIC_CARDS: IconicCard[] = [
  { name: 'Dracaufeu', setId: 'base1', localId: '4', lang: 'fr', era: 'Vintage WOTC', illustrator: 'Mitsuhiro Arita',
    anecdote: 'Le Dracaufeu du Set de Base est si convoite que des joueurs des annees 90 echangeaient toute leur collection contre un seul exemplaire.' },
  { name: 'Pikachu', setId: 'base1', localId: '58', lang: 'fr', era: 'Vintage WOTC', illustrator: 'Atsuko Nishida',
    anecdote: 'Pikachu devait initialement avoir une evolution intermediaire entre Pikachu et Raichu, appelee Gorochu. Elle n\u2019a jamais vu le jour.' },
  { name: 'Mew', setId: 'wizards-promo', localId: '8', lang: 'en', era: 'Vintage WOTC', illustrator: 'Keiji Kinebuchi',
    anecdote: 'Mew a ete cache dans le code de Pokemon Rouge/Bleu par un developpeur, a l\u2019insu de l\u2019equipe, juste avant la sortie du jeu.' },
  { name: 'Leviator', setId: 'base1', localId: '6', lang: 'fr', era: 'Vintage WOTC', illustrator: 'Mitsuhiro Arita',
    anecdote: 'Le Leviator holographique du Set de Base est l\u2019une des illustrations les plus reproduites de toute la franchise TCG.' },
  { name: 'Demolosse', setId: 'neo2', localId: '5', lang: 'fr', era: 'Vintage WOTC', illustrator: 'Kagemaru Himeno',
    anecdote: 'L\u2019ere Neo a introduit les premiers Pokemon de seconde generation en TCG, avec un style holographique \u00ab cosmos \u00bb mythique.' },
  { name: 'Lugia', setId: 'neo1', localId: '9', lang: 'fr', era: 'Vintage WOTC', illustrator: 'Kagemaru Himeno',
    anecdote: 'Le Lugia Neo Genesis est le graal des collectionneurs de l\u2019ere Neo \u2014 son illustration par Himeno est consideree comme une oeuvre d\u2019art.' },
]

export interface CardOfDay {
  name: string
  imageUrl: string     // URL TCGdex prete a afficher
  era: string
  illustrator?: string
  anecdote: string
  fromCollection: boolean
}

function tcgdexImg(lang: string, setId: string, localId: string): string {
  return `https://assets.tcgdex.net/${lang}/${setId.includes('-') ? setId.split('-')[0] : (setId.startsWith('base') ? 'base' : 'base')}/${setId}/${localId}/high.webp`
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86400000)
}

/** Carte du jour : priorite collection, sinon iconique curee. */
export function getCardOfDay(
  collectionCards: Array<{ name?: string | null; set_id?: string | null; card_number?: string | null; lang?: string | null; set_name?: string | null; image_url?: string | null }> = [],
  eraOf?: (setName: string | null) => string,
  date = new Date(),
): CardOfDay {
  const d = dayOfYear(date)
  const owned = (collectionCards ?? []).filter(c => c && (c.image_url || (c.set_id && c.card_number)))

  // Priorite : carte de la collection (si au moins une exploitable)
  if (owned.length > 0) {
    const c = owned[d % owned.length]
    const era = eraOf ? eraOf(c.set_name ?? null) : 'Ta collection'
    const setId = String(c.set_id ?? '').replace(/^jp-|^en-/, '')
    const num = String(c.card_number ?? '').replace(/^0+/, '')
    const lang = (c.lang === 'EN' ? 'en' : 'fr')
    const imageUrl = c.image_url || tcgdexImg(lang, setId, num)
    return {
      name: c.name || 'Carte',
      imageUrl,
      era,
      anecdote: `Une piece de ta collection mise en lumiere aujourd\u2019hui. Issue de l\u2019ere ${era}.`,
      fromCollection: true,
    }
  }

  // Fallback : iconique curee
  const ic = ICONIC_CARDS[d % ICONIC_CARDS.length]
  return {
    name: ic.name,
    imageUrl: tcgdexImg(ic.lang, ic.setId, ic.localId),
    era: ic.era,
    illustrator: ic.illustrator,
    anecdote: ic.anecdote,
    fromCollection: false,
  }
}
