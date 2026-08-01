import { neon } from '@neondatabase/serverless'
import { writeFileSync } from 'node:fs'
const sql = neon(process.env.DATABASE_URL)

const sets = await sql`
  SELECT s.id, s.name, s.name_fr, s.name_jp, s.series, s.release_date,
         s.langs, s.total_cards, s.logo_url
  FROM k_sets s
  WHERE NOT s.hidden`

const printedTotals = await sql`
  SELECT set_id,
         array_agg(number::int ORDER BY number::int) FILTER (WHERE number ~ '^[0-9]+$') AS nums
  FROM k_prints GROUP BY set_id`
const numsBySet = Object.fromEntries(printedTotals.map(r => [r.set_id, r.nums || []]))

function contiguousMax(nums) {
  if (!nums || !nums.length) return null
  const set = new Set(nums)
  let c = 0
  for (let i = 1; set.has(i); i++) c = i
  return c || null
}

const index = []
for (const s of sets) {
  const nums = numsBySet[s.id] || []
  const printedTotal = contiguousMax(nums)
  if (printedTotal == null) continue
  index.push({
    id: s.id,
    printedTotal,
    langs: s.langs || [],
    series: s.series || null,
    year: s.release_date ? new Date(s.release_date).getFullYear() : null,
    nameEn: s.name || null,
    nameFr: s.name_fr || null,
    nameJp: s.name_jp || null,
    logo: s.logo_url || null,
    dbTotalCards: s.total_cards,
  })
}

const byTotal = {}
for (const e of index) (byTotal[e.printedTotal] ||= []).push(e.id)

let uniqueTotal = 0, sharedTotal = 0, resolvableByLang = 0
for (const [, ids] of Object.entries(byTotal)) {
  if (ids.length === 1) { uniqueTotal++; continue }
  sharedTotal++
  const byLang = { en: 0, fr: 0, jp: 0 }
  for (const id of ids) {
    const e = index.find(x => x.id === id)
    for (const l of e.langs) if (byLang[l] != null) byLang[l]++
  }
  if (Object.values(byLang).every(n => n <= 1)) resolvableByLang++
}

writeFileSync('src/lib/scan/set-index.json', JSON.stringify(index, null, 2))

console.log('=== set-index.json genere ===')
console.log('   sets indexes         : ' + index.length)
console.log('   totaux uniques       : ' + uniqueTotal + '  (full-auto direct)')
console.log('   totaux partages      : ' + sharedTotal)
console.log('   dont resolus /langue : ' + resolvableByLang)
console.log('   picker necessaire    : ' + (sharedTotal - resolvableByLang) + ' totaux')
console.log('')
console.log('   total=102 -> ' + JSON.stringify(byTotal[102]))
console.log('   total=193 -> ' + JSON.stringify(byTotal[193] || 'aucun set a 193'))
console.log('   total=250 -> ' + JSON.stringify(byTotal[250]))
console.log('')
console.log('=== totaux encore ambigus APRES filtre langue ===')
let shown = 0
for (const [tot, ids] of Object.entries(byTotal)) {
  if (ids.length === 1) continue
  const perLang = { en: [], fr: [], jp: [] }
  for (const id of ids) {
    const e = index.find(x => x.id === id)
    for (const l of e.langs) if (perLang[l]) perLang[l].push(id)
  }
  const hard = Object.entries(perLang).filter(([, arr]) => arr.length > 1)
  if (hard.length && shown < 25) {
    shown++
    for (const [l, arr] of hard)
      console.log('   total=' + String(tot).padEnd(4) + ' lang=' + l + ' -> ' + arr.join(', '))
  }
}
if (shown === 0) console.log('   AUCUN cas dur hors variantes WotC')

process.exit(0)
