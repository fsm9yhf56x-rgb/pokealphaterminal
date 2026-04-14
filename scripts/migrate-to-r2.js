const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const https = require('https')
const fs = require('fs')

// ── Config ──
const SUPABASE_URL = 'https://jtheycxwbkweehfezyem.supabase.co'
const SERVICE_KEY = fs.readFileSync('.env.local','utf8').match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim()
const R2 = new S3Client({
  region: 'auto',
  endpoint: 'https://f7155f5c8c83f3528736c91ce3a505c4.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'dda03a61f717f9965ace34cd78e561c7',
    secretAccessKey: 'dbd7c447d35c7e1bae1a26d29e0132a8a4436dc9a3824f64ac25a1933af1a29b',
  },
})
const BUCKET = 'pokealphaterminal-images'
const LANGS = ['en', 'fr', 'jp']
const CONCURRENCY = 10
let uploaded = 0, failed = 0, skipped = 0

function listFiles(prefix) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ prefix, limit: 1000 })
    const req = https.request({
      hostname: 'jtheycxwbkweehfezyem.supabase.co',
      path: '/storage/v1/object/list/card-images',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let body = ''
      res.on('data', d => body += d)
      res.on('end', () => {
        try { resolve(JSON.parse(body)) } catch(e) { resolve([]) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function downloadFile(path) {
  const url = `${SUPABASE_URL}/storage/v1/object/public/card-images/${path}`
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function uploadToR2(key, buffer) {
  await R2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/webp',
  }))
}

async function processFile(path) {
  try {
    const buf = await downloadFile(path)
    if (buf.length < 100) { skipped++; return }
    await uploadToR2(path, buf)
    uploaded++
    if (uploaded % 100 === 0) console.log(`  ✓ ${uploaded} uploaded, ${failed} failed, ${skipped} skipped`)
  } catch(e) {
    failed++
  }
}

async function processBatch(paths) {
  for (let i = 0; i < paths.length; i += CONCURRENCY) {
    const batch = paths.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(p => processFile(p)))
  }
}

async function run() {
  console.log('=== Migration Supabase → R2 ===')
  for (const lang of LANGS) {
    console.log(`\n📁 ${lang.toUpperCase()}...`)
    const sets = await listFiles(lang)
    const folders = sets.filter(s => !s.metadata)
    console.log(`  ${folders.length} sets found`)
    
    for (const folder of folders) {
      const setId = folder.name
      const files = await listFiles(`${lang}/${setId}`)
      const paths = files.filter(f => f.metadata).map(f => `${lang}/${setId}/${f.name}`)
      if (paths.length === 0) continue
      console.log(`  ${setId}: ${paths.length} images`)
      await processBatch(paths)
    }
  }
  
  // Also migrate jp-logos
  console.log('\n📁 JP-LOGOS...')
  const logos = await listFiles('jp-logos')
  const logoPaths = logos.filter(f => f.metadata).map(f => `jp-logos/${f.name}`)
  console.log(`  ${logoPaths.length} logos`)
  await processBatch(logoPaths)
  
  console.log(`\n=== DONE ===`)
  console.log(`✓ Uploaded: ${uploaded}`)
  console.log(`✗ Failed: ${failed}`)
  console.log(`⊘ Skipped: ${skipped}`)
  console.log(`\nPublic URL: https://pub-1aade8805ea544358d85a303c1feef41.r2.dev/{lang}/{setId}/{localId}.webp`)
}

run()
