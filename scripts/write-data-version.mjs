/**
 * Kodo — public/data/version.json : le hash du contenu, calcule, jamais bumpe.
 *
 * AVANT (le bug qui a cache Pitch Black) : cardDb.ts comparait une constante
 * DATA_VERSION bumpee A LA MAIN. Le sync du lundi pouvait absorber dix series,
 * aucun utilisateur ne les voyait tant que personne ne touchait la constante.
 * Un maillon manuel dans une chaine automatique = une chaine manuelle.
 *
 * MAINTENANT : ce script tourne apres rebuild-static-data dans la chaine
 * catalogue. Il hashe le contenu reel des JSON -> version.json. Le client
 * compare son hash au chargement : different -> recharge. La donnee change,
 * le cache suit, personne ne pense a rien.
 *
 * Usage : node scripts/write-data-version.mjs
 */
import { createHash } from 'crypto';
import { readdirSync, readFileSync, writeFileSync } from 'fs';

const DIR = 'public/data';
const files = readdirSync(DIR)
  .filter(f => f.endsWith('.json') && f !== 'version.json')
  .sort(); // ordre stable = hash stable

const h = createHash('sha1');
for (const f of files) h.update(f).update(readFileSync(`${DIR}/${f}`));
const v = h.digest('hex').slice(0, 12);

writeFileSync(`${DIR}/version.json`, JSON.stringify({ v, ts: new Date().toISOString(), files: files.length }));
console.log(`version.json : ${v} (${files.length} fichiers)`);
