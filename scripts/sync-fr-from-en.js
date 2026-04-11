const { createClient } = require('@supabase/supabase-js')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const BUCKET = 'card-images'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function imageExists(path) {
  const parts = path.split('/'); const folder = parts.slice(0,-1).join('/'); const file = parts[parts.length-1]
  const { data } = await supabase.storage.from(BUCKET).list(folder, { search: file })
  return data && data.length > 0
}

async function main() {
  console.log('Copying EN images → FR where FR is missing\n')
  
  // List all EN images in storage
  const { data: enFolders } = await supabase.storage.from(BUCKET).list('en')
  if (!enFolders) { console.log('No EN folders'); return }
  
  let copied = 0, skipped = 0
  
  for (const folder of enFolders) {
    if (!folder.name || folder.name.startsWith('.')) continue
    const setId = folder.name
    
    const { data: enFiles } = await supabase.storage.from(BUCKET).list(`en/${setId}`)
    if (!enFiles) continue
    
    for (const file of enFiles) {
      if (!file.name.endsWith('.webp')) continue
      const frPath = `fr/${setId}/${file.name}`
      
      const exists = await imageExists(frPath)
      if (exists) { skipped++; continue }
      
      // Download EN image
      const { data: blob } = await supabase.storage.from(BUCKET).download(`en/${setId}/${file.name}`)
      if (!blob) continue
      
      const buffer = Buffer.from(await blob.arrayBuffer())
      const { error } = await supabase.storage.from(BUCKET).upload(frPath, buffer, { contentType: 'image/webp', upsert: true })
      
      if (!error) {
        copied++
        if (copied % 50 === 0) process.stdout.write(`  ${copied} copied...\r`)
      }
      await sleep(30)
    }
  }
  
  console.log(`\nDone: ${copied} EN→FR copies, ${skipped} already existed`)
}

main().catch(console.error)
