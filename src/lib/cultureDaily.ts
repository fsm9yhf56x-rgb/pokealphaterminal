// Pepites Culture pour le bloc "Culture du jour" du Daily Hub collectionneur.
// Mix anecdotes / artistes / eres. Rotation deterministe par jour (meme pepite
// pour tous un jour donne, stable dans la journee).

export type CultureDailyKind = 'anecdote' | 'artiste' | 'ere'

export interface CultureDailyItem {
  kind: CultureDailyKind
  eyebrow: string          // sur-titre (ex: "Anecdote du jour")
  title: string
  text: string             // 1-2 phrases
  href: string             // lien vers la page Culture concernee
  color: string            // accent
  // Optionnel : si la pepite concerne une ere precise, on peut relier a la collection.
  era?: string             // doit matcher deriveEra (ex: "Vintage WOTC")
  artist?: string          // nom illustrateur (pour "X dans ta collection")
}

const ITEMS: CultureDailyItem[] = [
  // ── Anecdotes ──────────────────────────────────────────────
  { kind: 'anecdote', eyebrow: 'Anecdote du jour', title: 'Pikachu Illustrator',
    text: 'Distribuee en 1998 a quelques gagnants d\u2019un concours de dessin, c\u2019est la carte Pokemon la plus rare au monde \u2014 plus de 5 M$ en PSA 10.',
    href: '/culture/curiosites', color: '#D4AF37' },
  { kind: 'anecdote', eyebrow: 'Anecdote du jour', title: 'Le Dracaufeu Shadowless',
    text: 'Les toutes premières impressions du Set de Base, sans ombre sous l\u2019illustration. Un détail qui multiplie la cote par dix.',
    href: '/culture/curiosites', color: '#E03020', era: 'Vintage WOTC' },
  { kind: 'anecdote', eyebrow: 'Anecdote du jour', title: 'Les cartes Trophee No.1',
    text: 'Remises aux vainqueurs des tournois officiels japonais, elles n\u2019existent qu\u2019a quelques dizaines d\u2019exemplaires.',
    href: '/culture/curiosites', color: '#2A82DD' },
  { kind: 'anecdote', eyebrow: 'Anecdote du jour', title: 'La queue de Dracaufeu',
    text: 'Sur l\u2019illustration originale du Set de Base, la queue presente une variation que les collectionneurs traquent encore.',
    href: '/culture/curiosites', color: '#C44E8E', era: 'Vintage WOTC' },
  // ── Artistes ───────────────────────────────────────────────
  { kind: 'artiste', eyebrow: 'Maitre du jour', title: 'Mitsuhiro Arita',
    text: 'Le maitre du Dracaufeu. Sa signature ouvre le Set de Base et definit l\u2019esthetique des origines.',
    href: '/culture/artistes/Mitsuhiro%20Arita', color: '#E03020', artist: 'Mitsuhiro Arita' },
  { kind: 'artiste', eyebrow: 'Maitre du jour', title: 'Atsuko Nishida',
    text: 'Creatrice du design de Pikachu et d\u2019Evoli. Son trait a faconne les Pokemon que tu collectionnes.',
    href: '/culture/artistes/Atsuko%20Nishida', color: '#E07B39', artist: 'Atsuko Nishida' },
  { kind: 'artiste', eyebrow: 'Maitre du jour', title: 'Ken Sugimori',
    text: 'Directeur artistique historique de la licence. La main derriere l\u2019identite visuelle de tout l\u2019univers.',
    href: '/culture/artistes/Ken%20Sugimori', color: '#2A82DD', artist: 'Ken Sugimori' },
  // ── Eres ───────────────────────────────────────────────────
  { kind: 'ere', eyebrow: 'Ere a (re)decouvrir', title: 'L\u2019age d\u2019or WOTC',
    text: '1996-2003 : la ou la legende a commence. Holos epais, bordures jaunes, et les premiers graals.',
    href: '/culture/eres', color: '#D4AF37', era: 'Vintage WOTC' },
  { kind: 'ere', eyebrow: 'Ere a (re)decouvrir', title: 'L\u2019ere EX',
    text: '2003-2007 : l\u2019arrivee des holos numeriques et des Crystal Types. Une epoque charniere souvent sous-cotee.',
    href: '/culture/eres', color: '#2A82DD', era: 'EX' },
  { kind: 'ere', eyebrow: 'Ere a (re)decouvrir', title: 'Diamant & Perle',
    text: '2007-2011 : une période discrète qui devient le prochain vintage. Les connaisseurs s\u2019y positionnent déjà.',
    href: '/culture/eres', color: '#0E9E8E', era: 'DPP / HGSS' },
]

/** Pepite du jour, deterministe : meme resultat toute la journee. */
export function getCultureDaily(date = new Date()): CultureDailyItem {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / 86400000)
  return ITEMS[dayOfYear % ITEMS.length]
}
