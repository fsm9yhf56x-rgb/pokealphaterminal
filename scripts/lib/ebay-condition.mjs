// Mapping etat -> tier Kodo (NEAR_MINT/EXCELLENT/LIGHTLY_PLAYED/MODERATELY_PLAYED/
// HEAVILY_PLAYED/DAMAGED), partage par l'ingestion eBay FR et kodo-price-by-state.
//
// REGLE (decision Alon 20/07) : TITRE d'abord (un vendeur qui ecrit "LP" sait ce
// qu'il vend), champ eBay condition en SECOURS (menu choisi a la va-vite).
// Exemple reel : annonce titre "... LP ..." + champ eBay "etat moyen" -> LP.
//
// PIEGE "EX" : c'est aussi un type de carte (Mewtwo EX, Gardevoir ex). "EX" ne
// compte comme etat QUE s'il n'est pas colle a un nom de Pokemon — on exige
// qu'il soit isole ET pas precede d'un mot capitalise type nom de carte.
// Approche prudente : on ne mappe "EX" du titre que si "etat"/"condition" est
// a proximite OU si c'est un token isole en fin de titre. Sinon on l'ignore.

export const TIERS = ['NEAR_MINT', 'EXCELLENT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED'];

// ── Titre : mentions explicites d'etat ──
// Ordre = du plus specifique au plus ambigu.
const TITLE_PATTERNS = [
  // Near Mint
  { tier: 'NEAR_MINT', re: /\b(near\s*mint|nm\/m|nm-mt|nmint)\b/i },
  { tier: 'NEAR_MINT', re: /\bNM\b/ },              // NM isole (casse stricte)
  { tier: 'NEAR_MINT', re: /\b(mint|neuve?|comme\s+neuf)\b/i },
  // Lightly Played
  { tier: 'LIGHTLY_PLAYED', re: /\b(lightly\s*played|light\s*play)\b/i },
  { tier: 'LIGHTLY_PLAYED', re: /\bLP\b/ },          // LP isole
  // Moderately Played
  { tier: 'MODERATELY_PLAYED', re: /\b(moderately\s*played|mod\s*play)\b/i },
  { tier: 'MODERATELY_PLAYED', re: /\bMP\b/ },
  // Damaged — AVANT HP : "abimee" explicite prime sur un "HP" ambigu
  { tier: 'DAMAGED', re: /\b(damaged|dmg|poor|ab[iî]m[ée]e?|endommag[ée]e?)\b/i },
  // Heavily Played
  { tier: 'HEAVILY_PLAYED', re: /\b(heavily\s*played|heavy\s*play)\b/i },
  { tier: 'HEAVILY_PLAYED', re: /\bHP\b(?!\s*\d)/ }, // HP mais pas "70 HP" (points de vie !)
  // Excellent — en DERNIER car "EX" est piegeux (type de carte)
  { tier: 'EXCELLENT', re: /\b(excellent|tr[eè]s\s+bon\s+[ée]tat)\b/i },
];

// ── Champ eBay condition (libelles FR normalises par eBay) ──
// "Non gradee - etat moyen" -> MP (decision Alon 20/07).
const EBAY_CONDITION_MAP = [
  { tier: 'NEAR_MINT', re: /(comme\s+neuf|neuf|brand\s*new|like\s*new)/i },
  { tier: 'EXCELLENT', re: /(excellent|tr[eè]s\s+bon)/i },
  { tier: 'LIGHTLY_PLAYED', re: /(bon\s+[ée]tat|good)/i },
  { tier: 'MODERATELY_PLAYED', re: /([ée]tat\s+moyen|average|acceptable)/i },
  { tier: 'HEAVILY_PLAYED', re: /([ée]tat\s+correct)/i },  // PAS 'used'/'worn' : etat commercial eBay != etat de collection (55 faux HP le 21/07)
  { tier: 'DAMAGED', re: /(ab[iî]m[ée]|endommag[ée]|damaged|poor)/i },
];

/**
 * Extrait le tier d'etat d'une annonce eBay.
 * @param {string} title  titre de l'annonce
 * @param {string|null} ebayCondition  champ condition renvoye par l'API (peut etre null)
 * @returns {{ tier: string|null, source: 'title'|'ebay_condition'|null }}
 */
export function extractConditionTier(title, ebayCondition) {
  const t = String(title || '');
  // Ne pas confondre "HP" (etat) avec "70 HP" (points de vie) : le pattern gere.
  // Ne pas lire l'etat d'un titre de carte gradee (PSA 9 etc.) : l'ingestion
  // filtre deja isGraded() en amont, mais on reste defensif.
  for (const { tier, re } of TITLE_PATTERNS) {
    if (tier === 'EXCELLENT' && /\b(ex|EX)\b/.test(t) && !/(excellent|tr[eè]s\s+bon)/i.test(t)) {
      // "EX" seul dans un titre = trop souvent le type de carte -> on saute.
      continue;
    }
    if (re.test(t)) return { tier, source: 'title' };
  }
  const c = String(ebayCondition || '');
  if (c) {
    for (const { tier, re } of EBAY_CONDITION_MAP) {
      if (re.test(c)) return { tier, source: 'ebay_condition' };
    }
  }
  return { tier: null, source: null };
}
