// scripts/ebay-quota.mjs
// Lit le quota eBay restant. A INSERER ENTRE LES ETAPES DES WORKFLOWS pour
// mesurer ce que chaque poste consomme reellement.
//
//   node scripts/ebay-quota.mjs                 -> etat
//   node scripts/ebay-quota.mjs --label "Ed1 FR"-> etat etiquete (lisible dans les logs)
//   node scripts/ebay-quota.mjs --min 800       -> sort en erreur sous le seuil
//
// POURQUOI : les 5000 appels/jour sont un plafond APPLICATIF UNIQUE, partage par
// TOUT ce qui touche eBay — cartes FR par etat, Ed1, gradees FR, scelle FR,
// scelle EN, et le scelle JP a venir. Quand la somme depasse, ce n'est pas le
// dernier arrive qui casse : c'est celui qui tourne en dernier dans la nuit,
// et il casse en silence (429 en boucle, run vide, aucune alerte).
// Sans mesure par poste, impossible de savoir qui manger le budget.
//
// Le compteur se remet a zero a 07:00 UTC (verifie le 29/07).
//
// Env : EBAY_APP_ID, EBAY_CERT_ID

const APP = process.env.EBAY_APP_ID;
const CERT = process.env.EBAY_CERT_ID;
if (!APP || !CERT) { console.error('Manque EBAY_APP_ID / EBAY_CERT_ID'); process.exit(1); }

const argv = process.argv.slice(2);
const iLabel = argv.indexOf('--label');
const LABEL = iLabel >= 0 ? String(argv[iLabel + 1] || '') : '';
const iMin = argv.indexOf('--min');
const MIN = iMin >= 0 ? Number(argv[iMin + 1] || 0) : 0;

const basic = Buffer.from(APP + ':' + CERT).toString('base64');
const tr = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
  method: 'POST',
  headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
});
const tj = await tr.json();
if (!tj.access_token) { console.error('OAuth echec'); process.exit(0); }

const r = await fetch('https://api.ebay.com/developer/analytics/v1_beta/rate_limit/', {
  headers: { Authorization: 'Bearer ' + tj.access_token },
});
if (!r.ok) { console.log('quota illisible (' + r.status + ') — on continue'); process.exit(0); }
const j = await r.json();

let browse = null;
for (const api of (j.rateLimits || [])) {
  for (const res of (api.resources || [])) {
    if (String(res.name || '') !== 'buy.browse') continue;
    for (const rt of (res.rates || [])) browse = rt;
  }
}

if (!browse) { console.log('buy.browse introuvable dans le rapport de quota'); process.exit(0); }

const limite = Number(browse.limit || 0);
const restant = Number(browse.remaining || 0);
const conso = limite - restant;
const pct = limite ? Math.round((conso / limite) * 100) : 0;
const barre = '#'.repeat(Math.round(pct / 5)) + '.'.repeat(20 - Math.round(pct / 5));

console.log(
  '[quota eBay]' + (LABEL ? ' ' + LABEL : '') + ' ' + barre + ' '
  + conso + '/' + limite + ' (' + pct + '%) · restant ' + restant
  + ' · reset ' + String(browse.reset || '').slice(11, 19) + ' UTC'
);

// Sous le seuil, on prefere sauter l'etape plutot que la voir echouer en 429
// a mi-parcours et laisser des donnees a moitie ecrites.
if (MIN > 0 && restant < MIN) {
  console.log('!! restant (' + restant + ') sous le seuil demande (' + MIN + ') — etape a sauter');
  process.exit(1);
}
