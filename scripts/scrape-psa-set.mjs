#!/usr/bin/env node
/**
 * Scrape la pop PSA d'un set (toutes langues : EN + FR/German/etc en variety)
 * et upsert dans psa_pop_reports. Reutilise psa-headings + psa-fetcher (Puppeteer).
 *
 * Usage:
 *   DATABASE_URL=... node scripts/scrape-psa-set.mjs --setId=sv35
 *   DATABASE_URL=... node scripts/scrape-psa-set.mjs --setId=sv35 --dry-run
 *
 * card_ref = <setId>-<cardNumber> (convention psa_pop_reports, sans prefixe langue).
 * La langue se lit dans variety ('French', 'German'...) ; null = EN.
 */
import { neon } from '@neondatabase/serverless'
import { config as dotenv } from 'dotenv'
import { getPsaConfig } from './lib/psa-headings.mjs'
import { fetchPsaSetAllPages } from './lib/psa-fetcher.mjs'
dotenv({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=')
  return [k, v ?? true]
}))
const setId = args.setId
const dryRun = !!args['dry-run']
if (!setId) { console.error('Usage: --setId=sv35 [--dry-run]'); process.exit(1) }

const n = v => (v == null ? null : Number(v))

function transform(e, setId, sourceUrl) {
  const cardNumber = e.CardNumber || ''
  const card_ref = cardNumber ? `${setId}-${cardNumber}` : `${setId}-${e.SpecID}`
  return {
    card_ref,
    psa_spec_id: String(e.SpecID),
    variety: e.Variety || null,
    subject_name: e.SubjectName || null,
    card_number: cardNumber || null,
    pop_1: n(e.Grade1), pop_1_5: n(e.Grade1_5), pop_2: n(e.Grade2), pop_2_5: n(e.Grade2_5),
    pop_3: n(e.Grade3), pop_3_5: n(e.Grade3_5), pop_4: n(e.Grade4), pop_4_5: n(e.Grade4_5),
    pop_5: n(e.Grade5), pop_5_5: n(e.Grade5_5), pop_6: n(e.Grade6), pop_6_5: n(e.Grade6_5),
    pop_7: n(e.Grade7), pop_7_5: n(e.Grade7_5), pop_8: n(e.Grade8), pop_8_5: n(e.Grade8_5),
    pop_9: n(e.Grade9), pop_9_5: null, pop_10: n(e.Grade10),
    pop_authentic: n(e.GradeN0),
    pop_total: n(e.GradeTotal ?? e.Total) ?? 0,
    source_url: sourceUrl,
  }
}

async function main() {
  const t0 = Date.now()
  const config = await getPsaConfig(setId)
  console.log(`Set ${setId} -> heading ${config.headingId} (${config.label}, ${config.lang})`)
  const sourceUrl = `https://www.psacard.com/pop/tcg-cards/heading/${config.headingId}`

  const entries = await fetchPsaSetAllPages({ categoryId: config.categoryId, headingId: config.headingId })
  const cards = entries.filter(e => e.SpecID && e.SpecID !== 0)
  console.log(`Entrees: ${cards.length}`)
  const rows = cards.map(e => transform(e, setId, sourceUrl))

  const byLang = {}
  for (const r of rows) { const k = r.variety && /french/i.test(r.variety) ? 'FR' : r.variety && /(german|italian|spanish|portuguese|korean|chinese)/i.test(r.variety) ? 'autre' : 'EN'; byLang[k] = (byLang[k]||0)+1 }
  console.log('Reparti par langue:', JSON.stringify(byLang))

  if (dryRun) { console.log('DRY-RUN: rien insere. Exemple:', JSON.stringify(rows[0])); return }

  let up = 0
  for (const r of rows) {
    await sql`
      INSERT INTO psa_pop_reports
        (card_ref, psa_spec_id, variety, subject_name, card_number,
         pop_1,pop_1_5,pop_2,pop_2_5,pop_3,pop_3_5,pop_4,pop_4_5,pop_5,pop_5_5,
         pop_6,pop_6_5,pop_7,pop_7_5,pop_8,pop_8_5,pop_9,pop_9_5,pop_10,
         pop_authentic,pop_total,source_url,scraped_at)
      VALUES
        (${r.card_ref},${r.psa_spec_id},${r.variety},${r.subject_name},${r.card_number},
         ${r.pop_1},${r.pop_1_5},${r.pop_2},${r.pop_2_5},${r.pop_3},${r.pop_3_5},${r.pop_4},${r.pop_4_5},${r.pop_5},${r.pop_5_5},
         ${r.pop_6},${r.pop_6_5},${r.pop_7},${r.pop_7_5},${r.pop_8},${r.pop_8_5},${r.pop_9},${r.pop_9_5},${r.pop_10},
         ${r.pop_authentic},${r.pop_total},${r.source_url},NOW())
      ON CONFLICT (psa_spec_id) DO UPDATE SET
        pop_1=EXCLUDED.pop_1,pop_1_5=EXCLUDED.pop_1_5,pop_2=EXCLUDED.pop_2,pop_2_5=EXCLUDED.pop_2_5,
        pop_3=EXCLUDED.pop_3,pop_3_5=EXCLUDED.pop_3_5,pop_4=EXCLUDED.pop_4,pop_4_5=EXCLUDED.pop_4_5,
        pop_5=EXCLUDED.pop_5,pop_5_5=EXCLUDED.pop_5_5,pop_6=EXCLUDED.pop_6,pop_6_5=EXCLUDED.pop_6_5,
        pop_7=EXCLUDED.pop_7,pop_7_5=EXCLUDED.pop_7_5,pop_8=EXCLUDED.pop_8,pop_8_5=EXCLUDED.pop_8_5,
        pop_9=EXCLUDED.pop_9,pop_10=EXCLUDED.pop_10,pop_authentic=EXCLUDED.pop_authentic,
        pop_total=EXCLUDED.pop_total,scraped_at=NOW()`
      .catch(async () => {
        // pas de contrainte unique psa_spec_id -> insert simple
        await sql`INSERT INTO psa_pop_reports
          (card_ref,psa_spec_id,variety,subject_name,card_number,pop_9,pop_10,pop_total,source_url,scraped_at)
          VALUES (${r.card_ref},${r.psa_spec_id},${r.variety},${r.subject_name},${r.card_number},${r.pop_9},${r.pop_10},${r.pop_total},${r.source_url},NOW())`
      })
    up++
  }
  console.log(`Upsert: ${up} | duree ${Math.round((Date.now()-t0)/1000)}s`)
}
main().catch(e => { console.error(e); process.exit(1) })
