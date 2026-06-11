require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

;(async () => {
  console.log('=== 1. PORTFOLIO: legacy current_price vs Engine fair_value ===')
  const pf = await sql`
    SELECT p.name, p.lang, p.current_price AS legacy,
      ps.fair_value_eur AS engine, ps.fair_value_method
    FROM portfolio_cards p
    JOIN k_cards kc ON kc.id = p.k_card_id
    LEFT JOIN price_signals ps ON ps.print_id = kc.print_id
    WHERE p.current_price IS NOT NULL AND p.current_price > 0`
  let close = 0, far = 0, missing = 0
  const outliers = []
  for (const r of pf) {
    if (r.engine == null) { missing++; continue }
    const l = Number(r.legacy), e = Number(r.engine)
    const ratio = e / l
    if (ratio > 0.5 && ratio < 2) close++
    else { far++; if (outliers.length < 12) outliers.push(r.name + ' (' + r.lang + '): legacy ' + l + ' vs engine ' + e + ' [' + r.fair_value_method + ']') }
  }
  console.log('Comparables:', pf.length, '| proches (x0.5-x2):', close, '| ecart fort:', far, '| sans signal:', missing)
  if (outliers.length) console.log('Ecarts forts:\n  ' + outliers.join('\n  '))

  console.log('\n=== 2. COUVERTURE par langue (k_cards avec prix Engine) ===')
  const cov = await sql`
    SELECT kc.lang, count(DISTINCT kc.id) AS cards,
      count(DISTINCT CASE WHEN ps.fair_value_eur IS NOT NULL THEN kc.id END) AS with_fair
    FROM k_cards kc
    LEFT JOIN price_signals ps ON ps.print_id = kc.print_id
    GROUP BY kc.lang`
  for (const r of cov) console.log(' ', r.lang, ':', r.with_fair, '/', r.cards,
    '(' + (100 * r.with_fair / r.cards).toFixed(1) + '%)')

  console.log('\n=== 3. SANITY: distribution fair values ===')
  const dist = await sql`SELECT
    count(*) AS n,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY fair_value_eur) AS median,
    max(fair_value_eur) AS max,
    count(CASE WHEN fair_value_eur <= 0 THEN 1 END) AS zeros_neg
    FROM price_signals WHERE fair_value_eur IS NOT NULL`
  console.log(JSON.stringify(dist[0]))
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
