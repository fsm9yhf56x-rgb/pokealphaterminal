// Dictionnaire FR -> EN dérivé du print_id partagé (même vérité que /api/v1/cards/search).
// Rejouer après chaque ajout de set : node scripts/build-pokedex-fr-en.mjs
import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'

const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : ''
const url = process.env.DATABASE_URL
  || env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
if (!url) { console.error('DATABASE_URL introuvable'); process.exit(1) }

const sql = neon(url)
const rows = await sql`
  SELECT DISTINCT lower(fr.name_localized) AS fr, en.name_localized AS en
  FROM k_cards fr
  JOIN k_cards en ON en.print_id = fr.print_id AND en.lang = 'en'
  WHERE fr.lang = 'fr'
    AND fr.name_localized IS NOT NULL AND en.name_localized IS NOT NULL
    AND lower(fr.name_localized) <> lower(en.name_localized)
`
const dict = {}
for (const r of rows) if (!dict[r.fr]) dict[r.fr] = r.en
fs.mkdirSync('public/data', { recursive: true })
fs.writeFileSync('public/data/pokedex-fr-en.json', JSON.stringify(dict))
console.log(Object.keys(dict).length, 'correspondances FR → EN')
