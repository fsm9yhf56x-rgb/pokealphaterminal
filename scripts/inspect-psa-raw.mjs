import { fetchPsaSetWithBrowser } from './lib/psa-fetcher.mjs'

const { data } = await fetchPsaSetWithBrowser({
  categoryId: 156940,
  headingId: 57801,  // Base Set
  verbose: false,
})

// Find Charizard Unlimited
const chari = data.find(e =>
  e.SubjectName?.includes('Charizard') &&
  e.CardNumber === '4' &&
  (!e.Variety || e.Variety === '')
)

if (chari) {
  console.log('🔍 Charizard Unlimited RAW from PSA (toutes les clés):\n')
  for (const k of Object.keys(chari).sort()) {
    console.log(`  ${k.padEnd(28)} ${JSON.stringify(chari[k])}`)
  }
}
