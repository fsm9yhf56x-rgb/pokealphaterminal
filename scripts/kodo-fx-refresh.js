// Kodo Engine — refresh quotidien des taux de change (source: Frankfurter / BCE)
require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

async function get(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url)
      if (r.status === 200) return r.json()
    } catch (e) {}
    await new Promise(r => setTimeout(r, i * 1500))
  }
  return null
}

;(async () => {
  // Frankfurter: taux BCE. Base EUR par defaut.
  // On recupere EUR->USD et EUR->JPY, puis on derive les inverses.
  const data = await get('https://api.frankfurter.app/latest?from=EUR&to=USD,JPY')
  if (!data || !data.rates) {
    console.error('FX: impossible de recuperer les taux')
    process.exit(1)
  }
  const eurUsd = data.rates.USD
  const eurJpy = data.rates.JPY
  const day = data.date // 'YYYY-MM-DD' fourni par l'API (dernier jour ouvre BCE)
  console.log('FX', day, '— EUR/USD:', eurUsd, '| EUR/JPY:', eurJpy)

  const pairs = [
    ['USD', 'EUR', 1 / eurUsd],
    ['EUR', 'USD', eurUsd],
    ['JPY', 'EUR', 1 / eurJpy],
    ['EUR', 'JPY', eurJpy],
    ['USD', 'USD', 1],
    ['EUR', 'EUR', 1],
    ['JPY', 'JPY', 1],
  ]

  for (const [from, to, rate] of pairs) {
    await sql`
      INSERT INTO fx_rates (rate_date, from_currency, to_currency, rate, fetched_at)
      VALUES (${day}::date, ${from}, ${to}, ${Math.round(rate * 1e6) / 1e6}, now())
      ON CONFLICT (rate_date, from_currency, to_currency)
      DO UPDATE SET rate = EXCLUDED.rate, fetched_at = now()`
  }
  console.log('FX: 7 paires upsertees pour', day)

  const check = await sql`SELECT from_currency, to_currency, rate FROM fx_rates WHERE rate_date = ${day}::date ORDER BY from_currency, to_currency`
  console.log('Verif:', JSON.stringify(check))
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
