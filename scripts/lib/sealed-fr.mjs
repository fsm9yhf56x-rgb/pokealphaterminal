// scripts/lib/sealed-fr.mjs
// Parseur de titres eBay FR pour le scelle Pokemon + agregation des annonces.
// PUR : zero I/O, zero dependance -> testable et reutilisable (ingest, sonde, futur JP/EN).
//
// Principe Kodo applique ici :
//   - un titre qu'on ne comprend pas est EXCLU, jamais devine
//   - un SKU ambigu (display vs demi-display vs case) est EXCLU plutot que rattache au hasard
//   - la cote sort de >= MIN_ASKS vendeurs DISTINCTS, jamais d'un vendeur seul
//   - ce sont des ANNONCES : decote appliquee, etiquetage "des X EUR" cote UI

// ---------------------------------------------------------------- normalisation

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu;

// Les drapeaux sont SOUVENT le seul marqueur de langue du titre ("Display SV8a EV8.5" + drapeau JP).
// normalize() les detruit -> il faut les lire AVANT. Un display japonais cote en FR, c'est
// exactement l'erreur qui decredibilise tout le produit.
const FLAG = {
  '\u{1F1EB}\u{1F1F7}': 'fr', '\u{1F1EF}\u{1F1F5}': 'jp', '\u{1F1EC}\u{1F1E7}': 'en',
  '\u{1F1FA}\u{1F1F8}': 'en', '\u{1F1E9}\u{1F1EA}': 'de', '\u{1F1EE}\u{1F1F9}': 'it',
  '\u{1F1EA}\u{1F1F8}': 'es', '\u{1F1F0}\u{1F1F7}': 'kr', '\u{1F1E8}\u{1F1F3}': 'cn',
};

/** langues signalees par les drapeaux du titre, dans l'ordre d'apparition */
export function detectFlags(title) {
  const out = [];
  const t = String(title || '');
  for (const [flag, lang] of Object.entries(FLAG)) if (t.includes(flag)) out.push(lang);
  return [...new Set(out)];
}

/** minuscules, sans accents, sans emoji, espaces normalises */
export function normalize(s) {
  return String(s || '')
    .replace(EMOJI, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2019\u2018']/g, "'")
    .replace(/[^a-z0-9.'/&+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------- SKU

export const SKU = {
  CASE: 'case',
  DISPLAY_BUNDLE: 'display_bundle',
  DISPLAY_TIN: 'display_tin',
  DEMI_DISPLAY: 'demi_display',
  DISPLAY: 'display',
  ETB: 'etb',
  BUNDLE: 'bundle',
  TRIPACK: 'tripack',
  BLISTER: 'blister',
  COFFRET: 'coffret',
  DECK: 'deck',
  TIN: 'tin',
  BOOSTER: 'booster',
};

/** Libelles FR affichables (le catalogue parle collectionneur, pas anglais technique) */
export const SKU_LABEL = {
  case: 'Case',
  display_bundle: 'Display de bundles',
  display_tin: 'Display de mini-tins',
  demi_display: 'Demi-display',
  display: 'Display 36 boosters',
  etb: "Coffret Dresseur d'Elite",
  bundle: 'Bundle 6 boosters',
  tripack: 'Tripack',
  blister: 'Blister',
  coffret: 'Coffret',
  deck: 'Deck',
  tin: 'Pokebox / Tin',
  booster: 'Booster',
};

// Ordre = priorite de detection : du plus specifique au plus general.
// Un titre matche le PREMIER motif -> "case etb" sort en CASE, jamais en ETB.
const SKU_RULES = [
  // "case de 6 displays", "case 24 blisters", "carton de 6" -- MAIS PAS "dans sa case individuelle"
  // "case" au sens carton. Pieges anglais : "Special Case File" et "On the Case"
  // (jeux de mots Detective Pikachu) ne sont pas des cartons.
  { sku: SKU.CASE, re: /(?<!on\s+the\s+)\b(case|carton)\b(?!\s*(individuelle|de\s*protection|acrylique|plexi|files?\b|study\b))/ },
  { sku: SKU.DISPLAY_BUNDLE, re: /\b(display|boite|lot)\b[^a-z]{0,12}\b(de\s*)?\d{1,2}\s*bundles?\b|\bdisplay\s*bundle\b|\b\d{1,2}\s*bundles?\b/ },
  { sku: SKU.DECK, re: /\bbuild\s*&?\s*battle\b[^a-z]{0,12}(box\s*)?display\b|\bdecks?\b[^a-z]{0,12}display\b/ },
  { sku: SKU.COFFRET, re: /\b(pin|figure|premium)?\s*collection\b[^a-z]{0,12}display\b/ },
  { sku: SKU.BLISTER, re: /\bblisters?\b[^a-z]{0,12}display\b/ },
  { sku: SKU.DISPLAY_TIN, re: /\b\d{1,2}\s*mini[\s-]*tins?\b|\b(display|presentoir|boite)\b(?:\s+[a-z0-9']+){0,4}\s+mini[\s-]*tins?\b|\bmini[\s-]*tins?\b[^a-z]{0,12}display\b/ },
  { sku: SKU.DEMI_DISPLAY, re: /\b(demie?[\s-]*display|1\/2\s*display|half\s*display|half\s*booster\s*box(es)?|18\s*boosters?)\b/ },
  { sku: SKU.DISPLAY, re: /\b(display|booster\s*box(es)?)\b|\b(boite|boitier)\b[^a-z]{0,12}\b(de\s*)?36\b|\b36\s*boosters?\b/ },
  { sku: SKU.ETB, re: /\betb\b|\bcoffret\s*(du\s*)?dresseur\s*d?'?\s*elite\b|\belite\s*trainer\s*box\b|\bdresseur\s*elite\b/ },
  { sku: SKU.BUNDLE, re: /\bbundle\b|\b6\s*boosters?\b/ },
  { sku: SKU.TRIPACK, re: /\btri[\s-]*pack\b|\b3\s*boosters?\b|\bpack\s*de\s*3\b/ },
  { sku: SKU.BLISTER, re: /\bblisters?\b/ },
  { sku: SKU.TIN, re: /\b(pokebox|poke\s*box|mini[\s-]*tins?|tins?)\b/ },
  { sku: SKU.DECK, re: /\b(deck|starter|paquet\s*de\s*combat|theme\s*deck|league\s*battle\s*deck|build\s*&?\s*battle)\b/ },
  { sku: SKU.COFFRET, re: /\bcoffrets?\b|\bcollection\s*(premium|speciale)\b|\b(premium\s*)?collection\b|\bbox\b/ },
  { sku: SKU.BOOSTER, re: /\bboosters?\b|\bsachets?\b|\bsleeved\s*booster\b|\bpromo\s*pack\b/ },
];

// "case 24 blisters", "display 10 bundles", "8 mini-tins" -> {qty, unit}
// Sans ca, un case de 6 displays et un case de 24 blisters tomberaient dans le meme panier.
const CONTENT_RE = /\bset\s*of\s*(\d{1,3})\b|\b(\d{1,3})\s*(booster\s*box(?:es)?|displays?|booster\s*bundles?|bundles?|blisters?|etb|elite\s*trainer\s*box(?:es)?|coffrets?|mini[\s-]*tins?|tins?|boosters?|packs?)\b/;
const CONTENT_UNIT = { display: 'display', boosterbox: 'display', boosterboxe: 'display', bundle: 'bundle', boosterbundle: 'bundle', blister: 'blister', etb: 'etb', elitetrainerbox: 'etb', elitetrainerboxe: 'etb', coffret: 'coffret', minitin: 'mini_tin', tin: 'mini_tin', booster: 'booster', pack: 'booster' };

// Un contenant reel ne depasse pas la quarantaine d'unites (case de 24 blisters,
// display de 36 boosters). Au-dela, le nombre capte est un NOM DE SERIE ou une
// reference : "SV: Scarlet & Violet 151 Booster Bundle Case" donnait
// "151 boosters" alors que 151 est le nom du set.
const CONTENT_MAX = 36;

export function detectContent(n) {
  const m = CONTENT_RE.exec(n);
  if (!m) return null;
  // "[Set of 8]" ne dit PAS de quoi : quantite sans unite, inexploitable seule
  if (m[1] && !m[3]) return null;
  const key = String(m[3] || '').replace(/[\s-]/g, '').replace(/s$/, '');
  const unit = CONTENT_UNIT[key] || null;
  if (!unit) return null;
  const qty = Number(m[2]);
  if (!(qty >= 2 && qty <= CONTENT_MAX)) return null;
  return { qty, unit };
}

export function detectSku(n) {
  for (const r of SKU_RULES) if (r.re.test(n)) return r.sku;
  return null;
}

// ---------------------------------------------------------------- exclusions

// Chaque motif dit POURQUOI on jette : l'ingest logue la raison, on peut auditer.
const EXCLUSIONS = [
  { reason: 'vide', re: /\b(boite|boitier|display|carton)\s*vide\b|\bvide\b|\bempty\b|\bsans\s*(les\s*)?cartes?\b|\bpresentoir\b/ },
  { reason: 'preco', re: /\bprecos?\b|\bpre[\s-]*commande\b|\bprecommande\b|\bpre[\s-]*order\b|\bpreorder\b/ },
  { reason: 'defaut', re: /\(\s*defaut\s*\)|\bdefaut\b|\babime\b|\bendommage\b|\bdechire\b|\bouvert\b|\bnon[\s-]*scelle\b|\breconditionne\b/ },
  { reason: 'lot', re: /\blot\b[^a-z]{0,12}\b(display|etb|coffret|bundle|blister|demi)\b|\blot\s*(de\s*)?\d|\blot\b[^a-z]{0,3}\d|^\s*\d{1,2}\s*(demi|display|coffret|etb|blister)\b|\bx\s*\d{1,2}\b(?!\s*(booster|carte))/ },
  { reason: 'accessoire', re: /\bacrylique\b|\bplexi\b|\bsleeves?\b|\bprotege[\s-]*cartes?\b|\bclasseur\b|\bportfolio\b|\brangement\b|\bvitrine\b|\bstand\b/ },
  { reason: 'grade', re: /\bwata\b|\bcgc\s*\d|\bpsa\s*\d|\bgraded?\b|\bgradee?\b/ },
  { reason: 'custom', re: /\bcustom\b|\bfait\s*main\b|\brepro\b|\bfake\b|\bproxy\b|\bpersonnalise\b/ },
  { reason: 'autre_langue', re: /\b(english|anglais(e|es)?|japonais(e|es)?|japanese|jap|allemand(e|es)?|german|deutsch|italien(ne|nes)?|italian|espagnol(e|es)?|spanish|korean|coreen(ne)?|chinois(e)?)\b/ },
];

export function detectExclusion(n) {
  for (const e of EXCLUSIONS) if (e.re.test(n)) return e.reason;
  return null;
}

// ---------------------------------------------------------------- code de serie FR

// Le marche FR ecrit les codes officiels dans les titres : EV1, EV03, EB11, ME05, SL3, EV3.5, EB4.5.
// C'est notre identifiant le plus fiable -- meilleur que le nom, qui varie ("Ecarlate et Violet" / "EV").
const SERIE_PREFIXES = ['ev', 'eb', 'sl', 'xy', 'nb', 'me', 'hs', 'pt', 'dp', 'ex'];
const CODE_RE = new RegExp('\\b(' + SERIE_PREFIXES.join('|') + ')\\s*[-.]?\\s*(\\d{1,2}(?:\\.\\d)?)\\b', 'g');

/** "EV01" et "EV1" -> "ev1" ; "EV3.5" -> "ev3.5" */
export function normalizeSetCode(prefix, num) {
  const p = String(prefix).toLowerCase();
  const raw = String(num);
  if (raw.includes('.')) {
    const [a, b] = raw.split('.');
    return p + String(Number(a)) + '.' + b;
  }
  return p + String(Number(raw));
}

export function detectSetCodes(n) {
  const out = [];
  CODE_RE.lastIndex = 0;
  let m;
  while ((m = CODE_RE.exec(n)) !== null) out.push(normalizeSetCode(m[1], m[2]));
  return [...new Set(out)];
}

// ---------------------------------------------------------------- parse

/**
 * @param {string} title  titre eBay brut
 * @param {object} opts
 * @param {Map<string,string>} [opts.byCode]  code normalise ("ev3.5") -> kodo_set_id
 * @param {Array<{id:string,norm:string}>} [opts.byName]  noms de sets FR normalises
 * @param {string} [opts.condition]  champ condition eBay ("Neuf/Scelle", "Occasion/Non-scelle"...)
 */
export function parseSealedTitle(title, opts = {}) {
  const n = normalize(title);
  const flags = detectFlags(title);
  const res = {
    title, norm: n, flags,
    sku: null, skuLabel: null, content: null,
    setId: null, setCode: null, setMatch: null,
    sealed: null,
    excluded: false, excludeReason: null,
  };

  // 0. drapeau d'une autre langue = rejet immediat, meme si le reste du titre est en francais
  //    (un vendeur francais qui vend du japonais ecrit son annonce en francais)
  const foreign = flags.filter((f) => f !== 'fr');
  if (foreign.length) { res.excluded = true; res.excludeReason = 'drapeau_' + foreign[0]; }

  // 1. etat : on fait confiance au champ eBay, il est declaratif et fiable sur le scelle
  if (opts.condition != null) {
    const c = normalize(opts.condition);
    if (/non[\s-]*scelle|occasion/.test(c)) { res.sealed = false; if (!res.excluded) { res.excluded = true; res.excludeReason = 'non_scelle'; } }
    else if (/scelle|neuf/.test(c)) res.sealed = true;
  }

  // 2. exclusions de titre (priment sur tout le reste)
  const ex = detectExclusion(n);
  if (ex && !res.excluded) { res.excluded = true; res.excludeReason = ex; }

  // 3. SKU
  res.sku = detectSku(n);
  res.skuLabel = res.sku ? SKU_LABEL[res.sku] : null;
  // Un contenant sans contenu identifie est AMBIGU : un case de 6 displays et un case de
  // 24 blisters n'ont rien a voir. Les agreger fabriquerait un prix qui n'existe pour personne.
  if (res.sku === SKU.CASE || res.sku === SKU.DISPLAY_BUNDLE || res.sku === SKU.DISPLAY_TIN) {
    res.content = detectContent(n);
    if (!res.content && !res.excluded) { res.excluded = true; res.excludeReason = 'contenu_indetermine'; }
  }
  if (!res.sku && !res.excluded) { res.excluded = true; res.excludeReason = 'sku_inconnu'; }

  // 4. serie : code d'abord (fiable), nom en repli
  const codes = detectSetCodes(n);
  if (codes.length === 1) {
    res.setCode = codes[0];
    res.setMatch = 'code';
    if (opts.byCode && opts.byCode.has(codes[0])) res.setId = opts.byCode.get(codes[0]);
  } else if (codes.length > 1) {
    // "EB04 / EB07 / EB09x2" = un lot multi-series -> on ne devine pas
    if (!res.excluded) { res.excluded = true; res.excludeReason = 'series_multiples'; }
  }
  if (!res.setId && opts.byName && opts.byName.length) {
    const hits = opts.byName.filter((s) => s.norm.length >= 5 && n.includes(s.norm));
    if (hits.length) {
      const best = hits.sort((a, b) => b.norm.length - a.norm.length)[0];
      res.setId = best.id;
      res.setMatch = res.setMatch || 'nom';
    }
  }
  if (!res.setId && !res.excluded) { res.excluded = true; res.excludeReason = 'serie_introuvable'; }

  return res;
}

// ---------------------------------------------------------------- agregation

// Nombre de boosters par SKU — UNIQUEMENT la ou le contenu est CERTAIN.
// Un ETB contient 8, 9 ou 10 boosters selon l'epoque, un coffret est variable :
// pour ceux-la on ne publie PAS de prix au booster plutot qu'un chiffre invente.
export const BOOSTERS_PER_SKU = { display: 36, demi_display: 18, bundle: 6, tripack: 3, booster: 1 };
// Standardises dans TOUS les marches : un display fait 36 boosters partout.
export const BOOSTERS_UNIVERSAL = { display: 36, demi_display: 18 };

/**
 * Boosters contenus, ou null si le contenu n'est pas certain.
 * @param {string} [lang] 'fr' -> table complete (les libelles FR designent les
 *   produits officiels). Ailleurs, table restreinte : TCGplayer vend ses propres
 *   lots sous le mot "bundle" ("Sleeved Booster Pack Bundle [Set of 8]"), les
 *   compter pour 6 donnerait un prix au booster faux.
 */
export function boosterCount(sku, content, lang) {
  if (sku === 'display_bundle' && content && content.unit === 'bundle') return content.qty * 6;
  if (sku === 'case' && content && content.unit === 'display') return content.qty * 36;
  const table = String(lang || '').toLowerCase() === 'fr' ? BOOSTERS_PER_SKU : BOOSTERS_UNIVERSAL;
  const n = table[sku];
  return n == null ? null : n;
}

/** SKU dont le contenu VARIE et fait donc partie de l'identite du produit */
export const CONTENT_BEARING = new Set(['case', 'display_bundle', 'display_tin']);

/** cle d'identite d'un produit : le contenu ne compte que la ou il varie */
export function productKey(sku, content) {
  return CONTENT_BEARING.has(sku) && content ? sku + ':' + content.qty + content.unit : sku;
}

export const MIN_ASKS = 3;      // jamais de cote sur 1-2 annonces (piege Demolosse 2745 EUR)
export const ASK_DISCOUNT = 0.88; // ce sont des demandes, pas des ventes

const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Une voix par VENDEUR (mediane de ses annonces), puis mediane des vendeurs.
 * Un vendeur qui republie 3x le meme display ne peut pas faire la cote a lui seul.
 * @param {Array<{price:number, seller:string}>} rows
 * @returns {{price:number|null, raw:number|null, n:number, sellers:number, method:string}}
 */
export function aggregateAsks(rows, opts = {}) {
  const minAsks = opts.minAsks ?? MIN_ASKS;
  const discount = opts.discount ?? ASK_DISCOUNT;

  const bySeller = new Map();
  for (const r of rows) {
    const p = Number(r.price);
    if (!Number.isFinite(p) || p <= 0) continue;
    const k = r.seller || ('anon:' + p);
    if (!bySeller.has(k)) bySeller.set(k, []);
    bySeller.get(k).push(p);
  }

  const votes = [...bySeller.values()].map((ps) => median(ps));
  if (votes.length < minAsks) {
    return { price: null, raw: null, low: null, n: rows.length, sellers: votes.length, method: 'insufficient_data' };
  }
  const raw = median(votes);
  // Le plancher subit la MEME decote que la mediane. Sans ca on compare une
  // annonce brute a une mediane decotee -> low > price (constate sur
  // 'Offensive Vapeur' : market 1672 pour un low de 1900, impossible).
  const lowRaw = Math.min(...votes);
  return {
    price: Math.round(raw * discount * 100) / 100,
    raw: Math.round(raw * 100) / 100,
    low: Math.round(lowRaw * discount * 100) / 100,
    n: rows.length,
    sellers: votes.length,
    method: 'ebay_fr_ask',
  };
}
